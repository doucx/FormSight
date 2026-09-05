import { CANVAS_THEME, type Point, expDecayInterpolate, setup2DCanvas } from '@formsight/card-sdk';
import type {
  AngleEstimationGenerateOptions,
  AngleEstimationHitResult,
  AngleEstimationQuestion,
  AngleRangePreset,
  LineSegment,
} from '../types';

export const ANGLE_CANVAS_SIZE = 340;

const RANGE_BOUNDS: Record<AngleRangePreset, [number, number]> = {
  '0_45': [5, 45],
  '45_90': [45, 90],
  '90_135': [90, 135],
  '135_180': [135, 175],
};

const ALL_RANGES: AngleRangePreset[] = ['0_45', '45_90', '90_135', '135_180'];

export function drawAngleCanvas(
  canvas: HTMLCanvasElement | null,
  lines: [LineSegment, LineSegment] | undefined,
  size = ANGLE_CANVAS_SIZE,
  strokeColor: string = CANVAS_THEME.shape.fill,
  lineWidth = 2.5,
): void {
  if (!lines) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const line of lines) {
    ctx.beginPath();
    ctx.moveTo(line.p1.x, line.p1.y);
    ctx.lineTo(line.p2.x, line.p2.y);
    ctx.stroke();
  }
}

function createRadialLine(center: Point, angleDeg: number, length: number): LineSegment {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    p1: { x: center.x, y: center.y },
    p2: {
      x: Math.round((center.x + length * Math.cos(rad)) * 10) / 10,
      y: Math.round((center.y - length * Math.sin(rad)) * 10) / 10,
    },
  };
}

export function generateQuestion(
  level: number,
  options?: AngleEstimationGenerateOptions,
): AngleEstimationQuestion {
  const id = `ang_est_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  const activeRanges =
    options?.angleRanges && options.angleRanges.length > 0 ? options.angleRanges : ALL_RANGES;

  const chosenPreset = activeRanges[Math.floor(Math.random() * activeRanges.length)];
  const [minDeg, maxDeg] = RANGE_BOUNDS[chosenPreset] ?? [15, 165];
  const targetAngleDeg = Math.floor(Math.random() * (maxDeg - minDeg + 1)) + minDeg;

  const startAngleDeg = Math.floor(Math.random() * 360);
>>>>>>
  const endAngleDeg = (startAngleDeg + targetAngleDeg) % 360;

  const center: Point = { x: ANGLE_CANVAS_SIZE / 2, y: ANGLE_CANVAS_SIZE / 2 };
  const armLength = ANGLE_CANVAS_SIZE * 0.38;

  const lineA = createRadialLine(center, startAngleDeg, armLength);
  const lineB = createRadialLine(center, endAngleDeg, armLength);

  const tolerance = Math.round(expDecayInterpolate(12.0, 1.5, clampedLevel) * 10) / 10;

  return {
    id,
    difficultyLevel: clampedLevel,
    targetAngleDeg,
    startAngleDeg,
    lineA,
    lineB,
    tolerance,
  };
}

export function checkHit(
  userValue: number,
  question: AngleEstimationQuestion,
): AngleEstimationHitResult {
  const userVal = typeof userValue === 'number' ? userValue : 90;
  const targetVal = question.targetAngleDeg ?? 90;
  const errorValue = Math.round(Math.abs(userVal - targetVal) * 10) / 10;
  const isHit = errorValue <= question.tolerance;

  return {
    isHit,
    userValue: userVal,
    targetValue: targetVal,
    errorValue,
    tolerance: question.tolerance,
  };
}
