import type { Point } from '../../../types';
import { type HitResult, NEGATIVE_SPACE_CANVAS_SIZE, type QuestionData } from '../types';

export function generateRandomPolygon(
  level: number,
  canvasSize = NEGATIVE_SPACE_CANVAS_SIZE,
): Point[] {
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

export function generateQuestion(difficultyLevel: number): QuestionData {
  const id = `nsq_match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, difficultyLevel));
  const canvasArea = NEGATIVE_SPACE_CANVAS_SIZE * NEGATIVE_SPACE_CANVAS_SIZE;
  const targetPolygon = generateRandomPolygon(clampedLevel, NEGATIVE_SPACE_CANVAS_SIZE);
  const distractorPolygon = perturbPolygon(targetPolygon, clampedLevel, NEGATIVE_SPACE_CANVAS_SIZE);

  const isTargetA = Math.random() < 0.5;
  const optionsPolygons = isTargetA
    ? [targetPolygon, distractorPolygon]
    : [distractorPolygon, targetPolygon];
  const correctOptionIndex = isTargetA ? 0 : 1;
  const correctChoice: 'A' | 'B' = isTargetA ? 'A' : 'B';

  const t = (clampedLevel - 1) / 34;
  const maxDisplayMs = 2400;
  const minDisplayMs = 450;
  const displayTimeMs = Math.round(maxDisplayMs * (minDisplayMs / maxDisplayMs) ** t);

  return {
    id,
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

export function evaluateAnswer(
  userChoiceInput: 0 | 1 | 'A' | 'B',
  question: QuestionData,
): HitResult {
  let userChoiceIndex: number;
  if (typeof userChoiceInput === 'number') {
    userChoiceIndex = userChoiceInput;
  } else if (userChoiceInput === 'A') {
    userChoiceIndex = 0;
  } else {
    userChoiceIndex = 1;
  }

  const isHit = userChoiceIndex === question.correctOptionIndex;
  const userChoice: 'A' | 'B' = userChoiceIndex === 0 ? 'A' : 'B';

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
