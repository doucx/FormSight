import type { Point } from '../types';

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
    const scaleTo2Afc = ABSTRACTION_2AFC_SIZE / ABSTRACTION_CANVAS_SIZE;
    const mapTo2Afc = (pts: Point[]) =>
      pts.map((p) => ({
        x: Math.round(p.x * scaleTo2Afc),
        y: Math.round(p.y * scaleTo2Afc),
      }));

    const simplifiedOptions = isA
      ? [mapTo2Afc(simplified), mapTo2Afc(distractor)]
      : [mapTo2Afc(distractor), mapTo2Afc(simplified)];

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
