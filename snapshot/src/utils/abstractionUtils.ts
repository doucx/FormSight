import type { Point } from '../types';
import { expDecayInterpolate } from './mathUtils';
import { calculateOtsuThreshold, createNoise2D, fbm2D } from './noiseUtils';
import { generateTetrahedralDistractors, hsvToOkLab } from './oklchUtils';
import { getDistractorDistanceForLevel } from './relativeColorUtils';

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
function generateFlowParticlesWithClutter(
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

/**
 * 兼容包装：生成基础方向性散点流
 */
function generateFlowParticles(
  angleDeg: number,
  spreadRatio: number,
  size = ABSTRACTION_CANVAS_SIZE,
): Point[] {
  return generateFlowParticlesWithClutter(angleDeg, spreadRatio, 0, size);
}

/**
 * 将简单的多边形边缘打碎，生成拥有大量顶点的复杂细碎剪影
 */
function fractalizePolygon(
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
 * 基于真理大模生成高度竞争性的对抗干扰多边形 (Adversarial Distractor)
 */
function generateAdversarialDistractorHull(
  targetHull: Point[],
  level: number,
  size = ABSTRACTION_2AFC_SIZE,
): Point[] {
  const t = (Math.max(1, Math.min(35, level)) - 1) / 34;
  const n = targetHull.length;
  const distractor: Point[] = targetHull.map((p) => ({ ...p }));
  const cx = size / 2;
  const cy = size / 2;

  // 策略 A (Level 低时概率稍高): 随机截断/拉平 1 个关键转折点（过度概括）
  // 策略 B (Level 高时主要使用): 关键转折点微小突变欺骗（位移量随 Level 缩小，越难察觉）
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
    // 选取 1~2 个顶点施加微小拓扑欺骗
    const mutateCount = t > 0.6 && Math.random() < 0.5 ? 2 : 1;
    const chosenIndices = new Set<number>();
    while (chosenIndices.size < mutateCount) {
      chosenIndices.add(Math.floor(Math.random() * n));
    }

    // 偏移幅度：Level 1 为 40px (较明显)，Level 35 为 14px (需要极其敏锐的大形眼力)
    const shiftMag = 14 + (1 - t) * 26;

    for (const idx of chosenIndices) {
      const p = targetHull[idx];
      // 沿质心向外或法线方向突变
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
    // 1. 随 Level 递增顶点数：Level 1 为 4~5 点，Level 35 为 7~9 点
    const minVerts = 4 + Math.floor(t * 3);
    const maxVerts = 5 + Math.floor(t * 4);
    const vertCount = Math.floor(Math.random() * (maxVerts - minVerts + 1)) + minVerts;

    const targetHull = generateDetailedPolygon(vertCount, ABSTRACTION_2AFC_SIZE);

    // 2. 生成高度对抗性的干扰大模 (仅在 1~2 个关键折角或比例上制造真假欺骗)
    const distractorHull = generateAdversarialDistractorHull(
      targetHull,
      clampedLevel,
      ABSTRACTION_2AFC_SIZE,
    );

    // 3. 基于 targetHull 进行边缘分形细化，生成题干展示的高频细碎多边形
    const scaleToMain = ABSTRACTION_CANVAS_SIZE / ABSTRACTION_2AFC_SIZE;
    const baseForDetailed = targetHull.map((p) => ({
      x: Math.round(p.x * scaleToMain),
      y: Math.round(p.y * scaleToMain),
    }));

    // 难度越高，边缘分形破碎程度与细化递归越深
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

  // 3. NOTAN_THRESHOLD 黑白素描二值归组 (多尺度 FBM 双频模型)
  if (mode === 'NOTAN_THRESHOLD') {
    const fieldDim = 120; // 120x120 场分辨率，兼顾极致生成速度与高清插值
    const buffer = new Uint8Array(fieldDim * fieldDim);

    const macroNoise = createNoise2D(Math.random());
    const microNoise = createNoise2D(Math.random());

    // 1. 随机生成画面的基准调性 (高调 High-Key / 低调 Low-Key / 中调 Mid-Key)
    // 使得理论阈值均匀离散在 20 ~ 80 宽幅区间
    const keyType = Math.random();
    const baseKey =
      keyType < 0.35
        ? 22 + Math.random() * 14 // 低调暗夜 (22~36)
        : keyType < 0.7
          ? 64 + Math.random() * 14 // 高调明亮 (64~78)
          : 44 + Math.random() * 12; // 中调 (44~56)

    // 2. 宏观场尺度 (超低频，形成 2~3 块宏观有机黑白大势)
    const macroScale = 0.012 + Math.random() * 0.008;
    const macroAmp = 42 + Math.random() * 10;

    // 3. 微观高频噪波扰动强度随 Level 递增
    const microScale = 0.08 + Math.random() * 0.04;
    const microAmp = 10 + t * 38; // Level 1 几乎无噪波，Level 35 强噪波干扰

    for (let y = 0; y < fieldDim; y++) {
      for (let x = 0; x < fieldDim; x++) {
        const idx = y * fieldDim + x;
        // 低频宏观大形骨架 (2 Octaves)
        const macroVal =
          (fbm2D(x * macroScale, y * macroScale, 2, macroNoise) - 0.5) * 2 * macroAmp;
        // 高频微观肌理干扰 (3 Octaves)
        const microVal =
          (fbm2D(x * microScale, y * microScale, 3, microNoise) - 0.5) * 2 * microAmp;

        const raw = baseKey + macroVal + microVal;
        const clamped0to100 = Math.max(0, Math.min(100, raw));
        buffer[idx] = Math.round((clamped0to100 / 100) * 255);
      }
    }

    // 4. 大津法自动寻找最大类间方差的最佳截断分割点
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

    // 使用 OKLab 四面体等距算法生成 3 个感知等距干扰色
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

    // 动态角偏差：Level 1 为 36° (极易区分)，Level 35 逼近 4.0° (精细辨识)
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

    // 动态粒子散布比：Level 1 为 0.18 (极聚拢)，Level 35 为 0.56 (弥散团，考验整体动势提取)
    const spreadRatio = 0.18 + t * 0.38;
    // 背景杂质噪点率：Level 1 为 0%，Level 35 为 28% 各向同性噪点
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
    // 1. 随 Level 递增顶点数：Level 1 为 4~5 点，Level 35 为 6~9 点
    const minVerts = 4 + Math.floor(t * 2);
    const maxVerts = 5 + Math.floor(t * 4);
    const vertCount = Math.floor(Math.random() * (maxVerts - minVerts + 1)) + minVerts;

    const promptHull = generateDetailedPolygon(vertCount, ABSTRACTION_THUMB_SIZE);
    const scale = ABSTRACTION_2AFC_SIZE / ABSTRACTION_THUMB_SIZE;

    const targetBase = promptHull.map((p) => ({
      x: Math.round(p.x * scale),
      y: Math.round(p.y * scale),
    }));

    // 2. 基于 targetBase 生成高度对抗性干扰项 (大轮廓 85%+ 相似，仅关键转角或局部比例失真)
    const distractorBase = generateAdversarialDistractorHull(
      targetBase,
      clampedLevel,
      ABSTRACTION_2AFC_SIZE,
    );

    // 3. 多尺度分形细化：难度越高，边缘高频噪波与破碎度越强
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

  // 7. TD_NOTAN_2AFC 自顶向下素描骨架匹配 (2AFC 多尺度连续灰阶场与二值逆向透视)
  if (mode === 'TD_NOTAN_2AFC') {
    const fieldDim = 120;
    const totalPixels = fieldDim * fieldDim;

    const targetMacroNoise = createNoise2D(Math.random());
    const distractorMacroNoise = createNoise2D(Math.random() + 100);
    const microNoise = createNoise2D(Math.random() + 200);

    // 随机画面基准调性
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
    const microAmp = 10 + t * 38; // 难度随 Level 递增微观干扰

    // 宏观骨架相似度逼近因子：Level 1 为 0 (完全独立大形)，Level 35 为 0.68 (高相似度大骨架逼近)
    const macroSimilarityWeight = t * 0.68;
    // 能量守恒系数：消除两个独立场线性加权导致的方差坍缩，保证干扰项黑白对比度与动态范围绝对守恒
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

        // 干扰项宏观场：能量守恒归一化插值，对比度与真理项 100% 统计等价
        const distractorMacroVal =
          ((1 - macroSimilarityWeight) * rawIndependentDistractorVal +
            macroSimilarityWeight * targetMacroVal) /
          blendNorm;

        const microVal =
          (fbm2D(x * microScale, y * microScale, 3, microNoise) - 0.5) * 2 * microAmp;

        // 仅宏观骨架场（用于生成清晰二值 Notan 题干）
        const macroRaw = Math.max(0, Math.min(100, baseKey + targetMacroVal));
        targetMacroBuffer[idx] = Math.round((macroRaw / 100) * 255);

        // 真实素描选项（宏观骨架 + 微观噪波）
        const targetSceneRaw = Math.max(0, Math.min(100, baseKey + targetMacroVal + microVal));
        targetSceneBuffer[idx] = Math.round((targetSceneRaw / 100) * 255);

        // 干扰素描选项（逼近宏观骨架 + 相同微观噪波肌理）
        const distractorSceneRaw = Math.max(
          0,
          Math.min(100, baseKey + distractorMacroVal + microVal),
        );
        distractorSceneBuffer[idx] = Math.round((distractorSceneRaw / 100) * 255);
      }
    }

    // 计算 targetMacroBuffer 的 Otsu 最佳二值截断分割，生成清晰二值 Notan 剪影 Prompt
    const otsuByte = calculateOtsuThreshold(targetMacroBuffer);
    const promptBuffer = new Uint8Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      promptBuffer[i] = targetMacroBuffer[i] <= otsuByte ? 15 : 248; // #0F172A (暗) vs #F8FAFC (亮)
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

  // 8. TD_PALETTE_2AFC (4AFC) 自顶向下调性基底归位：主调色群提炼的精确逆向
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

  // 使用 OKLab 四面体等距算法生成 3 个干扰图案主调 (随 Level 逼近)
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
