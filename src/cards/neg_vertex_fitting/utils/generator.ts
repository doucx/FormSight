import { type Point, evaluatePointGridHit } from '@formsight/card-sdk';
import { FITTING_CANVAS_SIZE, type HitResult, type QuestionData } from '../types';

export function generateRandomPolygon(level: number, canvasSize = FITTING_CANVAS_SIZE): Point[] {
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

export function generateQuestion(difficultyLevel: number): QuestionData {
  const id = `nsq_fit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, difficultyLevel));
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

export function evaluateAnswer(userPoint: Point, question: QuestionData): HitResult {
  const targetPoint = question.targetPoint;
  const distractorPoints = question.distractorPoints;

  const hitRes = evaluatePointGridHit(userPoint, targetPoint, distractorPoints);
  return {
    isHit: hitRes.isHit,
    clickPoint: userPoint,
    nearestGridPoint: hitRes.nearestGridPoint,
    errorDistance: hitRes.errorDistance,
    tolerance: question.tolerance,
  };
}
