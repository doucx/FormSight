好的，我们现在启动重构流程。首先对优先级最高（P0）的两个巨石文件 `abstractionUtils.ts` (689 行) 和 `AbstractionCanvas.tsx` (626 行) 进行模块化解耦与拆分。

## [WIP] refactor(abstraction): 解耦视知觉概括算法与 Canvas 视图组件

### 用户需求
将代码库中职责过重、代码量庞大的 `src/utils/abstractionUtils.ts` 和 `src/components/AbstractionCanvas.tsx` 拆分为职责明确的高内聚小模块，提升系统可读性、可维护性与测试便利度。

### 评论
视知觉概括 (Visual Abstraction) 模块包含了 8 种截然不同的生成算法与 4 类不同的交互界面。将单体大文件拆分为分层的领域子模块（数学计算、算法生成、题型判定、独立视图组件），同时保留原入口的重导出以保障向后兼容性，是降低复杂度与促进代码健康度的关键重构。

### 目标
1. 将底层的 Canvas 绘图函数抽离至 `src/utils/canvas/` 工具库。
2. 将 `src/utils/abstractionUtils.ts` 拆分到 `src/utils/abstraction/` 目录中，分为 `types`、`pca`、`polygon`、`notan`、`palette`、`questionGenerator` 与 `hitDetection`。
3. 将 `src/components/AbstractionCanvas.tsx` 拆分到 `src/components/abstraction/` 目录中，各题型视图（势线、大模、Notan、拼贴色群、调性基底）拆分为独立组件。
4. 在原文件路径保留 re-export，保证外部引用无缝衔接。

### 基本原理
- **领域职责隔离**：几何运算、多尺度噪声/Otsu 分割、OKLab 色彩采样与 UI 渲染解耦。
- **视图组件原子化**：每个视知觉题型拥有独立的事件处理与 UI 布局，消除单文件内长达数百行的 `if-else` 分支。
- **平滑兼容**：通过 `src/utils/abstractionUtils.ts` 与 `src/components/AbstractionCanvas.tsx` 的转发，不破坏现有外部引用。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #scope/core #scope/dx #ai/delegate #task/domain/abstraction #task/object/modular-refactoring #task/action/refactor #task/state/begin #task/status/active

---

### Script

#### Acts 1: 抽取 Canvas 通用绘图工具函数

我们将 `drawParticles`、`drawSpinePrompt`、`drawNotanField`、`drawPaletteTiles` 等基础绘图逻辑提取到 `src/utils/canvas/` 中。

~~~~~act
write_file
src/utils/canvas/drawParticles.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export function drawParticlesCanvas(
  canvas: HTMLCanvasElement | null,
  particles?: Point[],
  size = 400,
  axisAngle?: number,
  axisColor = '#22C55E',
) {
  if (!canvas || !particles) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // 绘制散点
  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
  }

  // 绘制指示势线
  if (axisAngle !== undefined) {
    const rad = (axisAngle * Math.PI) / 180;
    const cx = size / 2;
    const cy = size / 2;
    const L = size * 0.44;

    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - L * Math.cos(rad), cy - L * Math.sin(rad));
    ctx.lineTo(cx + L * Math.cos(rad), cy + L * Math.sin(rad));
    ctx.stroke();
  }
}

export function drawSpinePromptCanvas(
  canvas: HTMLCanvasElement | null,
  spine?: Point[],
  size = 160,
) {
  if (!canvas || !spine || spine.length < 2) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  const [p1, p2] = spine;
  ctx.strokeStyle = '#4F46E5';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  ctx.fillStyle = '#4F46E5';
  ctx.beginPath();
  ctx.arc(p1.x, p1.y, 4, 0, Math.PI * 2);
  ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
  ctx.fill();
}
~~~~~

~~~~~act
write_file
src/utils/canvas/drawNotanField.ts
~~~~~
~~~~~typescript
export function drawRawGrayscaleNoiseField(
  canvas: HTMLCanvasElement | null,
  buffer?: number[],
  dim = 120,
  size = 260,
) {
  if (!canvas || !buffer) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const offscreen = document.createElement('canvas');
  offscreen.width = dim;
  offscreen.height = dim;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  const imgData = offCtx.createImageData(dim, dim);
  const pixels = imgData.data;

  for (let i = 0; i < buffer.length; i++) {
    const val = buffer[i];
    const pIdx = i * 4;
    pixels[pIdx] = val;
    pixels[pIdx + 1] = val;
    pixels[pIdx + 2] = val;
    pixels[pIdx + 3] = 255;
  }
  offCtx.putImageData(imgData, 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(offscreen, 0, 0, size, size);
}

export function drawNotanNoiseField(
  canvas: HTMLCanvasElement | null,
  buffer?: number[],
  dim = 120,
  thresholdPercent = 50,
  size = 400,
) {
  if (!canvas || !buffer) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const thresholdByte = Math.round((thresholdPercent / 100) * 255);

  const offscreen = document.createElement('canvas');
  offscreen.width = dim;
  offscreen.height = dim;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  const imgData = offCtx.createImageData(dim, dim);
  const pixels = imgData.data;

  for (let i = 0; i < buffer.length; i++) {
    const isDark = buffer[i] <= thresholdByte;
    const color = isDark ? 15 : 248;
    const pIdx = i * 4;
    pixels[pIdx] = color;
    pixels[pIdx + 1] = color === 15 ? 23 : 250;
    pixels[pIdx + 2] = color === 15 ? 42 : 252;
    pixels[pIdx + 3] = 255;
  }
  offCtx.putImageData(imgData, 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(offscreen, 0, 0, size, size);
}
~~~~~

~~~~~act
write_file
src/utils/canvas/drawPaletteTiles.ts
~~~~~
~~~~~typescript
import { hsvToHex } from '../colorUtils';

export interface PaletteTile {
  x: number;
  y: number;
  w: number;
  h: number;
  hsv: [number, number, number];
  weight: number;
}

export function drawPaletteTilesCanvas(
  canvas: HTMLCanvasElement | null,
  tiles?: PaletteTile[],
  size = 400,
) {
  if (!canvas || !tiles) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  for (const t of tiles) {
    ctx.fillStyle = hsvToHex(...t.hsv);
    ctx.fillRect(t.x, t.y, t.w, t.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.strokeRect(t.x, t.y, t.w, t.h);
  }
}
~~~~~

#### Acts 2: 拆分 `src/utils/abstraction/` 核心算法模块

~~~~~act
write_file
src/utils/abstraction/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';
import type { PaletteTile } from '../canvas/drawPaletteTiles';

export type { PaletteTile };

export type AbstractionMode =
  | 'GESTURE_AXIS'
  | 'POLYGON_DECIMATION'
  | 'NOTAN_THRESHOLD'
  | 'PALETTE_CLUSTERING'
  | 'TD_GESTURE_2AFC'
  | 'TD_HULL_2AFC'
  | 'TD_NOTAN_2AFC'
  | 'TD_PALETTE_2AFC';

export const ABSTRACTION_CANVAS_SIZE = 400;
export const ABSTRACTION_THUMB_SIZE = 160;
export const ABSTRACTION_2AFC_SIZE = 260;

export interface AbstractionQuestionData {
  id: string;
  mode: AbstractionMode;
  difficultyLevel: number;
  tolerance: number;

  // 1. GESTURE_AXIS 势线字段
  particles?: Point[];
  targetAngleDeg?: number; // 0..180 角度

  // 2. POLYGON_DECIMATION 折线大形字段
  detailedPolygon?: Point[];
  simplifiedOptions?: Point[][]; // [polyA, polyB]
  correctPolyIndex?: number;
  correctPolyChoice?: 'A' | 'B';

  // 3. NOTAN_THRESHOLD 黑白素描归组字段
  notanBuffer?: number[]; // 0..255 灰阶连续场数组
  notanFieldDim?: number; // 灰度场分辨率 (如 120x120)
  idealNotanThreshold?: number; // 0..100 理论最佳二值化阈值

  // 4. PALETTE_CLUSTERING 调色板主调字段
  paletteTiles?: PaletteTile[];
  dominantColorHsv?: [number, number, number];
  paletteOptions?: [number, number, number][]; // 4 个候选颜色
  correctPaletteIndex?: number;

  // 5. Top-Down 2AFC 通用题干与候选项
  promptSpine?: Point[]; // 题干势线
  particlesA?: Point[];
  particlesB?: Point[];
  correctParticleChoice?: 'A' | 'B';

  promptHull?: Point[]; // 题干大模外壳
  hullDetailedA?: Point[];
  hullDetailedB?: Point[];
  correctHullChoice?: 'A' | 'B';

  promptNotanBuffer?: number[]; // 题干二值 Notan 剪影场
  notanSceneBufferA?: number[]; // 选项 A 连续灰阶素描场
  notanSceneBufferB?: number[]; // 选项 B 连续灰阶素描场
  correctNotanChoice?: 'A' | 'B';

  promptDominantColor?: [number, number, number]; // 题干单基准主色
  palettePatternOptions?: PaletteTile[][]; // 4 组候选图案
  correctPatternIndex?: number; // 0..3
  patternA?: PaletteTile[];
  patternB?: PaletteTile[];
  correctPatternChoice?: 'A' | 'B';
}

export interface AbstractionHitResult {
  isHit: boolean;
  userValue?: number;
  targetValue?: number;
  errorValue: number;
  tolerance: number;
  userChoice?: 'A' | 'B';
  correctChoice?: 'A' | 'B';
  userChoiceIndex?: number;
  correctIndex?: number;
}
~~~~~

~~~~~act
write_file
src/utils/abstraction/pca.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';
import { ABSTRACTION_CANVAS_SIZE } from './types';

/**
 * 计算点集的 PCA 第一主成分角度 (0..180°)
 */
export function calcPCAOrientation(points: Point[]): number {
  const n = points.length;
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  const cx = sumX / n;
  const cy = sumY / n;

  let covXX = 0;
  let covYY = 0;
  let covXY = 0;
  for (const p of points) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    covXX += dx * dx;
    covYY += dy * dy;
    covXY += dx * dy;
  }

  // 求解 2x2 协方差矩阵的最大特征向量方向
  const theta = 0.5 * Math.atan2(2 * covXY, covXX - covYY);
  let deg = (theta * 180) / Math.PI;
  deg = ((deg % 180) + 180) % 180;
  return Math.round(deg * 10) / 10;
}

/**
 * 生成带方向性与背景各向同性噪点的散点流
 */
export function generateFlowParticlesWithClutter(
  angleDeg: number,
  spreadRatio: number,
  clutterRatio = 0,
  size = ABSTRACTION_CANVAS_SIZE,
): Point[] {
  const rad = (angleDeg * Math.PI) / 180;
  const count = 45 + Math.floor(Math.random() * 20);
  const cx = size / 2;
  const cy = size / 2;
  const majorLen = size * 0.38;
  const minorLen = majorLen * spreadRatio;

  const points: Point[] = [];
  const clutterCount = Math.floor(count * clutterRatio);
  const flowCount = count - clutterCount;

  // 主流动势粒子
  for (let i = 0; i < flowCount; i++) {
    const u = (Math.random() * 2 - 1) * majorLen;
    const v = (Math.random() * 2 - 1) * minorLen;

    const x = Math.round(cx + u * Math.cos(rad) - v * Math.sin(rad));
    const y = Math.round(cy + u * Math.sin(rad) + v * Math.cos(rad));
    points.push({
      x: Math.max(15, Math.min(size - 15, x)),
      y: Math.max(15, Math.min(size - 15, y)),
    });
  }

  // 背景各向同性杂质噪点 (破除简单外轮廓一眼看穿)
  for (let i = 0; i < clutterCount; i++) {
    const r = Math.sqrt(Math.random()) * majorLen * 0.95;
    const theta = Math.random() * Math.PI * 2;
    const x = Math.round(cx + r * Math.cos(theta));
    const y = Math.round(cy + r * Math.sin(theta));
    points.push({
      x: Math.max(15, Math.min(size - 15, x)),
      y: Math.max(15, Math.min(size - 15, y)),
    });
  }

  return points;
}

export function generateFlowParticles(
  angleDeg: number,
  spreadRatio: number,
  size = ABSTRACTION_CANVAS_SIZE,
): Point[] {
  return generateFlowParticlesWithClutter(angleDeg, spreadRatio, 0, size);
}
~~~~~

~~~~~act
write_file
src/utils/abstraction/polygon.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';
import { ABSTRACTION_2AFC_SIZE, ABSTRACTION_CANVAS_SIZE } from './types';

/**
 * 将简单的多边形边缘打碎，生成拥有大量顶点的复杂细碎剪影
 */
export function fractalizePolygon(
  basePolygon: Point[],
  detailLevel: number,
  noiseFactor: number,
): Point[] {
  let currentPoints = [...basePolygon];

  for (let iter = 0; iter < detailLevel; iter++) {
    const nextPoints: Point[] = [];
    for (let i = 0; i < currentPoints.length; i++) {
      const p1 = currentPoints[i];
      const p2 = currentPoints[(i + 1) % currentPoints.length];

      nextPoints.push(p1);

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) continue;

      const nx = -dy / len;
      const ny = dx / len;

      const displacement = (Math.random() * 2 - 1) * noiseFactor * (len * 0.3);
      nextPoints.push({
        x: Math.round(midX + nx * displacement),
        y: Math.round(midY + ny * displacement),
      });
    }
    currentPoints = nextPoints;
  }
  return currentPoints;
}

/**
 * 生成大模基础多边形
 */
export function generateDetailedPolygon(
  verticesCount: number,
  size = ABSTRACTION_CANVAS_SIZE,
): Point[] {
  const cx = size / 2;
  const cy = size / 2;
  const baseR = size * 0.32;
  const angles: number[] = [];
  const step = (Math.PI * 2) / verticesCount;

  for (let i = 0; i < verticesCount; i++) {
    angles.push(i * step + (Math.random() - 0.5) * step * 0.65);
  }
  angles.sort((a, b) => a - b);

  return angles.map((a) => {
    const r = baseR * (0.65 + Math.random() * 0.65);
    return {
      x: Math.round(cx + r * Math.cos(a)),
      y: Math.round(cy + r * Math.sin(a)),
    };
  });
}

/**
 * 基于真理大模生成高度竞争性的对抗干扰多边形
 */
export function generateAdversarialDistractorHull(
  targetHull: Point[],
  level: number,
  size = ABSTRACTION_2AFC_SIZE,
): Point[] {
  const t = (Math.max(1, Math.min(35, level)) - 1) / 34;
  const n = targetHull.length;
  const distractor: Point[] = targetHull.map((p) => ({ ...p }));
  const cx = size / 2;
  const cy = size / 2;

  const mutationType = Math.random();

  if (mutationType < 0.35 && n > 4) {
    const idx = Math.floor(Math.random() * n);
    const prev = targetHull[(idx - 1 + n) % n];
    const next = targetHull[(idx + 1) % n];
    distractor[idx] = {
      x: Math.round((prev.x + next.x) / 2),
      y: Math.round((prev.y + next.y) / 2),
    };
  } else {
    const mutateCount = t > 0.6 && Math.random() < 0.5 ? 2 : 1;
    const chosenIndices = new Set<number>();
    while (chosenIndices.size < mutateCount) {
      chosenIndices.add(Math.floor(Math.random() * n));
    }

    const shiftMag = 14 + (1 - t) * 26;

    for (const idx of chosenIndices) {
      const p = targetHull[idx];
      const angleFromCenter = Math.atan2(p.y - cy, p.x - cx);
      const angle = angleFromCenter + (Math.random() - 0.5) * (Math.PI * 0.8);

      distractor[idx] = {
        x: Math.max(10, Math.min(size - 10, Math.round(p.x + Math.cos(angle) * shiftMag))),
        y: Math.max(10, Math.min(size - 10, Math.round(p.y + Math.sin(angle) * shiftMag))),
      };
    }
  }

  return distractor;
}
~~~~~

~~~~~act
write_file
src/utils/abstraction/questionGenerator.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';
import { expDecayInterpolate } from '../mathUtils';
import { calculateOtsuThreshold, createNoise2D, fbm2D } from '../noiseUtils';
import { generateTetrahedralDistractors, hsvToOkLab } from '../oklchUtils';
import { getDistractorDistanceForLevel } from '../relativeColorUtils';
import { calcPCAOrientation, generateFlowParticles, generateFlowParticlesWithClutter } from './pca';
import {
  fractalizePolygon,
  generateAdversarialDistractorHull,
  generateDetailedPolygon,
} from './polygon';
import {
  ABSTRACTION_2AFC_SIZE,
  ABSTRACTION_CANVAS_SIZE,
  ABSTRACTION_THUMB_SIZE,
  type AbstractionMode,
  type AbstractionQuestionData,
  type PaletteTile,
} from './types';

export function generateAbstractionQuestion(
  mode: AbstractionMode,
  level: number,
): AbstractionQuestionData {
  const id = `abs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34;

  // 1. GESTURE_AXIS 势线角度提取
  if (mode === 'GESTURE_AXIS') {
    const targetAngleDeg = Math.floor(Math.random() * 180);
    const spreadRatio = 0.15 + t * 0.5;
    const particles = generateFlowParticles(targetAngleDeg, spreadRatio);
    const realPCA = calcPCAOrientation(particles);
    const tolerance = Math.round(expDecayInterpolate(18.0, 2.5, clampedLevel) * 10) / 10;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      particles,
      targetAngleDeg: realPCA,
      tolerance,
    };
  }

  // 2. POLYGON_DECIMATION 折线大形 (2AFC)
  if (mode === 'POLYGON_DECIMATION') {
    const minVerts = 4 + Math.floor(t * 3);
    const maxVerts = 5 + Math.floor(t * 4);
    const vertCount = Math.floor(Math.random() * (maxVerts - minVerts + 1)) + minVerts;

    const targetHull = generateDetailedPolygon(vertCount, ABSTRACTION_2AFC_SIZE);
    const distractorHull = generateAdversarialDistractorHull(
      targetHull,
      clampedLevel,
      ABSTRACTION_2AFC_SIZE,
    );

    const scaleToMain = ABSTRACTION_CANVAS_SIZE / ABSTRACTION_2AFC_SIZE;
    const baseForDetailed = targetHull.map((p) => ({
      x: Math.round(p.x * scaleToMain),
      y: Math.round(p.y * scaleToMain),
    }));

    const noiseFactor = 0.4 + t * 0.9;
    const detailedPolygon = fractalizePolygon(baseForDetailed, 2, noiseFactor);

    const isA = Math.random() < 0.5;
    const simplifiedOptions = isA ? [targetHull, distractorHull] : [distractorHull, targetHull];

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      detailedPolygon,
      simplifiedOptions,
      correctPolyIndex: isA ? 0 : 1,
      correctPolyChoice: isA ? 'A' : 'B',
      tolerance: 0,
    };
  }

  // 3. NOTAN_THRESHOLD 黑白素描二值归组
  if (mode === 'NOTAN_THRESHOLD') {
    const fieldDim = 120;
    const buffer = new Uint8Array(fieldDim * fieldDim);

    const macroNoise = createNoise2D(Math.random());
    const microNoise = createNoise2D(Math.random());

    const keyType = Math.random();
    const baseKey =
      keyType < 0.35
        ? 22 + Math.random() * 14
        : keyType < 0.7
          ? 64 + Math.random() * 14
          : 44 + Math.random() * 12;

    const macroScale = 0.012 + Math.random() * 0.008;
    const macroAmp = 42 + Math.random() * 10;

    const microScale = 0.08 + Math.random() * 0.04;
    const microAmp = 10 + t * 38;

    for (let y = 0; y < fieldDim; y++) {
      for (let x = 0; x < fieldDim; x++) {
        const idx = y * fieldDim + x;
        const macroVal =
          (fbm2D(x * macroScale, y * macroScale, 2, macroNoise) - 0.5) * 2 * macroAmp;
        const microVal =
          (fbm2D(x * microScale, y * microScale, 3, microNoise) - 0.5) * 2 * microAmp;

        const raw = baseKey + macroVal + microVal;
        const clamped0to100 = Math.max(0, Math.min(100, raw));
        buffer[idx] = Math.round((clamped0to100 / 100) * 255);
      }
    }

    const otsuByte = calculateOtsuThreshold(buffer);
    const idealNotanThreshold = Math.round((otsuByte / 255) * 100);
    const tolerance = Math.round(expDecayInterpolate(10.0, 2.0, clampedLevel) * 10) / 10;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      notanBuffer: Array.from(buffer),
      notanFieldDim: fieldDim,
      idealNotanThreshold,
      tolerance,
    };
  }

  // 4. PALETTE_CLUSTERING 主调色群提炼 (4AFC)
  if (mode === 'PALETTE_CLUSTERING') {
    const baseH = Math.floor(Math.random() * 360);
    const baseS = Math.floor(Math.random() * 40) + 40;
    const baseV = Math.floor(Math.random() * 40) + 40;

    const dominantColorHsv: [number, number, number] = [baseH, baseS, baseV];
    const paletteTiles: PaletteTile[] = [];
    const gridSize = 4;
    const tileSize = ABSTRACTION_CANVAS_SIZE / gridSize;

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const jitterH = (baseH + (Math.floor(Math.random() * 40) - 20) + 360) % 360;
        const jitterS = Math.max(10, Math.min(100, baseS + (Math.floor(Math.random() * 30) - 15)));
        const jitterV = Math.max(15, Math.min(100, baseV + (Math.floor(Math.random() * 30) - 15)));
        paletteTiles.push({
          x: c * tileSize,
          y: r * tileSize,
          w: tileSize,
          h: tileSize,
          hsv: [jitterH, jitterS, jitterV],
          weight: 1,
        });
      }
    }

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
  if (mode === 'TD_GESTURE_2AFC') {
    const targetAngle = Math.floor(Math.random() * 180);
    const angleDelta = expDecayInterpolate(36.0, 4.0, clampedLevel);
    const sign = Math.random() < 0.5 ? 1 : -1;
    const distractorAngle = (targetAngle + sign * angleDelta + 180) % 180;

    const rad = (targetAngle * Math.PI) / 180;
    const L = ABSTRACTION_THUMB_SIZE * 0.36;
    const cx = ABSTRACTION_THUMB_SIZE / 2;
    const cy = ABSTRACTION_THUMB_SIZE / 2;
    const promptSpine: Point[] = [
      { x: cx - L * Math.cos(rad), y: cy - L * Math.sin(rad) },
      { x: cx + L * Math.cos(rad), y: cy + L * Math.sin(rad) },
    ];

    const spreadRatio = 0.18 + t * 0.38;
    const clutterRatio = t * 0.28;

    const partA = generateFlowParticlesWithClutter(
      targetAngle,
      spreadRatio,
      clutterRatio,
      ABSTRACTION_2AFC_SIZE,
    );
    const partB = generateFlowParticlesWithClutter(
      distractorAngle,
      spreadRatio,
      clutterRatio,
      ABSTRACTION_2AFC_SIZE,
    );

    const isA = Math.random() < 0.5;
    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      promptSpine,
      particlesA: isA ? partA : partB,
      particlesB: isA ? partB : partA,
      correctParticleChoice: isA ? 'A' : 'B',
      tolerance: 0,
    };
  }

  // 6. TD_HULL_2AFC 自顶向下大模寻形 (2AFC)
  if (mode === 'TD_HULL_2AFC') {
    const minVerts = 4 + Math.floor(t * 2);
    const maxVerts = 5 + Math.floor(t * 4);
    const vertCount = Math.floor(Math.random() * (maxVerts - minVerts + 1)) + minVerts;

    const promptHull = generateDetailedPolygon(vertCount, ABSTRACTION_THUMB_SIZE);
    const scale = ABSTRACTION_2AFC_SIZE / ABSTRACTION_THUMB_SIZE;

    const targetBase = promptHull.map((p) => ({
      x: Math.round(p.x * scale),
      y: Math.round(p.y * scale),
    }));

    const distractorBase = generateAdversarialDistractorHull(
      targetBase,
      clampedLevel,
      ABSTRACTION_2AFC_SIZE,
    );

    const noiseFactor = 0.45 + t * 0.85;
    const targetDetailed = fractalizePolygon(targetBase, 2, noiseFactor);
    const distractorDetailed = fractalizePolygon(distractorBase, 2, noiseFactor);

    const isA = Math.random() < 0.5;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      promptHull,
      hullDetailedA: isA ? targetDetailed : distractorDetailed,
      hullDetailedB: isA ? distractorDetailed : targetDetailed,
      correctHullChoice: isA ? 'A' : 'B',
      tolerance: 0,
    };
  }

  // 7. TD_NOTAN_2AFC 自顶向下素描骨架匹配 (2AFC)
  if (mode === 'TD_NOTAN_2AFC') {
    const fieldDim = 120;
    const totalPixels = fieldDim * fieldDim;

    const targetMacroNoise = createNoise2D(Math.random());
    const distractorMacroNoise = createNoise2D(Math.random() + 100);
    const microNoise = createNoise2D(Math.random() + 200);

    const keyType = Math.random();
    const baseKey =
      keyType < 0.35
        ? 24 + Math.random() * 12
        : keyType < 0.7
          ? 64 + Math.random() * 12
          : 45 + Math.random() * 10;

    const macroScale = 0.012 + Math.random() * 0.008;
    const macroAmp = 42 + Math.random() * 10;
    const microScale = 0.08 + Math.random() * 0.04;
    const microAmp = 10 + t * 38;

    const macroSimilarityWeight = t * 0.68;
    const blendNorm = Math.sqrt((1 - macroSimilarityWeight) ** 2 + macroSimilarityWeight ** 2);

    const targetMacroBuffer = new Uint8Array(totalPixels);
    const targetSceneBuffer = new Uint8Array(totalPixels);
    const distractorSceneBuffer = new Uint8Array(totalPixels);

    for (let y = 0; y < fieldDim; y++) {
      for (let x = 0; x < fieldDim; x++) {
        const idx = y * fieldDim + x;
        const targetMacroVal =
          (fbm2D(x * macroScale, y * macroScale, 2, targetMacroNoise) - 0.5) * 2 * macroAmp;
        const rawIndependentDistractorVal =
          (fbm2D(x * macroScale, y * macroScale, 2, distractorMacroNoise) - 0.5) * 2 * macroAmp;

        const distractorMacroVal =
          ((1 - macroSimilarityWeight) * rawIndependentDistractorVal +
            macroSimilarityWeight * targetMacroVal) /
          blendNorm;

        const microVal =
          (fbm2D(x * microScale, y * microScale, 3, microNoise) - 0.5) * 2 * microAmp;

        const macroRaw = Math.max(0, Math.min(100, baseKey + targetMacroVal));
        targetMacroBuffer[idx] = Math.round((macroRaw / 100) * 255);

        const targetSceneRaw = Math.max(0, Math.min(100, baseKey + targetMacroVal + microVal));
        targetSceneBuffer[idx] = Math.round((targetSceneRaw / 100) * 255);

        const distractorSceneRaw = Math.max(
          0,
          Math.min(100, baseKey + distractorMacroVal + microVal),
        );
        distractorSceneBuffer[idx] = Math.round((distractorSceneRaw / 100) * 255);
      }
    }

    const otsuByte = calculateOtsuThreshold(targetMacroBuffer);
    const promptBuffer = new Uint8Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      promptBuffer[i] = targetMacroBuffer[i] <= otsuByte ? 15 : 248;
    }

    const isA = Math.random() < 0.5;
    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      promptNotanBuffer: Array.from(promptBuffer),
      notanSceneBufferA: isA ? Array.from(targetSceneBuffer) : Array.from(distractorSceneBuffer),
      notanSceneBufferB: isA ? Array.from(distractorSceneBuffer) : Array.from(targetSceneBuffer),
      notanFieldDim: fieldDim,
      correctNotanChoice: isA ? 'A' : 'B',
      tolerance: 0,
    };
  }

  // 8. TD_PALETTE_2AFC (4AFC) 自顶向下调性基底归位
  const baseH = Math.floor(Math.random() * 360);
  const baseS = Math.floor(Math.random() * 40) + 40;
  const baseV = Math.floor(Math.random() * 40) + 40;
  const promptDominantColor: [number, number, number] = [baseH, baseS, baseV];

  const makePatternTiles = (domH: number, domS: number, domV: number) => {
    const tiles: PaletteTile[] = [];
    const gridSize = 3;
    const tileDim = ABSTRACTION_2AFC_SIZE / gridSize;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const jitterH = (domH + (Math.floor(Math.random() * 36) - 18) + 360) % 360;
        const jitterS = Math.max(10, Math.min(100, domS + (Math.floor(Math.random() * 26) - 13)));
        const jitterV = Math.max(15, Math.min(100, domV + (Math.floor(Math.random() * 26) - 13)));
        tiles.push({
          x: c * tileDim,
          y: r * tileDim,
          w: tileDim,
          h: tileDim,
          hsv: [jitterH, jitterS, jitterV],
          weight: 1,
        });
      }
    }
    return tiles;
  };

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

~~~~~act
write_file
src/utils/abstraction/hitDetection.ts
~~~~~
~~~~~typescript
import type { AbstractionHitResult, AbstractionQuestionData } from './types';

export function checkAbstractionHit(
  userAnswer: number | 'A' | 'B' | [number, number, number],
  question: AbstractionQuestionData,
): AbstractionHitResult {
  const { mode } = question;

  if (mode === 'GESTURE_AXIS') {
    const userDeg = typeof userAnswer === 'number' ? userAnswer : 0;
    const targetDeg = question.targetAngleDeg ?? 0;
    let diff = Math.abs(userDeg - targetDeg);
    diff = Math.min(diff, 180 - diff);
    const isHit = diff <= question.tolerance;

    return {
      isHit,
      userValue: userDeg,
      targetValue: targetDeg,
      errorValue: Math.round(diff * 10) / 10,
      tolerance: question.tolerance,
    };
  }

  if (mode === 'POLYGON_DECIMATION') {
    const choice = userAnswer as 'A' | 'B';
    const isHit = choice === question.correctPolyChoice;
    return {
      isHit,
      userChoice: choice,
      correctChoice: question.correctPolyChoice,
      errorValue: isHit ? 0 : 1,
      tolerance: 0,
    };
  }

  if (mode === 'NOTAN_THRESHOLD') {
    const userVal = typeof userAnswer === 'number' ? userAnswer : 50;
    const targetVal = question.idealNotanThreshold ?? 50;
    const errorVal = Math.round(Math.abs(userVal - targetVal) * 10) / 10;
    const isHit = errorVal <= question.tolerance;

    return {
      isHit,
      userValue: userVal,
      targetValue: targetVal,
      errorValue: errorVal,
      tolerance: question.tolerance,
    };
  }

  if (mode === 'PALETTE_CLUSTERING') {
    const chosenIndex = typeof userAnswer === 'number' ? userAnswer : 0;
    const isHit = chosenIndex === question.correctPaletteIndex;
    return {
      isHit,
      userChoiceIndex: chosenIndex,
      correctIndex: question.correctPaletteIndex,
      errorValue: isHit ? 0 : 1,
      tolerance: question.tolerance,
    };
  }

  if (mode === 'TD_PALETTE_2AFC') {
    const chosenIndex =
      typeof userAnswer === 'number'
        ? userAnswer
        : userAnswer === 'A'
          ? 0
          : userAnswer === 'B'
            ? 1
            : 0;
    const isHit = chosenIndex === question.correctPatternIndex;
    return {
      isHit,
      userChoiceIndex: chosenIndex,
      correctIndex: question.correctPatternIndex,
      errorValue: isHit ? 0 : 1,
      tolerance: 0,
    };
  }

  // 2AFC Top-Down 通用处理
  const choice = userAnswer as 'A' | 'B';
  let correctChoice: 'A' | 'B' = 'A';
  if (mode === 'TD_GESTURE_2AFC') correctChoice = question.correctParticleChoice ?? 'A';
  if (mode === 'TD_HULL_2AFC') correctChoice = question.correctHullChoice ?? 'A';
  if (mode === 'TD_NOTAN_2AFC') correctChoice = question.correctNotanChoice ?? 'A';

  const isHit = choice === correctChoice;
  return {
    isHit,
    userChoice: choice,
    correctChoice,
    errorValue: isHit ? 0 : 1,
    tolerance: 0,
  };
}
~~~~~

~~~~~act
write_file
src/utils/abstraction/index.ts
~~~~~
~~~~~typescript
export * from './types';
export * from './pca';
export * from './polygon';
export * from './questionGenerator';
export * from './hitDetection';
~~~~~

~~~~~act
write_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript
export * from './abstraction/index';
~~~~~

#### Acts 3: 拆分 `src/components/abstraction/` 题型子视图组件

~~~~~act
write_file
src/components/abstraction/GestureAxisView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../../hooks/useTrackPointer';
import { ABSTRACTION_CANVAS_SIZE, type AbstractionHitResult, type AbstractionQuestionData } from '../../utils/abstraction';
import { drawParticlesCanvas } from '../../utils/canvas/drawParticles';

interface GestureAxisViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showCanvasHints?: boolean;
}

export function GestureAxisView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showCanvasHints = true,
}: GestureAxisViewProps) {
  const [sliderVal, setSliderVal] = useState<number>(90);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    max: 180,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: setSliderVal,
    onCommit: (committedVal) => {
      if (!disabled && !showAnswer) onAnswer(committedVal);
    },
  });

  const activeVal = hoverVal !== null ? hoverVal : sliderVal;

  useEffect(() => {
    drawParticlesCanvas(
      canvasRef.current,
      question.particles,
      ABSTRACTION_CANVAS_SIZE,
      showAnswer ? question.targetAngleDeg : activeVal,
      showAnswer ? '#22C55E' : '#6366F1',
    );
  }, [question.particles, activeVal, showAnswer, question.targetAngleDeg]);

  const unit = '°';

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          <Eye className="w-3.5 h-3.5 text-indigo-600" />
          旋转主轴对齐粒子群动态流向 (0°~180°)
        </div>
      )}

      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={ABSTRACTION_CANVAS_SIZE}
          height={ABSTRACTION_CANVAS_SIZE}
          className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm"
        />
      </div>

      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>动态势线角度:</span>
          <span className="font-mono text-base font-black text-indigo-600">
            {showAnswer ? `${userAnswer?.userValue ?? sliderVal}${unit}` : `${activeVal}${unit}`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-slate-400 text-xs">0{unit}</span>

          <div
            {...pointerProps}
            style={
              hitMargin > 0
                ? {
                    paddingLeft: `${hitMargin}px`,
                    paddingRight: `${hitMargin}px`,
                    marginLeft: `-${hitMargin}px`,
                    marginRight: `-${hitMargin}px`,
                    paddingTop: '6px',
                    paddingBottom: '6px',
                    marginTop: '-6px',
                    marginBottom: '-6px',
                  }
                : undefined
            }
            className={`relative flex-1 flex items-center select-none touch-none ${
              !showAnswer && !disabled ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <div
              ref={trackRef}
              className="relative w-full h-7 rounded-xl bg-slate-200 border border-slate-300/80 shadow-inner flex items-center overflow-hidden"
            >
              <div
                className="absolute top-0 bottom-0 left-0 bg-indigo-500/20"
                style={{ width: `${(activeVal / 180) * 100}%` }}
              />

              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                  style={{ left: `${(activeVal / 180) * 100}%` }}
                />
              )}

              {showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                  style={{ left: `${((question.targetAngleDeg ?? 0) / 180) * 100}%` }}
                />
              )}
            </div>
          </div>

          <span className="font-bold font-mono text-slate-400 text-xs">180{unit}</span>
        </div>

        {showAnswer && (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              绝对真理值:{' '}
              <span className="font-bold text-slate-800 font-mono">
                {question.targetAngleDeg}
                {unit}
              </span>
            </span>
            <span
              className={
                userAnswer?.isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'
              }
            >
              误差: {userAnswer?.errorValue}
              {unit} (容错: ±{question.tolerance}
              {unit})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/abstraction/NotanThresholdView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../../hooks/useTrackPointer';
import {
  ABSTRACTION_2AFC_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../../utils/abstraction';
import { drawNotanNoiseField, drawRawGrayscaleNoiseField } from '../../utils/canvas/drawNotanField';

interface NotanThresholdViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showCanvasHints?: boolean;
}

export function NotanThresholdView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showCanvasHints = true,
}: NotanThresholdViewProps) {
  const [sliderVal, setSliderVal] = useState<number>(50);
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);

  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    max: 100,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: setSliderVal,
    onCommit: (committedVal) => {
      if (!disabled && !showAnswer) onAnswer(committedVal);
    },
  });

  const activeVal = hoverVal !== null ? hoverVal : sliderVal;

  useEffect(() => {
    if (question.notanBuffer) {
      drawRawGrayscaleNoiseField(
        canvasRefA.current,
        question.notanBuffer,
        question.notanFieldDim ?? 120,
        ABSTRACTION_2AFC_SIZE,
      );
      drawNotanNoiseField(
        canvasRefB.current,
        question.notanBuffer,
        question.notanFieldDim ?? 120,
        showAnswer ? question.idealNotanThreshold : activeVal,
        ABSTRACTION_2AFC_SIZE,
      );
    }
  }, [question.notanBuffer, question.notanFieldDim, question.idealNotanThreshold, activeVal, showAnswer]);

  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          <Eye className="w-3.5 h-3.5 text-indigo-600" />
          观察左侧灰阶原图，在下方滑块点击/调节右侧最佳黑白二值截断点
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
        <div className="flex flex-col items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            灰阶原图 (Raw Scene)
          </span>
          <div className="w-full flex justify-center bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
            <canvas
              ref={canvasRefA}
              width={ABSTRACTION_2AFC_SIZE}
              height={ABSTRACTION_2AFC_SIZE}
              className="w-full max-w-[240px] aspect-square rounded-xl shadow-sm border border-slate-200"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
            二值显影 (Notan Output)
          </span>
          <div className="w-full flex justify-center bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
            <canvas
              ref={canvasRefB}
              width={ABSTRACTION_2AFC_SIZE}
              height={ABSTRACTION_2AFC_SIZE}
              className="w-full max-w-[240px] aspect-square rounded-xl shadow-sm border border-slate-200"
            />
          </div>
        </div>
      </div>

      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>二值化截断阈值:</span>
          <span className="font-mono text-base font-black text-indigo-600">
            {showAnswer ? `${userAnswer?.userValue ?? sliderVal}%` : `${activeVal}%`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-slate-400 text-xs">0%</span>

          <div
            {...pointerProps}
            style={
              hitMargin > 0
                ? {
                    paddingLeft: `${hitMargin}px`,
                    paddingRight: `${hitMargin}px`,
                    marginLeft: `-${hitMargin}px`,
                    marginRight: `-${hitMargin}px`,
                    paddingTop: '6px',
                    paddingBottom: '6px',
                    marginTop: '-6px',
                    marginBottom: '-6px',
                  }
                : undefined
            }
            className={`relative flex-1 flex items-center select-none touch-none ${
              !showAnswer && !disabled ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <div
              ref={trackRef}
              className="relative w-full h-7 rounded-xl bg-slate-200 border border-slate-300/80 shadow-inner flex items-center overflow-hidden"
            >
              <div
                className="absolute top-0 bottom-0 left-0 bg-indigo-500/20"
                style={{ width: `${activeVal}%` }}
              />

              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                  style={{ left: `${activeVal}%` }}
                />
              )}

              {showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                  style={{ left: `${question.idealNotanThreshold ?? 50}%` }}
                />
              )}
            </div>
          </div>

          <span className="font-bold font-mono text-slate-400 text-xs">100%</span>
        </div>

        {showAnswer && (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              最佳素描阈值:{' '}
              <span className="font-bold text-slate-800 font-mono">
                {question.idealNotanThreshold}%
              </span>
            </span>
            <span
              className={
                userAnswer?.isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'
              }
            >
              误差: {userAnswer?.errorValue}% (容错: ±{question.tolerance}%)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/abstraction/TopDown2AfcView.tsx
~~~~~
~~~~~typescript
import { Columns } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  ABSTRACTION_2AFC_SIZE,
  ABSTRACTION_CANVAS_SIZE,
  ABSTRACTION_THUMB_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../../utils/abstraction';
import { drawNotanNoiseField, drawRawGrayscaleNoiseField } from '../../utils/canvas/drawNotanField';
import { drawParticlesCanvas, drawSpinePromptCanvas } from '../../utils/canvas/drawParticles';
import { drawPolygonCanvas } from '../../utils/canvas/drawPolygon';
import { AnswerDiagnosticBar } from '../common/AnswerDiagnosticBar';
import { Choice2AfcContainer } from '../common/Choice2AfcContainer';

interface TopDown2AfcViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function TopDown2AfcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: TopDown2AfcViewProps) {
  const { mode } = question;
  const isPoly = mode === 'POLYGON_DECIMATION';

  const canvasMainRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const canvasThumbRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  useEffect(() => {
    if (isPoly && question.detailedPolygon) {
      drawPolygonCanvas({ canvas: canvasMainRef.current, vertices: question.detailedPolygon, size: ABSTRACTION_CANVAS_SIZE });
      drawPolygonCanvas({ canvas: canvasRefA.current, vertices: question.simplifiedOptions?.[0], size: ABSTRACTION_2AFC_SIZE, fillColor: '#4F46E5' });
      drawPolygonCanvas({ canvas: canvasRefB.current, vertices: question.simplifiedOptions?.[1], size: ABSTRACTION_2AFC_SIZE, fillColor: '#4F46E5' });
    } else if (mode === 'TD_GESTURE_2AFC') {
      drawSpinePromptCanvas(canvasThumbRef.current, question.promptSpine, ABSTRACTION_THUMB_SIZE);
      drawParticlesCanvas(canvasRefA.current, question.particlesA, ABSTRACTION_2AFC_SIZE);
      drawParticlesCanvas(canvasRefB.current, question.particlesB, ABSTRACTION_2AFC_SIZE);
    } else if (mode === 'TD_HULL_2AFC') {
      drawPolygonCanvas({ canvas: canvasThumbRef.current, vertices: question.promptHull, size: ABSTRACTION_THUMB_SIZE, fillColor: '#4F46E5', strokeColor: '#3730A3' });
      drawPolygonCanvas({ canvas: canvasRefA.current, vertices: question.hullDetailedA, size: ABSTRACTION_2AFC_SIZE });
      drawPolygonCanvas({ canvas: canvasRefB.current, vertices: question.hullDetailedB, size: ABSTRACTION_2AFC_SIZE });
    } else if (mode === 'TD_NOTAN_2AFC') {
      if (question.promptNotanBuffer && question.notanSceneBufferA && question.notanSceneBufferB) {
        drawRawGrayscaleNoiseField(canvasThumbRef.current, question.promptNotanBuffer, question.notanFieldDim ?? 120, ABSTRACTION_THUMB_SIZE);
        drawRawGrayscaleNoiseField(canvasRefA.current, question.notanSceneBufferA, question.notanFieldDim ?? 120, ABSTRACTION_2AFC_SIZE);
        drawRawGrayscaleNoiseField(canvasRefB.current, question.notanSceneBufferB, question.notanFieldDim ?? 120, ABSTRACTION_2AFC_SIZE);
      }
    }
  }, [mode, isPoly, question]);

  const handleSelectChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelectedChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );

  const isTargetA = isPoly
    ? question.correctPolyChoice === 'A'
    : userAnswer?.correctChoice === 'A' ||
      question.correctParticleChoice === 'A' ||
      question.correctHullChoice === 'A' ||
      question.correctNotanChoice === 'A';
  const isTargetB = !isTargetA;

  return (
    <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          <Columns className="w-3.5 h-3.5 text-indigo-600" />
          {isPoly ? '选择保留了主要转折大形的精简项' : '判别哪一侧具象细节符合上方骨架'}
        </div>
      )}

      {!isPoly && (
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            概括基准 (Prompt)
          </span>
          <canvas
            ref={canvasThumbRef}
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className="w-24 h-24 rounded-xl border border-slate-200 shadow-sm"
          />
        </div>
      )}

      {isPoly && (
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            多边形原图
          </span>
          <canvas
            ref={canvasMainRef}
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-40 h-40 rounded-xl border border-slate-200 shadow-sm"
          />
        </div>
      )}

      <Choice2AfcContainer
        optionA={{
          key: 'A',
          title: '区域 A (键 1)',
          isCorrect: isTargetA,
          content: (
            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefA}
                width={ABSTRACTION_2AFC_SIZE}
                height={ABSTRACTION_2AFC_SIZE}
                className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
              />
            </div>
          ),
        }}
        optionB={{
          key: 'B',
          title: '区域 B (键 2)',
          isCorrect: isTargetB,
          content: (
            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefB}
                width={ABSTRACTION_2AFC_SIZE}
                height={ABSTRACTION_2AFC_SIZE}
                className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
              />
            </div>
          ),
        }}
        selectedChoice={selectedChoice}
        showAnswer={showAnswer}
        disabled={disabled}
        enableKeyboardShortcuts={true}
        onSelect={handleSelectChoice}
      />

      {showAnswer && (
        <AnswerDiagnosticBar
          isHit={Boolean(userAnswer?.isHit)}
          successTitle="瞬时结构透视识别完全正确！"
          failTitle="结构透视判断出现偏差"
          subText={`(正确匹配为: 区域 ${userAnswer?.correctChoice ?? (isTargetA ? 'A' : 'B')})`}
        />
      )}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/abstraction/PaletteClusteringView.tsx
~~~~~
~~~~~typescript
import { Sparkles } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  ABSTRACTION_CANVAS_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../../utils/abstraction';
import { drawPaletteTilesCanvas } from '../../utils/canvas/drawPaletteTiles';
import { hsvToHex } from '../../utils/colorUtils';

interface PaletteClusteringViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (idx: number) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function PaletteClusteringView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: PaletteClusteringViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    setSelectedIdx(null);
  }, [question.id]);

  useEffect(() => {
    drawPaletteTilesCanvas(canvasRef.current, question.paletteTiles, ABSTRACTION_CANVAS_SIZE);
  }, [question.paletteTiles]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || showAnswer) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const idx = Number.parseInt(e.key, 10) - 1;
        setSelectedIdx(idx);
        onAnswer(idx);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, showAnswer, onAnswer]);

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          选出最能代表全局主调的加权主色 (键 1-4)
        </div>
      )}

      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={ABSTRACTION_CANVAS_SIZE}
          height={ABSTRACTION_CANVAS_SIZE}
          className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm"
        />
      </div>

      <div className="grid grid-cols-4 gap-3 w-full">
        {question.paletteOptions?.map((hsv, idx) => {
          const isSelected = selectedIdx === idx;
          const isTarget = idx === question.correctPaletteIndex;
          const hex = hsvToHex(...hsv);

          let border = 'border-slate-200';
          if (showAnswer) {
            border = isTarget
              ? 'border-emerald-500 ring-2 ring-emerald-500/40'
              : isSelected
                ? 'border-rose-400 opacity-60'
                : 'border-slate-200 opacity-40';
          } else if (isSelected) {
            border = 'border-indigo-600 ring-2 ring-indigo-500/30';
          }

          return (
            <button
              key={`palette-option-${idx}-${hex}`}
              type="button"
              disabled={disabled || showAnswer}
              onClick={() => {
                setSelectedIdx(idx);
                onAnswer(idx);
              }}
              className={`p-1.5 rounded-2xl border bg-white transition-all duration-150 active:scale-95 cursor-pointer ${border}`}
            >
              <div
                className="w-full aspect-square rounded-xl shadow-inner border border-white/60"
                style={{ backgroundColor: hex }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/abstraction/TopDownPatternView.tsx
~~~~~
~~~~~typescript
import { Check, Sparkles, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  ABSTRACTION_2AFC_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../../utils/abstraction';
import { drawPaletteTilesCanvas } from '../../utils/canvas/drawPaletteTiles';
import { hsvToHex } from '../../utils/colorUtils';

interface TopDownPatternViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (idx: number) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function TopDownPatternView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: TopDownPatternViewProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const patternCanvasRef0 = useRef<HTMLCanvasElement | null>(null);
  const patternCanvasRef1 = useRef<HTMLCanvasElement | null>(null);
  const patternCanvasRef2 = useRef<HTMLCanvasElement | null>(null);
  const patternCanvasRef3 = useRef<HTMLCanvasElement | null>(null);

  const patternRefs = [patternCanvasRef0, patternCanvasRef1, patternCanvasRef2, patternCanvasRef3];

  useEffect(() => {
    setSelectedIdx(null);
  }, [question.id]);

  useEffect(() => {
    if (question.palettePatternOptions) {
      question.palettePatternOptions.forEach((pat, i) => {
        if (patternRefs[i].current) {
          drawPaletteTilesCanvas(patternRefs[i].current, pat, ABSTRACTION_2AFC_SIZE);
        }
      });
    }
  }, [question.palettePatternOptions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || showAnswer) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const idx = Number.parseInt(e.key, 10) - 1;
        setSelectedIdx(idx);
        onAnswer(idx);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, showAnswer, onAnswer]);

  const promptHex = question.promptDominantColor
    ? hsvToHex(...question.promptDominantColor)
    : '#6366F1';
  const targetIdx = question.correctPatternIndex ?? 0;
  const chosenIdx = userAnswer?.userChoiceIndex ?? selectedIdx;

  return (
    <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          观察上方基准主色，选出以此为基调的拼贴画面 (键 1-4)
        </div>
      )}

      <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          基准主调色
        </span>
        <div
          className="w-16 h-16 rounded-2xl border-4 border-white shadow-md ring-1 ring-slate-200"
          style={{ backgroundColor: promptHex }}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
        {question.palettePatternOptions?.map((pat, idx) => {
          const isSelected = chosenIdx === idx;
          const isTarget = idx === targetIdx;
          const keyLabel = (idx + 1).toString();
          const patternKey = `td-pattern-card-${question.id}-${pat.map((t) => `${t.x}_${t.y}_${t.hsv.join('_')}`).join('-')}`;

          let border = 'border-slate-200/90 hover:border-indigo-300 hover:shadow-md bg-slate-50';
          if (showAnswer) {
            if (isTarget) {
              border = 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md';
            } else if (isSelected) {
              border = 'bg-rose-50/50 border-rose-400 shadow-sm';
            } else {
              border = 'bg-slate-50/60 border-slate-200 opacity-50';
            }
          } else if (isSelected) {
            border = 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md';
          }

          return (
            <button
              key={patternKey}
              type="button"
              disabled={disabled || showAnswer}
              onClick={() => {
                setSelectedIdx(idx);
                onAnswer(idx);
              }}
              className={`group flex flex-col items-center gap-2.5 p-3 rounded-2xl border transition-all duration-200 text-left active:scale-[0.98] ${border}`}
            >
              <div className="flex items-center justify-between w-full px-1">
                <span className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                  <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                    {keyLabel}
                  </span>
                  画面 {keyLabel}
                </span>
                {showAnswer && isTarget && (
                  <Check className="w-4 h-4 text-emerald-600 font-extrabold" />
                )}
              </div>

              <div className="w-full aspect-square bg-white p-1 rounded-xl border border-slate-200 shadow-inner flex items-center justify-center">
                <canvas
                  ref={patternRefs[idx]}
                  width={ABSTRACTION_2AFC_SIZE}
                  height={ABSTRACTION_2AFC_SIZE}
                  className="w-full aspect-square rounded-lg shadow-sm"
                />
              </div>
            </button>
          );
        })}
      </div>

      {showAnswer && (
        <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-xl ${
                userAnswer?.isHit
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {userAnswer?.isHit ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </div>
            <div className="text-xs">
              <span className="font-bold text-slate-800">
                {userAnswer?.isHit ? '调性基底寻源匹配完全正确！' : '色彩调性感知出现偏差'}
              </span>
              <span className="text-slate-400 ml-2">(正确匹配为: 画面 {targetIdx + 1})</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
~~~~~

#### Acts 4: 重构 `src/components/AbstractionCanvas.tsx` 为顶层分发器

~~~~~act
write_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript
import type { AbstractionHitResult, AbstractionQuestionData } from '../utils/abstraction';
import { GestureAxisView } from './abstraction/GestureAxisView';
import { NotanThresholdView } from './abstraction/NotanThresholdView';
import { PaletteClusteringView } from './abstraction/PaletteClusteringView';
import { TopDown2AfcView } from './abstraction/TopDown2AfcView';
import { TopDownPatternView } from './abstraction/TopDownPatternView';

interface AbstractionCanvasProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (val: number | 'A' | 'B') => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function AbstractionCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showCanvasHints = true,
}: AbstractionCanvasProps) {
  const { mode } = question;

  if (mode === 'GESTURE_AXIS') {
    return (
      <GestureAxisView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(val) => onAnswer(val)}
        disabled={disabled}
        hitMargin={hitMargin}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'NOTAN_THRESHOLD') {
    return (
      <NotanThresholdView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(val) => onAnswer(val)}
        disabled={disabled}
        hitMargin={hitMargin}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'PALETTE_CLUSTERING') {
    return (
      <PaletteClusteringView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(idx) => onAnswer(idx)}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'TD_PALETTE_2AFC') {
    return (
      <TopDownPatternView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(idx) => onAnswer(idx)}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  // 默认 Top-Down 2AFC 视图 (TD_GESTURE_2AFC, TD_HULL_2AFC, TD_NOTAN_2AFC, POLYGON_DECIMATION)
  return (
    <TopDown2AfcView
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={(choice) => onAnswer(choice)}
      disabled={disabled}
      showCanvasHints={showCanvasHints}
    />
  );
}
~~~~~

### 下一步建议
- **执行构建与测试检查**：运行 `npm test` 和 `npm run build` 确保拆分后视知觉概括模块的所有类型、事件及绘图逻辑完全正常。
- **继续拆分 P1 任务**：继续对正负形感知模块（`NegativeSpaceCanvas.tsx` 与 `negativeSpaceUtils.ts`）执行同样的模块化拆分。
