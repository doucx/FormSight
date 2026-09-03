import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { Point } from '../../../types';
import type { HitResult, QuestionData } from '../types';

export const CANVAS_SIZE = 500;
export const CX = CANVAS_SIZE / 2;
export const CY = CANVAS_SIZE / 2;
export const DEFAULT_GRID_DIM = 3;

export interface QuestionGenerateOptions {
  targetingMode?: 'off' | 'manual';
  targetSectors?: number[];
  gridSize?: number;
}

export function generatePolarGridPoints(
  anchorA: Point,
  targetB: Point,
  level: number,
  gridDim = DEFAULT_GRID_DIM,
  targetRow = Math.floor(Math.random() * gridDim),
  targetCol = Math.floor(Math.random() * gridDim),
): Point[] {
  const dx = targetB.x - anchorA.x;
  const dy = targetB.y - anchorA.y;
  const R = Math.sqrt(dx * dx + dy * dy);
  const theta = Math.atan2(dy, dx);

  const S_MAX = 25;
  const S_MIN = 3.5;

  const t = (Math.max(1, Math.min(level, 35)) - 1) / 34;
  const S = S_MAX - t * (S_MAX - S_MIN);

  const maxAngleStepRad = (15 * Math.PI) / 180;
  const angleStepRad = Math.min(S / R, maxAngleStepRad);
  const rStep = S;

  const points: Point[] = [];
  for (let rIdx = 0; rIdx < gridDim; rIdx++) {
    for (let aIdx = 0; aIdx < gridDim; aIdx++) {
      const curR = R + (rIdx - targetRow) * rStep;
      const curTheta = theta + (aIdx - targetCol) * angleStepRad;
      const x = Math.round((anchorA.x + curR * Math.cos(curTheta)) * 100) / 100;
      const y = Math.round((anchorA.y + curR * Math.sin(curTheta)) * 100) / 100;
      points.push({ x, y });
    }
  }
  return points;
}

function selectAngleWithTargeting(options?: QuestionGenerateOptions): number {
  if (
    options?.targetingMode &&
    options.targetingMode !== 'off' &&
    options.targetSectors &&
    options.targetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        options.targetSectors[Math.floor(Math.random() * options.targetSectors.length)];
      const sectorCenterAngle = chosenSector * 45;
      const jitter = (Math.random() - 0.5) * 40;
      return Math.floor((sectorCenterAngle + jitter + 360) % 360);
    }
  }
  return Math.floor(Math.random() * 360);
}

export function generateQuestion(
  difficultyLevel: number,
  options?: QuestionGenerateOptions,
): QuestionData {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = options?.gridSize ?? DEFAULT_GRID_DIM;
  const randomRow = Math.floor(Math.random() * gridDim);
  const randomCol = Math.floor(Math.random() * gridDim);

  const anchorA: Point = { x: CX, y: CY };
  const angle = selectAngleWithTargeting(options);
  const distChoices = [60, 90, 120, 150, 180];
  const dist = distChoices[Math.floor(Math.random() * distChoices.length)];

  const rad = (angle * Math.PI) / 180;
  const targetB: Point = {
    x: Math.round((CX + dist * Math.cos(rad)) * 100) / 100,
    y: Math.round((CY + dist * Math.sin(rad)) * 100) / 100,
  };

  const distractorPoints = generatePolarGridPoints(
    anchorA,
    targetB,
    difficultyLevel,
    gridDim,
    randomRow,
    randomCol,
  );

  return {
    id,
    anchorA,
    targetB,
    gridStart: distractorPoints[0],
    difficultyLevel,
    gridDim,
    distractorPoints,
    angleDegree: angle,
    distanceRatio: dist,
  };
}

export function checkHit(userPoint: Point, question: QuestionData): HitResult {
  const res = evaluatePointGridHit(userPoint, question.targetB, question.distractorPoints);
  return {
    isHit: res.isHit,
    nearestGridPoint: res.nearestGridPoint,
    errorDistance: res.errorDistance,
  };
}