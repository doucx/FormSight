好的，我们现在开始全面实施 **相对色感训练（Relative Color Perception）** 模块。

首先执行 **第一阶段** 的建设：构建核心类型、OKLab 矢量推移算法、IndexedDB v4 数据表迁移与单元测试。

以下为您生成 `[WIP]` 计划：

## [WIP] feat(relative-color): 新增相对色感核心算法与 IndexedDB v4 数据模型

### 用户需求
引入“相对色感 (Relative Color Perception)”训练体系，首先搭建底层数据类型、基于 OKLab 色彩空间的 3D 矢量变化与评分算子（色彩矢量迁移模式 Vector Translation），并升级 IndexedDB 数据库至 v4 以持久化存储相对色感训练记录与能力看板。

### 评论
在物理色彩建模中，画师对光影和固有色推移的判断对应于均匀色彩空间（OKLab）中的矢量平移 $\vec{v}_{AB} = \mathbf{Lab}_B - \mathbf{Lab}_A$。通过计算用户调制矢量 $\vec{v}_{CD_{\text{user}}}$ 与理论矢量 $\vec{v}_{AB}$ 在 OKLab 空间中的欧氏色差 $\Delta E$、模长偏差（明度/纯度推移幅值）与方向夹角（色温偏转角），能够极其精准地评估并训练画师的相对色彩推移直觉。

### 目标
1. 在 `src/types/index.ts` 中定义 `RelativeColorMode`、`RelativeColorQuestionData`、`RelativeColorHitResult`、`RelativeColorTrialRecord` 等类型。
2. 创建 `src/utils/relativeColorUtils.ts`，实现基于 OKLab 矢量的题目生成、色域安全边界检查以及多维度（$\Delta E$、模长误差、角度误差）评分算子。
3. 升级 `src/utils/db.ts` 中的 IndexedDB 数据库至版本 `4`，新增 `relative_color_sessions`、`relative_color_records` 和 `relative_color_profiles` 存储表及对应的 CRUD/导入导出 API。
4. 编写 `src/utils/__tests__/relativeColorUtils.test.ts` 单元测试，验证矢量推移算子的准确性。

### 基本原理
1. **矢量平移**: 理论点 $\mathbf{Lab}_{D_{\text{target}}} = \mathbf{Lab}_C + (\mathbf{Lab}_B - \mathbf{Lab}_A)$。在 HSV 转换回 RGB 时增加色域防爆溢判断，确保生成的四色组在显示屏上安全可呈现。
2. **三维偏差拆解**: 
   - 色差总值: $\Delta E = \|\mathbf{Lab}_{D_{\text{user}}} - \mathbf{Lab}_{D_{\text{target}}}\|$
   - 模长误差: $\Delta M = |\|\vec{v}_{CD_{\text{user}}}\| - \|\vec{v}_{AB}\|_\|$
   - 方向夹角: $\theta = \arccos\left(\frac{\vec{v}_{CD_{\text{user}}} \cdot \vec{v}_{AB}}{\|\vec{v}_{CD_{\text{user}}}\| \|\vec{v}_{AB}\|}\right)$
3. **数据库平滑迁移**: 升级 IndexedDB 版本号为 4，在 `upgrade` 钩子中增加新增 Store 判断，并在全量 JSON 导入导出与数据清空 API 中整合相对色感数据集。

### 标签
#intent/build #flow/ready #priority/high #comp/engine #concept/state #scope/core #ai/instruct #task/domain/color-recognition #task/object/relative-color-module #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 扩展类型定义 `src/types/index.ts`

在 `src/types/index.ts` 中补充相对色感相关的模式、题目、命中结果及数据库记录接口。

~~~~~act
patch_file
src/types/index.ts
~~~~~
~~~~~typescript
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
~~~~~typescript
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

// === 相对色感类型定义 ===
export type RelativeColorMode = 'VECTOR_SHIFT' | 'CONTRAST_MATCH' | 'THREE_TONE_SCALE';

export interface RelativeColorQuestionData {
  id: string;
  mode: RelativeColorMode;
  difficultyLevel: number;
  colorA: [number, number, number]; // HSV [0..360, 0..100, 0..100]
  colorB: [number, number, number]; // HSV
  colorC: [number, number, number]; // HSV
  targetD: [number, number, number]; // HSV 真理值
  tolerance: number; // OKLab 允许色差 ΔE
}

export interface RelativeColorHitResult {
  isHit: boolean;
  userHSV: [number, number, number];
  targetHSV: [number, number, number];
  deltaEError: number;
  magnitudeError: number; // 模长误差 (明度/彩度跨度偏离)
  angleErrorDeg: number;  // 矢量方向夹角偏转 (色温偏向)
  tolerance: number;
}

export interface RelativeColorTrialRecord {
  id: string;
  sessionId: string;
  mode: RelativeColorMode;
  timestamp: number;
  difficultyLevel: number;
  colorA: [number, number, number];
  colorB: [number, number, number];
  colorC: [number, number, number];
  targetD: [number, number, number];
  userD: [number, number, number];
  isHit: boolean;
  deltaEError: number;
  magnitudeError: number;
  angleErrorDeg: number;
  responseTimeMs: number;
}
~~~~~

#### Acts 2: 创建相对色感算法工具 `src/utils/relativeColorUtils.ts`

实现 OKLab 矢量算子、题目生成器以及评分拆解函数。

~~~~~act
write_file
src/utils/relativeColorUtils.ts
~~~~~
~~~~~typescript
import type {
  RelativeColorHitResult,
  RelativeColorMode,
  RelativeColorQuestionData,
} from '../types';
import { hsvToHex } from './colorUtils';
import { calcDeltaEOk, getTargetDeltaEForLevel, hsvToOkLab } from './oklchUtils';

/**
 * OKLab (L: 0..1, a: -0.4..0.4, b: -0.4..0.4) -> sRGB (0..1) -> HSV (0..360, 0..100, 0..100)
 */
export function okLabToHsv(lab: [number, number, number]): [number, number, number] | null {
  const [L, a, bLab] = lab;

  // 1. OKLab -> LMS
  const lCbrt = L + 0.3963377774 * a + 0.2158037573 * bLab;
  const mCbrt = L - 0.1055613458 * a - 0.0638541728 * bLab;
  const sCbrt = L - 0.0894841775 * a - 1.291485548 * bLab;

  const lCone = lCbrt ** 3;
  const mCone = mCbrt ** 3;
  const sCone = sCbrt ** 3;

  // 2. LMS -> Linear RGB
  const rLin = +4.0767416621 * lCone - 3.3077115913 * mCone + 0.2309699292 * sCone;
  const gLin = -1.2684380046 * lCone + 2.6097574011 * mCone - 0.3413193965 * sCone;
  const bLin = -0.0041960863 * lCone - 0.7034186147 * mCone + 1.707614701 * sCone;

  // 3. Linear RGB -> sRGB
  const toSrgb = (val: number) =>
    val <= 0.0031308 ? 12.92 * val : 1.055 * Math.abs(val) ** (1 / 2.4) - 0.055;

  const rSrgb = toSrgb(rLin);
  const gSrgb = toSrgb(gLin);
  const bSrgb = toSrgb(bLin);

  // 检查是否在 RGB 色域内 (允许极小越界保护)
  if (
    rSrgb < -0.02 ||
    rSrgb > 1.02 ||
    gSrgb < -0.02 ||
    gSrgb > 1.02 ||
    bSrgb < -0.02 ||
    bSrgb > 1.02
  ) {
    return null;
  }

  const r = Math.max(0, Math.min(1, rSrgb));
  const g = Math.max(0, Math.min(1, gSrgb));
  const b = Math.max(0, Math.min(1, bSrgb));

  // 4. sRGB -> HSV
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(v * 100)];
}

/**
 * 校验 HSV 在 CSS hex 中是否有效呈现
 */
export function isHsvValid(hsv: [number, number, number]): boolean {
  try {
    const hex = hsvToHex(hsv[0], hsv[1], hsv[2]);
    return /^#[0-9A-F]{6}$/i.test(hex);
  } catch {
    return false;
  }
}

/**
 * 生成色彩矢量迁移 (Vector Shift) 题目
 */
export function generateRelativeColorQuestion(
  mode: RelativeColorMode = 'VECTOR_SHIFT',
  level: number = 5,
): RelativeColorQuestionData {
  const id = `rcq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const tolerance = getTargetDeltaEForLevel(clampedLevel) * 1.2; // 相对推移适度放宽 20% 容错

  let colorA: [number, number, number] = [0, 0, 0];
  let colorB: [number, number, number] = [0, 0, 0];
  let colorC: [number, number, number] = [0, 0, 0];
  let targetD: [number, number, number] = [0, 0, 0];

  let attempts = 0;
  while (attempts < 100) {
    attempts++;

    // 随机生成色块 A
    const hA = Math.floor(Math.random() * 360);
    const sA = Math.floor(Math.random() * 61) + 20; // 20..80
    const vA = Math.floor(Math.random() * 61) + 20; // 20..80
    colorA = [hA, sA, vA];

    // 生成受光/暗部偏移色块 B
    const hB = (hA + (Math.floor(Math.random() * 61) - 30) + 360) % 360;
    const sB = Math.max(10, Math.min(90, sA + (Math.floor(Math.random() * 41) - 20)));
    const vB = Math.max(10, Math.min(90, vA + (Math.floor(Math.random() * 41) - 20)));
    colorB = [hB, sB, vB];

    // 生成全新固有色 C
    const hC = (hA + Math.floor(Math.random() * 180) + 90) % 360; // 离 A 有一定色相距离
    const sC = Math.floor(Math.random() * 61) + 20;
    const vC = Math.floor(Math.random() * 61) + 20;
    colorC = [hC, sC, vC];

    // 计算 OKLab 矢量: v_AB = Lab(B) - Lab(A)
    const labA = hsvToOkLab(colorA[0], colorA[1], colorA[2]);
    const labB = hsvToOkLab(colorB[0], colorB[1], colorB[2]);
    const labC = hsvToOkLab(colorC[0], colorC[1], colorC[2]);

    const vAB: [number, number, number] = [
      labB[0] - labA[0],
      labB[1] - labA[1],
      labB[2] - labA[2],
    ];

    // 理论推移 D = Lab(C) + v_AB
    const labDTarget: [number, number, number] = [
      labC[0] + vAB[0],
      labC[1] + vAB[1],
      labC[2] + vAB[2],
    ];

    // 校验 D 的色域安全性
    const hsvD = okLabToHsv(labDTarget);
    if (hsvD && isHsvValid(hsvD)) {
      targetD = hsvD;
      break;
    }
  }

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    colorA,
    colorB,
    colorC,
    targetD,
    tolerance,
  };
}

/**
 * 相对色感答题判定算子 (解构欧氏色差 ΔE、矢量模长误差与方向夹角误差)
 */
export function checkRelativeColorHit(
  userHSV: [number, number, number],
  question: RelativeColorQuestionData,
): RelativeColorHitResult {
  const { colorA, colorB, colorC, targetD, tolerance } = question;

  const labA = hsvToOkLab(colorA[0], colorA[1], colorA[2]);
  const labB = hsvToOkLab(colorB[0], colorB[1], colorB[2]);
  const labC = hsvToOkLab(colorC[0], colorC[1], colorC[2]);
  const labDTarget = hsvToOkLab(targetD[0], targetD[1], targetD[2]);
  const labDUser = hsvToOkLab(userHSV[0], userHSV[1], userHSV[2]);

  // 1. 欧氏总色差 ΔE
  const deltaEError = Math.round(calcDeltaEOk(labDTarget, labDUser) * 1000) / 1000;
  const isHit = deltaEError <= tolerance;

  // 2. 基准矢量 v_AB 与 用户矢量 v_CD_user
  const vAB = [labB[0] - labA[0], labB[1] - labA[1], labB[2] - labA[2]];
  const vCDUser = [labDUser[0] - labC[0], labDUser[1] - labC[1], labDUser[2] - labC[2]];

  const magAB = Math.sqrt(vAB[0] ** 2 + vAB[1] ** 2 + vAB[2] ** 2);
  const magCDUser = Math.sqrt(vCDUser[0] ** 2 + vCDUser[1] ** 2 + vCDUser[2] ** 2);

  // 模长误差 (跨度偏离)
  const magnitudeError = Math.round(Math.abs(magCDUser - magAB) * 1000) / 1000;

  // 方向夹角误差 (色温偏向度)
  let angleErrorDeg = 0;
  if (magAB > 1e-4 && magCDUser > 1e-4) {
    const dot = vAB[0] * vCDUser[0] + vAB[1] * vCDUser[1] + vAB[2] * vCDUser[2];
    const cosTheta = Math.max(-1, Math.min(1, dot / (magAB * magCDUser)));
    angleErrorDeg = Math.round(((Math.acos(cosTheta) * 180) / Math.PI) * 10) / 10;
  }

  return {
    isHit,
    userHSV,
    targetHSV: targetD,
    deltaEError,
    magnitudeError,
    angleErrorDeg,
    tolerance,
  };
}
~~~~~

#### Acts 3: 升级数据库 `src/utils/db.ts` 至 v4

将 IndexedDB 数据库版本升级到 4，并增加相对色感的表和 CRUD 接口。

~~~~~act
write_file
src/utils/db.ts
~~~~~
~~~~~typescript
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import type {
  RelativeColorMode,
  RelativeColorProfileData,
  RelativeColorSessionData,
  RelativeColorTrialRecord,
  TrainingMode,
  TrialRecord,
} from '../types';
import { loadSettings, saveSettings } from './settings';

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
  currentLevel: number;
  bestLevel: number;
  totalTrainedCards: number;
  totalHits: number;
  updatedAt: number;
}

export interface ColorSessionData {
  id: string;
  mode: 'H' | 'S' | 'V' | 'ALL';
  type: 'training' | 'benchmark';
  startTimestamp: number;
  endTimestamp?: number;
  totalTrials: number;
  hitTrials: number;
  startLevel: number;
  endLevel: number;
}

export interface ColorTrialRecord {
  id: string;
  sessionId: string;
  mode: 'H' | 'S' | 'V' | 'ALL';
  timestamp: number;
  difficultyLevel: number;
  targetHSV: [number, number, number];
  userHSV: [number, number, number];
  isHit: boolean;
  errorValue: number;
  responseTimeMs: number;
}

export interface ColorProfileData {
  mode: 'H' | 'S' | 'V' | 'ALL';
  currentLevel: number;
  bestLevel: number;
  totalTrainedCards: number;
  totalHits: number;
  updatedAt: number;
}

export interface RelativeColorProfileData {
  mode: RelativeColorMode;
  currentLevel: number;
  bestLevel: number;
  totalTrainedCards: number;
  totalHits: number;
  updatedAt: number;
}

export interface RelativeColorSessionData {
  id: string;
  mode: RelativeColorMode;
  type: 'training' | 'benchmark';
  startTimestamp: number;
  endTimestamp?: number;
  totalTrials: number;
  hitTrials: number;
  startLevel: number;
  endLevel: number;
}

interface FormSightDBSchema extends DBSchema {
  sessions: { key: string; value: SessionData };
  records: {
    key: string;
    value: TrialRecord;
    indexes: { 'by-session': string; 'by-mode': string };
  };
  user_profiles: { key: TrainingMode; value: UserProfileData };

  color_sessions: { key: string; value: ColorSessionData };
  color_records: {
    key: string;
    value: ColorTrialRecord;
    indexes: { 'by-session': string; 'by-mode': string };
  };
  color_profiles: { key: 'H' | 'S' | 'V' | 'ALL'; value: ColorProfileData };

  // === v4 新增：相对色感练习表 ===
  relative_color_sessions: { key: string; value: RelativeColorSessionData };
  relative_color_records: {
    key: string;
    value: RelativeColorTrialRecord;
    indexes: { 'by-session': string; 'by-mode': string };
  };
  relative_color_profiles: { key: RelativeColorMode; value: RelativeColorProfileData };
}

const DB_NAME = 'StarHoppingDB';
const DB_VERSION = 4; // v4: 支持相对色感训练模块

let dbPromise: Promise<IDBPDatabase<FormSightDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<FormSightDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<FormSightDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 2) {
          if (db.objectStoreNames.contains('sessions')) db.deleteObjectStore('sessions');
          if (db.objectStoreNames.contains('records')) db.deleteObjectStore('records');
          if (db.objectStoreNames.contains('user_profiles')) db.deleteObjectStore('user_profiles');
        }

        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('records')) {
          const recordStore = db.createObjectStore('records', { keyPath: 'id' });
          recordStore.createIndex('by-session', 'sessionId');
          recordStore.createIndex('by-mode', 'mode');
        }
        if (!db.objectStoreNames.contains('user_profiles')) {
          db.createObjectStore('user_profiles', { keyPath: 'mode' });
        }

        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains('color_sessions')) {
            db.createObjectStore('color_sessions', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('color_records')) {
            const colorRecordStore = db.createObjectStore('color_records', { keyPath: 'id' });
            colorRecordStore.createIndex('by-session', 'sessionId');
            colorRecordStore.createIndex('by-mode', 'mode');
          }
          if (!db.objectStoreNames.contains('color_profiles')) {
            db.createObjectStore('color_profiles', { keyPath: 'mode' });
          }
        }

        // === v4 新增：相对色感存储表创建 ===
        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains('relative_color_sessions')) {
            db.createObjectStore('relative_color_sessions', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('relative_color_records')) {
            const relRecordStore = db.createObjectStore('relative_color_records', {
              keyPath: 'id',
            });
            relRecordStore.createIndex('by-session', 'sessionId');
            relRecordStore.createIndex('by-mode', 'mode');
          }
          if (!db.objectStoreNames.contains('relative_color_profiles')) {
            db.createObjectStore('relative_color_profiles', { keyPath: 'mode' });
          }
        }
      },
    });
  }
  return dbPromise;
}

// === 寻星 API ===
export async function saveTrialRecord(record: TrialRecord): Promise<void> {
  const db = await getDB();
  await db.put('records', record);
  await updateUserProfile(record.mode, record.isHit, record.difficultyLevel);
}

export async function saveSession(session: SessionData): Promise<void> {
  const db = await getDB();
  await db.put('sessions', session);
}

export async function getUserProfile(mode: TrainingMode): Promise<UserProfileData | null> {
  const db = await getDB();
  return (await db.get('user_profiles', mode)) || null;
}

export async function getAllUserProfiles(): Promise<Record<TrainingMode, UserProfileData | null>> {
  const db = await getDB();
  const single = (await db.get('user_profiles', 'single')) || null;
  const doubleH = (await db.get('user_profiles', 'double_h')) || null;
  const doubleR = (await db.get('user_profiles', 'double_r')) || null;
  return { single, double_h: doubleH, double_r: doubleR };
}

async function updateUserProfile(
  mode: TrainingMode,
  isHit: boolean,
  currentLevel: number,
): Promise<void> {
  const db = await getDB();
  const existing = await db.get('user_profiles', mode);
  if (!existing) {
    await db.put('user_profiles', {
      mode,
      currentLevel,
      bestLevel: currentLevel,
      totalTrainedCards: 1,
      totalHits: isHit ? 1 : 0,
      updatedAt: Date.now(),
    });
  } else {
    existing.totalTrainedCards += 1;
    if (isHit) existing.totalHits += 1;
    existing.currentLevel = currentLevel;
    if (currentLevel > existing.bestLevel) existing.bestLevel = currentLevel;
    existing.updatedAt = Date.now();
    await db.put('user_profiles', existing);
  }
}

// === 绝对色感 API ===
export async function saveColorTrialRecord(record: ColorTrialRecord): Promise<void> {
  const db = await getDB();
  await db.put('color_records', record);
  await updateColorProfile(record.mode, record.isHit, record.difficultyLevel);
}

export async function saveColorSession(session: ColorSessionData): Promise<void> {
  const db = await getDB();
  await db.put('color_sessions', session);
}

export async function getAllColorProfiles(): Promise<
  Record<'H' | 'S' | 'V' | 'ALL', ColorProfileData | null>
> {
  const db = await getDB();
  const h = (await db.get('color_profiles', 'H')) || null;
  const s = (await db.get('color_profiles', 'S')) || null;
  const v = (await db.get('color_profiles', 'V')) || null;
  const all = (await db.get('color_profiles', 'ALL')) || null;
  return { H: h, S: s, V: v, ALL: all };
}

export async function getAllColorTrialRecords(
  mode?: 'H' | 'S' | 'V' | 'ALL',
): Promise<ColorTrialRecord[]> {
  const db = await getDB();
  if (mode) return await db.getAllFromIndex('color_records', 'by-mode', mode);
  return await db.getAll('color_records');
}

async function updateColorProfile(
  mode: 'H' | 'S' | 'V' | 'ALL',
  isHit: boolean,
  currentLevel: number,
): Promise<void> {
  const db = await getDB();
  const existing = await db.get('color_profiles', mode);
  if (!existing) {
    await db.put('color_profiles', {
      mode,
      currentLevel,
      bestLevel: currentLevel,
      totalTrainedCards: 1,
      totalHits: isHit ? 1 : 0,
      updatedAt: Date.now(),
    });
  } else {
    existing.totalTrainedCards += 1;
    if (isHit) existing.totalHits += 1;
    existing.currentLevel = currentLevel;
    if (currentLevel > existing.bestLevel) existing.bestLevel = currentLevel;
    existing.updatedAt = Date.now();
    await db.put('color_profiles', existing);
  }
}

// === v4 新增：相对色感 API ===
export async function saveRelativeColorTrialRecord(
  record: RelativeColorTrialRecord,
): Promise<void> {
  const db = await getDB();
  await db.put('relative_color_records', record);
  await updateRelativeColorProfile(record.mode, record.isHit, record.difficultyLevel);
}

export async function saveRelativeColorSession(session: RelativeColorSessionData): Promise<void> {
  const db = await getDB();
  await db.put('relative_color_sessions', session);
}

export async function getAllRelativeColorProfiles(): Promise<
  Record<RelativeColorMode, RelativeColorProfileData | null>
> {
  const db = await getDB();
  const vectorShift = (await db.get('relative_color_profiles', 'VECTOR_SHIFT')) || null;
  const contrastMatch = (await db.get('relative_color_profiles', 'CONTRAST_MATCH')) || null;
  const threeToneScale = (await db.get('relative_color_profiles', 'THREE_TONE_SCALE')) || null;

  return {
    VECTOR_SHIFT: vectorShift,
    CONTRAST_MATCH: contrastMatch,
    THREE_TONE_SCALE: threeToneScale,
  };
}

export async function getAllRelativeColorTrialRecords(
  mode?: RelativeColorMode,
): Promise<RelativeColorTrialRecord[]> {
  const db = await getDB();
  if (mode) return await db.getAllFromIndex('relative_color_records', 'by-mode', mode);
  return await db.getAll('relative_color_records');
}

async function updateRelativeColorProfile(
  mode: RelativeColorMode,
  isHit: boolean,
  currentLevel: number,
): Promise<void> {
  const db = await getDB();
  const existing = await db.get('relative_color_profiles', mode);
  if (!existing) {
    await db.put('relative_color_profiles', {
      mode,
      currentLevel,
      bestLevel: currentLevel,
      totalTrainedCards: 1,
      totalHits: isHit ? 1 : 0,
      updatedAt: Date.now(),
    });
  } else {
    existing.totalTrainedCards += 1;
    if (isHit) existing.totalHits += 1;
    existing.currentLevel = currentLevel;
    if (currentLevel > existing.bestLevel) existing.bestLevel = currentLevel;
    existing.updatedAt = Date.now();
    await db.put('relative_color_profiles', existing);
  }
}

// === 全局数据统计 & 导入导出 API ===
export function formatTotalTime(ms: number): string {
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return `${days}天${hours}小时${minutes}分钟`;
}

export async function getStarHoppingTrainingTimeMs(): Promise<number> {
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

export async function getColorTrainingTimeMs(): Promise<number> {
  const db = await getDB();
  const sessions = await db.getAll('color_sessions');
  let totalMs = 0;
  for (const s of sessions) {
    if (s.endTimestamp && s.endTimestamp > s.startTimestamp) {
      totalMs += s.endTimestamp - s.startTimestamp;
    }
  }
  return totalMs;
}

export async function getRelativeColorTrainingTimeMs(): Promise<number> {
  const db = await getDB();
  const sessions = await db.getAll('relative_color_sessions');
  let totalMs = 0;
  for (const s of sessions) {
    if (s.endTimestamp && s.endTimestamp > s.startTimestamp) {
      totalMs += s.endTimestamp - s.startTimestamp;
    }
  }
  return totalMs;
}

export async function getTotalTrainingTimeMs(): Promise<number> {
  const starMs = await getStarHoppingTrainingTimeMs();
  const colorMs = await getColorTrainingTimeMs();
  const relColorMs = await getRelativeColorTrainingTimeMs();
  return starMs + colorMs + relColorMs;
}

export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  const records = await db.getAll('records');
  const profiles = await db.getAll('user_profiles');

  const colorSessions = await db.getAll('color_sessions');
  const colorRecords = await db.getAll('color_records');
  const colorProfiles = await db.getAll('color_profiles');

  const relColorSessions = await db.getAll('relative_color_sessions');
  const relColorRecords = await db.getAll('relative_color_records');
  const relColorProfiles = await db.getAll('relative_color_profiles');

  const settings = loadSettings();

  const exportObject = {
    version: DB_VERSION,
    exportAt: new Date().toISOString(),
    sessions,
    records,
    profiles,
    color_sessions: colorSessions,
    color_records: colorRecords,
    color_profiles: colorProfiles,
    relative_color_sessions: relColorSessions,
    relative_color_records: relColorRecords,
    relative_color_profiles: relColorProfiles,
    settings,
  };

  return JSON.stringify(exportObject, null, 2);
}

export async function importAllData(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    const db = await getDB();
    const tx = db.transaction(
      [
        'sessions',
        'records',
        'user_profiles',
        'color_sessions',
        'color_records',
        'color_profiles',
        'relative_color_sessions',
        'relative_color_records',
        'relative_color_profiles',
      ],
      'readwrite',
    );

    if (data.sessions) {
      for (const s of data.sessions) await tx.objectStore('sessions').put(s);
    }
    if (data.records) {
      for (const r of data.records) await tx.objectStore('records').put(r);
    }
    if (data.profiles) {
      for (const p of data.profiles) await tx.objectStore('user_profiles').put(p);
    }

    if (data.color_sessions) {
      for (const cs of data.color_sessions) await tx.objectStore('color_sessions').put(cs);
    }
    if (data.color_records) {
      for (const cr of data.color_records) await tx.objectStore('color_records').put(cr);
    }
    if (data.color_profiles) {
      for (const cp of data.color_profiles) await tx.objectStore('color_profiles').put(cp);
    }

    if (data.relative_color_sessions) {
      for (const rcs of data.relative_color_sessions)
        await tx.objectStore('relative_color_sessions').put(rcs);
    }
    if (data.relative_color_records) {
      for (const rcr of data.relative_color_records)
        await tx.objectStore('relative_color_records').put(rcr);
    }
    if (data.relative_color_profiles) {
      for (const rcp of data.relative_color_profiles)
        await tx.objectStore('relative_color_profiles').put(rcp);
    }

    await tx.done;
    if (data.settings) saveSettings(data.settings);
    return true;
  } catch (err) {
    console.error('导入寻星与色感数据失败:', err);
    return false;
  }
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    [
      'sessions',
      'records',
      'user_profiles',
      'color_sessions',
      'color_records',
      'color_profiles',
      'relative_color_sessions',
      'relative_color_records',
      'relative_color_profiles',
    ],
    'readwrite',
  );
  await tx.objectStore('sessions').clear();
  await tx.objectStore('records').clear();
  await tx.objectStore('user_profiles').clear();
  await tx.objectStore('color_sessions').clear();
  await tx.objectStore('color_records').clear();
  await tx.objectStore('color_profiles').clear();
  await tx.objectStore('relative_color_sessions').clear();
  await tx.objectStore('relative_color_records').clear();
  await tx.objectStore('relative_color_profiles').clear();
  await tx.done;
}
~~~~~

#### Acts 4: 添加单元测试 `src/utils/__tests__/relativeColorUtils.test.ts`

针对相对色感矢量平移与评分算子进行单元测试覆盖。

~~~~~act
write_file
src/utils/__tests__/relativeColorUtils.test.ts
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import {
  checkRelativeColorHit,
  generateRelativeColorQuestion,
  okLabToHsv,
} from '../relativeColorUtils';

describe('relativeColorUtils', () => {
  it('okLabToHsv - should convert OKLab back to valid HSV tuple within gamut', () => {
    // Red OKLab approx
    const labRed: [number, number, number] = [0.627, 0.224, 0.125];
    const hsv = okLabToHsv(labRed);
    expect(hsv).not.toBeNull();
    if (hsv) {
      expect(hsv[0]).toBeGreaterThanOrEqual(0);
      expect(hsv[0]).toBeLessThanOrEqual(360);
    }
  });

  it('generateRelativeColorQuestion - should generate valid 4-color question for VECTOR_SHIFT', () => {
    const question = generateRelativeColorQuestion('VECTOR_SHIFT', 5);
    expect(question.mode).toBe('VECTOR_SHIFT');
    expect(question.colorA.length).toBe(3);
    expect(question.colorB.length).toBe(3);
    expect(question.colorC.length).toBe(3);
    expect(question.targetD.length).toBe(3);
    expect(question.tolerance).toBeGreaterThan(0);
  });

  it('checkRelativeColorHit - exact target match should produce near zero delta E error', () => {
    const question = generateRelativeColorQuestion('VECTOR_SHIFT', 10);
    const hitResult = checkRelativeColorHit(question.targetD, question);

    expect(hitResult.isHit).toBe(true);
    expect(hitResult.deltaEError).toBeLessThan(0.01);
    expect(hitResult.magnitudeError).toBeLessThan(0.02);
    expect(hitResult.angleErrorDeg).toBeLessThan(5);
  });

  it('checkRelativeColorHit - large deviation in user answer should fail hit test', () => {
    const question = generateRelativeColorQuestion('VECTOR_SHIFT', 35);
    // User submits opposite hue / inverted color
    const userInverted: [number, number, number] = [
      (question.targetD[0] + 180) % 360,
      100 - question.targetD[1],
      100 - question.targetD[2],
    ];

    const hitResult = checkRelativeColorHit(userInverted, question);
    expect(hitResult.isHit).toBe(false);
    expect(hitResult.deltaEError).toBeGreaterThan(0.1);
  });
});
~~~~~

### 下一步建议
- **运行单元测试验证**: 执行 `npm run test`，确保 OKLab 矢量算子与 IndexedDB v4 数据库定义全部无误通过。
- **进行 Phase 2 开发**: 编写 `RelativeColorCanvas.tsx` UI 组件、`RelativeColorDashboard.tsx` 页面以及 `RelativeColorTrainingView.tsx` 视图，并将其无缝挂载至主页与顶层应用状态中心。
