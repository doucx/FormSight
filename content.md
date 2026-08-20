好的，我将为你实现“视知觉概括能力”（Visual Abstraction）的完整训练体系，包含自底向上的 4 张本质提炼卡片与自顶向下的 4 张逆向结构匹配（2AFC）卡片，共计 8 张核心卡片。

## [WIP] feat: 增加视知觉概括能力训练模块与八张核心卡片

### 用户需求
在 FormSight 系统中新增“视知觉概括”领域模块（`abstraction`），并完整实现 8 张训练卡片：
1. **动态势线提取** (`abs_gesture_axis`)：散点流向 PCA 第一主成分角度提取。
2. **折线低模大形** (`abs_polygon_decimation`)：细碎多边形 RDP 核心拐点大形匹配（2AFC）。
3. **黑白素描归组** (`abs_notan_threshold`)：灰阶场景二值化 Notan 明度大关系滑块调节。
4. **主调色群提炼** (`abs_palette_clustering`)：多色拼贴图案 OKLab 面积加权主色提炼（4AFC）。
5. **动态势线寻源** (`abs_td_gesture_2afc`)：给定势线骨架，在两个点群中寻源（2AFC）。
6. **几何大模寻形** (`abs_td_hull_2afc`)：给定低模大形，辨识谁是该骨架上的高频剪影（2AFC）。
7. **黑白素描骨架** (`abs_td_notan_2afc`)：给定 Notan 块面，辨识具象灰阶素描大关系（2AFC）。
8. **调性基底归位** (`abs_td_palette_2afc`)：给定 3 阶基调色谱，辨识所属的复杂混色图案（2AFC）。

### 评论
该模块将造型认知训练推进到了高级的“去噪、提炼与结构透视”阶段。将自底向上（Bottom-Up）与自顶向下（Top-Down）成对设计，构成了完整的视知觉认知闭环。

### 目标
1. 扩充系统基础类型与持久化数据库 Schema，支持 `abstraction` 领域。
2. 创建确定性数学与程序化生成核心库 `src/utils/abstractionUtils.ts`（包含 PCA 主轴计算、Ramer-Douglas-Peucker 折线简化、Notan 灰阶合成与加权 OKLab 调色板）。
3. 构建专属交互与渲染画布 `src/components/AbstractionCanvas.tsx`，支持手势旋转、连续滑块调节与 2AFC/4AFC 快速对比和揭晓叠印。
4. 配置卡片元数据、领域路由、训练插件以及全局统计整合。

### 基本原理
- **数学真理（Ground Truth）**：通过 PCA 协方差矩阵特征向量确定绝对动态线；通过 RDP 算法截断误差确定最优低模；通过 OKLab 空间色度与亮度加权质心确定主色；通过精确的几何与扰动变换生成具有唯一正确答案的 2AFC 干扰项。
- **全栈无缝接入**：复用 FormSight 的 `useTrainingSession`、自适应难度升降机制、快捷键系统（1/2/Space/Esc）与 HiDPI Canvas 渲染管道。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #comp/interfaces #concept/ui #concept/executor #scope/core #scope/ux #scope/api #ai/delegate #task/domain/ui #task/object/abstraction-module #task/action/implementation #task/state/begin #task/status/active

---

### Script

#### Acts 1: 扩展核心类型定义与数据库 Schema

~~~~~act
patch_file
src/types/card.ts
~~~~~
~~~~~typescript.old
export type SensoryTargetTag = 'geometry' | 'color' | 'relative_color' | 'negative_space';

export type CognitiveSkillTag =
  | 'spatial_orientation'
  | 'color_fidelity'
  | 'illusion_invariance'
  | 'proportion'
  | 'visual_memory';

export type InteractionTag = 'continuous_slider' | 'point_click' | 'choice_2afc' | 'choice_nafc';
~~~~~
~~~~~typescript.new
export type SensoryTargetTag =
  | 'geometry'
  | 'color'
  | 'relative_color'
  | 'negative_space'
  | 'abstraction';

export type CognitiveSkillTag =
  | 'spatial_orientation'
  | 'color_fidelity'
  | 'illusion_invariance'
  | 'proportion'
  | 'visual_memory'
  | 'abstraction'
  | 'gesture_flow'
  | 'notan_grouping';

export type InteractionTag = 'continuous_slider' | 'point_click' | 'choice_2afc' | 'choice_nafc';
~~~~~

~~~~~act
patch_file
src/utils/db/schema.ts
~~~~~
~~~~~typescript.old
export type TrainingDomain = 'star' | 'color' | 'relative_color' | 'negative_space';
~~~~~
~~~~~typescript.new
export type TrainingDomain = 'star' | 'color' | 'relative_color' | 'negative_space' | 'abstraction';
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
export interface NegativeSpaceSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
}

export interface GlobalSettings {
~~~~~
~~~~~typescript.new
export interface NegativeSpaceSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
}

export interface AbstractionSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
}

export interface GlobalSettings {
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
    neg_area_comparison_2afc: { ...DEFAULT_BASE_SETTINGS },
    neg_vertex_fitting: { ...DEFAULT_BASE_SETTINGS },
    neg_shape_match_2afc: { ...DEFAULT_BASE_SETTINGS },
  },
};
~~~~~
~~~~~typescript.new
    neg_area_comparison_2afc: { ...DEFAULT_BASE_SETTINGS },
    neg_vertex_fitting: { ...DEFAULT_BASE_SETTINGS },
    neg_shape_match_2afc: { ...DEFAULT_BASE_SETTINGS },
    abs_gesture_axis: { ...DEFAULT_BASE_SETTINGS, sliderHitMargin: 12, showToleranceBand: true },
    abs_polygon_decimation: { ...DEFAULT_BASE_SETTINGS },
    abs_notan_threshold: { ...DEFAULT_BASE_SETTINGS, sliderHitMargin: 12, showToleranceBand: true },
    abs_palette_clustering: { ...DEFAULT_BASE_SETTINGS },
    abs_td_gesture_2afc: { ...DEFAULT_BASE_SETTINGS },
    abs_td_hull_2afc: { ...DEFAULT_BASE_SETTINGS },
    abs_td_notan_2afc: { ...DEFAULT_BASE_SETTINGS },
    abs_td_palette_2afc: { ...DEFAULT_BASE_SETTINGS },
  },
};
~~~~~

#### Acts 2: 创建视知觉概括核心数学与题目生成算法库

~~~~~act
write_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript
import type { Point } from '../types';
import { hsvToHex } from './colorUtils';
import { calcDeltaEOk, getTargetDeltaEForLevel, hsvToOkLab } from './oklchUtils';

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

// Notan 几何图元定义
export interface NotanShape {
  type: 'circle' | 'rect' | 'polygon';
  points?: Point[];
  cx?: number;
  cy?: number;
  r?: number;
  w?: number;
  h?: number;
  baseVal: number; // 基础明度 (0..100)
  invertInDistractor?: boolean;
}

// 色彩马赛克单元
export interface PaletteTile {
  x: number;
  y: number;
  w: number;
  h: number;
  hsv: [number, number, number];
  weight: number;
}

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
  notanShapes?: NotanShape[];
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

  promptNotanMask?: NotanShape[]; // 题干 Notan
  notanSceneA?: NotanShape[];
  notanSceneB?: NotanShape[];
  correctNotanChoice?: 'A' | 'B';

  promptPaletteBand?: [number, number, number][]; // 题干 3 色色谱
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
 * 经典 Ramer-Douglas-Peucker (RDP) 多边形顶点精简算法
 */
function perpendicularDistance(p: Point, p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return Math.hypot(p.x - p1.x, p.y - p1.y);
  return Math.abs(dy * p.x - dx * p.y + p2.x * p1.y - p2.y * p1.x) / len;
}

export function rdpSimplify(points: Point[], epsilon: number): Point[] {
  if (points.length <= 3) return points;

  let dmax = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    const recResults1 = rdpSimplify(points.slice(0, index + 1), epsilon);
    const recResults2 = rdpSimplify(points.slice(index), epsilon);
    return recResults1.slice(0, -1).concat(recResults2);
  }
  return [points[0], points[end]];
}

/**
 * 生成带方向性的散点流
 */
function generateFlowParticles(
  angleDeg: number,
  spreadRatio: number,
  size = ABSTRACTION_CANVAS_SIZE,
): Point[] {
  const rad = (angleDeg * Math.PI) / 180;
  const count = 40 + Math.floor(Math.random() * 20);
  const cx = size / 2;
  const cy = size / 2;
  const majorLen = size * 0.38;
  const minorLen = majorLen * spreadRatio;

  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const u = (Math.random() * 2 - 1) * majorLen;
    const v = (Math.random() * 2 - 1) * minorLen;

    const x = Math.round(cx + u * Math.cos(rad) - v * Math.sin(rad));
    const y = Math.round(cy + u * Math.sin(rad) + v * Math.cos(rad));
    points.push({
      x: Math.max(15, Math.min(size - 15, x)),
      y: Math.max(15, Math.min(size - 15, y)),
    });
  }
  return points;
}

/**
 * 生成细碎多边形
 */
function generateDetailedPolygon(verticesCount: number, size = ABSTRACTION_CANVAS_SIZE): Point[] {
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
 * 生成题目总工厂
 */
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
    // 离心率：Level 1 为 0.15 (极明显)，Level 35 为 0.65 (更难)
    const spreadRatio = 0.15 + t * 0.5;
    const particles = generateFlowParticles(targetAngleDeg, spreadRatio);
    const realPCA = calcPCAOrientation(particles);
    const maxTol = 18.0;
    const minTol = 2.5;
    const tolerance = Math.round(maxTol * (minTol / maxTol) ** t * 10) / 10;

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
    const vertCount = 18 + Math.floor(t * 12);
    const detailedPolygon = generateDetailedPolygon(vertCount);

    // 计算标准 RDP 简化 (目标保留 4~6 顶点)
    let eps = 25;
    let simplified = rdpSimplify(detailedPolygon, eps);
    let attempts = 0;
    while ((simplified.length < 4 || simplified.length > 7) && attempts < 15) {
      attempts++;
      eps = simplified.length < 4 ? eps * 0.75 : eps * 1.35;
      simplified = rdpSimplify(detailedPolygon, eps);
    }

    // 生成干扰项：随机微调/丢失一个关键大顶点
    const distractor = simplified.map((p) => ({ ...p }));
    const modIdx = Math.floor(Math.random() * distractor.length);
    const perturbDist = 35 * (1 - t * 0.6); // 随 Level 变小
    distractor[modIdx].x += Math.round((Math.random() * 2 - 1) * perturbDist);
    distractor[modIdx].y += Math.round((Math.random() * 2 - 1) * perturbDist);

    const isA = Math.random() < 0.5;
    const simplifiedOptions = isA ? [simplified, distractor] : [distractor, simplified];

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
    const notanShapes: NotanShape[] = [
      {
        type: 'rect',
        cx: 200,
        cy: 200,
        w: 360,
        h: 360,
        baseVal: Math.floor(Math.random() * 20) + 75,
      },
      {
        type: 'circle',
        cx: 160 + Math.random() * 80,
        cy: 160 + Math.random() * 80,
        r: 60 + Math.random() * 40,
        baseVal: Math.floor(Math.random() * 20) + 20,
      },
      {
        type: 'rect',
        cx: 140 + Math.random() * 120,
        cy: 220 + Math.random() * 60,
        w: 120 + Math.random() * 60,
        h: 80 + Math.random() * 40,
        baseVal: Math.floor(Math.random() * 30) + 40,
      },
    ];

    const idealNotanThreshold = 50.0;
    const maxTol = 14.0;
    const minTol = 2.0;
    const tolerance = Math.round(maxTol * (minTol / maxTol) ** t * 10) / 10;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      notanShapes,
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

    // 生成 3 个干扰色
    const distractorDeltaE = 0.12 * (0.018 / 0.12) ** t;
    const distractors: [number, number, number][] = [
      [(baseH + 25 + Math.floor(Math.random() * 15)) % 360, baseS, baseV],
      [(baseH - 25 - Math.floor(Math.random() * 15) + 360) % 360, baseS, baseV],
      [baseH, Math.max(10, baseS - 35), Math.max(20, baseV - 30)],
    ];

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
    const distractorAngle = (targetAngle + 35 * (1 - t * 0.7) + 180) % 180;

    const rad = (targetAngle * Math.PI) / 180;
    const L = ABSTRACTION_THUMB_SIZE * 0.36;
    const cx = ABSTRACTION_THUMB_SIZE / 2;
    const cy = ABSTRACTION_THUMB_SIZE / 2;
    const promptSpine: Point[] = [
      { x: cx - L * Math.cos(rad), y: cy - L * Math.sin(rad) },
      { x: cx + L * Math.cos(rad), y: cy + L * Math.sin(rad) },
    ];

    const partA = generateFlowParticles(targetAngle, 0.25, ABSTRACTION_2AFC_SIZE);
    const partB = generateFlowParticles(distractorAngle, 0.25, ABSTRACTION_2AFC_SIZE);

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
    const promptHull = generateDetailedPolygon(5, ABSTRACTION_THUMB_SIZE);
    const scale = ABSTRACTION_2AFC_SIZE / ABSTRACTION_THUMB_SIZE;
    const targetDetailed = promptHull.map((p) => ({
      x: p.x * scale + (Math.random() * 10 - 5),
      y: p.y * scale + (Math.random() * 10 - 5),
    }));

    const distractorDetailed = generateDetailedPolygon(5, ABSTRACTION_2AFC_SIZE);
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
    const promptNotanMask: NotanShape[] = [
      { type: 'rect', cx: 80, cy: 80, w: 140, h: 140, baseVal: 85 },
      { type: 'circle', cx: 70, cy: 70, r: 35, baseVal: 20 },
      { type: 'rect', cx: 100, cy: 100, w: 50, h: 40, baseVal: 30 },
    ];

    const notanSceneA: NotanShape[] = [
      { type: 'rect', cx: 130, cy: 130, w: 230, h: 230, baseVal: 85 },
      { type: 'circle', cx: 110, cy: 110, r: 55, baseVal: 20 },
      { type: 'rect', cx: 160, cy: 160, w: 80, h: 65, baseVal: 30 },
    ];

    // 干扰项颠倒阴影
    const notanSceneB: NotanShape[] = [
      { type: 'rect', cx: 130, cy: 130, w: 230, h: 230, baseVal: 20 },
      { type: 'circle', cx: 110, cy: 110, r: 55, baseVal: 85 },
      { type: 'rect', cx: 160, cy: 160, w: 80, h: 65, baseVal: 70 },
    ];

    const isA = Math.random() < 0.5;
    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      promptNotanMask,
      notanSceneA: isA ? notanSceneA : notanSceneB,
      notanSceneB: isA ? notanSceneB : notanSceneA,
      correctNotanChoice: isA ? 'A' : 'B',
      tolerance: 0,
    };
  }

  // 8. TD_PALETTE_2AFC 自顶向下调性基底归位 (2AFC)
  const baseH = Math.floor(Math.random() * 360);
  const promptPaletteBand: [number, number, number][] = [
    [baseH, 70, 75],
    [(baseH + 45) % 360, 45, 60],
    [(baseH + 180) % 360, 80, 85],
  ];

  const makeTiles = (shiftH: number) => {
    const tiles: PaletteTile[] = [];
    const size = 3;
    const tileDim = ABSTRACTION_2AFC_SIZE / size;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const pickIdx = (r + c) % 3;
        const color = promptPaletteBand[pickIdx];
        tiles.push({
          x: c * tileDim,
          y: r * tileDim,
          w: tileDim,
          h: tileDim,
          hsv: [(color[0] + shiftH + 360) % 360, color[1], color[2]],
          weight: 1,
        });
      }
    }
    return tiles;
  };

  const patternTarget = makeTiles(0);
  const patternDistractor = makeTiles(45 * (1 - t * 0.6));
  const isA = Math.random() < 0.5;

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    promptPaletteBand,
    patternA: isA ? patternTarget : patternDistractor,
    patternB: isA ? patternDistractor : patternTarget,
    correctPatternChoice: isA ? 'A' : 'B',
    tolerance: 0,
  };
}

/**
 * 答题结果检测与评定
 */
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

  // 2AFC Top-Down 通用处理
  const choice = userAnswer as 'A' | 'B';
  let correctChoice: 'A' | 'B' = 'A';
  if (mode === 'TD_GESTURE_2AFC') correctChoice = question.correctParticleChoice ?? 'A';
  if (mode === 'TD_HULL_2AFC') correctChoice = question.correctHullChoice ?? 'A';
  if (mode === 'TD_NOTAN_2AFC') correctChoice = question.correctNotanChoice ?? 'A';
  if (mode === 'TD_PALETTE_2AFC') correctChoice = question.correctPatternChoice ?? 'A';

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

#### Acts 3: 实现视知觉概括 Canvas 交互与呈现组件

~~~~~act
write_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript
import { Check, Columns, Eye, Sparkles, X } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../hooks/useTrackPointer';
import type { Point } from '../types';
import {
  ABSTRACTION_2AFC_SIZE,
  ABSTRACTION_CANVAS_SIZE,
  ABSTRACTION_THUMB_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
  type NotanShape,
  type PaletteTile,
} from '../utils/abstractionUtils';
import { hsvToHex } from '../utils/colorUtils';

interface AbstractionCanvasProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (val: number | 'A' | 'B') => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
}

// 辅助绘图：绘制散点流
function drawParticles(
  canvas: HTMLCanvasElement | null,
  particles?: Point[],
  size = ABSTRACTION_CANVAS_SIZE,
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

// 辅助绘图：绘制多边形
function drawPolygon(
  canvas: HTMLCanvasElement | null,
  vertices?: Point[],
  size = ABSTRACTION_CANVAS_SIZE,
  fillColor = '#0F172A',
  strokeColor = '#1E293B',
) {
  if (!canvas || !vertices || vertices.length < 3) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    ctx.lineTo(vertices[i].x, vertices[i].y);
  }
  ctx.closePath();

  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// 辅助绘图：绘制 Notan 场景
function drawNotanScene(
  canvas: HTMLCanvasElement | null,
  shapes?: NotanShape[],
  threshold = 50,
  size = ABSTRACTION_CANVAS_SIZE,
) {
  if (!canvas || !shapes) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  for (const s of shapes) {
    const isDark = s.baseVal <= threshold;
    ctx.fillStyle = isDark ? '#0F172A' : '#F8FAFC';
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;

    if (s.type === 'rect' && s.cx && s.cy && s.w && s.h) {
      ctx.fillRect(s.cx - s.w / 2, s.cy - s.h / 2, s.w, s.h);
      ctx.strokeRect(s.cx - s.w / 2, s.cy - s.h / 2, s.w, s.h);
    } else if (s.type === 'circle' && s.cx && s.cy && s.r) {
      ctx.beginPath();
      ctx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

// 辅助绘图：绘制色彩拼贴图案
function drawPaletteTiles(
  canvas: HTMLCanvasElement | null,
  tiles?: PaletteTile[],
  size = ABSTRACTION_CANVAS_SIZE,
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

export function AbstractionCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
}: AbstractionCanvasProps) {
  const { mode } = question;

  // 1. 角度与滑块交互状态
  const [sliderVal, setSliderVal] = useState<number>(0);
  const canvasMainRef = useRef<HTMLCanvasElement | null>(null);

  // 2. 2AFC 状态
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const canvasThumbRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);
  const [selected4AfcIdx, setSelected4AfcIdx] = useState<number>(0);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: mode === 'GESTURE_AXIS' ? 180 : 100,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: setSliderVal,
  });

  useEffect(() => {
    if (question.id) {
      setSliderVal(mode === 'GESTURE_AXIS' ? 90 : 50);
      setHoverVal(null);
      setSelectedChoice(null);
      setSelected4AfcIdx(0);
    }
  }, [question.id, mode, setHoverVal]);

  const activeVal = hoverVal !== null ? hoverVal : sliderVal;

  // 渲染各种题型 Canvas
  useEffect(() => {
    if (mode === 'GESTURE_AXIS') {
      drawParticles(
        canvasMainRef.current,
        question.particles,
        ABSTRACTION_CANVAS_SIZE,
        showAnswer ? question.targetAngleDeg : activeVal,
        showAnswer ? '#22C55E' : '#6366F1',
      );
    } else if (mode === 'POLYGON_DECIMATION' && question.detailedPolygon) {
      drawPolygon(canvasMainRef.current, question.detailedPolygon, ABSTRACTION_CANVAS_SIZE);
      drawPolygon(
        canvasRefA.current,
        question.simplifiedOptions?.[0],
        ABSTRACTION_2AFC_SIZE,
        '#4F46E5',
      );
      drawPolygon(
        canvasRefB.current,
        question.simplifiedOptions?.[1],
        ABSTRACTION_2AFC_SIZE,
        '#4F46E5',
      );
    } else if (mode === 'NOTAN_THRESHOLD') {
      drawNotanScene(
        canvasMainRef.current,
        question.notanShapes,
        activeVal,
        ABSTRACTION_CANVAS_SIZE,
      );
    } else if (mode === 'PALETTE_CLUSTERING') {
      drawPaletteTiles(canvasMainRef.current, question.paletteTiles, ABSTRACTION_CANVAS_SIZE);
    } else if (mode === 'TD_GESTURE_2AFC') {
      drawParticles(canvasThumbRef.current, question.promptSpine, ABSTRACTION_THUMB_SIZE);
      drawParticles(canvasRefA.current, question.particlesA, ABSTRACTION_2AFC_SIZE);
      drawParticles(canvasRefB.current, question.particlesB, ABSTRACTION_2AFC_SIZE);
    } else if (mode === 'TD_HULL_2AFC') {
      drawPolygon(
        canvasThumbRef.current,
        question.promptHull,
        ABSTRACTION_THUMB_SIZE,
        '#4F46E5',
        '#3730A3',
      );
      drawPolygon(canvasRefA.current, question.hullDetailedA, ABSTRACTION_2AFC_SIZE);
      drawPolygon(canvasRefB.current, question.hullDetailedB, ABSTRACTION_2AFC_SIZE);
    } else if (mode === 'TD_NOTAN_2AFC') {
      drawNotanScene(
        canvasThumbRef.current,
        question.promptNotanMask,
        50,
        ABSTRACTION_THUMB_SIZE,
      );
      drawNotanScene(canvasRefA.current, question.notanSceneA, 50, ABSTRACTION_2AFC_SIZE);
      drawNotanScene(canvasRefB.current, question.notanSceneB, 50, ABSTRACTION_2AFC_SIZE);
    } else if (mode === 'TD_PALETTE_2AFC') {
      drawPaletteTiles(canvasRefA.current, question.patternA, ABSTRACTION_2AFC_SIZE);
      drawPaletteTiles(canvasRefB.current, question.patternB, ABSTRACTION_2AFC_SIZE);
    }
  }, [mode, question, activeVal, showAnswer]);

  const handleSelectChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelectedChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );

  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || showAnswer) return;
      if (e.key === '1' || e.code === 'Digit1') {
        e.preventDefault();
        handleSelectChoice('A');
      } else if (e.key === '2' || e.code === 'Digit2') {
        e.preventDefault();
        handleSelectChoice('B');
      } else if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (mode === 'PALETTE_CLUSTERING') {
          onAnswer(selected4AfcIdx);
        } else if (mode === 'GESTURE_AXIS' || mode === 'NOTAN_THRESHOLD') {
          onAnswer(activeVal);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    disabled,
    showAnswer,
    mode,
    activeVal,
    selected4AfcIdx,
    handleSelectChoice,
    onAnswer,
  ]);

  // =========================================================================
  // 视图 A：Top-Down 2AFC 逆向匹配系列
  // =========================================================================
  if (mode.startsWith('TD_') || mode === 'POLYGON_DECIMATION') {
    const isPoly = mode === 'POLYGON_DECIMATION';
    const isTargetA = isPoly
      ? question.correctPolyChoice === 'A'
      : userAnswer?.correctChoice === 'A' ||
        question.correctParticleChoice === 'A' ||
        question.correctHullChoice === 'A' ||
        question.correctNotanChoice === 'A' ||
        question.correctPatternChoice === 'A';
    const isTargetB = !isTargetA;

    return (
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
        <div className="text-center space-y-1">
          <div className="text-base font-black text-slate-800 flex items-center justify-center gap-2">
            <Columns className="w-5 h-5 text-indigo-600" />
            {isPoly
              ? '观察左侧细碎多边形，选择右侧保留了主要转折大形的概括项'
              : '观察上方提炼的本质基准，快速判别哪一侧具象细节符合该骨架'}
          </div>
          <p className="text-xs text-slate-400">
            按快捷键{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">
              1
            </kbd>{' '}
            选择 A，按{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">
              2
            </kbd>{' '}
            选择 B
          </p>
        </div>

        {/* 顶部题干或基准展示 */}
        {!isPoly && (
          <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              提炼出的概括基准 (Prompt)
            </span>
            {mode === 'TD_PALETTE_2AFC' && question.promptPaletteBand ? (
              <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                {question.promptPaletteBand.map((c, i) => (
                  <div
                    key={i}
                    className="w-12 h-12 rounded-lg border border-slate-300 shadow-inner"
                    style={{ backgroundColor: hsvToHex(...c) }}
                  />
                ))}
              </div>
            ) : (
              <canvas
                ref={canvasThumbRef}
                width={ABSTRACTION_THUMB_SIZE}
                height={ABSTRACTION_THUMB_SIZE}
                className="w-28 h-28 rounded-xl border border-slate-200 shadow-sm"
              />
            )}
          </div>
        )}

        {isPoly && (
          <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              细碎多边形原图
            </span>
            <canvas
              ref={canvasMainRef}
              width={ABSTRACTION_CANVAS_SIZE}
              height={ABSTRACTION_CANVAS_SIZE}
              className="w-48 h-48 rounded-xl border border-slate-200 shadow-sm"
            />
          </div>
        )}

        {/* 双卡片候选区 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          {/* 卡片 A */}
          <button
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => handleSelectChoice('A')}
            className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
              showAnswer
                ? isTargetA
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : selectedChoice === 'A'
                    ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                : selectedChoice === 'A'
                  ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                  A
                </span>
                区域 A (键 1)
              </span>
              {showAnswer && isTargetA && (
                <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
                  <Check className="w-4 h-4 text-emerald-600" />
                  真实匹配
                </span>
              )}
            </div>

            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefA}
                width={ABSTRACTION_2AFC_SIZE}
                height={ABSTRACTION_2AFC_SIZE}
                className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
              />
            </div>
          </button>

          {/* 卡片 B */}
          <button
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => handleSelectChoice('B')}
            className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
              showAnswer
                ? isTargetB
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : selectedChoice === 'B'
                    ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                : selectedChoice === 'B'
                  ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                  B
                </span>
                区域 B (键 2)
              </span>
              {showAnswer && isTargetB && (
                <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
                  <Check className="w-4 h-4 text-emerald-600" />
                  真实匹配
                </span>
              )}
            </div>

            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefB}
                width={ABSTRACTION_2AFC_SIZE}
                height={ABSTRACTION_2AFC_SIZE}
                className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
              />
            </div>
          </button>
        </div>

        {/* 答案揭晓诊断 */}
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
                  {userAnswer?.isHit ? '瞬时结构透视识别完全正确！' : '结构透视判断出现偏差'}
                </span>
                <span className="text-slate-400 ml-2">
                  (正确匹配为: 区域 {userAnswer?.correctChoice ?? (isTargetA ? 'A' : 'B')})
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 视图 B：PALETTE_CLUSTERING 4AFC 调色板提炼视图
  // =========================================================================
  if (mode === 'PALETTE_CLUSTERING') {
    return (
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
        <div className="text-center space-y-1">
          <div className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            在下方 4 个候选项中，选出最能代表整幅画面主调的加权主色
          </div>
          <div className="text-xs text-slate-400">穿透细碎微小混色，提炼全局面积加权调性</div>
        </div>

        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
          <canvas
            ref={canvasMainRef}
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm"
          />
        </div>

        {/* 4 候选色块 */}
        <div className="grid grid-cols-4 gap-3 w-full">
          {question.paletteOptions?.map((hsv, idx) => {
            const isSelected = selected4AfcIdx === idx;
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
                key={idx}
                type="button"
                disabled={disabled || showAnswer}
                onClick={() => {
                  setSelected4AfcIdx(idx);
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

  // =========================================================================
  // 视图 C：滑块/旋转连续调节视图 (GESTURE_AXIS / NOTAN_THRESHOLD)
  // =========================================================================
  const isGesture = mode === 'GESTURE_AXIS';
  const unit = isGesture ? '°' : '%';

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      <div className="text-center space-y-1">
        <div className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1.5">
          <Eye className="w-4 h-4 text-indigo-600" />
          {isGesture
            ? '旋转调节绿色主轴，对齐粒子群的主动态流向 (0°~180°)'
            : '拖动滑块调节二值化剪切线，达成黑白咬合最平衡的 Notan 状态'}
        </div>
        <div className="text-xs text-slate-400">
          {isGesture ? '基于 PCA 统计第一主成分真理线' : '基于黑白块面骨架二值化分割'}
        </div>
      </div>

      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasMainRef}
          width={ABSTRACTION_CANVAS_SIZE}
          height={ABSTRACTION_CANVAS_SIZE}
          className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm"
        />
      </div>

      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>{isGesture ? '动态势线角度:' : 'Notan 归组阈值:'}</span>
          <span className="font-mono text-base font-black text-indigo-600">
            {showAnswer
              ? `${userAnswer?.userValue ?? sliderVal}${unit}`
              : `${activeVal}${unit}`}
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
                style={{
                  width: `${(activeVal / (isGesture ? 180 : 100)) * 100}%`,
                }}
              />

              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                  style={{
                    left: `${(activeVal / (isGesture ? 180 : 100)) * 100}%`,
                  }}
                />
              )}

              {showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                  style={{
                    left: `${((question.targetAngleDeg ?? question.idealNotanThreshold ?? 50) / (isGesture ? 180 : 100)) * 100}%`,
                  }}
                />
              )}
            </div>
          </div>

          <span className="font-bold font-mono text-slate-400 text-xs">
            {isGesture ? 180 : 100}
            {unit}
          </span>
        </div>

        {showAnswer && (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              绝对真理值:{' '}
              <span className="font-bold text-slate-800 font-mono">
                {isGesture ? question.targetAngleDeg : question.idealNotanThreshold}
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

      {!showAnswer && (
        <button
          type="button"
          onClick={() => {
            if (!disabled && !showAnswer) onAnswer(activeVal);
          }}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
        >
          确认提交 (Space)
        </button>
      )}
    </div>
  );
}
~~~~~

#### Acts 4: 注册 8 张卡片、领域配置与训练插件接入

~~~~~act
patch_file
src/config/cards.ts
~~~~~
~~~~~typescript.old
export const ALL_CARDS: CardDefinition[] = [
  // ==========================================
  // 1. 寻星练习系列 (Star-Hopping)
  // ==========================================
~~~~~
~~~~~typescript.new
export const ALL_CARDS: CardDefinition[] = [
  // ==========================================
  // 0. 视知觉概括系列 (Visual Abstraction)
  // ==========================================
  {
    id: 'abs_gesture_axis',
    legacyDomain: 'abstraction',
    legacyMode: 'GESTURE_AXIS',
    title: '动态势线提取',
    desc: '从离散散点流向中提取第一主成分 PCA 势线角度，建立画面主导动势感知力。',
    icon: RotateCw,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'gesture_flow'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'abs_polygon_decimation',
    legacyDomain: 'abstraction',
    legacyMode: 'POLYGON_DECIMATION',
    title: '折线低模大形',
    desc: '从细碎繁复轮廓中识别 RDP 算法精简出的最优关键折线大形框架。',
    icon: Maximize2,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_notan_threshold',
    legacyDomain: 'abstraction',
    legacyMode: 'NOTAN_THRESHOLD',
    title: '黑白素描归组',
    desc: '调节二值化明度剪切阈值，过滤杂乱中间调，压榨出最坚固的 Notan 黑白大关系。',
    icon: Sun,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'notan_grouping'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'abs_palette_clustering',
    legacyDomain: 'abstraction',
    legacyMode: 'PALETTE_CLUSTERING',
    title: '主调色群提炼',
    desc: '穿透多色拼贴马赛克的混色噪点，四选一提炼出面积加权下的加权质心主色。',
    icon: Palette,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'color_fidelity'],
      interaction: ['choice_nafc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_gesture_2afc',
    legacyDomain: 'abstraction',
    legacyMode: 'TD_GESTURE_2AFC',
    title: '动态势线寻源',
    desc: '给定抽象势线骨架，在两幅复杂点阵中透视判别谁长在该动势中 (2AFC)。',
    icon: Shuffle,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'gesture_flow'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_hull_2afc',
    legacyDomain: 'abstraction',
    legacyMode: 'TD_HULL_2AFC',
    title: '几何大模寻形',
    desc: '给定极简低模多边形，在两个高细碎剪影中二选一辨识其具象原形 (2AFC)。',
    icon: Columns,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_notan_2afc',
    legacyDomain: 'abstraction',
    legacyMode: 'TD_NOTAN_2AFC',
    title: '黑白素描骨架',
    desc: '给定二值 Notan 剪影，透视辨识哪幅丰富灰阶素描拥有该黑白大结构 (2AFC)。',
    icon: Droplet,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'notan_grouping'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_palette_2afc',
    legacyDomain: 'abstraction',
    legacyMode: 'TD_PALETTE_2AFC',
    title: '调性基底归位',
    desc: '给定 3 阶基调色谱条，在两张复杂混色拼贴图案中二选一归位 (2AFC)。',
    icon: Sparkles,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'color_fidelity'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },

  // ==========================================
  // 1. 寻星练习系列 (Star-Hopping)
  // ==========================================
~~~~~

~~~~~act
patch_file
src/config/domains.ts
~~~~~
~~~~~typescript.old
import { Compass, Maximize2, Palette, Shuffle } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db';
import { getCardsByDomain } from './cards';

export interface DomainMeta {
  domain: TrainingDomain;
  appId: 'star-hopping' | 'color-sense' | 'relative-color' | 'negative-space';
~~~~~
~~~~~typescript.new
import { Compass, Eye, Maximize2, Palette, Shuffle } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db';
import { getCardsByDomain } from './cards';

export interface DomainMeta {
  domain: TrainingDomain;
  appId: 'star-hopping' | 'color-sense' | 'relative-color' | 'negative-space' | 'visual-abstraction';
~~~~~

~~~~~act
patch_file
src/config/domains.ts
~~~~~
~~~~~typescript.old
export const DOMAINS_CONFIG: Record<TrainingDomain, DomainMeta> = {
  star: {
~~~~~
~~~~~typescript.new
export const DOMAINS_CONFIG: Record<TrainingDomain, DomainMeta> = {
  abstraction: {
    domain: 'abstraction',
    appId: 'visual-abstraction',
    title: '视知觉概括',
    subTitle: 'Visual Abstraction',
    homeTitle: '视知觉概括 (Visual Abstraction)',
    homeDesc:
      '过滤视觉噪点，双向训练动态势线提取、极简几何大形、素描黑白灰大关系与调性基底的本质提炼与透视匹配能力。',
    themeColor: 'indigo',
    icon: Eye,
    hasWeaknessAnalytics: false,
    get cards() {
      return getCardsByDomain('abstraction');
    },
  },
  star: {
    domain: 'star',
    appId: 'star-hopping',
    title: '寻星练习',
    subTitle: 'Star-Hopping',
    homeTitle: '寻星练习 (Star-Hopping)',
    homeDesc:
      '基于极坐标与双极透视网格，通过视线搜寻与目标盲打，训练你对空间方位、线段比例及角度旋转的视觉直觉。',
    themeColor: 'indigo',
    icon: Compass,
    hasWeaknessAnalytics: true,
    get cards() {
      return getCardsByDomain('star');
    },
  },
~~~~~

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript.old
import { ColorCanvas } from '../components/ColorCanvas';
import { NegativeSpaceCanvas } from '../components/NegativeSpaceCanvas';
import { RelativeColorCanvas } from '../components/RelativeColorCanvas';
import { StarCanvas } from '../components/StarCanvas';
import type { HitResult, Point, QuestionData, TrainingMode } from '../types';
~~~~~
~~~~~typescript.new
import { AbstractionCanvas } from '../components/AbstractionCanvas';
import { ColorCanvas } from '../components/ColorCanvas';
import { NegativeSpaceCanvas } from '../components/NegativeSpaceCanvas';
import { RelativeColorCanvas } from '../components/RelativeColorCanvas';
import { StarCanvas } from '../components/StarCanvas';
import type { HitResult, Point, QuestionData, TrainingMode } from '../types';
import {
  type AbstractionHitResult,
  type AbstractionMode,
  type AbstractionQuestionData,
  checkAbstractionHit,
  generateAbstractionQuestion,
} from '../utils/abstractionUtils';
~~~~~

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript.old
// 4. 正负形感知插件
export const negativeSpacePlugin: TrainingPlugin<
  NegativeSpaceQuestionData,
  NegativeSpaceHitResult,
  number | 'A' | 'B' | Point,
  NegativeSpaceSettings
> = {
  domain: 'negative_space',
  title: '正负形感知',
  getModeBadge: (mode) =>
    mode === 'AREA_COMPARISON_2AFC'
      ? '负形面积二分判别'
      : mode === 'NEGATIVE_VERTEX_FITTING'
        ? '负形边界反切定点'
        : mode === 'SHAPE_MATCH_2AFC'
          ? '负形轮廓记忆匹配'
          : '负形占比估算',
  generateQuestion: (mode, level) =>
    generateNegativeSpaceQuestion(mode as NegativeSpaceMode, level),
  evaluateAnswer: (userVal, q) => checkNegativeSpaceHit(userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => {
    if (mode === 'NEGATIVE_VERTEX_FITTING') {
      return {
        mode: 'NEGATIVE_VERTEX_FITTING',
        targetVertexIndex: q.targetVertexIndex,
        targetPoint: q.targetPoint ? [q.targetPoint.x, q.targetPoint.y] : undefined,
        userClick: hitResult.nearestGridPoint
          ? [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y]
          : undefined,
        errorPixelDistance: hitResult.errorValue,
      };
    }
    if (mode === 'AREA_COMPARISON_2AFC') {
      return {
        mode: 'AREA_COMPARISON_2AFC',
        userChoice: userVal,
        correctChoice: q.largerSide,
        negRatioA: q.negRatioA,
        negRatioB: q.negRatioB,
        areaDeltaPercent: q.areaDeltaPercent,
        errorValue: hitResult.errorValue,
      };
    }
    if (mode === 'SHAPE_MATCH_2AFC') {
      return {
        mode: 'SHAPE_MATCH_2AFC',
        userChoice: userVal === 0 || userVal === 'A' ? 'A' : 'B',
        correctChoice: q.correctChoice,
        displayTimeMs: q.displayTimeMs,
        errorValue: hitResult.errorValue,
      };
    }
    return {
      targetNegativeRatio: q.targetNegativeRatio,
      userRatio: userVal,
      errorValue: hitResult.errorValue,
      positiveArea: q.positiveArea,
      negativeArea: q.negativeArea,
    };
  },
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <NegativeSpaceCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
    />
  ),
};

export type AnyTrainingPlugin =
  | typeof starPlugin
  | typeof colorPlugin
  | typeof relativeColorPlugin
  | typeof negativeSpacePlugin;

export const TRAINING_PLUGINS: Record<TrainingDomain, AnyTrainingPlugin> = {
  star: starPlugin,
  color: colorPlugin,
  relative_color: relativeColorPlugin,
  negative_space: negativeSpacePlugin,
};
~~~~~
~~~~~typescript.new
// 4. 正负形感知插件
export const negativeSpacePlugin: TrainingPlugin<
  NegativeSpaceQuestionData,
  NegativeSpaceHitResult,
  number | 'A' | 'B' | Point,
  NegativeSpaceSettings
> = {
  domain: 'negative_space',
  title: '正负形感知',
  getModeBadge: (mode) =>
    mode === 'AREA_COMPARISON_2AFC'
      ? '负形面积二分判别'
      : mode === 'NEGATIVE_VERTEX_FITTING'
        ? '负形边界反切定点'
        : mode === 'SHAPE_MATCH_2AFC'
          ? '负形轮廓记忆匹配'
          : '负形占比估算',
  generateQuestion: (mode, level) =>
    generateNegativeSpaceQuestion(mode as NegativeSpaceMode, level),
  evaluateAnswer: (userVal, q) => checkNegativeSpaceHit(userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => {
    if (mode === 'NEGATIVE_VERTEX_FITTING') {
      return {
        mode: 'NEGATIVE_VERTEX_FITTING',
        targetVertexIndex: q.targetVertexIndex,
        targetPoint: q.targetPoint ? [q.targetPoint.x, q.targetPoint.y] : undefined,
        userClick: hitResult.nearestGridPoint
          ? [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y]
          : undefined,
        errorPixelDistance: hitResult.errorValue,
      };
    }
    if (mode === 'AREA_COMPARISON_2AFC') {
      return {
        mode: 'AREA_COMPARISON_2AFC',
        userChoice: userVal,
        correctChoice: q.largerSide,
        negRatioA: q.negRatioA,
        negRatioB: q.negRatioB,
        areaDeltaPercent: q.areaDeltaPercent,
        errorValue: hitResult.errorValue,
      };
    }
    if (mode === 'SHAPE_MATCH_2AFC') {
      return {
        mode: 'SHAPE_MATCH_2AFC',
        userChoice: userVal === 0 || userVal === 'A' ? 'A' : 'B',
        correctChoice: q.correctChoice,
        displayTimeMs: q.displayTimeMs,
        errorValue: hitResult.errorValue,
      };
    }
    return {
      targetNegativeRatio: q.targetNegativeRatio,
      userRatio: userVal,
      errorValue: hitResult.errorValue,
      positiveArea: q.positiveArea,
      negativeArea: q.negativeArea,
    };
  },
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <NegativeSpaceCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
    />
  ),
};

// 5. 视知觉概括插件
export const abstractionPlugin: TrainingPlugin<
  AbstractionQuestionData,
  AbstractionHitResult,
  number | 'A' | 'B',
  BaseModuleSettings
> = {
  domain: 'abstraction',
  title: '视知觉概括',
  getModeBadge: (mode) => {
    const map: Record<string, string> = {
      GESTURE_AXIS: '动态势线提取',
      POLYGON_DECIMATION: '折线低模大形',
      NOTAN_THRESHOLD: '黑白素描归组',
      PALETTE_CLUSTERING: '主调色群提炼',
      TD_GESTURE_2AFC: '动态势线寻源',
      TD_HULL_2AFC: '几何大模寻形',
      TD_NOTAN_2AFC: '黑白素描骨架',
      TD_PALETTE_2AFC: '调性基底归位',
    };
    return map[mode] || mode;
  },
  generateQuestion: (mode, level) => generateAbstractionQuestion(mode as AbstractionMode, level),
  evaluateAnswer: (userVal, q) => checkAbstractionHit(userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => ({
    mode,
    userAnswer: userVal,
    errorValue: hitResult.errorValue,
  }),
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <AbstractionCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={(settings.sliderHitMargin as number) ?? 12}
      showToleranceBand={(settings.showToleranceBand as boolean) ?? true}
    />
  ),
};

export type AnyTrainingPlugin =
  | typeof starPlugin
  | typeof colorPlugin
  | typeof relativeColorPlugin
  | typeof negativeSpacePlugin
  | typeof abstractionPlugin;

export const TRAINING_PLUGINS: Record<TrainingDomain, AnyTrainingPlugin> = {
  abstraction: abstractionPlugin,
  star: starPlugin,
  color: colorPlugin,
  relative_color: relativeColorPlugin,
  negative_space: negativeSpacePlugin,
};
~~~~~

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript.old
  neg_area_comparison_2afc: negativeSpacePlugin,
  neg_vertex_fitting: negativeSpacePlugin,
  neg_shape_match_2afc: negativeSpacePlugin,
};
~~~~~
~~~~~typescript.new
  neg_area_comparison_2afc: negativeSpacePlugin,
  neg_vertex_fitting: negativeSpacePlugin,
  neg_shape_match_2afc: negativeSpacePlugin,
  abs_gesture_axis: abstractionPlugin,
  abs_polygon_decimation: abstractionPlugin,
  abs_notan_threshold: abstractionPlugin,
  abs_palette_clustering: abstractionPlugin,
  abs_td_gesture_2afc: abstractionPlugin,
  abs_td_hull_2afc: abstractionPlugin,
  abs_td_notan_2afc: abstractionPlugin,
  abs_td_palette_2afc: abstractionPlugin,
};
~~~~~

#### Acts 5: 在应用总览与全局统计中纳入新领域

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
const ALL_DOMAINS: TrainingDomain[] = ['star', 'color', 'relative_color', 'negative_space'];
~~~~~
~~~~~typescript.new
const ALL_DOMAINS: TrainingDomain[] = [
  'abstraction',
  'star',
  'color',
  'relative_color',
  'negative_space',
];
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
  const [domainTimes, setDomainTimes] = useState<Record<TrainingDomain, number>>({
    star: 0,
    color: 0,
    relative_color: 0,
    negative_space: 0,
  });
~~~~~
~~~~~typescript.new
  const [domainTimes, setDomainTimes] = useState<Record<TrainingDomain, number>>({
    abstraction: 0,
    star: 0,
    color: 0,
    relative_color: 0,
    negative_space: 0,
  });
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript.old
const ALL_DOMAINS: TrainingDomain[] = ['star', 'color', 'relative_color', 'negative_space'];
~~~~~
~~~~~typescript.new
const ALL_DOMAINS: TrainingDomain[] = [
  'abstraction',
  'star',
  'color',
  'relative_color',
  'negative_space',
];
~~~~~

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript.old
    if (['star', 'color', 'relative_color', 'negative_space'].includes(domain)) {
      return { type: 'dashboard', domain };
    }
~~~~~
~~~~~typescript.new
    if (['abstraction', 'star', 'color', 'relative_color', 'negative_space'].includes(domain)) {
      return { type: 'dashboard', domain };
    }
~~~~~

### 下一步建议
1. **测试与运行验证**：运行 `npm run dev` 打开浏览器，检查主页是否成功呈现“视知觉概括”卡片，并逐一进入 8 个练习模式测试快捷键和难度自适应变化。
2. **弱点分析插件定制**：后续可为该模块添加专有弱点分析视图（例如：PCA 角度系统性偏差散点图、Notan 阈值过度偏暗/偏亮倾向）。
