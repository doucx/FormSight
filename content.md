好的，我将为你生成 **Step 1: 数据流重构与难度层阶抽象** 的执行计划并进行代码调整。

## [WIP] refactor: 实现 Step 1 数据流重构与难度层阶抽象

### 用户需求
将系统底层的物理像素步长（`gridStep` in px）解耦，引入统一且单调递增的抽象难度层阶（`difficultyLevel`，数字越大代表难度越高），并同步升级 IndexedDB 数据版本与各个视图层显示组件。

### 评论
将像素步长解耦为抽象的 Level 是实现极坐标网格与双极透视网格的前提。这使得自适应引擎（`AdaptiveEngine`）可以独立于物理渲染机制运作，极大地增强了系统的模块化与可扩展性。

### 目标
1. **类型定义升级**：修改 `QuestionData` 与 `TrialRecord` 类型，引入 `difficultyLevel`。
2. **算法重构**：改造 `AdaptiveEngine`，使其基于 `Level 1..N` 单调递设/递增调度。
3. **数据库升级**：将 `StarHoppingDB` 升至 `v2`，重构 `SessionData` 与 `UserProfileData` 存储结构。
4. **视图层适配**：更新 Dashboard、TrainingView、SessionSummaryModal 以及 App 主入口，将其指标展示从 `px` 切换至 `Level`。

### 基本原理
通过在 `geometry.ts` 中暂时提供过渡函数 `levelToTempGridStep`，可以在不打破现有渲染的前提下完成全链路数据模型的平滑迁移。随后后续 Step 2 可以直接在 `geometry.ts` 内将 Level 映射为非线性扇形/双极网格坐标，而无需再动数据与 UI 逻辑。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #concept/state #scope/core #ai/instruct #task/domain/geometry #task/object/difficulty-level-abstraction #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 更新类型模型与核心逻辑库

我们将重构类型文件 `index.ts`，重构自适应引擎 `adaptiveEngine.ts`，升级 `db.ts` 至 v2 版本，并在 `geometry.ts` 中加入 Level 到临时网格步长的桥接方法。

~~~~~act
write_file
src/types/index.ts
~~~~~
~~~~~typescript
export type TrainingMode = 'single' | 'double_h' | 'double_r';

export interface Point {
  x: number;
  y: number;
}

export interface QuestionData {
  id: string;
  mode: TrainingMode;
  anchorA: Point;
  anchorC: Point | null;
  targetB: Point;
  gridStart: Point;
  gridStep: number; // 仅作为 Step 1 过渡期渲染使用
  difficultyLevel: number; // 统一抽象难度等级 (1..N，数字越大越难)
  gridDim: number; // 默认 5 (5x5 网格)

  // 衍生分析指标 (用于后续弱点分析)
  angleDegree: number; // 极角 (0~360°)
  distanceRatio: number; // 极径/距离
  rotationAngle?: number; // 整体画布旋转倾角
}

export interface HitResult {
  isHit: boolean; // 是否选中正确的网格点
  nearestGridPoint: Point; // 用户点击位置对应的网格点
  errorDistance: number; // 点击位置与真理点的像素误差
  isWithinRange?: boolean; // 是否落在有效点击感应范围内
}

export interface TrialRecord {
  id: string;
  sessionId: string;
  mode: TrainingMode;
  timestamp: number;
  difficultyLevel: number; // 存入 Level 等级
  anchorA: [number, number];
  anchorC?: [number, number];
  targetB: [number, number];
  userClick: [number, number];
  angleDegree: number;
  distanceRatio: number;
  isHit: boolean;
  errorPixelDistance: number;
  responseTimeMs: number;
}
~~~~~

~~~~~act
write_file
src/utils/adaptiveEngine.ts
~~~~~
~~~~~typescript
import type { AdaptiveMode } from './settings';

/**
 * 难度序列与最大层阶配置
 * Level 1 最简单，Level 越高难度越大
 */
export const STANDARD_MAX_LEVEL = 12;
export const FINE_MAX_LEVEL = 35;

export type AdaptiveChange = 'up' | 'down' | 'same';

export interface AdaptiveProgress {
  current: number;
  total: number;
  hits: number;
}

export interface RecordResultOutput {
  newLevel: number;
  change: AdaptiveChange;
  isBlockComplete?: boolean;
  progress?: AdaptiveProgress;
}

export class AdaptiveEngine {
  private maxLevel: number;
  private currentLevel: number;
  private mode: AdaptiveMode;
  private targetAccuracy: number;
  private blockSize: number;

  // 经典 3U1D 状态
  private consecutiveCorrect = 0;

  // 轮次胜率评估状态
  private blockHistory: boolean[] = [];

  constructor(
    initialLevel = 5,
    isFineGranularity = false,
    mode: AdaptiveMode = 'block',
    targetAccuracy = 0.8,
    blockSize = 10,
  ) {
    this.maxLevel = isFineGranularity ? FINE_MAX_LEVEL : STANDARD_MAX_LEVEL;
    this.mode = mode;
    this.targetAccuracy = targetAccuracy;
    this.blockSize = blockSize;
    this.currentLevel = Math.max(1, Math.min(initialLevel, this.maxLevel));
  }

  /**
   * 获取当前难度等级 Level (1..maxLevel)
   */
  public getCurrentLevel(): number {
    return this.currentLevel;
  }

  /**
   * 获取当前轮次进度（仅在 block 模式下有效）
   */
  public getBlockProgress(): AdaptiveProgress | null {
    if (this.mode !== 'block') return null;
    const hits = this.blockHistory.filter(Boolean).length;
    return {
      current: this.blockHistory.length,
      total: this.blockSize,
      hits,
    };
  }

  /**
   * 记录做答结果并计算下一题难度 Level
   * @param isHit 本题是否击中目标
   */
  public recordResult(isHit: boolean): RecordResultOutput {
    if (this.mode === 'staircase') {
      return this.recordStaircase(isHit);
    }
    return this.recordBlock(isHit);
  }

  /**
   * 经典 3-Up / 1-Down 算子 (升级 = Level + 1)
   */
  private recordStaircase(isHit: boolean): RecordResultOutput {
    if (isHit) {
      this.consecutiveCorrect += 1;
      if (this.consecutiveCorrect >= 3) {
        this.consecutiveCorrect = 0;
        if (this.currentLevel < this.maxLevel) {
          this.currentLevel += 1;
          return { newLevel: this.getCurrentLevel(), change: 'up' };
        }
      }
    } else {
      this.consecutiveCorrect = 0;
      if (this.currentLevel > 1) {
        this.currentLevel -= 1;
        return { newLevel: this.getCurrentLevel(), change: 'down' };
      }
    }

    return { newLevel: this.getCurrentLevel(), change: 'same' };
  }

  /**
   * 轮次胜率评估算子 (Block Master Engine)
   */
  private recordBlock(isHit: boolean): RecordResultOutput {
    this.blockHistory.push(isHit);
    const count = this.blockHistory.length;
    const hits = this.blockHistory.filter(Boolean).length;

    // 尚未做满一个评估轮次
    if (count < this.blockSize) {
      return {
        newLevel: this.getCurrentLevel(),
        change: 'same',
        isBlockComplete: false,
        progress: { current: count, total: this.blockSize, hits },
      };
    }

    // 做满了一轮，计算胜率
    const accuracy = hits / this.blockSize;
    let change: AdaptiveChange = 'same';

    if (accuracy >= this.targetAccuracy) {
      // 达到或超过目标正确率 -> 通关升级 (Level + 1)
      if (this.currentLevel < this.maxLevel) {
        this.currentLevel += 1;
        change = 'up';
      }
    } else if (accuracy < 0.5) {
      // 正确率低于 50% -> 难度太高，降级 (Level - 1)
      if (this.currentLevel > 1) {
        this.currentLevel -= 1;
        change = 'down';
      }
    }

    // 清空轮次历史，开始下一轮
    this.blockHistory = [];

    return {
      newLevel: this.getCurrentLevel(),
      change,
      isBlockComplete: true,
      progress: { current: 0, total: this.blockSize, hits: 0 },
    };
  }

  /**
   * 强制重置难度等级
   */
  public setLevel(level: number): void {
    this.currentLevel = Math.max(1, Math.min(level, this.maxLevel));
    this.consecutiveCorrect = 0;
    this.blockHistory = [];
  }
}
~~~~~

~~~~~act
write_file
src/utils/db.ts
~~~~~
~~~~~typescript
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import type { TrainingMode, TrialRecord } from '../types';

export interface SessionData {
  id: string;
  mode: TrainingMode;
  type: 'training' | 'benchmark';
  startTimestamp: number;
  endTimestamp?: number;
  totalTrials: number;
  hitTrials: number;
  startLevel: number;
  endLevel: number;
}

export interface UserProfileData {
  mode: TrainingMode;
  currentLevel: number; // 当前维持的难度 Level
  bestLevel: number; // 历史最高难度 Level
  totalTrainedCards: number;
  totalHits: number;
  updatedAt: number;
}

interface StarHoppingDBSchema extends DBSchema {
  sessions: {
    key: string;
    value: SessionData;
  };
  records: {
    key: string;
    value: TrialRecord;
    indexes: {
      'by-session': string;
      'by-mode': string;
    };
  };
  user_profiles: {
    key: TrainingMode;
    value: UserProfileData;
  };
}

const DB_NAME = 'StarHoppingDB';
const DB_VERSION = 2; // 升级版本号以支撑 Level 难度重构

let dbPromise: Promise<IDBPDatabase<StarHoppingDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<StarHoppingDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<StarHoppingDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 2) {
          // 清理旧版本以 px 为单位的数据结构，避免层阶混淆
          if (db.objectStoreNames.contains('sessions')) {
            db.deleteObjectStore('sessions');
          }
          if (db.objectStoreNames.contains('records')) {
            db.deleteObjectStore('records');
          }
          if (db.objectStoreNames.contains('user_profiles')) {
            db.deleteObjectStore('user_profiles');
          }
        }

        // 1. 会话表
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }

        // 2. 试题点击日志表
        if (!db.objectStoreNames.contains('records')) {
          const recordStore = db.createObjectStore('records', { keyPath: 'id' });
          recordStore.createIndex('by-session', 'sessionId');
          recordStore.createIndex('by-mode', 'mode');
        }

        // 3. 用户模式能力表
        if (!db.objectStoreNames.contains('user_profiles')) {
          db.createObjectStore('user_profiles', { keyPath: 'mode' });
        }
      },
    });
  }
  return dbPromise;
}

// === API 1: 保存单次答题记录 ===
export async function saveTrialRecord(record: TrialRecord): Promise<void> {
  const db = await getDB();
  await db.put('records', record);

  // 同步更新模式能力看板
  await updateUserProfile(record.mode, record.isHit, record.difficultyLevel);
}

// === API 2: 保存/更新训练会话 ===
export async function saveSession(session: SessionData): Promise<void> {
  const db = await getDB();
  await db.put('sessions', session);
}

// === API 3: 获取用户指定模式的能力看板 ===
export async function getUserProfile(mode: TrainingMode): Promise<UserProfileData | null> {
  const db = await getDB();
  const profile = await db.get('user_profiles', mode);
  return profile || null;
}

// === API 4: 获取用户所有模式的能力看板 ===
export async function getAllUserProfiles(): Promise<Record<TrainingMode, UserProfileData | null>> {
  const db = await getDB();
  const single = (await db.get('user_profiles', 'single')) || null;
  const doubleH = (await db.get('user_profiles', 'double_h')) || null;
  const doubleR = (await db.get('user_profiles', 'double_r')) || null;

  return {
    single,
    double_h: doubleH,
    double_r: doubleR,
  };
}

// === 内部辅助：更新能力看板 ===
async function updateUserProfile(
  mode: TrainingMode,
  isHit: boolean,
  currentLevel: number,
): Promise<void> {
  const db = await getDB();
  const existing = await db.get('user_profiles', mode);

  if (!existing) {
    const newProfile: UserProfileData = {
      mode,
      currentLevel,
      bestLevel: currentLevel,
      totalTrainedCards: 1,
      totalHits: isHit ? 1 : 0,
      updatedAt: Date.now(),
    };
    await db.put('user_profiles', newProfile);
  } else {
    existing.totalTrainedCards += 1;
    if (isHit) existing.totalHits += 1;
    existing.currentLevel = currentLevel;
    // Level 越高代表能力越强，因此 bestLevel 取最大值
    if (currentLevel > existing.bestLevel) {
      existing.bestLevel = currentLevel;
    }
    existing.updatedAt = Date.now();
    await db.put('user_profiles', existing);
  }
}

// === API 5: 全量 JSON 数据导出 ===
export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  const records = await db.getAll('records');
  const profiles = await db.getAll('user_profiles');

  const exportObject = {
    version: DB_VERSION,
    exportAt: new Date().toISOString(),
    sessions,
    records,
    profiles,
  };

  return JSON.stringify(exportObject, null, 2);
}

// === API 6: 全量 JSON 数据导入 ===
export async function importAllData(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    if (!data.records || !Array.isArray(data.records)) {
      throw new Error('无效的寻星练习导出格式');
    }

    const db = await getDB();
    const tx = db.transaction(['sessions', 'records', 'user_profiles'], 'readwrite');

    if (data.sessions) {
      for (const s of data.sessions) {
        await tx.objectStore('sessions').put(s);
      }
    }
    for (const r of data.records) {
      await tx.objectStore('records').put(r);
    }
    if (data.profiles) {
      for (const p of data.profiles) {
        await tx.objectStore('user_profiles').put(p);
      }
    }

    await tx.done;
    return true;
  } catch (err) {
    console.error('导入寻星数据失败:', err);
    return false;
  }
}

// === API 7: 获取历史做答日志（支持按模式筛选） ===
export async function getAllTrialRecords(mode?: TrainingMode): Promise<TrialRecord[]> {
  const db = await getDB();
  if (mode) {
    return await db.getAllFromIndex('records', 'by-mode', mode);
  }
  return await db.getAll('records');
}

// === API 8: 获取累积练习总时长 (ms) 与格式化辅助 ===
export function formatTotalTime(ms: number): string {
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return `${days}天${hours}小时${minutes}分钟`;
}

export async function getTotalTrainingTimeMs(): Promise<number> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  let totalMs = 0;
  for (const s of sessions) {
    if (s.endTimestamp && s.endTimestamp > s.startTimestamp) {
      totalMs += s.endTimestamp - s.startTimestamp;
    }
  }
  return totalMs;
}
~~~~~

~~~~~act
write_file
src/utils/geometry.ts
~~~~~
~~~~~typescript
import type { HitResult, Point, QuestionData, TrainingMode } from '../types';

export const CANVAS_SIZE = 500;
export const CX = CANVAS_SIZE / 2; // 250
export const CY = CANVAS_SIZE / 2; // 250
export const DEFAULT_GRID_DIM = 5; // 5x5 网格

/**
 * 映射 Level 到临时网格步长 px (仅在 Step 1 过渡期间使用)
 */
export function levelToTempGridStep(level: number): number {
  const steps = [35, 30, 25, 20, 16, 13, 10, 8, 6, 5, 4, 3];
  const idx = Math.max(0, Math.min(level - 1, steps.length - 1));
  return steps[idx];
}

/**
 * 将点绕指定中心旋转指定角度 (角度制)
 */
export function rotatePoint(p: Point, center: Point, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - center.x;
  const dy = p.y - center.y;

  return {
    x: Math.round((center.x + dx * cos - dy * sin) * 100) / 100,
    y: Math.round((center.y + dx * sin + dy * cos) * 100) / 100,
  };
}

/**
 * 计算两点间的欧氏距离
 */
export function calcDistance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
}

/**
 * 根据真理点 B 以及目标在网格中的行列位置 (row, col)，推算网格左上角 GridStart 坐标
 */
export function calcGridStart(
  targetB: Point,
  rowIdx: number,
  colIdx: number,
  gridStep: number,
): Point {
  return {
    x: Math.round((targetB.x - colIdx * gridStep) * 100) / 100,
    y: Math.round((targetB.y - rowIdx * gridStep) * 100) / 100,
  };
}

/**
 * 根据 GridStart、维度和步长生成全量干扰点阵坐标数组
 */
export function generateGridPoints(gridStart: Point, dim: number, step: number): Point[] {
  const points: Point[] = [];
  for (let r = 0; r < dim; r++) {
    for (let c = 0; c < dim; c++) {
      points.push({
        x: Math.round((gridStart.x + c * step) * 100) / 100,
        y: Math.round((gridStart.y + r * step) * 100) / 100,
      });
    }
  }
  return points;
}

/**
 * 寻找最近的网格点及感应范围判定
 */
export function findNearestGridPoint(
  clickPoint: Point,
  gridStart: Point,
  gridStep: number,
  dim: number = DEFAULT_GRID_DIM,
): { nearestPoint: Point; minDistance: number; isWithinRange: boolean } {
  const gridPoints = generateGridPoints(gridStart, dim, gridStep);
  let nearestPoint = gridPoints[0];
  let minDistance = calcDistance(clickPoint, nearestPoint);

  for (let i = 1; i < gridPoints.length; i++) {
    const dist = calcDistance(clickPoint, gridPoints[i]);
    if (dist < minDistance) {
      minDistance = dist;
      nearestPoint = gridPoints[i];
    }
  }

  // 判定感应半径：网格步长的 55%
  const maxRadius = gridStep * 0.55;
  return {
    nearestPoint,
    minDistance,
    isWithinRange: minDistance <= maxRadius,
  };
}

/**
 * 点击作答 Hit Detection：判定用户的点击坐标是否击中了真理点 B 所在的网格
 */
export function checkHit(
  clickPoint: Point,
  targetB: Point,
  gridStart: Point,
  gridStep: number,
  dim: number = DEFAULT_GRID_DIM,
): HitResult {
  const { nearestPoint, isWithinRange } = findNearestGridPoint(
    clickPoint,
    gridStart,
    gridStep,
    dim,
  );

  // 1. 判断吸附后网格点与真理点 B 的直接偏差
  const errorDistance = calcDistance(nearestPoint, targetB);
  const isHit = errorDistance < 0.5;

  return {
    isHit,
    nearestGridPoint: nearestPoint,
    errorDistance,
    isWithinRange,
  };
}

export interface QuestionGenerateOptions {
  targetingMode?: 'off' | 'auto' | 'manual';
  targetSectors?: number[]; // [0~7]
}

/**
 * 加权随机生成极角：70% 概率落入靶向弱点扇区，30% 概率全盘均匀探索
 */
function selectAngleWithTargeting(options?: QuestionGenerateOptions): number {
  if (
    options?.targetingMode &&
    options.targetingMode !== 'off' &&
    options.targetSectors &&
    options.targetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        options.targetSectors[Math.floor(Math.random() * options.targetSectors.length)];
      const sectorCenterAngle = chosenSector * 45;
      const jitter = (Math.random() - 0.5) * 40; // ±20° 范围加权抖动
      return Math.floor((sectorCenterAngle + jitter + 360) % 360);
    }
  }
  return Math.floor(Math.random() * 360);
}

/**
 * 随机生成算法：根据模式与难度 Level 生成一道题目数据
 */
export function generateQuestion(
  mode: TrainingMode,
  difficultyLevel: number,
  options?: QuestionGenerateOptions,
): QuestionData {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = DEFAULT_GRID_DIM;
  const gridStep = levelToTempGridStep(difficultyLevel);
  const randomRow = Math.floor(Math.random() * gridDim);
  const randomCol = Math.floor(Math.random() * gridDim);

  if (mode === 'single') {
    // === 1. 单锚点模式 ===
    const anchorA: Point = { x: CX, y: CY };
    const angle = selectAngleWithTargeting(options);
    const distChoices = [60, 90, 120, 150, 180];
    const dist = distChoices[Math.floor(Math.random() * distChoices.length)];

    const rad = (angle * Math.PI) / 180;
    const targetB: Point = {
      x: Math.round((CX + dist * Math.cos(rad)) * 100) / 100,
      y: Math.round((CY + dist * Math.sin(rad)) * 100) / 100,
    };

    const gridStart = calcGridStart(targetB, randomRow, randomCol, gridStep);

    return {
      id,
      mode,
      anchorA,
      anchorC: null,
      targetB,
      gridStart,
      gridStep,
      difficultyLevel,
      gridDim,
      angleDegree: angle,
      distanceRatio: dist,
    };
  }

  // 双锚点基础拓扑
  const baseAx = -70;
  const baseAy = 0;
  const baseCx = 70;
  const baseCy = 0;

  const projChoices = [-90, -45, 0, 45, 90];
  const hgtChoices = [-90, -45, 45, 90];

  const validPairs: { px: number; py: number; angle: number }[] = [];
  for (const x of projChoices) {
    for (const y of hgtChoices) {
      const angle = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
      validPairs.push({ px: x, py: y, angle });
    }
  }

  let chosenPair = validPairs[Math.floor(Math.random() * validPairs.length)];

  if (
    options?.targetingMode &&
    options.targetingMode !== 'off' &&
    options.targetSectors &&
    options.targetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        options.targetSectors[Math.floor(Math.random() * options.targetSectors.length)];
      const sectorCenterAngle = chosenSector * 45;

      const targetedPairs = validPairs.filter((p) => {
        const diff = Math.abs(p.angle - sectorCenterAngle);
        const minDiff = Math.min(diff, 360 - diff);
        return minDiff <= 22.5;
      });

      if (targetedPairs.length > 0) {
        chosenPair = targetedPairs[Math.floor(Math.random() * targetedPairs.length)];
      }
    }
  }

  const px = chosenPair.px;
  const py = chosenPair.py;

  const rotAngle =
    mode === 'double_h'
      ? 0
      : [15, 30, 45, 60, 75, 90, 105, 120, 135, 150][Math.floor(Math.random() * 10)];

  const center: Point = { x: 0, y: 0 };
  const rotatedA = rotatePoint({ x: baseAx, y: baseAy }, center, rotAngle);
  const rotatedC = rotatePoint({ x: baseCx, y: baseCy }, center, rotAngle);
  const rotatedB = rotatePoint({ x: px, y: py }, center, rotAngle);

  const anchorA: Point = {
    x: Math.round((rotatedA.x + CX) * 100) / 100,
    y: Math.round((rotatedA.y + CY) * 100) / 100,
  };
  const anchorC: Point = {
    x: Math.round((rotatedC.x + CX) * 100) / 100,
    y: Math.round((rotatedC.y + CY) * 100) / 100,
  };
  const targetB: Point = {
    x: Math.round((rotatedB.x + CX) * 100) / 100,
    y: Math.round((rotatedB.y + CY) * 100) / 100,
  };

  const gridStart = calcGridStart(targetB, randomRow, randomCol, gridStep);
  const angleDegree = Math.round(((Math.atan2(py, px) * 180) / Math.PI + 360) % 360);

  return {
    id,
    mode,
    anchorA,
    anchorC,
    targetB,
    gridStart,
    gridStep,
    difficultyLevel,
    gridDim,
    angleDegree,
    distanceRatio: Math.round(Math.sqrt(px * px + py * py)),
    rotationAngle: rotAngle,
  };
}
~~~~~

#### Acts 2: 更新 UI 组件与视图层

调整 Dashboard、TrainingView、SessionSummaryModal 与 App 组件，使其正确传递与显示难度 Level。

~~~~~act
write_file
src/views/Dashboard.tsx
~~~~~
~~~~~typescript
import {
  Award,
  BarChart2,
  Clock,
  type Compass,
  Crosshair,
  Download,
  Play,
  RotateCw,
  Sliders,
  Target,
  TrendingUp,
  Upload,
} from 'lucide-preact';
import { useRef } from 'preact/hooks';
import type { TrainingMode } from '../types';
import { type UserProfileData, exportAllData, formatTotalTime, importAllData } from '../utils/db';

interface DashboardProps {
  profiles: Record<TrainingMode, UserProfileData | null>;
  totalTimeMs: number;
  onStart: (mode: TrainingMode, type: 'training' | 'benchmark') => void;
  onRefreshProfiles: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics: (mode?: TrainingMode) => void;
}

const MODES_CONFIG: Array<{
  id: TrainingMode;
  title: string;
  subtitle: string;
  desc: string;
  icon: typeof Compass;
  badgeColor: string;
}> = [
  {
    id: 'single',
    title: '单锚点模式',
    subtitle: 'Single Anchor',
    desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
    icon: Target,
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'double_h',
    title: '水平双锚点',
    subtitle: 'Double Horiz',
    desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
    icon: Crosshair,
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    id: 'double_r',
    title: '旋转双锚点',
    subtitle: 'Double Rotated',
    desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
    icon: RotateCw,
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
];

export function Dashboard({
  profiles,
  totalTimeMs,
  onStart,
  onRefreshProfiles,
  onOpenSettings,
  onOpenAnalytics,
}: DashboardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = async () => {
    const jsonStr = await exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `star_hopping_data_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      const file = target.files[0];
      const text = await file.text();
      const success = await importAllData(text);
      if (success) {
        alert('✅ 数据导入成功！');
        onRefreshProfiles();
      } else {
        alert('❌ 导入失败，数据格式不匹配。');
      }
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
      {/* 极简 Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 px-6 py-5 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            寻星练习 <span className="text-indigo-600 font-light text-xl">Star-Hopping</span>
          </h1>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>{formatTotalTime(totalTimeMs)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenAnalytics()}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="弱点分析"
          >
            <BarChart2 className="w-4 h-4 text-indigo-600" />
            弱点分析
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="偏好设置"
          >
            <Sliders className="w-4 h-4" />
            设置
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all"
            title="导出数据"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all"
            title="导入数据"
          >
            <Upload className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </div>

      {/* 3 个训练卡片区 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {MODES_CONFIG.map((config) => {
          const profile = profiles[config.id];
          const totalCards = profile?.totalTrainedCards || 0;
          const accuracy =
            totalCards > 0 && profile ? Math.round((profile.totalHits / totalCards) * 100) : 0;
          const currentLevel = profile?.currentLevel || 5;
          const IconComponent = config.icon;

          return (
            <div
              key={config.id}
              className="group bg-white border border-gray-200/80 hover:border-indigo-300 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${config.badgeColor}`}
                  >
                    {config.subtitle}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{config.title}</h3>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed h-10">{config.desc}</p>

                {/* 核心指标统计 */}
                <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400">
                      <TrendingUp className="w-3 h-3 text-indigo-500" />
                      能力层阶
                    </div>
                    <div className="text-xl font-black text-slate-800">
                      Level {currentLevel}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400">
                      <Award className="w-3 h-3 text-emerald-500" />
                      正确率
                    </div>
                    <div className="text-xl font-black text-slate-800">{accuracy}%</div>
                  </div>
                </div>
              </div>

              {/* 动作按钮区 */}
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => onStart(config.id, 'training')}
                  className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  开始自适应训练
                </button>
                <button
                  type="button"
                  onClick={() => onStart(config.id, 'benchmark')}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Target className="w-3.5 h-3.5 text-gray-500" />
                  20 题基准测试
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript
import { ArrowLeft, ChevronRight, Clock, Crosshair } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { type SessionHistoryItem, SessionSummaryModal } from '../components/SessionSummaryModal';
import { StarCanvas } from '../components/StarCanvas';
import type { HitResult, Point, QuestionData, TrainingMode, TrialRecord } from '../types';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import { type SessionData, getAllTrialRecords, saveSession, saveTrialRecord } from '../utils/db';
import { type QuestionGenerateOptions, generateQuestion } from '../utils/geometry';
import type { UserSettings } from '../utils/settings';

interface TrainingViewProps {
  mode: TrainingMode;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: UserSettings;
  onExit: () => void;
}

export function TrainingView({
  mode,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: TrainingViewProps) {
  // === 会话状态 ===
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);
  const startTimeRef = useRef<number>(Date.now());
  const adaptiveEngineRef = useRef<AdaptiveEngine>(
    new AdaptiveEngine(
      initialLevel,
      settings.stepGranularity === 'fine',
      sessionType === 'benchmark' ? 'staircase' : settings.adaptiveMode,
      settings.targetAccuracy,
      settings.blockSize,
    ),
  );
  const autoNextTimerRef = useRef<number | null>(null);
  const targetSectorsRef = useRef<number[]>(settings.manualTargetSectors || []);

  // 辅助：获取发题配置选项
  const getGenerateOptions = (): QuestionGenerateOptions => {
    return {
      targetingMode: settings.targetingMode,
      targetSectors:
        settings.targetingMode === 'manual'
          ? settings.manualTargetSectors
          : targetSectorsRef.current,
    };
  };

  const [question, setQuestion] = useState<QuestionData>(() =>
    generateQuestion(mode, initialLevel, {
      targetingMode: settings.targetingMode,
      targetSectors: settings.manualTargetSectors,
    }),
  );
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  // 自动拉取弱点扇区（若为 auto 模式）
  useEffect(() => {
    if (settings.targetingMode === 'auto') {
      getAllTrialRecords(mode).then((records) => {
        if (records.length >= 3) {
          const buckets = Array.from({ length: 8 }, () => ({ total: 0, hits: 0 }));
          for (const r of records) {
            const idx = Math.floor(((r.angleDegree + 22.5) % 360) / 45);
            buckets[idx].total += 1;
            if (r.isHit) buckets[idx].hits += 1;
          }
          let minAcc = 1.0;
          let minIdx = 0;
          for (let i = 0; i < buckets.length; i++) {
            const b = buckets[i];
            if (b.total >= 1) {
              const acc = b.hits / b.total;
              if (acc < minAcc) {
                minAcc = acc;
                minIdx = i;
              }
            }
          }
          targetSectorsRef.current = [minIdx];
        }
      });
    }
  }, [mode, settings.targetingMode]);

  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [userAnswer, setUserAnswer] = useState<{
    clickPoint: Point;
    hitResult: HitResult;
  } | null>(null);

  // 统计指标与结算弹窗
  const [totalTrials, setTotalTrials] = useState<number>(0);
  const [hitTrials, setHitTrials] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);

  const lastActivityTimeRef = useRef<number>(Date.now());
  const accumulatedMsRef = useRef<number>(0);
  const lastTickTimeRef = useRef<number>(Date.now());

  // 用户活动监听，静默重置闲置计时器
  useEffect(() => {
    const handleUserActivity = () => {
      lastActivityTimeRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('mousedown', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
    };
  }, []);

  // === 计时器 ===
  useEffect(() => {
    lastTickTimeRef.current = Date.now();
    const timer = setInterval(() => {
      // 弹窗弹出或会话完成时，冻结计时
      if (showSummaryModal || isFinished) return;

      const now = Date.now();
      const delta = now - lastTickTimeRef.current;
      lastTickTimeRef.current = now;

      const idleLimitMs = (settings.idleTimeout ?? 60) * 1000;
      const isIdle = idleLimitMs > 0 && now - lastActivityTimeRef.current > idleLimitMs;

      if (!isIdle) {
        accumulatedMsRef.current += delta;
        setElapsedSeconds(Math.floor(accumulatedMsRef.current / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [settings.idleTimeout, showSummaryModal, isFinished]);

  // === 键盘监听 (Space / Esc) ===
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (showAnswer && !isFinished) {
          handleNextQuestion();
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        handleFinishSession();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, isFinished]);

  // === 作答处理 ===
  const handleAnswer = async (clickPoint: Point, hitResult: HitResult) => {
    const responseTimeMs = Date.now() - questionStartTime;
    setUserAnswer({ clickPoint, hitResult });
    setShowAnswer(true);

    const newTotal = totalTrials + 1;
    const newHits = hitTrials + (hitResult.isHit ? 1 : 0);
    setTotalTrials(newTotal);
    setHitTrials(newHits);

    // 1. 存数据库原子记录
    const record: TrialRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: sessionIdRef.current,
      mode,
      timestamp: Date.now(),
      difficultyLevel: question.difficultyLevel,
      anchorA: [question.anchorA.x, question.anchorA.y],
      anchorC: question.anchorC ? [question.anchorC.x, question.anchorC.y] : undefined,
      targetB: [question.targetB.x, question.targetB.y],
      userClick: [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y],
      angleDegree: question.angleDegree,
      distanceRatio: question.distanceRatio,
      isHit: hitResult.isHit,
      errorPixelDistance: hitResult.errorDistance,
      responseTimeMs,
    };
    await saveTrialRecord(record);

    // 2. 记录做答 Level 历史
    setSessionHistory((prev) => [
      ...prev,
      {
        trialIndex: newTotal,
        level: question.difficultyLevel,
        isHit: hitResult.isHit,
        responseTimeMs,
      },
    ]);

    // 3. 调优阶梯难度 Level
    adaptiveEngineRef.current.recordResult(hitResult.isHit);

    // 4. 检查基准测试是否完成 (20 题)
    if (sessionType === 'benchmark' && newTotal >= 20) {
      setIsFinished(true);
      await saveCurrentSession(newTotal, newHits, true);
      setShowSummaryModal(true);
    } else if (settings.autoNext) {
      // 自动翻页延时
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = window.setTimeout(() => {
        handleNextQuestion();
      }, settings.autoNextDelay);
    }
  };

  // === 切题 ===
  const handleNextQuestion = () => {
    if (isFinished) return;
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }

    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateQuestion(mode, nextLevel, getGenerateOptions()));
    setQuestionStartTime(Date.now());
  };

  // === 保存会话数据 ===
  const saveCurrentSession = async (trials = totalTrials, hits = hitTrials, ended = false) => {
    const sessionData: SessionData = {
      id: sessionIdRef.current,
      mode,
      type: sessionType,
      startTimestamp: startTimeRef.current,
      endTimestamp: ended ? Date.now() : undefined,
      totalTrials: trials,
      hitTrials: hits,
      startLevel: initialLevel,
      endLevel: adaptiveEngineRef.current.getCurrentLevel(),
    };
    await saveSession(sessionData);
  };

  // === 触发退出/完成请求 ===
  const handleRequestFinish = async () => {
    if (sessionHistory.length > 0 && !showSummaryModal) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      setShowSummaryModal(true);
    } else {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onExit();
    }
  };

  // === 彻底退出 ===
  const handleFinishSession = async () => {
    await saveCurrentSession(totalTrials, hitTrials, true);
    onExit();
  };

  // === 再练一轮 ===
  const handleRestartSession = () => {
    setShowSummaryModal(false);
    setIsFinished(false);
    setTotalTrials(0);
    setHitTrials(0);
    setSessionHistory([]);
    setShowAnswer(false);
    setUserAnswer(null);
    sessionIdRef.current = `session_${Date.now()}`;
    startTimeRef.current = Date.now();
    lastActivityTimeRef.current = Date.now();
    accumulatedMsRef.current = 0;
    setElapsedSeconds(0);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateQuestion(mode, nextLevel, getGenerateOptions()));
    setQuestionStartTime(Date.now());
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const currentAccuracy = totalTrials > 0 ? Math.round((hitTrials / totalTrials) * 100) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      {/* 顶栏控制面板 */}
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRequestFinish}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            退出训练 (Esc)
          </button>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {mode} | {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
          {settings.targetingMode !== 'off' && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-amber-600" />
              {settings.targetingMode === 'auto' ? '智能靶向强化' : '手动靶向强化'}
            </span>
          )}
        </div>

        {/* 核心监控指标 */}
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              已练题数
            </span>
            <span className="font-black text-gray-800">
              {totalTrials} {sessionType === 'benchmark' ? '/ 20' : ''}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              总正确率
            </span>
            <span className="font-black text-gray-800">{currentAccuracy}%</span>
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              当前难度
            </span>
            <span className="font-black text-indigo-600">Level {question.difficultyLevel}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono font-bold text-slate-700">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>
      </header>

      {/* 核心双 Canvas 交互区 */}
      <StarCanvas
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={handleAnswer}
        disabled={isFinished}
      />

      {/* 底部操作面板（仅在未开启自动翻页时显示） */}
      {!settings.autoNext && (
        <div className="w-full max-w-md bg-white border border-gray-200/80 rounded-2xl p-3 shadow-sm flex items-center justify-end min-h-[56px]">
          {isFinished ? (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all"
            >
              完成并查看总结
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              disabled={!showAnswer}
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-1 ${
                showAnswer
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              下一题
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 练习结算弹窗 */}
      {showSummaryModal && (
        <SessionSummaryModal
          mode={mode}
          sessionType={sessionType}
          elapsedSeconds={elapsedSeconds}
          history={sessionHistory}
          onClose={handleFinishSession}
          onRestart={handleRestartSession}
        />
      )}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/SessionSummaryModal.tsx
~~~~~
~~~~~typescript
import { ArrowRight, Award, Clock, Home, RotateCcw, Target, Zap } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import type { TrainingMode } from '../types';

export interface SessionHistoryItem {
  trialIndex: number;
  level: number;
  isHit: boolean;
  responseTimeMs: number;
}

interface SessionSummaryModalProps {
  mode: TrainingMode;
  sessionType: 'training' | 'benchmark';
  elapsedSeconds: number;
  history: SessionHistoryItem[];
  onClose: () => void;
  onRestart: () => void;
}

const MODE_NAMES: Record<TrainingMode, string> = {
  single: '单锚点模式',
  double_h: '水平双锚点',
  double_r: '旋转双锚点',
};

export function SessionSummaryModal({
  mode,
  sessionType,
  elapsedSeconds,
  history,
  onClose,
  onRestart,
}: SessionSummaryModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const totalTrials = history.length;
  const hitCount = history.filter((h) => h.isHit).length;
  const accuracy = totalTrials > 0 ? Math.round((hitCount / totalTrials) * 100) : 0;

  const startLevel = history.length > 0 ? history[0].level : 5;
  const endLevel = history.length > 0 ? history[history.length - 1].level : 5;
  const levelDiff = endLevel - startLevel;

  const avgResponseTimeSec =
    totalTrials > 0
      ? (history.reduce((acc, curr) => acc + curr.responseTimeMs, 0) / totalTrials / 1000).toFixed(
          1,
        )
      : '0.0';

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // 绘制 Level 演进折线图
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 30, right: 30, bottom: 35, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // 清屏
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, width, height);

    const levels = history.map((h) => h.level);
    const maxLevel = Math.max(...levels, 12);
    const minLevel = Math.min(...levels, 1);

    // Y 轴转换函数 (Level 越大代表难度越高，向上增加)
    const getY = (val: number) => {
      const ratio = (val - minLevel) / (maxLevel - minLevel || 1);
      return padding.top + (1 - ratio) * chartH;
    };

    // X 轴转换函数
    const getX = (index: number) => {
      if (history.length === 1) return padding.left + chartW / 2;
      return padding.left + (index / (history.length - 1)) * chartW;
    };

    // 1. 绘制网格线与 Y 轴刻度
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#334155';
    ctx.fillStyle = '#64748B';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const yTicks = [maxLevel, Math.round((maxLevel + minLevel) / 2), minLevel];
    const uniqueYTicks = Array.from(new Set(yTicks));

    for (const tickVal of uniqueYTicks) {
      const y = getY(tickVal);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillText(`Lvl ${tickVal}`, padding.left - 8, y);
    }

    // 2. 绘制渐变填充区域
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.02)');

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(history[0].level));
    for (let i = 1; i < history.length; i++) {
      ctx.lineTo(getX(i), getY(history[i].level));
    }
    ctx.lineTo(getX(history.length - 1), height - padding.bottom);
    ctx.lineTo(getX(0), height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // 3. 绘制折线
    ctx.beginPath();
    ctx.strokeStyle = '#818CF8';
    ctx.lineWidth = 2.5;
    ctx.moveTo(getX(0), getY(history[0].level));
    for (let i = 1; i < history.length; i++) {
      ctx.lineTo(getX(i), getY(history[i].level));
    }
    ctx.stroke();

    // 4. 绘制数据点与作答标记
    for (let i = 0; i < history.length; i++) {
      const h = history[i];
      const x = getX(i);
      const y = getY(h.level);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = h.isHit ? '#22C55E' : '#EF4444';
      ctx.fill();
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 在主要节点标 Level 数字
      if (
        history.length <= 10 ||
        i === 0 ||
        i === history.length - 1 ||
        h.level !== history[i - 1]?.level
      ) {
        ctx.fillStyle = '#CBD5E1';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`L${h.level}`, x, y - 8);
      }
    }

    // X 轴底线
    ctx.strokeStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('题目做答序列 ➔', width / 2, height - 10);
  }, [history]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Award className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">训练总结与成果</h2>
              <p className="text-xs text-slate-400">
                {MODE_NAMES[mode]} • {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
              </p>
            </div>
          </div>
        </div>

        {/* 核心指标统计卡片 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              正确率 / 题数
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800">{accuracy}%</span>
              <span className="text-xs font-semibold text-slate-400">
                ({hitCount}/{totalTrials} 题)
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              训练时长
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800">
                {formatTime(elapsedSeconds)}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                ({avgResponseTimeSec}秒/题)
              </span>
            </div>
          </div>
        </div>

        {/* 层阶提升高亮卡片 */}
        <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 text-white rounded-xl">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-900">能力层阶演进</div>
              <div className="text-[11px] text-indigo-600">
                {levelDiff > 0
                  ? `难度层阶提升了 ${levelDiff} 级！`
                  : levelDiff < 0
                    ? `难度层阶回调了 ${Math.abs(levelDiff)} 级`
                    : '稳健维持当前难度层阶'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono font-black text-slate-800 text-base">
            <span className="bg-white px-2.5 py-1 rounded-xl border border-indigo-100 shadow-sm">
              Lvl {startLevel}
            </span>
            <ArrowRight className="w-4 h-4 text-indigo-500" />
            <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-xl shadow-sm">
              Lvl {endLevel}
            </span>
          </div>
        </div>

        {/* 折线图 Canvas 区 */}
        <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
          <div className="flex justify-between items-center px-1 mb-2">
            <span className="text-[11px] font-bold text-slate-400">难度层阶变化曲线</span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> 击中
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> 未击中
              </span>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={440}
            height={160}
            className="w-full aspect-[11/4] rounded-xl"
          />
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Home className="w-4 h-4" />
            返回主页
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            再练一轮
          </button>
        </div>
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/app.tsx
~~~~~
~~~~~typescript
import { useCallback, useEffect, useState } from 'preact/hooks';
import { AnalyticsModal } from './components/AnalyticsModal';
import { SettingsModal } from './components/SettingsModal';
import type { TrainingMode } from './types';
import { type UserProfileData, getAllUserProfiles, getTotalTrainingTimeMs } from './utils/db';
import { type UserSettings, loadSettings } from './utils/settings';
import { Dashboard } from './views/Dashboard';
import { TrainingView } from './views/TrainingView';

export function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'training'>('dashboard');
  const [activeMode, setActiveMode] = useState<TrainingMode>('single');
  const [sessionType, setSessionType] = useState<'training' | 'benchmark'>('training');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [analyticsMode, setAnalyticsMode] = useState<TrainingMode | 'all'>('all');
  const [settings, setSettings] = useState<UserSettings>(loadSettings);

  const [profiles, setProfiles] = useState<Record<TrainingMode, UserProfileData | null>>({
    single: null,
    double_h: null,
    double_r: null,
  });
  const [totalTimeMs, setTotalTimeMs] = useState<number>(0);

  // 刷新用户能力度数与总练习时长
  const refreshProfiles = useCallback(async () => {
    const data = await getAllUserProfiles();
    const timeMs = await getTotalTrainingTimeMs();
    setProfiles(data);
    setTotalTimeMs(timeMs);
  }, []);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  // 打开弱点分析
  const handleOpenAnalytics = (mode?: TrainingMode) => {
    setAnalyticsMode(mode || 'all');
    setIsAnalyticsOpen(true);
  };

  // 启动训练
  const handleStartTraining = (mode: TrainingMode, type: 'training' | 'benchmark') => {
    setActiveMode(mode);
    setSessionType(type);
    setCurrentView('training');
  };

  // 退出训练返回主页
  const handleExitTraining = () => {
    setCurrentView('dashboard');
    refreshProfiles();
  };

  const activeLevel = profiles[activeMode]?.currentLevel || 5;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {currentView === 'dashboard' ? (
        <Dashboard
          profiles={profiles}
          totalTimeMs={totalTimeMs}
          onStart={handleStartTraining}
          onRefreshProfiles={refreshProfiles}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAnalytics={handleOpenAnalytics}
        />
      ) : (
        <TrainingView
          mode={activeMode}
          sessionType={sessionType}
          initialLevel={activeLevel}
          settings={settings}
          onExit={handleExitTraining}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(newSettings) => setSettings(newSettings)}
        />
      )}

      {isAnalyticsOpen && (
        <AnalyticsModal initialMode={analyticsMode} onClose={() => setIsAnalyticsOpen(false)} />
      )}
    </div>
  );
}
~~~~~

### 下一步建议
我们已经成功完成了 Step 1 的数据流与逻辑解耦。下一步我们将进入 **Step 2: 几何计算逻辑重构**：

1. **单锚点极坐标生成器 (`generatePolarGrid`)**：在 `geometry.ts` 中根据 Level 映射离散角度步长 $\Delta\theta$ 和径向比例步长 $\Delta r/R$，生成扇形网格。
2. **双锚点透视极坐标生成器 (`generateBipolarGrid`)**：计算两锚点到真理点的两条视线辐射角，根据 Level 进行偏角交叉求交点生成透视网格。
3. **点阵判定更新 (`checkHit`)**：脱离方形网格逻辑，直接在给定的非线性干扰点阵数组中寻找欧氏距离最近点。
