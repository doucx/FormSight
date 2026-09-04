

import { type HitResult, type QuestionData, TWO_AFC_CANVAS_SIZE } from '../types';
import { expDecayInterpolate, Point } from '@formsight/card-sdk';

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

export function calcPolygonCentroid(vertices: Point[]): Point {
  let cx = 0;
  let cy = 0;
  for (const p of vertices) {
    cx += p.x;
    cy += p.y;
  }
  return { x: cx / vertices.length, y: cy / vertices.length };
}

export function generateRandomPolygon(level: number, canvasSize = TWO_AFC_CANVAS_SIZE): Point[] {
  const clamped = Math.max(1, Math.min(35, level));
  const t = (clamped - 1) / 34;

  const minVerts = 4 + Math.floor(t * 2);
  const maxVerts = 4 + Math.floor(t * 4);
  const vertexCount = Math.floor(Math.random() * (maxVerts - minVerts + 1)) + minVerts;

  const cx = canvasSize / 2 + (Math.random() - 0.5) * (canvasSize * 0.1);
  const cy = canvasSize / 2 + (Math.random() - 0.5) * (canvasSize * 0.1);

  const baseRadius = canvasSize * 0.28 + Math.random() * (canvasSize * 0.1);
  const irregularity = 0.2 + t * 0.45;

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
    const scaledX = centroid.x + (p.x - centroid.x) * k;
    const scaledY = centroid.y + (p.y - centroid.y) * k;
    const centeredX = scaledX - centroid.x + canvasCenter;
    const centeredY = scaledY - centroid.y + canvasCenter;
    return {
      x: Math.round(Math.max(6, Math.min(canvasSize - 6, centeredX))),
      y: Math.round(Math.max(6, Math.min(canvasSize - 6, centeredY))),
    };
  });
}

export function get2AfcdeltaForLevel(level: number): number {
  return expDecayInterpolate(0.35, 0.02, level);
}

export function generateQuestion(difficultyLevel: number): QuestionData {
  const id = `nsq_2afc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, difficultyLevel));
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

export function evaluateAnswer(userChoice: 'A' | 'B', question: QuestionData): HitResult {
  const isHit = userChoice === question.largerSide;

  return {
    isHit,
    userChoice,
    correctChoice: question.largerSide,
    negRatioA: question.negRatioA,
    negRatioB: question.negRatioB,
    errorValue: isHit ? 0 : question.areaDeltaPercent,
    tolerance: question.tolerance,
  };
}
