好的，我已经针对你的需求制定了完整的变更计划，并在 `SettingsModal` 中补充了数据清空二次确认与自定义网格维度（2x2 ~ 5x5，默认 3x3）的设置选项。

## [WIP] feat: 支持自定义网格大小(默认3x3)与清空训练数据功能

### 用户需求
1. **删除数据**: 在训练偏好设置模态框中添加清空所有本地存储数据（历史会话、作答日志与能力看板）的功能，并提供二次确认机制。
2. **网格大小设置**: 支持配置干扰点阵网格维度为 `2x2`、`3x3`、`4x4` 或 `5x5`，且默认大小改为 `3x3`。

### 评论
这两项需求极大地提升了系统的可控性与灵活性。自定义网格维数允许用户根据个人的视觉识别习惯调节题目的密集程度，降低了初学者的门槛；而提供数据清空能力则是完备应用不可或缺的数据管理功能。

### 目标
1. 在 `settings.ts` 中新增 `gridSize` 字段，默认值设为 `3`。
2. 在 `db.ts` 中新增 `clearAllData()` 方法，用于原子化清空 IDB 中的三大 Object Store。
3. 重构 `geometry.ts` 中的网格点生成算法，使其完美自适应 `2x2` 到 `5x5` 任意网格维度。
4. 在 `SettingsModal.tsx` 交互界面中增加“网格维数设置”与“危险区：清空所有数据”控制组件。
5. 在 `TrainingView.tsx` 中绑定设置中的 `gridSize` 动态发题，并在 `app.tsx` 中联动数据刷新。

### 基本原理
- **网格算法通用化**: 将 `geometry.ts` 原先针对 5x5 网格硬编码的 `rIdx` / `aIdx` 从 `-2..2` 迭代循环改为按 `0..gridDim-1` 偏移计算，使得真理点 $B$ 在 $N \times N$ 网格中均能精准定点。
- **数据清空**: 利用 IndexedDB 事务原子清空 `sessions`、`records` 及 `user_profiles` 数据表，并在成功后触发主视图数据看板重置。

### 标签
#intent/build #flow/ready #priority/high #comp/ui #concept/config #scope/ux #ai/instruct #task/domain/settings #task/object/grid-size-and-data-cleanup #task/action/feature-implementation #task/state/begin

---

### Script

#### Acts 1: 更新设置类型与默认值 (`settings.ts`)

在 `UserSettings` 接口及 `DEFAULT_SETTINGS` 中增加 `gridSize` 配置项，默认值为 `3`（即 3x3）。

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
  idleTimeout: number; // 闲置自动暂停计时时长 (秒)，0 表示关闭
}

const SETTINGS_KEY = 'star_hopping_user_settings';

export const DEFAULT_SETTINGS: UserSettings = {
  autoNext: true,
  autoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
  targetingMode: 'off',
  manualTargetSectors: [],
  idleTimeout: 60,
};
~~~~~
~~~~~typescript.new
  idleTimeout: number; // 闲置自动暂停计时时长 (秒)，0 表示关闭
  gridSize: number; // 网格维数 (2, 3, 4, 5)
}

const SETTINGS_KEY = 'star_hopping_user_settings';

export const DEFAULT_SETTINGS: UserSettings = {
  autoNext: true,
  autoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
  targetingMode: 'off',
  manualTargetSectors: [],
  idleTimeout: 60,
  gridSize: 3,
};
~~~~~

#### Acts 2: 在数据库工具中新增清空数据接口 (`db.ts`)

在 `db.ts` 中提供 `clearAllData` 方法，通过 IDB 事务清空所有数据表。

~~~~~act
patch_file
src/utils/db.ts
~~~~~
~~~~~typescript.old
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
~~~~~typescript.new
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

// === API 9: 清空所有本地数据 ===
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['sessions', 'records', 'user_profiles'], 'readwrite');
  await tx.objectStore('sessions').clear();
  await tx.objectStore('records').clear();
  await tx.objectStore('user_profiles').clear();
  await tx.done;
}
~~~~~

#### Acts 3: 重构几何网格生成逻辑 (`geometry.ts`)

调整默认网格尺寸为 3，并将 `generatePolarGridPoints` 和 `generateBipolarGridPoints` 改为支持动态 `gridDim` 参数。

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~typescript.old
export const CANVAS_SIZE = 500;
export const CX = CANVAS_SIZE / 2; // 250
export const CY = CANVAS_SIZE / 2; // 250
export const DEFAULT_GRID_DIM = 5; // 5x5 网格
~~~~~
~~~~~typescript.new
export const CANVAS_SIZE = 500;
export const CX = CANVAS_SIZE / 2; // 250
export const CY = CANVAS_SIZE / 2; // 250
export const DEFAULT_GRID_DIM = 3; // 默认 3x3 网格
~~~~~

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~typescript.old
export function generatePolarGridPoints(
  anchorA: Point,
  targetB: Point,
  level: number,
  targetRow = Math.floor(Math.random() * 5),
  targetCol = Math.floor(Math.random() * 5),
): Point[] {
  const dx = targetB.x - anchorA.x;
  const dy = targetB.y - anchorA.y;
  const R = Math.sqrt(dx * dx + dy * dy);
  const theta = Math.atan2(dy, dx);

  // 定义 Level 1 的最大间距与 Level 35 的最小间距
  const S_MAX = 25;
  const S_MIN = 3.5;

  // 线性计算当前 Level 对应的目标像素间距
  const t = (Math.max(1, Math.min(level, 35)) - 1) / 34; // 0 to 1
  const S = S_MAX - t * (S_MAX - S_MIN);

  // 反推角度步长: theta = 弧长(S) / 半径(R)
  const maxAngleStepRad = (15 * Math.PI) / 180;
  const angleStepRad = Math.min(S / R, maxAngleStepRad);

  // 半径增量直接使用计算出的绝对像素距离
  const rStep = S;

  // 将 targetRow (0..4) 与 targetCol (0..4) 映射为相对偏移 (-2..2)
  const r0 = targetRow - 2;
  const a0 = targetCol - 2;

  const points: Point[] = [];
  for (let rIdx = -2; rIdx <= 2; rIdx++) {
    for (let aIdx = -2; aIdx <= 2; aIdx++) {
      const curR = R + (rIdx - r0) * rStep;
      const curTheta = theta + (aIdx - a0) * angleStepRad;
      const x = Math.round((anchorA.x + curR * Math.cos(curTheta)) * 100) / 100;
      const y = Math.round((anchorA.y + curR * Math.sin(curTheta)) * 100) / 100;
      points.push({ x, y });
    }
  }
  return points;
}
~~~~~
~~~~~typescript.new
export function generatePolarGridPoints(
  anchorA: Point,
  targetB: Point,
  level: number,
  gridDim = DEFAULT_GRID_DIM,
  targetRow = Math.floor(Math.random() * gridDim),
  targetCol = Math.floor(Math.random() * gridDim),
): Point[] {
  const dx = targetB.x - anchorA.x;
  const dy = targetB.y - anchorA.y;
  const R = Math.sqrt(dx * dx + dy * dy);
  const theta = Math.atan2(dy, dx);

  // 定义 Level 1 的最大间距与 Level 35 的最小间距
  const S_MAX = 25;
  const S_MIN = 3.5;

  // 线性计算当前 Level 对应的目标像素间距
  const t = (Math.max(1, Math.min(level, 35)) - 1) / 34; // 0 to 1
  const S = S_MAX - t * (S_MAX - S_MIN);

  // 反推角度步长: theta = 弧长(S) / 半径(R)
  const maxAngleStepRad = (15 * Math.PI) / 180;
  const angleStepRad = Math.min(S / R, maxAngleStepRad);

  // 半径增量直接使用计算出的绝对像素距离
  const rStep = S;

  const points: Point[] = [];
  for (let rIdx = 0; rIdx < gridDim; rIdx++) {
    for (let aIdx = 0; aIdx < gridDim; aIdx++) {
      const curR = R + (rIdx - targetRow) * rStep;
      const curTheta = theta + (aIdx - targetCol) * angleStepRad;
      const x = Math.round((anchorA.x + curR * Math.cos(curTheta)) * 100) / 100;
      const y = Math.round((anchorA.y + curR * Math.sin(curTheta)) * 100) / 100;
      points.push({ x, y });
    }
  }
  return points;
}
~~~~~

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~typescript.old
export function generateBipolarGridPoints(
  anchorA: Point,
  anchorC: Point,
  targetB: Point,
  level: number,
  targetRow = Math.floor(Math.random() * 5),
  targetCol = Math.floor(Math.random() * 5),
): Point[] {
  const alpha = Math.atan2(targetB.y - anchorA.y, targetB.x - anchorA.x);
  const beta = Math.atan2(targetB.y - anchorC.y, targetB.x - anchorC.x);

  const Ra = calcDistance(anchorA, targetB);
  const Rc = calcDistance(anchorC, targetB);

  // 双锚点交点可能会因夹角产生斜向拉伸拉长，所以最大间距稍微收敛一点
  const S_MAX = 20;
  const S_MIN = 3.5;

  const t = (Math.max(1, Math.min(level, 35)) - 1) / 34; // 0 to 1
  const S = S_MAX - t * (S_MAX - S_MIN);

  // 反推 alpha 和 beta 的独立角度步长
  const maxAngleStepRad = (15 * Math.PI) / 180;
  const alphaStepRad = Math.min(S / Ra, maxAngleStepRad);
  const betaStepRad = Math.min(S / Rc, maxAngleStepRad);

  const a0 = targetRow - 2;
  const c0 = targetCol - 2;

  const points: Point[] = [];

  for (let aIdx = -2; aIdx <= 2; aIdx++) {
    for (let cIdx = -2; cIdx <= 2; cIdx++) {
      const alphaI = alpha + (aIdx - a0) * alphaStepRad;
      const betaJ = beta + (cIdx - c0) * betaStepRad;

      const v1x = Math.cos(alphaI);
      const v1y = Math.sin(alphaI);
      const v2x = Math.cos(betaJ);
      const v2y = Math.sin(betaJ);

      const dx = anchorC.x - anchorA.x;
      const dy = anchorC.y - anchorA.y;
      const det = v1x * v2y - v1y * v2x;

      if (Math.abs(det) < 1e-5) {
        // 退化近似退回 TargetB 偏移
        points.push({
          x: Math.round((targetB.x + (aIdx - a0) * S) * 100) / 100,
          y: Math.round((targetB.y + (cIdx - c0) * S) * 100) / 100,
        });
      } else {
        const t1 = (dx * v2y - dy * v2x) / det;
        const x = Math.round((anchorA.x + t1 * v1x) * 100) / 100;
        const y = Math.round((anchorA.y + t1 * v1y) * 100) / 100;
        points.push({ x, y });
      }
    }
  }
  return points;
}
~~~~~
~~~~~typescript.new
export function generateBipolarGridPoints(
  anchorA: Point,
  anchorC: Point,
  targetB: Point,
  level: number,
  gridDim = DEFAULT_GRID_DIM,
  targetRow = Math.floor(Math.random() * gridDim),
  targetCol = Math.floor(Math.random() * gridDim),
): Point[] {
  const alpha = Math.atan2(targetB.y - anchorA.y, targetB.x - anchorA.x);
  const beta = Math.atan2(targetB.y - anchorC.y, targetB.x - anchorC.x);

  const Ra = calcDistance(anchorA, targetB);
  const Rc = calcDistance(anchorC, targetB);

  // 双锚点交点可能会因夹角产生斜向拉伸拉长，所以最大间距稍微收敛一点
  const S_MAX = 20;
  const S_MIN = 3.5;

  const t = (Math.max(1, Math.min(level, 35)) - 1) / 34; // 0 to 1
  const S = S_MAX - t * (S_MAX - S_MIN);

  // 反推 alpha 和 beta 的独立角度步长
  const maxAngleStepRad = (15 * Math.PI) / 180;
  const alphaStepRad = Math.min(S / Ra, maxAngleStepRad);
  const betaStepRad = Math.min(S / Rc, maxAngleStepRad);

  const points: Point[] = [];

  for (let aIdx = 0; aIdx < gridDim; aIdx++) {
    for (let cIdx = 0; cIdx < gridDim; cIdx++) {
      const alphaI = alpha + (aIdx - targetRow) * alphaStepRad;
      const betaJ = beta + (cIdx - targetCol) * betaStepRad;

      const v1x = Math.cos(alphaI);
      const v1y = Math.sin(alphaI);
      const v2x = Math.cos(betaJ);
      const v2y = Math.sin(betaJ);

      const dx = anchorC.x - anchorA.x;
      const dy = anchorC.y - anchorA.y;
      const det = v1x * v2y - v1y * v2x;

      if (Math.abs(det) < 1e-5) {
        // 退化近似退回 TargetB 偏移
        points.push({
          x: Math.round((targetB.x + (aIdx - targetRow) * S) * 100) / 100,
          y: Math.round((targetB.y + (cIdx - targetCol) * S) * 100) / 100,
        });
      } else {
        const t1 = (dx * v2y - dy * v2x) / det;
        const x = Math.round((anchorA.x + t1 * v1x) * 100) / 100;
        const y = Math.round((anchorA.y + t1 * v1y) * 100) / 100;
        points.push({ x, y });
      }
    }
  }
  return points;
}
~~~~~

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~typescript.old
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
 * 随机生成算法：根据模式与难度 Level 生成一道题目数据及非线性干扰点阵
 */
export function generateQuestion(
  mode: TrainingMode,
  difficultyLevel: number,
  options?: QuestionGenerateOptions,
): QuestionData {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = DEFAULT_GRID_DIM;
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

    const distractorPoints = generatePolarGridPoints(
      anchorA,
      targetB,
      difficultyLevel,
      randomRow,
      randomCol,
    );
~~~~~
~~~~~typescript.new
export interface QuestionGenerateOptions {
  targetingMode?: 'off' | 'auto' | 'manual';
  targetSectors?: number[]; // [0~7]
  gridSize?: number;
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
 * 随机生成算法：根据模式与难度 Level 生成一道题目数据及非线性干扰点阵
 */
export function generateQuestion(
  mode: TrainingMode,
  difficultyLevel: number,
  options?: QuestionGenerateOptions,
): QuestionData {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = options?.gridSize ?? DEFAULT_GRID_DIM;
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

    const distractorPoints = generatePolarGridPoints(
      anchorA,
      targetB,
      difficultyLevel,
      gridDim,
      randomRow,
      randomCol,
    );
~~~~~

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~typescript.old
  const distractorPoints = generateBipolarGridPoints(
    anchorA,
    anchorC,
    targetB,
    difficultyLevel,
    randomRow,
    randomCol,
  );
~~~~~
~~~~~typescript.new
  const distractorPoints = generateBipolarGridPoints(
    anchorA,
    anchorC,
    targetB,
    difficultyLevel,
    gridDim,
    randomRow,
    randomCol,
  );
~~~~~

#### Acts 4: 在设置弹窗中增加网格维度与清空数据 UI (`SettingsModal.tsx`)

在偏好设置组件中增加“干扰点网格大小”选择按钮和底部的“删除所有数据”按钮（含二次确认弹窗）。

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
import { Crosshair, Flame, Sliders, Target, ToggleLeft, ToggleRight, X } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { type TargetingMode, type UserSettings, saveSettings } from '../utils/settings';

const SECTOR_NAMES = [
  '正东(0°)',
  '东北(45°)',
  '正北(90°)',
  '西北(135°)',
  '正西(180°)',
  '西南(225°)',
  '正南(270°)',
  '东南(315°)',
];

interface SettingsModalProps {
  settings: UserSettings;
  onClose: () => void;
  onSave: (newSettings: UserSettings) => void;
}

export function SettingsModal({ settings, onClose, onSave }: SettingsModalProps) {
  const [current, setCurrent] = useState<UserSettings>({ ...settings });
~~~~~
~~~~~typescript.new
import { Crosshair, Flame, Sliders, Target, ToggleLeft, ToggleRight, Trash2, X } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { clearAllData } from '../utils/db';
import { type TargetingMode, type UserSettings, saveSettings } from '../utils/settings';

const SECTOR_NAMES = [
  '正东(0°)',
  '东北(45°)',
  '正北(90°)',
  '西北(135°)',
  '正西(180°)',
  '西南(225°)',
  '正南(270°)',
  '东南(315°)',
];

interface SettingsModalProps {
  settings: UserSettings;
  onClose: () => void;
  onSave: (newSettings: UserSettings) => void;
  onDataCleared?: () => void;
}

export function SettingsModal({ settings, onClose, onSave, onDataCleared }: SettingsModalProps) {
  const [current, setCurrent] = useState<UserSettings>({ ...settings });
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
  const handleIdleTimeoutChange = (timeout: number) => {
    setCurrent((prev) => ({ ...prev, idleTimeout: timeout }));
  };

  const handleConfirm = () => {
    saveSettings(current);
    onSave(current);
    onClose();
  };
~~~~~
~~~~~typescript.new
  const handleIdleTimeoutChange = (timeout: number) => {
    setCurrent((prev) => ({ ...prev, idleTimeout: timeout }));
  };

  const handleGridSizeChange = (size: number) => {
    setCurrent((prev) => ({ ...prev, gridSize: size }));
  };

  const handleClearData = async () => {
    if (confirm('⚠️ 确定要清空所有训练日志、历史会话和能力看板数据吗？此操作无法撤销！')) {
      await clearAllData();
      alert('所有训练数据已清空。');
      onDataCleared?.();
      onClose();
    }
  };

  const handleConfirm = () => {
    saveSettings(current);
    onSave(current);
    onClose();
  };
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
          {/* 无操作闲置暂停计时 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">无操作闲置暂停计时</div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '关闭', value: 0 },
                { label: '30秒', value: 30 },
                { label: '1分钟', value: 60 },
                { label: '2分钟', value: 120 },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => handleIdleTimeoutChange(opt.value)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    (current.idleTimeout ?? 60) === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 专项靶向强化训练设置 */}
~~~~~
~~~~~typescript.new
          {/* 无操作闲置暂停计时 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">无操作闲置暂停计时</div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '关闭', value: 0 },
                { label: '30秒', value: 30 },
                { label: '1分钟', value: 60 },
                { label: '2分钟', value: 120 },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => handleIdleTimeoutChange(opt.value)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    (current.idleTimeout ?? 60) === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 干扰点网格大小 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">干扰点网格大小</div>
            <div className="grid grid-cols-4 gap-1.5">
              {[2, 3, 4, 5].map((size) => (
                <button
                  type="button"
                  key={size}
                  onClick={() => handleGridSizeChange(size)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    (current.gridSize ?? 3) === size
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {size}x{size}
                </button>
              ))}
            </div>
          </div>

          {/* 专项靶向强化训练设置 */}
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}
~~~~~
~~~~~typescript.new
          {/* 危险操作区：删除数据 */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-rose-600">删除所有数据</div>
              <div className="text-[11px] text-slate-400">清空本地存储的全部练习记录与能力看板</div>
            </div>
            <button
              type="button"
              onClick={handleClearData}
              className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              清空数据
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}
~~~~~

#### Acts 5: 训练视图与 App 主入口集成网格大小与数据清理 (`TrainingView.tsx` & `app.tsx`)

使得 `TrainingView` 在生成初始题目和后续题目时传入用户设置的 `gridSize`，并在 `App.tsx` 中向 `SettingsModal` 绑定清空数据回调函数。

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
  // 辅助：获取发题配置选项
  const getGenerateOptions = (): QuestionGenerateOptions => {
    return {
      targetingMode: settings.targetingMode,
      targetSectors:
        settings.targetingMode === 'manual'
          ? settings.manualTargetSectors
          : targetSectorsRef.current,
      gridSize: settings.gridSize,
    };
  };

  const [question, setQuestion] = useState<QuestionData>(() =>
    generateQuestion(mode, initialLevel, {
      targetingMode: settings.targetingMode,
      targetSectors: settings.manualTargetSectors,
      gridSize: settings.gridSize,
    }),
  );
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(newSettings) => setSettings(newSettings)}
        />
      )}
~~~~~
~~~~~typescript.new
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(newSettings) => setSettings(newSettings)}
          onDataCleared={refreshProfiles}
        />
      )}
~~~~~

### 下一步建议
- **格式与语法验证**: 修改完成后可以运行 `npm run check` 或 `pnpm check` 验证代码类型与 Lint 规范。
- **自定义测试**: 在前端尝试切换不同的网格大小（如 2x2、3x3），观察画布右侧点击网格点的视觉体验，并验证“清空数据”按钮是否正常清理主界面与数据库中的统计日志。
