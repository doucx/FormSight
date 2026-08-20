import type { Point } from '../types';
import { checkHit } from './geometry';
import { expDecayInterpolate } from './mathUtils';

export type NegativeSpaceMode =
  | 'RATIO_ESTIMATION'
  | 'AREA_COMPARISON_2AFC'
  | 'NEGATIVE_VERTEX_FITTING'
  | 'SHAPE_MATCH_2AFC';

export const NEGATIVE_SPACE_CANVAS_SIZE = 400;
export const TWO_AFC_CANVAS_SIZE = 280;
export const FITTING_CANVAS_SIZE = 340;

export interface NegativeSpaceQuestionData {
  id: string;
  mode: NegativeSpaceMode;
  difficultyLevel: number;
  // 单图滑块估算模式字段
  vertices?: Point[];
  canvasArea: number;
  positiveArea?: number;
  negativeArea?: number;
  targetNegativeRatio?: number;
  tolerance: number;

  // 2AFC 二分判别模式字段
  verticesA?: Point[];
  verticesB?: Point[];
  negAreaA?: number;
  negAreaB?: number;
  negRatioA?: number;
  negRatioB?: number;
  largerSide?: 'A' | 'B';
  areaDeltaPercent?: number; // 相对面积差异百分比 (例如 12.5%)

  // 负形反切定点模式字段
  targetVertexIndex?: number;
  targetPoint?: Point;
  truncatedVertices?: Point[]; // 右侧截断残缺多边形
  distractorPoints?: Point[]; // 围绕 targetPoint 的干扰网格点
  gridDim?: number;

  // 记忆匹配 2AFC 模式字段
  targetPolygon?: Point[];
  optionsPolygons?: Point[][]; // [polyA, polyB]
  correctOptionIndex?: number; // 0 (A) or 1 (B)
  correctChoice?: 'A' | 'B';
  displayTimeMs?: number;
}

export interface NegativeSpaceHitResult {
  isHit: boolean;
  userRatio?: number;
  targetRatio?: number;
  errorValue: number;
  tolerance: number;

  // 2AFC 结果字段
  userChoice?: 'A' | 'B';
  correctChoice?: 'A' | 'B';
  negRatioA?: number;
  negRatioB?: number;

  // 定点模式结果字段
  clickPoint?: Point;
  nearestGridPoint?: Point;
  isWithinRange?: boolean;

  // 记忆匹配 2AFC 结果字段
  userChoiceIndex?: number;
  correctOptionIndex?: number;
}

/**
 * 经典鞋带公式 (Shoelace Formula) 计算简单多边形面积
 */
export function calcPolygonArea(vertices: Point[]): number {
  const n = vertices.length;
  if (n < 3) return 0;

  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * 根据 Level (1..35) 计算允许的占比容错阈值 (百分比 Δ%)
 * Level 1: ±10.0%, Level 35: ±1.2%
 */
export function getNegativeSpaceToleranceForLevel(level: number): number {
  return Math.round(expDecayInterpolate(10.0, 1.2, level) * 10) / 10;
}

/**
 * 随机生成不自交的不规则正形多边形
 */
export function generateRandomPolygon(
  level: number,
  canvasSize = NEGATIVE_SPACE_CANVAS_SIZE,
): Point[] {
  const clamped = Math.max(1, Math.min(35, level));
  const t = (clamped - 1) / 34;

  // 顶点数量：Level 1 为 4，Level 35 为 8
  const minVerts = 4 + Math.floor(t * 2);
  const maxVerts = 4 + Math.floor(t * 4);
  const vertexCount = Math.floor(Math.random() * (maxVerts - minVerts + 1)) + minVerts;

  const cx = canvasSize / 2 + (Math.random() - 0.5) * (canvasSize * 0.1);
  const cy = canvasSize / 2 + (Math.random() - 0.5) * (canvasSize * 0.1);

  // 基础半径与扰动率
  const baseRadius = canvasSize * 0.28 + Math.random() * (canvasSize * 0.1);
  const irregularity = 0.2 + t * 0.45; // 0.2..0.65 凹凸度

  // 极角切分并随机抖动
  const angles: number[] = [];
  const angleStep = (Math.PI * 2) / vertexCount;
  for (let i = 0; i < vertexCount; i++) {
    const rawA = i * angleStep + (Math.random() - 0.5) * angleStep * 0.7;
    angles.push((rawA + Math.PI * 2) % (Math.PI * 2));
  }
  angles.sort((a, b) => a - b);

  const vertices: Point[] = [];
  for (const a of angles) {
    const rJitter = 1 + (Math.random() * 2 - 1) * irregularity;
    const r = Math.max(canvasSize * 0.1, Math.min(canvasSize * 0.42, baseRadius * rJitter));
    const x = Math.round(Math.max(15, Math.min(canvasSize - 15, cx + r * Math.cos(a))));
    const y = Math.round(Math.max(15, Math.min(canvasSize - 15, cy + r * Math.sin(a))));
    vertices.push({ x, y });
  }

  return vertices;
}

/**
 * 根据 Level (1..35) 计算 2AFC 负形面积相对差异率 delta
 * Level 1: delta = 0.35 (35%), Level 35: delta = 0.02 (2%)
 */
export function get2AfcdeltaForLevel(level: number): number {
  return expDecayInterpolate(0.35, 0.02, level);
}

/**
 * 计算多边形质心
 */
export function calcPolygonCentroid(vertices: Point[]): Point {
  let cx = 0;
  let cy = 0;
  for (const p of vertices) {
    cx += p.x;
    cy += p.y;
  }
  return { x: cx / vertices.length, y: cy / vertices.length };
}

/**
 * 将任意多边形围绕质心缩放，使其面积精准等于 targetArea
 */
export function scalePolygonToArea(
  vertices: Point[],
  targetArea: number,
  canvasSize = TWO_AFC_CANVAS_SIZE,
): Point[] {
  const currentArea = calcPolygonArea(vertices);
  if (currentArea <= 0) return vertices;

  const k = Math.sqrt(targetArea / currentArea);
  const centroid = calcPolygonCentroid(vertices);
  const canvasCenter = canvasSize / 2;

  return vertices.map((p) => {
    // 质心缩放
    const scaledX = centroid.x + (p.x - centroid.x) * k;
    const scaledY = centroid.y + (p.y - centroid.y) * k;
    // 平移回画布中央
    const centeredX = scaledX - centroid.x + canvasCenter;
    const centeredY = scaledY - centroid.y + canvasCenter;
    return {
      x: Math.round(Math.max(6, Math.min(canvasSize - 6, centeredX))),
      y: Math.round(Math.max(6, Math.min(canvasSize - 6, centeredY))),
    };
  });
}

/**
 * 对多边形顶点施加微小扰动生成高相似干扰项
 */
export function perturbPolygon(
  baseVertices: Point[],
  level: number,
  canvasSize = NEGATIVE_SPACE_CANVAS_SIZE,
): Point[] {
  const clamped = Math.max(1, Math.min(35, level));
  const t = (clamped - 1) / 34;
  const maxPerturb = 36;
  const minPerturb = 6;
  const perturbAmount = maxPerturb * (minPerturb / maxPerturb) ** t;

  return baseVertices.map((p) => {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * perturbAmount + 2;
    const x = Math.max(15, Math.min(canvasSize - 15, Math.round(p.x + Math.cos(angle) * dist)));
    const y = Math.max(15, Math.min(canvasSize - 15, Math.round(p.y + Math.sin(angle) * dist)));
    return { x, y };
  });
}

/**
 * 生成负形空间练习题目 (支持 RATIO_ESTIMATION, AREA_COMPARISON_2AFC, NEGATIVE_VERTEX_FITTING, SHAPE_MATCH_4AFC)
 */
export function generateNegativeSpaceQuestion(
  mode: NegativeSpaceMode,
  level: number,
): NegativeSpaceQuestionData {
  const id = `nsq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  if (mode === 'AREA_COMPARISON_2AFC') {
    const canvasArea = TWO_AFC_CANVAS_SIZE * TWO_AFC_CANVAS_SIZE;
    const delta = get2AfcdeltaForLevel(clampedLevel);

    // 随机决定哪一侧负形面积更大
    const largerSide: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B';

    // 基准负形留白占比：设定在 45% ~ 75% 之间
    const baseNegRatio = 0.45 + Math.random() * 0.3;
    const halfDelta = delta / 2;

    const negRatioA =
      largerSide === 'A' ? baseNegRatio * (1 + halfDelta) : baseNegRatio * (1 - halfDelta);
    const negRatioB =
      largerSide === 'B' ? baseNegRatio * (1 + halfDelta) : baseNegRatio * (1 - halfDelta);

    const clampedRatioA = Math.max(0.2, Math.min(0.88, negRatioA));
    const clampedRatioB = Math.max(0.2, Math.min(0.88, negRatioB));

    const negAreaA = Math.round(canvasArea * clampedRatioA);
    const negAreaB = Math.round(canvasArea * clampedRatioB);

    const posAreaA = canvasArea - negAreaA;
    const posAreaB = canvasArea - negAreaB;

    // 分别为 A、B 生成形态各异的基础多边形并精准缩放至正形目标面积
    const rawPolyA = generateRandomPolygon(clampedLevel);
    const rawPolyB = generateRandomPolygon(clampedLevel);

    const verticesA = scalePolygonToArea(rawPolyA, posAreaA, TWO_AFC_CANVAS_SIZE);
    const verticesB = scalePolygonToArea(rawPolyB, posAreaB, TWO_AFC_CANVAS_SIZE);

    // 重新校准实际缩放后多边形的真实负形面积
    const actualPosA = calcPolygonArea(verticesA);
    const actualPosB = calcPolygonArea(verticesB);
    const actualNegA = canvasArea - actualPosA;
    const actualNegB = canvasArea - actualPosB;

    const finalRatioA = Math.round((actualNegA / canvasArea) * 1000) / 10;
    const finalRatioB = Math.round((actualNegB / canvasArea) * 1000) / 10;
    const finalLarger: 'A' | 'B' = actualNegA >= actualNegB ? 'A' : 'B';
    const actualDeltaPercent =
      Math.round((Math.abs(actualNegA - actualNegB) / ((actualNegA + actualNegB) / 2)) * 1000) / 10;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      canvasArea,
      verticesA,
      verticesB,
      negAreaA: Math.round(actualNegA),
      negAreaB: Math.round(actualNegB),
      negRatioA: finalRatioA,
      negRatioB: finalRatioB,
      largerSide: finalLarger,
      areaDeltaPercent: actualDeltaPercent,
      tolerance: delta,
    };
  }

  if (mode === 'NEGATIVE_VERTEX_FITTING') {
    const canvasArea = FITTING_CANVAS_SIZE * FITTING_CANVAS_SIZE;
    const vertices = generateRandomPolygon(clampedLevel, FITTING_CANVAS_SIZE);
    const n = vertices.length;

    // 选取一个目标关键拐点
    const targetVertexIndex = Math.floor(Math.random() * n);
    const targetPoint = vertices[targetVertexIndex];

    const prevIdx = (targetVertexIndex - 1 + n) % n;
    const nextIdx = (targetVertexIndex + 1) % n;
    const prevPoint = vertices[prevIdx];
    const nextPoint = vertices[nextIdx];

    // 计算截断正形多边形（在目标顶点两侧各截去 45% 的线段长度）
    const cutRatio = 0.45;
    const cutPrev: Point = {
      x: Math.round(prevPoint.x + (targetPoint.x - prevPoint.x) * (1 - cutRatio)),
      y: Math.round(prevPoint.y + (targetPoint.y - prevPoint.y) * (1 - cutRatio)),
    };
    const cutNext: Point = {
      x: Math.round(nextPoint.x + (targetPoint.x - nextPoint.x) * (1 - cutRatio)),
      y: Math.round(nextPoint.y + (targetPoint.y - nextPoint.y) * (1 - cutRatio)),
    };

    const truncatedVertices: Point[] = [];
    for (let i = 0; i < n; i++) {
      if (i === targetVertexIndex) {
        truncatedVertices.push(cutPrev);
        truncatedVertices.push(cutNext);
      } else {
        truncatedVertices.push(vertices[i]);
      }
    }

    // 围绕 targetPoint 构建局部干扰网格点 (点间距 S 随 Level 从 24px 缩紧至 3.5px)
    const gridDim = 3;
    const S_MAX = 24;
    const S_MIN = 3.5;
    const t = (clampedLevel - 1) / 34;
    const S = S_MAX * (S_MIN / S_MAX) ** t;

    const targetRow = Math.floor(Math.random() * gridDim);
    const targetCol = Math.floor(Math.random() * gridDim);
    const distractorPoints: Point[] = [];

    for (let r = 0; r < gridDim; r++) {
      for (let c = 0; c < gridDim; c++) {
        const x = Math.round((targetPoint.x + (c - targetCol) * S) * 100) / 100;
        const y = Math.round((targetPoint.y + (r - targetRow) * S) * 100) / 100;
        distractorPoints.push({ x, y });
      }
    }

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      canvasArea,
      vertices,
      targetVertexIndex,
      targetPoint,
      truncatedVertices,
      distractorPoints,
      gridDim,
      tolerance: S / 2,
    };
  }

  if (mode === 'SHAPE_MATCH_2AFC') {
    const canvasArea = NEGATIVE_SPACE_CANVAS_SIZE * NEGATIVE_SPACE_CANVAS_SIZE;
    const targetPolygon = generateRandomPolygon(clampedLevel, NEGATIVE_SPACE_CANVAS_SIZE);
    const distractorPolygon = perturbPolygon(
      targetPolygon,
      clampedLevel,
      NEGATIVE_SPACE_CANVAS_SIZE,
    );

    const isTargetA = Math.random() < 0.5;
    const optionsPolygons = isTargetA
      ? [targetPolygon, distractorPolygon]
      : [distractorPolygon, targetPolygon];
    const correctOptionIndex = isTargetA ? 0 : 1;
    const correctChoice = isTargetA ? 'A' : 'B';

    const t = (clampedLevel - 1) / 34;
    const maxDisplayMs = 2400;
    const minDisplayMs = 450;
    const displayTimeMs = Math.round(maxDisplayMs * (minDisplayMs / maxDisplayMs) ** t);

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      canvasArea,
      targetPolygon,
      optionsPolygons,
      correctOptionIndex,
      correctChoice,
      displayTimeMs,
      tolerance: 0,
    };
  }

  // 默认 RATIO_ESTIMATION 滑块评估模式
  const tolerance = getNegativeSpaceToleranceForLevel(clampedLevel);
  const canvasArea = NEGATIVE_SPACE_CANVAS_SIZE * NEGATIVE_SPACE_CANVAS_SIZE;

  let vertices = generateRandomPolygon(clampedLevel);
  let posArea = calcPolygonArea(vertices);

  let attempts = 0;
  while ((posArea / canvasArea < 0.15 || posArea / canvasArea > 0.8) && attempts < 10) {
    attempts++;
    vertices = generateRandomPolygon(clampedLevel);
    posArea = calcPolygonArea(vertices);
  }

  const negArea = canvasArea - posArea;
  const targetNegativeRatio = Math.round((negArea / canvasArea) * 1000) / 10;

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    vertices,
    canvasArea,
    positiveArea: Math.round(posArea),
    negativeArea: Math.round(negArea),
    targetNegativeRatio,
    tolerance,
  };
}

/**
 * 答题结果检测与评估
 */
export function checkNegativeSpaceHit(
  userAnswer: number | 'A' | 'B' | Point,
  question: NegativeSpaceQuestionData,
): NegativeSpaceHitResult {
  if (question.mode === 'NEGATIVE_VERTEX_FITTING') {
    const clickPoint = userAnswer as Point;
    const targetPoint = question.targetPoint ?? { x: 0, y: 0 };
    const distractorPoints = question.distractorPoints ?? [];

    const hitRes = checkHit(clickPoint, targetPoint, distractorPoints);
    return {
      isHit: hitRes.isHit,
      clickPoint,
      nearestGridPoint: hitRes.nearestGridPoint,
      errorValue: hitRes.errorDistance,
      tolerance: question.tolerance,
      isWithinRange: hitRes.isWithinRange,
    };
  }

  if (question.mode === 'AREA_COMPARISON_2AFC') {
    const userChoice = userAnswer as 'A' | 'B';
    const isHit = userChoice === question.largerSide;

    return {
      isHit,
      userChoice,
      correctChoice: question.largerSide,
      negRatioA: question.negRatioA,
      negRatioB: question.negRatioB,
      errorValue: isHit ? 0 : (question.areaDeltaPercent ?? 0),
      tolerance: question.tolerance,
    };
  }

  if (question.mode === 'SHAPE_MATCH_2AFC') {
    let userChoiceIndex: number;
    if (typeof userAnswer === 'number') {
      userChoiceIndex = userAnswer;
    } else if (userAnswer === 'A') {
      userChoiceIndex = 0;
    } else if (userAnswer === 'B') {
      userChoiceIndex = 1;
    } else {
      userChoiceIndex = 0;
    }

    const isHit = userChoiceIndex === question.correctOptionIndex;
    const userChoice = userChoiceIndex === 0 ? 'A' : 'B';

    return {
      isHit,
      userChoice,
      userChoiceIndex,
      correctChoice: question.correctChoice,
      correctOptionIndex: question.correctOptionIndex,
      errorValue: isHit ? 0 : 1,
      tolerance: 0,
    };
  }

  const userRatio = typeof userAnswer === 'number' ? userAnswer : 50;
  const targetRatio = question.targetNegativeRatio ?? 50;
  const errorValue = Math.round(Math.abs(userRatio - targetRatio) * 10) / 10;
  const isHit = errorValue <= question.tolerance;

  return {
    isHit,
    userRatio,
    targetRatio,
    errorValue,
    tolerance: question.tolerance,
  };
}
