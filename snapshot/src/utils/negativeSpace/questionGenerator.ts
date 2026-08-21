import type { Point } from '../../types';
import {
  calcPolygonArea,
  generateRandomPolygon,
  get2AfcdeltaForLevel,
  getNegativeSpaceToleranceForLevel,
  perturbPolygon,
  scalePolygonToArea,
} from './polygonMath';
import {
  FITTING_CANVAS_SIZE,
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceMode,
  type NegativeSpaceQuestionData,
  TWO_AFC_CANVAS_SIZE,
} from './types';

export function generateNegativeSpaceQuestion(
  mode: NegativeSpaceMode,
  level: number,
): NegativeSpaceQuestionData {
  const id = `nsq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  if (mode === 'AREA_COMPARISON_2AFC') {
    const canvasArea = TWO_AFC_CANVAS_SIZE * TWO_AFC_CANVAS_SIZE;
    const delta = get2AfcdeltaForLevel(clampedLevel);

    const largerSide: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B';
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

    const rawPolyA = generateRandomPolygon(clampedLevel);
    const rawPolyB = generateRandomPolygon(clampedLevel);

    const verticesA = scalePolygonToArea(rawPolyA, posAreaA, TWO_AFC_CANVAS_SIZE);
    const verticesB = scalePolygonToArea(rawPolyB, posAreaB, TWO_AFC_CANVAS_SIZE);

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

    const targetVertexIndex = Math.floor(Math.random() * n);
    const targetPoint = vertices[targetVertexIndex];

    const prevIdx = (targetVertexIndex - 1 + n) % n;
    const nextIdx = (targetVertexIndex + 1) % n;
    const prevPoint = vertices[prevIdx];
    const nextPoint = vertices[nextIdx];

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