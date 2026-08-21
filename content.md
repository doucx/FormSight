收到，我已为你规划了针对死代码清理、抽离复用 `createShuffledChoices` 替代重复内联代码、消除底层与领域间反向依赖的重构实施方案。

## [WIP] refactor: 复用洗牌算法并清理死代码与反向依赖层级

### 用户需求
1. 在各个题目生成器中复用 `src/core/math/mathUtils.ts` 的 `createShuffledChoices` 泛型函数，替换各处内联的手写 Fisher-Yates 洗牌逻辑。
2. 清理审计中发现的死代码（包括未使用的导出、死参数 `_getQuestionLevel`、组件死 Props `_userAnswer`、冗余类型别名、多余包装函数）。
3. 解除 `core` 对 `domains/star` 的反向依赖以及领域间不必要的基础算法横向耦合（如将 `getDistractorDistanceForLevel` 归位至 `core/color`）。

### 评论
这些重构将提升核心代码库的 DRY 原则符合度，消除冗余计算和死代码包袱，并理顺 Core 与 Domain 之间的单向依赖拓扑，有助于后续扩展新题型与构建独立插件包。

### 目标
1. 在 `abstraction/utils/questionGenerator.ts` 与 `relative_color/utils/generators.ts` 中全面接入 `createShuffledChoices`。
2. 将 `getDistractorDistanceForLevel` 统一收拢到 `src/core/color/oklchUtils.ts`，解除 `abstraction` 对 `relative_color` 的跨模块私有引用。
3. 将点阵几何渲染所需的度量计算函数归位到 `src/core/canvas/drawPointGrid.ts`，解除 `core` 对 `domains/star` 的反向依赖。
4. 清理 `useTrainingSession` 中的死参数 `getQuestionLevel` 及 `GenericTrainingView` 中的冗余传参。
5. 移除 `colorUtils.ts`、`planStorage.ts`、`db/schema.ts`、`contracts.ts` 中的未引用导出与遗留别名。

### 基本原理
1. 通过将共用的通用色彩感知与点阵数学工具沉淀在 `src/core/`，让 `domains/*` 仅保持单向依赖 `core`。
2. 使用类型安全且经测试的泛型 `createShuffledChoices<T>` 一次性处理随机洗牌与真理索引定位，避免分散重复的易错索引循环。
3. 精简组件与 Hook 的入参契约，提高类型提示清晰度与运行时精简性。

### 标签
#intent/refine #flow/ready #priority/high #comp/core #comp/runtime #concept/state #scope/core #scope/dx #ai/refine #task/domain/refactoring #task/object/dead-code-and-layering #task/action/cleanup #task/state/begin #task/status/active

---

### Script

#### Acts 1: 将跨领域公用色彩度量算法下沉至 Core 并清理死包装函数

我们将 `getDistractorDistanceForLevel` 提炼至 `oklchUtils.ts`，并清理 `colorUtils.ts` 与 `contracts.ts` 中的冗余导出。

~~~~~act
patch_file
src/core/color/oklchUtils.ts
~~~~~
~~~~~typescript
function rotateVector(
  v: [number, number, number],
  axis: [number, number, number],
  theta: number,
): [number, number, number] {
  const [vx, vy, vz] = v;
  const [kx, ky, kz] = axis;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const dot = kx * vx + ky * vy + kz * vz;
  const crossX = ky * vz - kz * vy;
  const crossY = kz * vx - kx * vz;
  const crossZ = kx * vy - ky * vx;

  return [
    vx * cosT + crossX * sinT + kx * dot * (1 - cosT),
    vy * cosT + crossY * sinT + ky * dot * (1 - cosT),
    vz * cosT + crossZ * sinT + kz * dot * (1 - cosT),
  ];
}

/**
 * 在 OKLab 色彩空间中以 targetLab 为基准生成 3 个正四面体等距分布的干扰色 (HSV 格式)
 * @param targetLab 基准目标色的 OKLab 坐标
 * @param R 目标感知色差半径 (ΔE)
 * @returns 3 个干扰色 HSV 数组
 */
export function generateTetrahedralDistractors(
  targetLab: [number, number, number],
  R: number,
): [number, number, number][] {
  const baseV1: [number, number, number] = [1, 0, 0];
  const baseV2: [number, number, number] = [0.5, Math.sqrt(3) / 2, 0];
  const baseV3: [number, number, number] = [0.5, Math.sqrt(3) / 6, Math.sqrt(2 / 3)];

  let bestDistractors: [number, number, number][] = [];
  let bestValidCount = -1;

  for (let attempt = 0; attempt < 30; attempt++) {
    const axis = getRandomAxis();
    const theta = Math.random() * Math.PI * 2;

    const rotV1 = rotateVector(baseV1, axis, theta);
    const rotV2 = rotateVector(baseV2, axis, theta);
    const rotV3 = rotateVector(baseV3, axis, theta);

    const lab1: [number, number, number] = [
      targetLab[0] + rotV1[0] * R,
      targetLab[1] + rotV1[1] * R,
      targetLab[2] + rotV1[2] * R,
    ];
    const lab2: [number, number, number] = [
      targetLab[0] + rotV2[0] * R,
      targetLab[1] + rotV2[1] * R,
      targetLab[2] + rotV2[2] * R,
    ];
    const lab3: [number, number, number] = [
      targetLab[0] + rotV3[0] * R,
      targetLab[1] + rotV3[1] * R,
      targetLab[2] + rotV3[2] * R,
    ];

    const hsv1 = okLabToHsv(lab1);
    const hsv2 = okLabToHsv(lab2);
    const hsv3 = okLabToHsv(lab3);

    const rep1 = hsvToOkLab(...hsv1);
    const rep2 = hsvToOkLab(...hsv2);
    const rep3 = hsvToOkLab(...hsv3);

    const dist1 = calcDeltaEOk(targetLab, rep1);
    const dist2 = calcDeltaEOk(targetLab, rep2);
    const dist3 = calcDeltaEOk(targetLab, rep3);

    let validCount = 0;
    if (dist1 >= R * 0.7) validCount++;
    if (dist2 >= R * 0.7) validCount++;
    if (dist3 >= R * 0.7) validCount++;

    if (validCount > bestValidCount) {
      bestValidCount = validCount;
      bestDistractors = [hsv1, hsv2, hsv3];
    }

    if (validCount === 3) break;
  }

  return bestDistractors;
}
~~~~~
~~~~~typescript
function rotateVector(
  v: [number, number, number],
  axis: [number, number, number],
  theta: number,
): [number, number, number] {
  const [vx, vy, vz] = v;
  const [kx, ky, kz] = axis;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const dot = kx * vx + ky * vy + kz * vz;
  const crossX = ky * vz - kz * vy;
  const crossY = kz * vx - kx * vz;
  const crossZ = kx * vy - ky * vx;

  return [
    vx * cosT + crossX * sinT + kx * dot * (1 - cosT),
    vy * cosT + crossY * sinT + ky * dot * (1 - cosT),
    vz * cosT + crossZ * sinT + kz * dot * (1 - cosT),
  ];
}

/**
 * 根据难度等级 (Level 1..35) 计算干扰项的绝对 OKLab 距离 Radius R
 */
export function getDistractorDistanceForLevel(level: number): number {
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34;
  const maxR = 0.14;
  const minR = 0.015;
  return maxR * (minR / maxR) ** t;
}

/**
 * 在 OKLab 色彩空间中以 targetLab 为基准生成 3 个正四面体等距分布的干扰色 (HSV 格式)
 * @param targetLab 基准目标色的 OKLab 坐标
 * @param R 目标感知色差半径 (ΔE)
 * @returns 3 个干扰色 HSV 数组
 */
export function generateTetrahedralDistractors(
  targetLab: [number, number, number],
  R: number,
): [number, number, number][] {
  const baseV1: [number, number, number] = [1, 0, 0];
  const baseV2: [number, number, number] = [0.5, Math.sqrt(3) / 2, 0];
  const baseV3: [number, number, number] = [0.5, Math.sqrt(3) / 6, Math.sqrt(2 / 3)];

  let bestDistractors: [number, number, number][] = [];
  let bestValidCount = -1;

  for (let attempt = 0; attempt < 30; attempt++) {
    const axis = getRandomAxis();
    const theta = Math.random() * Math.PI * 2;

    const rotV1 = rotateVector(baseV1, axis, theta);
    const rotV2 = rotateVector(baseV2, axis, theta);
    const rotV3 = rotateVector(baseV3, axis, theta);

    const lab1: [number, number, number] = [
      targetLab[0] + rotV1[0] * R,
      targetLab[1] + rotV1[1] * R,
      targetLab[2] + rotV1[2] * R,
    ];
    const lab2: [number, number, number] = [
      targetLab[0] + rotV2[0] * R,
      targetLab[1] + rotV2[1] * R,
      targetLab[2] + rotV2[2] * R,
    ];
    const lab3: [number, number, number] = [
      targetLab[0] + rotV3[0] * R,
      targetLab[1] + rotV3[1] * R,
      targetLab[2] + rotV3[2] * R,
    ];

    const hsv1 = okLabToHsv(lab1);
    const hsv2 = okLabToHsv(lab2);
    const hsv3 = okLabToHsv(lab3);

    const rep1 = hsvToOkLab(...hsv1);
    const rep2 = hsvToOkLab(...hsv2);
    const rep3 = hsvToOkLab(...hsv3);

    const dist1 = calcDeltaEOk(targetLab, rep1);
    const dist2 = calcDeltaEOk(targetLab, rep2);
    const dist3 = calcDeltaEOk(targetLab, rep3);

    let validCount = 0;
    if (dist1 >= R * 0.7) validCount++;
    if (dist2 >= R * 0.7) validCount++;
    if (dist3 >= R * 0.7) validCount++;

    if (validCount > bestValidCount) {
      bestValidCount = validCount;
      bestDistractors = [hsv1, hsv2, hsv3];
    }

    if (validCount === 3) break;
  }

  return bestDistractors;
}
~~~~~

~~~~~act
patch_file
src/core/color/colorUtils.ts
~~~~~
~~~~~typescript
  return `#${rHex}${gHex}${bHex}`.toUpperCase();
}

/**
 * 根据 Level (1..35) 计算允许的容错阈值（感知色差 ΔE）
 */
export function getToleranceForLevel(_mode: ColorMode, level: number): number {
  return getTargetDeltaEForLevel(level);
}

export interface ColorQuestionGenerateOptions {
~~~~~
~~~~~typescript
  return `#${rHex}${gHex}${bHex}`.toUpperCase();
}

export interface ColorQuestionGenerateOptions {
~~~~~

~~~~~act
patch_file
src/core/contracts.ts
~~~~~
~~~~~typescript
export interface DomainManifest {
  domain: TrainingDomain;
  meta: DomainMeta;
  cards: CardDefinition[];
  trainingPlugin: AnyTrainingPlugin;
  analyticsPlugins?: Record<string, CardAnalyticsPlugin>;
  defaultCardSettings?: Record<string, Partial<BaseModuleSettings>>;
}

/**
 * 向后兼容的 DomainPlugin 别名
 */
export type DomainPlugin = DomainManifest;
~~~~~
~~~~~typescript
export interface DomainManifest {
  domain: TrainingDomain;
  meta: DomainMeta;
  cards: CardDefinition[];
  trainingPlugin: AnyTrainingPlugin;
  analyticsPlugins?: Record<string, CardAnalyticsPlugin>;
  defaultCardSettings?: Record<string, Partial<BaseModuleSettings>>;
}
~~~~~

#### Acts 2: 解除 Core 对 Domain 的反向依赖 (点阵几何渲染与度量)

将 `drawPointGrid.ts` 中的动态十字准星与圆点尺寸计算收拢到 Core Canvas，消除对 `domains/star` 的反向导入。

~~~~~act
patch_file
src/core/canvas/drawPointGrid.ts
~~~~~
~~~~~typescript
import {
  getDynamicCrosshairMetrics,
  getDynamicDotRadius,
} from '../../domains/star/utils/hitDetection';
import type { Point } from '../../types';

/**
 * 绘制单个圆点
 */
export function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  radius: number,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}
~~~~~
~~~~~typescript
import type { Point } from '../../types';

/**
 * 计算点阵中任意两点间的最小欧氏间距
 */
export function getGridMinSpacing(gridPoints: Point[]): number {
  if (!gridPoints || gridPoints.length < 2) return 25;
  let minDist = Number.MAX_VALUE;
  for (let i = 0; i < gridPoints.length; i++) {
    for (let j = i + 1; j < gridPoints.length; j++) {
      const dx = gridPoints[i].x - gridPoints[j].x;
      const dy = gridPoints[i].y - gridPoints[j].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0 && d < minDist) {
        minDist = d;
      }
    }
  }
  return minDist === Number.MAX_VALUE ? 25 : minDist;
}

/**
 * 根据点阵间距动态计算渲染圆点的半径
 */
export function getDynamicDotRadius(gridPoints: Point[]): number {
  const minDist = getGridMinSpacing(gridPoints);
  return Math.max(1.2, Math.min(3.5, minDist * 0.25));
}

/**
 * 根据点阵间距动态计算十字准星的臂长与线宽
 */
export function getDynamicCrosshairMetrics(gridPoints: Point[]): {
  size: number;
  lineWidth: number;
} {
  const minDist = getGridMinSpacing(gridPoints);
  const size = Math.max(3.5, Math.min(12, minDist * 0.42));
  const lineWidth = Math.max(1, Math.min(2, minDist * 0.08));
  return { size, lineWidth };
}

/**
 * 绘制单个圆点
 */
export function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  radius: number,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}
~~~~~

~~~~~act
patch_file
src/domains/star/utils/hitDetection.ts
~~~~~
~~~~~typescript
import type { HitResult, Point } from '../../../types';
import { calcDistance } from './pointMath';

/**
 * 寻找最近的网格点及感应范围判定
 */
export function findNearestGridPoint(
  clickPoint: Point,
  gridPoints: Point[],
): { nearestPoint: Point; minDistance: number; isWithinRange: boolean } {
  if (!gridPoints || gridPoints.length === 0) {
    return { nearestPoint: clickPoint, minDistance: 0, isWithinRange: false };
  }

  let nearestPoint = gridPoints[0];
  let minDistance = calcDistance(clickPoint, nearestPoint);

  for (let i = 1; i < gridPoints.length; i++) {
    const dist = calcDistance(clickPoint, gridPoints[i]);
    if (dist < minDistance) {
      minDistance = dist;
      nearestPoint = gridPoints[i];
    }
  }

  let minNeighborDist = Number.MAX_VALUE;
  for (let i = 0; i < Math.min(5, gridPoints.length - 1); i++) {
    const d = calcDistance(gridPoints[i], gridPoints[i + 1]);
    if (d > 0 && d < minNeighborDist) minNeighborDist = d;
  }
  const maxRadius = Math.max(20, minNeighborDist * 0.75);

  return {
    nearestPoint,
    minDistance,
    isWithinRange: minDistance <= maxRadius,
  };
}

/**
 * 点击作答 Hit Detection
 */
export function checkHit(clickPoint: Point, targetB: Point, gridPoints: Point[]): HitResult {
  const { nearestPoint, isWithinRange } = findNearestGridPoint(clickPoint, gridPoints);
  const errorDistance = calcDistance(nearestPoint, targetB);
  const isHit = errorDistance < 0.5;

  return {
    isHit,
    nearestGridPoint: nearestPoint,
    errorDistance,
    isWithinRange,
  };
}

/**
 * 计算点阵中任意两点间的最小欧氏间距
 */
export function getGridMinSpacing(gridPoints: Point[]): number {
  if (!gridPoints || gridPoints.length < 2) return 25;
  let minDist = Number.MAX_VALUE;
  for (let i = 0; i < gridPoints.length; i++) {
    for (let j = i + 1; j < gridPoints.length; j++) {
      const d = calcDistance(gridPoints[i], gridPoints[j]);
      if (d > 0 && d < minDist) {
        minDist = d;
      }
    }
  }
  return minDist === Number.MAX_VALUE ? 25 : minDist;
}

/**
 * 根据点阵间距动态计算渲染圆点的半径
 */
export function getDynamicDotRadius(gridPoints: Point[]): number {
  const minDist = getGridMinSpacing(gridPoints);
  return Math.max(1.2, Math.min(3.5, minDist * 0.25));
}

/**
 * 根据点阵间距动态计算十字准星的臂长与线宽
 */
export function getDynamicCrosshairMetrics(gridPoints: Point[]): {
  size: number;
  lineWidth: number;
} {
  const minDist = getGridMinSpacing(gridPoints);
  // 臂长控制在最小点间距的 42% 以内，绝不超过相邻点
  const size = Math.max(3.5, Math.min(12, minDist * 0.42));
  const lineWidth = Math.max(1, Math.min(2, minDist * 0.08));

  return { size, lineWidth };
}
~~~~~
~~~~~typescript
import {
  getDynamicCrosshairMetrics,
  getDynamicDotRadius,
  getGridMinSpacing,
} from '../../../core/canvas/drawPointGrid';
import type { HitResult, Point } from '../../../types';
import { calcDistance } from './pointMath';

export { getGridMinSpacing, getDynamicDotRadius, getDynamicCrosshairMetrics };

/**
 * 寻找最近的网格点及感应范围判定
 */
export function findNearestGridPoint(
  clickPoint: Point,
  gridPoints: Point[],
): { nearestPoint: Point; minDistance: number; isWithinRange: boolean } {
  if (!gridPoints || gridPoints.length === 0) {
    return { nearestPoint: clickPoint, minDistance: 0, isWithinRange: false };
  }

  let nearestPoint = gridPoints[0];
  let minDistance = calcDistance(clickPoint, nearestPoint);

  for (let i = 1; i < gridPoints.length; i++) {
    const dist = calcDistance(clickPoint, gridPoints[i]);
    if (dist < minDistance) {
      minDistance = dist;
      nearestPoint = gridPoints[i];
    }
  }

  let minNeighborDist = Number.MAX_VALUE;
  for (let i = 0; i < Math.min(5, gridPoints.length - 1); i++) {
    const d = calcDistance(gridPoints[i], gridPoints[i + 1]);
    if (d > 0 && d < minNeighborDist) minNeighborDist = d;
  }
  const maxRadius = Math.max(20, minNeighborDist * 0.75);

  return {
    nearestPoint,
    minDistance,
    isWithinRange: minDistance <= maxRadius,
  };
}

/**
 * 点击作答 Hit Detection
 */
export function checkHit(clickPoint: Point, targetB: Point, gridPoints: Point[]): HitResult {
  const { nearestPoint, isWithinRange } = findNearestGridPoint(clickPoint, gridPoints);
  const errorDistance = calcDistance(nearestPoint, targetB);
  const isHit = errorDistance < 0.5;

  return {
    isHit,
    nearestGridPoint: nearestPoint,
    errorDistance,
    isWithinRange,
  };
}
~~~~~

#### Acts 3: 在 `abstraction` 与 `relative_color` 题目生成器中接入 `createShuffledChoices`

将重复内联的手写 Fisher-Yates 洗牌逻辑替换为 `src/core/math/mathUtils.ts` 中的泛型函数 `createShuffledChoices`，并改用 Core 色彩函数消除跨 Domain 引用。

~~~~~act
patch_file
src/domains/abstraction/utils/questionGenerator.ts
~~~~~
~~~~~typescript
import { generateTetrahedralDistractors, hsvToOkLab } from '../../../core/color/oklchUtils';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import { calculateOtsuThreshold, createNoise2D, fbm2D } from '../../../core/math/noiseUtils';
import type { Point } from '../../../types';
import { getDistractorDistanceForLevel } from '../../relative_color/utils/inductionMath';
import { calcPCAOrientation, generateFlowParticles, generateFlowParticlesWithClutter } from './pca';
~~~~~
~~~~~typescript
import {
  generateTetrahedralDistractors,
  getDistractorDistanceForLevel,
  hsvToOkLab,
} from '../../../core/color/oklchUtils';
import { createShuffledChoices, expDecayInterpolate } from '../../../core/math/mathUtils';
import { calculateOtsuThreshold, createNoise2D, fbm2D } from '../../../core/math/noiseUtils';
import type { Point } from '../../../types';
import { calcPCAOrientation, generateFlowParticles, generateFlowParticlesWithClutter } from './pca';
~~~~~

~~~~~act
patch_file
src/domains/abstraction/utils/questionGenerator.ts
~~~~~
~~~~~typescript
    const distractorDeltaE = getDistractorDistanceForLevel(clampedLevel);
    const labDom = hsvToOkLab(...dominantColorHsv);
    const distractors = generateTetrahedralDistractors(labDom, distractorDeltaE);

    const rawOptions = [dominantColorHsv, ...distractors];
    const indexed = rawOptions.map((opt, i) => ({ opt, isTarget: i === 0 }));
    for (let i = indexed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
    }

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      paletteTiles,
      dominantColorHsv,
      paletteOptions: indexed.map((item) => item.opt),
      correctPaletteIndex: indexed.findIndex((item) => item.isTarget),
      tolerance: distractorDeltaE,
    };
  }

  // 5. TD_GESTURE_2AFC 自顶向下势线寻源 (2AFC)
~~~~~
~~~~~typescript
    const distractorDeltaE = getDistractorDistanceForLevel(clampedLevel);
    const labDom = hsvToOkLab(...dominantColorHsv);
    const distractors = generateTetrahedralDistractors(labDom, distractorDeltaE);
    const { options: paletteOptions, correctIndex: correctPaletteIndex } = createShuffledChoices(
      dominantColorHsv,
      distractors,
    );

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      paletteTiles,
      dominantColorHsv,
      paletteOptions,
      correctPaletteIndex,
      tolerance: distractorDeltaE,
    };
  }

  // 5. TD_GESTURE_2AFC 自顶向下势线寻源 (2AFC)
~~~~~

~~~~~act
patch_file
src/domains/abstraction/utils/questionGenerator.ts
~~~~~
~~~~~typescript
  const distractorDeltaE = getDistractorDistanceForLevel(clampedLevel);
  const labDom = hsvToOkLab(...promptDominantColor);
  const distractorsDom = generateTetrahedralDistractors(labDom, distractorDeltaE);

  const rawPatterns: PaletteTile[][] = [
    makePatternTiles(baseH, baseS, baseV),
    makePatternTiles(...distractorsDom[0]),
    makePatternTiles(...distractorsDom[1]),
    makePatternTiles(...distractorsDom[2]),
  ];

  const indexedPatterns = rawPatterns.map((pat, idx) => ({ pat, isTarget: idx === 0 }));
  for (let i = indexedPatterns.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexedPatterns[i], indexedPatterns[j]] = [indexedPatterns[j], indexedPatterns[i]];
  }

  const palettePatternOptions = indexedPatterns.map((item) => item.pat);
  const correctPatternIndex = indexedPatterns.findIndex((item) => item.isTarget);

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    promptDominantColor,
    palettePatternOptions,
    correctPatternIndex,
    tolerance: 0,
  };
}
~~~~~
~~~~~typescript
  const distractorDeltaE = getDistractorDistanceForLevel(clampedLevel);
  const labDom = hsvToOkLab(...promptDominantColor);
  const distractorsDom = generateTetrahedralDistractors(labDom, distractorDeltaE);

  const { options: palettePatternOptions, correctIndex: correctPatternIndex } =
    createShuffledChoices(
      makePatternTiles(baseH, baseS, baseV),
      [
        makePatternTiles(...distractorsDom[0]),
        makePatternTiles(...distractorsDom[1]),
        makePatternTiles(...distractorsDom[2]),
      ],
    );

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    promptDominantColor,
    palettePatternOptions,
    correctPatternIndex,
    tolerance: 0,
  };
}
~~~~~

~~~~~act
patch_file
src/domains/relative_color/utils/inductionMath.ts
~~~~~
~~~~~typescript
/**
 * 根据难度等级 (Level 1..35) 计算干扰项的绝对 OKLab 距离 Radius R
 */
export function getDistractorDistanceForLevel(level: number): number {
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34;
  const maxR = 0.14;
  const minR = 0.015;
  return maxR * (minR / maxR) ** t;
}

/**
 * 计算背景对中心色的感知诱导偏移 (OKLab 空间侧抑制模型)
~~~~~
~~~~~typescript
import { getDistractorDistanceForLevel } from '../../../core/color/oklchUtils';

export { getDistractorDistanceForLevel };

/**
 * 计算背景对中心色的感知诱导偏移 (OKLab 空间侧抑制模型)
~~~~~

~~~~~act
patch_file
src/domains/relative_color/utils/generators.ts
~~~~~
~~~~~typescript
import {
  generateTetrahedralDistractors,
  getTargetDeltaEForLevel,
  hasGamutMargin,
  hsvToOkLab,
  okLabToHsv,
} from '../../../core/color/oklchUtils';
import { calcCompensatedRightColor, getDistractorDistanceForLevel } from './inductionMath';
import type { RelativeColorMode, RelativeColorQuestionData } from './types';
~~~~~
~~~~~typescript
import {
  generateTetrahedralDistractors,
  getDistractorDistanceForLevel,
  getTargetDeltaEForLevel,
  hasGamutMargin,
  hsvToOkLab,
  okLabToHsv,
} from '../../../core/color/oklchUtils';
import { createShuffledChoices } from '../../../core/math/mathUtils';
import { calcCompensatedRightColor } from './inductionMath';
import type { RelativeColorMode, RelativeColorQuestionData } from './types';
~~~~~

~~~~~act
patch_file
src/domains/relative_color/utils/generators.ts
~~~~~
~~~~~typescript
  const bestDistractors = generateTetrahedralDistractors(labTargetD, R);
  const rawOptions: [number, number, number][] = [targetD, ...bestDistractors];
  const indexedOptions = rawOptions.map((opt, index) => ({ opt, isTarget: index === 0 }));
  for (let i = indexedOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexedOptions[i], indexedOptions[j]] = [indexedOptions[j], indexedOptions[i]];
  }

  const options = indexedOptions.map((o) => o.opt);
  const correctIndex = indexedOptions.findIndex((o) => o.isTarget);

  return {
    id,
    mode: 'VECTOR_SHIFT',
    difficultyLevel: clampedLevel,
    colorA,
    colorB,
    colorC,
    targetD,
    tolerance,
    options,
    correctIndex,
  };
}
~~~~~
~~~~~typescript
  const bestDistractors = generateTetrahedralDistractors(labTargetD, R);
  const { options, correctIndex } = createShuffledChoices(targetD, bestDistractors);

  return {
    id,
    mode: 'VECTOR_SHIFT',
    difficultyLevel: clampedLevel,
    colorA,
    colorB,
    colorC,
    targetD,
    tolerance,
    options,
    correctIndex,
  };
}
~~~~~

~~~~~act
patch_file
src/domains/relative_color/utils/generators.ts
~~~~~
~~~~~typescript
  // 利用正四面体算法生成 3 个等距对抗干扰色
  const distractors = generateTetrahedralDistractors(idealLabR, distractorDeltaE);
  const rawOptions: [number, number, number][] = [idealRightCenter, ...distractors];
  const indexed = rawOptions.map((opt, index) => ({ opt, isTarget: index === 0 }));
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }

  const options = indexed.map((item) => item.opt);
  const correctIndex = indexed.findIndex((item) => item.isTarget);

  return {
    id,
    mode: 'HUE_INDUCTION',
    difficultyLevel: clampedLevel,
    colorA: bgLeft,
    colorB: targetLeftCenter,
    colorC: bgRight,
    targetD: idealRightCenter,
    bgLeft,
    bgRight,
    targetLeftCenter,
    idealRightCenter,
    options,
    correctIndex,
    tolerance,
  };
}
~~~~~
~~~~~typescript
  // 利用正四面体算法生成 3 个等距对抗干扰色
  const distractors = generateTetrahedralDistractors(idealLabR, distractorDeltaE);
  const { options, correctIndex } = createShuffledChoices(idealRightCenter, distractors);

  return {
    id,
    mode: 'HUE_INDUCTION',
    difficultyLevel: clampedLevel,
    colorA: bgLeft,
    colorB: targetLeftCenter,
    colorC: bgRight,
    targetD: idealRightCenter,
    bgLeft,
    bgRight,
    targetLeftCenter,
    idealRightCenter,
    options,
    correctIndex,
    tolerance,
  };
}
~~~~~

#### Acts 4: 清理 Hook 死参数与未引用的 Props

清理 `useTrainingSession` 中的 `getQuestionLevel` 死入参以及 `ShapeMemory2AfcView` 中的未消费 Props。

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
export interface UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal> {
  domain: string;
  mode: string;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  autoNext: boolean;
  autoNextDelay: number;
  stepGranularity?: StepGranularity;
  adaptiveMode?: AdaptiveMode;
  targetAccuracy?: number;
  blockSize?: number;
  idleTimeoutSec?: number;
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
  generateQuestion: (level: number) => TQuestion;
  evaluateAnswer: (userVal: TAnswerVal, question: TQuestion) => THitResult;
  isHit: (hitResult: THitResult) => boolean;
  getQuestionLevel: (question: TQuestion) => number;
  saveTrialRecord: (params: {
    sessionId: string;
    question: TQuestion;
    hitResult: THitResult;
    responseTimeMs: number;
    userVal: TAnswerVal;
    currentProfileLevel: number;
  }) => Promise<void>;
  saveSession: (params: {
    sessionId: string;
    totalTrials: number;
    hitTrials: number;
    ended: boolean;
    startTimestamp: number;
    endLevel: number;
  }) => Promise<void>;
  onExit: () => void;
}

export function useTrainingSession<TQuestion, THitResult, TAnswerVal>({
  domain,
  mode,
  sessionType,
  initialLevel,
  autoNext,
  autoNextDelay,
  stepGranularity = 'standard',
  adaptiveMode = 'block',
  targetAccuracy = 0.8,
  blockSize = 10,
  idleTimeoutSec: optionsIdleTimeout,
  targetLimitTrials,
  onTargetLimitReached,
  generateQuestion,
  evaluateAnswer,
  isHit,
  getQuestionLevel: _getQuestionLevel,
  saveTrialRecord,
  saveSession,
  onExit,
}: UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal>) {
~~~~~
~~~~~typescript
export interface UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal> {
  domain: string;
  mode: string;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  autoNext: boolean;
  autoNextDelay: number;
  stepGranularity?: StepGranularity;
  adaptiveMode?: AdaptiveMode;
  targetAccuracy?: number;
  blockSize?: number;
  idleTimeoutSec?: number;
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
  generateQuestion: (level: number) => TQuestion;
  evaluateAnswer: (userVal: TAnswerVal, question: TQuestion) => THitResult;
  isHit: (hitResult: THitResult) => boolean;
  saveTrialRecord: (params: {
    sessionId: string;
    question: TQuestion;
    hitResult: THitResult;
    responseTimeMs: number;
    userVal: TAnswerVal;
    currentProfileLevel: number;
  }) => Promise<void>;
  saveSession: (params: {
    sessionId: string;
    totalTrials: number;
    hitTrials: number;
    ended: boolean;
    startTimestamp: number;
    endLevel: number;
  }) => Promise<void>;
  onExit: () => void;
}

export function useTrainingSession<TQuestion, THitResult, TAnswerVal>({
  domain,
  mode,
  sessionType,
  initialLevel,
  autoNext,
  autoNextDelay,
  stepGranularity = 'standard',
  adaptiveMode = 'block',
  targetAccuracy = 0.8,
  blockSize = 10,
  idleTimeoutSec: optionsIdleTimeout,
  targetLimitTrials,
  onTargetLimitReached,
  generateQuestion,
  evaluateAnswer,
  isHit,
  saveTrialRecord,
  saveSession,
  onExit,
}: UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal>) {
~~~~~

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript
import type { ComponentChildren } from 'preact';
import { TrainingShell } from '../components/training/TrainingShell';
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import { useTrainingSession } from '../hooks/useTrainingSession';
import type { CardDefinition } from '../types/card';
import { saveSession, saveTrialRecord } from '../utils/db/index';
import type { BaseModuleSettings, GlobalSettings } from '../utils/settings';

interface GenericTrainingPluginAdapter {
  isTargeting?: (mode: string, settings: unknown) => boolean;
  generateQuestion: (mode: string, level: number, settings: unknown) => unknown;
  evaluateAnswer: (userVal: unknown, question: unknown, mode: string) => unknown;
  isHit: (hitResult: unknown) => boolean;
  getQuestionLevel: (question: unknown) => number;
  extractRecordDetails: (
    question: unknown,
    hitResult: unknown,
    userVal: unknown,
    mode: string,
  ) => Record<string, unknown>;
  renderCanvas: (props: {
    question: unknown;
    showAnswer: boolean;
    userAnswer: unknown;
    onAnswer: (val: unknown) => void;
    disabled: boolean;
    isIdle: boolean;
    settings: unknown;
  }) => ComponentChildren;
}

import type { SessionHistoryItem } from '../components/SessionSummaryModal';

export interface GenericTrainingViewProps {
~~~~~
~~~~~typescript
import type { ComponentChildren } from 'preact';
import type { SessionHistoryItem } from '../components/SessionSummaryModal';
import { TrainingShell } from '../components/training/TrainingShell';
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import { useTrainingSession } from '../hooks/useTrainingSession';
import type { CardDefinition } from '../types/card';
import { saveSession, saveTrialRecord } from '../utils/db/index';
import type { BaseModuleSettings, GlobalSettings } from '../utils/settings';

interface GenericTrainingPluginAdapter {
  isTargeting?: (mode: string, settings: unknown) => boolean;
  generateQuestion: (mode: string, level: number, settings: unknown) => unknown;
  evaluateAnswer: (userVal: unknown, question: unknown, mode: string) => unknown;
  isHit: (hitResult: unknown) => boolean;
  getQuestionLevel: (question: unknown) => number;
  extractRecordDetails: (
    question: unknown,
    hitResult: unknown,
    userVal: unknown,
    mode: string,
  ) => Record<string, unknown>;
  renderCanvas: (props: {
    question: unknown;
    showAnswer: boolean;
    userAnswer: unknown;
    onAnswer: (val: unknown) => void;
    disabled: boolean;
    isIdle: boolean;
    settings: unknown;
  }) => ComponentChildren;
}

export interface GenericTrainingViewProps {
~~~~~

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript
    targetLimitTrials,
    onTargetLimitReached,
    generateQuestion: (level) => adapter.generateQuestion(mode, level, settings),
    evaluateAnswer: (userVal, q) => adapter.evaluateAnswer(userVal, q, mode),
    isHit: adapter.isHit,
    getQuestionLevel: adapter.getQuestionLevel,
    saveTrialRecord: async ({
      sessionId,
      question: q,
      hitResult,
      responseTimeMs,
      userVal,
      currentProfileLevel,
    }) => {
~~~~~
~~~~~typescript
    targetLimitTrials,
    onTargetLimitReached,
    generateQuestion: (level) => adapter.generateQuestion(mode, level, settings),
    evaluateAnswer: (userVal, q) => adapter.evaluateAnswer(userVal, q, mode),
    isHit: adapter.isHit,
    saveTrialRecord: async ({
      sessionId,
      question: q,
      hitResult,
      responseTimeMs,
      userVal,
      currentProfileLevel,
    }) => {
~~~~~

~~~~~act
patch_file
src/domains/negative_space/components/ShapeMemory2AfcView.tsx
~~~~~
~~~~~typescript
interface ShapeMemory2AfcViewProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (choice: 0 | 1) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function ShapeMemory2AfcView({
  question,
  showAnswer,
  userAnswer: _userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: ShapeMemory2AfcViewProps) {
~~~~~
~~~~~typescript
interface ShapeMemory2AfcViewProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  onAnswer: (choice: 0 | 1) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function ShapeMemory2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: ShapeMemory2AfcViewProps) {
~~~~~

~~~~~act
patch_file
src/domains/negative_space/views/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript
  if (mode === 'SHAPE_MATCH_2AFC') {
    return (
      <ShapeMemory2AfcView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(choiceIdx) => onAnswer(choiceIdx)}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }
~~~~~
~~~~~typescript
  if (mode === 'SHAPE_MATCH_2AFC') {
    return (
      <ShapeMemory2AfcView
        question={question}
        showAnswer={showAnswer}
        onAnswer={(choiceIdx) => onAnswer(choiceIdx)}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }
~~~~~

#### Acts 5: 清理数据库 Schema 冗余字段、未引用别名与旧 Plan 双写

清理 `schema.ts`、`db/index.ts` 中的未引用类型别名和废弃字段，并移除 `planStorage.ts` 中的未引用辅助函数与旧 key 同步双写。

~~~~~act
patch_file
src/utils/db/schema.ts
~~~~~
~~~~~typescript
export interface UnifiedProfileData {
  cardId: string;
  domain: TrainingDomain;
  mode: string;
  currentLevel: number;
  bestLevel: number;
  totalTrials: number;
  totalTrainedCards?: number;
  totalHits: number;
  updatedAt: number;
}
~~~~~
~~~~~typescript
export interface UnifiedProfileData {
  cardId: string;
  domain: TrainingDomain;
  mode: string;
  currentLevel: number;
  bestLevel: number;
  totalTrials: number;
  totalHits: number;
  updatedAt: number;
}
~~~~~

~~~~~act
patch_file
src/utils/db/index.ts
~~~~~
~~~~~typescript
export * from './schema';
export * from './queries';
export * from './importExport';

// 类型别名导出
import type { UnifiedProfileData, UnifiedSessionData, UnifiedTrialRecord } from './schema';
export type SessionData = UnifiedSessionData;
export type UserProfileData = UnifiedProfileData;
export type TrialRecord = UnifiedTrialRecord;
~~~~~
~~~~~typescript
export * from './schema';
export * from './queries';
export * from './importExport';
~~~~~

~~~~~act
patch_file
src/utils/planStorage.ts
~~~~~
~~~~~typescript
function createPlanFromTemplateInternal(
  template: PlanTemplate,
  isBuiltin = false,
  isFavorite = true,
): TrainingPlan {
  const items: PlanItem[] = template.items.map((item, idx) => ({
    id: `item_${template.id}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
    cardId: item.cardId,
    targetTrials: item.targetTrials,
  }));

  return {
    id: `plan_${template.id}`,
    name: template.name,
    description: template.description,
    items,
    isFavorite,
    isBuiltin,
    updatedAt: Date.now(),
  };
}

export function createPlanFromTemplate(template: PlanTemplate): TrainingPlan {
  return createPlanFromTemplateInternal(template, false, true);
}

export function getDefaultPlans(): TrainingPlan[] {
~~~~~
~~~~~typescript
function createPlanFromTemplateInternal(
  template: PlanTemplate,
  isBuiltin = false,
  isFavorite = true,
): TrainingPlan {
  const items: PlanItem[] = template.items.map((item, idx) => ({
    id: `item_${template.id}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
    cardId: item.cardId,
    targetTrials: item.targetTrials,
  }));

  return {
    id: `plan_${template.id}`,
    name: template.name,
    description: template.description,
    items,
    isFavorite,
    isBuiltin,
    updatedAt: Date.now(),
  };
}

export function getDefaultPlans(): TrainingPlan[] {
~~~~~

~~~~~act
patch_file
src/utils/planStorage.ts
~~~~~
~~~~~typescript
export function savePlanStorageState(state: PlanStorageState): void {
  try {
    localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(state));
    // 兼容旧接口读取
    const active = state.plans.find((p) => p.id === state.activePlanId) || state.plans[0];
    if (active) {
      localStorage.setItem(LEGACY_PLAN_STORAGE_KEY, JSON.stringify(active));
    }
  } catch (e) {
    console.error('Failed to save plan storage state:', e);
  }
}
~~~~~
~~~~~typescript
export function savePlanStorageState(state: PlanStorageState): void {
  try {
    localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save plan storage state:', e);
  }
}
~~~~~

### 下一步建议
- **执行测试验证**: 运行 `npm run check` (Biome) 与 `npm test` (Vitest) 确保所有重构与类型变更均无缝通过。
- **Canvas 工具目录扁平化**: 可进一步考虑将 `src/utils/canvas/` 与 `src/core/canvas/` 合并统一收拢至 `src/core/canvas/`，降低跨层级检索心智负担。
