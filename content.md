现在开始实施 **Phase 3: 宿主层解耦与类型系统净化 (Host Decoupling & Types)**。

本阶段我们将完成宿主类型系统的纯粹化，消除 `src/types/index.ts` 中的首个模块历史特化遗留，改造 `src/utils/settings.ts` 实现基于扩展包清单的零特例声明式聚合，并清理全局 `src/utils/canvas/` 中已内聚搬迁的废弃绘图文件。

## [WIP] feat: 宿主层解耦、类型系统净化与声明式设置聚合

### 用户需求
按照 FormSight v0.5 架构白皮书 Phase 3 执行：
1. **收敛 Star 领域专有类型**：在 `src/packs/star/utils/types.ts` 中内聚封装 `TrainingMode`、`QuestionData`、`HitResult`，更新 `star` 包内所有模块的引用。
2. **净化全局 `src/types/index.ts`**：删除所有特定训练模式专有类型，仅保留 `Point`、`Size`、`Rect`、`HSVTuple`、`OKLabTuple` 等纯净基础图元与数学模型。
3. **改造 `src/utils/settings.ts`**：彻底清除 `buildDefaultCardSettings()` 中针对特定 Pack（如 `star`、`color_hue`、`color_all`）的 `if-else` 硬编码特例，改由 `registry` 声明式聚合合并各 Pack 的 `defaultCardSettings`。
4. **清理全局 Canvas 目录**：删除已内聚搬迁至 `src/packs/abstraction/canvas/` 的冗余文件（`drawParticles.ts`、`drawNotanField.ts`、`drawPaletteTiles.ts`）。

### 评论
解耦宿主与净化全局类型是实现“零知识微内核（Zero-Knowledge Kernel）”的决定性一步。消除全局设置文件中的业务硬编码后，任何扩展包的增删改均无需触碰宿主代码，达成了真正的开闭原则（OCP）。

### 目标
1. 新建 `src/packs/star/utils/types.ts` 并更新 `src/packs/star/utils/index.ts`、`StarCanvas.tsx`、`questionGenerator.ts`、`hitDetection.ts`、`plugin.tsx`。
2. 重构 `src/types/index.ts`，导出纯净几何与色彩基础图元。
3. 重写 `src/utils/settings.ts` 中的 `buildDefaultCardSettings`，纯粹通过 `registry` 声明式聚合。
4. 使用 `delete_file` 删除 `src/utils/canvas/` 中的 3 个冗余绘图文件。

### 基本原理
平台微内核（Kernel）不应该知道任何具体知觉包的数据结构。通过将早期 Star 模式遗留在全局 `types/index.ts` 的类型下沉回 `packs/star`，并在宿主 `settings.ts` 中通过 `registry.getPack(card.packId)?.defaultCardSettings` 读取初始配置，使微内核与所有领域包之间形成纯粹的契约驱动。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/config #concept/executor #scope/core #scope/dx #ai/instruct #task/domain/types-and-settings #task/object/host-decoupling #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 收敛 Star 专属类型至包内并在 star 模块内部内聚

创建 `src/packs/star/utils/types.ts`，更新 `src/packs/star/utils/index.ts` 与包内引用。

~~~~~act
write_file
src/packs/star/utils/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../../types';

export type TrainingMode = 'single' | 'double_h' | 'double_r';
export type StarTrainingMode = TrainingMode;

export interface QuestionData {
  id: string;
  mode: TrainingMode;
  anchorA: Point;
  anchorC: Point | null;
  targetB: Point;
  gridStart: Point;
  difficultyLevel: number;
  gridDim: number;
  distractorPoints: Point[];

  // 衍生分析指标 (用于后续弱点分析)
  angleDegree: number; // 极角 (0~360°)
  distanceRatio: number; // 极径/距离
  rotationAngle?: number; // 整体画布旋转倾角
}
export type StarQuestionData = QuestionData;

export interface HitResult {
  isHit: boolean; // 是否选中正确的网格点
  nearestGridPoint: Point; // 用户点击位置对应的网格点
  errorDistance: number; // 点击位置与真理点的像素误差
  isWithinRange?: boolean; // 是否落在有效点击感应范围内
}
export type StarHitResult = HitResult;
~~~~~

~~~~~act
patch_file
src/packs/star/utils/index.ts
~~~~~
~~~~~old
export * from './pointMath';
export * from './gridGenerators';
export * from './hitDetection';
export * from './questionGenerator';
~~~~~
~~~~~new
export * from './types';
export * from './pointMath';
export * from './gridGenerators';
export * from './hitDetection';
export * from './questionGenerator';
~~~~~

~~~~~act
patch_file
src/packs/star/utils/hitDetection.ts
~~~~~
~~~~~old
import { evaluatePointGridHit, findNearestPointInGrid } from '../../../core/geometry/pointGrid';
import type { HitResult, Point } from '../../../types';

export { getGridMinSpacing, getDynamicDotRadius, getDynamicCrosshairMetrics };
~~~~~
~~~~~new
import { evaluatePointGridHit, findNearestPointInGrid } from '../../../core/geometry/pointGrid';
import type { Point } from '../../../types';
import type { HitResult } from './types';

export { getGridMinSpacing, getDynamicDotRadius, getDynamicCrosshairMetrics };
~~~~~

~~~~~act
patch_file
src/packs/star/utils/questionGenerator.ts
~~~~~
~~~~~old
import type { Point, QuestionData, TrainingMode } from '../../../types';
import { generateBipolarGridPoints, generatePolarGridPoints } from './gridGenerators';
import { CX, CY, DEFAULT_GRID_DIM, rotatePoint } from './pointMath';
~~~~~
~~~~~new
import type { Point } from '../../../types';
import { generateBipolarGridPoints, generatePolarGridPoints } from './gridGenerators';
import { CX, CY, DEFAULT_GRID_DIM, rotatePoint } from './pointMath';
import type { QuestionData, TrainingMode } from './types';
~~~~~

~~~~~act
patch_file
src/packs/star/views/StarCanvas.tsx
~~~~~
~~~~~old
import { useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../../components/common/PointClickCanvas';
import { drawDot } from '../../../core/canvas/drawPointGrid';
import type { HitResult, Point, QuestionData } from '../../../types';
import { CANVAS_SIZE, checkHit, getDynamicDotRadius } from '../utils/index';
~~~~~
~~~~~new
import { useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../../components/common/PointClickCanvas';
import { drawDot } from '../../../core/canvas/drawPointGrid';
import type { Point } from '../../../types';
import {
  CANVAS_SIZE,
  type HitResult,
  type QuestionData,
  checkHit,
  getDynamicDotRadius,
} from '../utils/index';
~~~~~

~~~~~act
patch_file
src/packs/star/plugin.tsx
~~~~~
~~~~~old
import type { TrainingPlugin } from '../../config/trainingPlugins';
import type { HitResult, Point, QuestionData } from '../../types';
import type { StarSettings } from '../../utils/settings';
import { type QuestionGenerateOptions, checkHit, generateQuestion } from './utils/index';
import { StarCanvas } from './views/StarCanvas';
~~~~~
~~~~~new
import type { TrainingPlugin } from '../../config/trainingPlugins';
import type { Point } from '../../types';
import type { StarSettings } from '../../utils/settings';
import {
  type HitResult,
  type QuestionData,
  type QuestionGenerateOptions,
  checkHit,
  generateQuestion,
} from './utils/index';
import { StarCanvas } from './views/StarCanvas';
~~~~~

#### Acts 2: 净化 `src/types/index.ts`

将 `src/types/index.ts` 净化为纯粹的基础几何与感知色彩数学图元。

~~~~~act
write_file
src/types/index.ts
~~~~~
~~~~~typescript
export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Point, Size {}

/** 色彩感知三元组 [H(0..360), S(0..100), V(0..100)] */
export type HSVTuple = [number, number, number];

/** OKLab 感知色彩空间坐标 [L(0..1), a(-0.4..0.4), b(-0.4..0.4)] */
export type OKLabTuple = [number, number, number];
~~~~~

#### Acts 3: 改造 `src/utils/settings.ts` 实现零特例声明式聚合

清除 `settings.ts` 中针对特定 Pack 的硬编码逻辑，纯粹基于 `registry` 声明式聚合。

~~~~~act
write_file
src/utils/settings.ts
~~~~~
~~~~~typescript
import { registry } from '../core/registry';

export type StepGranularity = 'standard' | 'fine';
export type AdaptiveMode = 'block' | 'staircase';
export type TargetingMode = 'off' | 'manual';

export interface BaseModuleSettings {
  autoNext: boolean;
  autoNextDelay: number;
  stepGranularity: StepGranularity;
  adaptiveMode: AdaptiveMode;
  targetAccuracy: number;
  blockSize: number;
  [key: string]: unknown;
}

export interface StarSettings extends BaseModuleSettings {
  gridSize?: number;
  targetingMode?: TargetingMode;
  manualTargetSectors?: number[];
}

export interface ColorSenseSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
  enableHoverColorPreview?: boolean;
  targetingMode?: TargetingMode;
  manualTargetSectors?: number[];
}

export interface RelativeColorSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
  enableHoverColorPreview?: boolean;
}

export interface NegativeSpaceSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
}

export interface AbstractionSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
}

export interface GlobalSettings {
  idleTimeout: number;
  soundEnabled: boolean;
  sliderHitMargin: number;
  showCanvasHints?: boolean;
}

export interface UserSettings {
  global: GlobalSettings;
  cards: Record<string, BaseModuleSettings>;
}

const SETTINGS_KEY = 'formsight_user_settings';

export const DEFAULT_BASE_SETTINGS: BaseModuleSettings = {
  autoNext: true,
  autoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
};

/**
 * 纯粹基于 SystemDomainRegistry 中的卡片与 Pack 声明式定义聚合初始默认配置
 * 零特例、零硬编码分支
 */
function buildDefaultCardSettings(): Record<string, BaseModuleSettings> {
  const cards: Record<string, BaseModuleSettings> = {};
  const allCards = registry.getAllCards();

  for (const card of allCards) {
    const pack = registry.getPack(card.packId);
    const packCardDefaults = pack?.defaultCardSettings?.[card.id] || {};

    const cardConfig: BaseModuleSettings = {
      ...DEFAULT_BASE_SETTINGS,
      ...packCardDefaults,
    };

    // 若声明了连续调制滑块交互，注入默认滑块偏好（若 Pack 未显式覆盖）
    if (card.tags?.interaction?.includes('continuous_mod')) {
      if (cardConfig.sliderHitMargin === undefined) {
        cardConfig.sliderHitMargin = 12;
      }
      if (cardConfig.showToleranceBand === undefined) {
        cardConfig.showToleranceBand = true;
      }
    }

    cards[card.id] = cardConfig;
  }

  return cards;
}

export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    idleTimeout: 60,
    soundEnabled: true,
    sliderHitMargin: 12,
    showCanvasHints: true,
  },
  cards: buildDefaultCardSettings(),
};

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_SETTINGS;

    const defaultCards = buildDefaultCardSettings();
    const cards: Record<string, BaseModuleSettings> = { ...defaultCards };

    if (parsed.cards && typeof parsed.cards === 'object') {
      for (const [cardId, val] of Object.entries(parsed.cards)) {
        cards[cardId] = {
          ...(cards[cardId] || DEFAULT_BASE_SETTINGS),
          ...(val as Record<string, unknown>),
        };
      }
    }

    return {
      global: { ...DEFAULT_SETTINGS.global, ...(parsed.global || {}) },
      cards,
    };
  } catch (e) {
    console.error('Failed to load user settings, fallback to default:', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save user settings:', e);
  }
}

export function getCardSettings(settings: UserSettings, cardId: string): BaseModuleSettings {
  return settings.cards[cardId] || DEFAULT_SETTINGS.cards[cardId] || DEFAULT_BASE_SETTINGS;
}
~~~~~

#### Acts 4: 清理全局 Canvas 目录下的冗余废弃文件

删除已经移入 `src/packs/abstraction/canvas/` 的 3 个全局遗留文件。

~~~~~act
delete_file
src/utils/canvas/drawParticles.ts
~~~~~

~~~~~act
delete_file
src/utils/canvas/drawNotanField.ts
~~~~~

~~~~~act
delete_file
src/utils/canvas/drawPaletteTiles.ts
~~~~~

### 下一步建议
Phase 3 的宿主层解耦、类型系统净化与零特例设置聚合已执行完毕。下一步建议推进 **Phase 4: UI 表现层与交互容器查表化重构 (UI Refactoring)**：
1. 改造 `src/components/discovery/FilterEngine.tsx`，对接 `src/config/tags.ts` 与 `useTranslation`，移除硬编码 Tag 字典。
2. 改造 `src/components/common/ModeCard.tsx`、`src/components/training/TrainingShell.tsx` 与各模态弹窗（`GlobalStatsModal`, `GlobalSettingsModal`, `WeaknessAnalyticsModal`），全面接入 `t()` 动态查表。
