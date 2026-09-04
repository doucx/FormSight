import type { Point } from '@formsight/card-sdk';
import type { HitResult, QuestionData } from '../types';

export const CANVAS_SIZE = 400;
export const OPTION_SIZE = 260;

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

export function generateDetailedPolygon(verticesCount: number, size = CANVAS_SIZE): Point[] {
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

export function generateAdversarialDistractorHull(
  targetHull: Point[],
  level: number,
  size = OPTION_SIZE,
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

export function generateQuestion(level: number): QuestionData {
  const id = `abs_pd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34;

  const minVerts = 4 + Math.floor(t * 3);
  const maxVerts = 5 + Math.floor(t * 4);
  const vertCount = Math.floor(Math.random() * (maxVerts - minVerts + 1)) + minVerts;

  const targetHull = generateDetailedPolygon(vertCount, OPTION_SIZE);
  const distractorHull = generateAdversarialDistractorHull(targetHull, clampedLevel, OPTION_SIZE);

  const scaleToMain = CANVAS_SIZE / OPTION_SIZE;
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
    difficultyLevel: clampedLevel,
    detailedPolygon,
    simplifiedOptions,
    correctPolyIndex: isA ? 0 : 1,
    correctPolyChoice: isA ? 'A' : 'B',
    tolerance: 0,
  };
}

export function checkHit(userChoice: 'A' | 'B', question: QuestionData): HitResult {
  const isHit = userChoice === question.correctPolyChoice;
  return {
    isHit,
    userChoice,
    correctChoice: question.correctPolyChoice,
    errorValue: isHit ? 0 : 1,
    tolerance: 0,
  };
}
