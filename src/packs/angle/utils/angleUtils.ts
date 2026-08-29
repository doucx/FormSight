import { setup2DCanvas } from '../../../core/canvas/hidpi';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';

export type AngleMode = 'ANGLE_ESTIMATION' | 'ANGLE_COMPARISON_2AFC' | 'PARALLEL_ALIGNMENT_2AFC';

export const ANGLE_CANVAS_SIZE = 340;
export const ANGLE_2AFC_SIZE = 240;
export const ANGLE_PROMPT_SIZE = 140;

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface AngleQuestionData {
  id: string;
  mode: AngleMode;
  difficultyLevel: number;
  tolerance: number;

  targetAngleDeg?: number;
  startAngleDeg?: number;
  lineA?: LineSegment;
  lineB?: LineSegment;

  angleA?: number;
  angleB?: number;
  linesA?: [LineSegment, LineSegment];
  linesB?: [LineSegment, LineSegment];
  largerSide?: 'A' | 'B';

  promptLine?: LineSegment;
  lineOptionA?: LineSegment;
  lineOptionB?: LineSegment;
  parallelSide?: 'A' | 'B';
  angularDeviation?: number;
}

export interface AngleHitResult {
  isHit: boolean;
  userValue?: number;
  targetValue?: number;
  errorValue: number;
  tolerance: number;
  userChoice?: 'A' | 'B';
  correctChoice?: 'A' | 'B';
}

export function drawAngleCanvas(
  canvas: HTMLCanvasElement | null,
  lines: [LineSegment, LineSegment] | undefined,
  size = ANGLE_CANVAS_SIZE,
  strokeColor = '#0F172A',
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

export function drawSingleLineCanvas(
  canvas: HTMLCanvasElement | null,
  line: LineSegment | undefined,
  size = ANGLE_2AFC_SIZE,
  strokeColor = '#0F172A',
  lineWidth = 2.5,
): void {
  if (!line) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(line.p1.x, line.p1.y);
  ctx.lineTo(line.p2.x, line.p2.y);
  ctx.stroke();
}

function createCenteredLine(center: Point, angleDeg: number, length: number): LineSegment {
  const rad = (angleDeg * Math.PI) / 180;
  const halfL = length / 2;
  return {
    p1: {
      x: Math.round((center.x - halfL * Math.cos(rad)) * 10) / 10,
      y: Math.round((center.y + halfL * Math.sin(rad)) * 10) / 10,
    },
    p2: {
      x: Math.round((center.x + halfL * Math.cos(rad)) * 10) / 10,
      y: Math.round((center.y - halfL * Math.sin(rad)) * 10) / 10,
    },
  };
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

export function generateAngleQuestion(mode: AngleMode, level: number): AngleQuestionData {
  const id = `ang_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  if (mode === 'ANGLE_ESTIMATION') {
    const targetAngleDeg = Math.floor(Math.random() * 150) + 15;
    const startAngleDeg = Math.floor(Math.random() * 360);
    const endAngleDeg = (startAngleDeg + targetAngleDeg) % 360;

    const center: Point = { x: ANGLE_CANVAS_SIZE / 2, y: ANGLE_CANVAS_SIZE / 2 };
    const armLength = ANGLE_CANVAS_SIZE * 0.38;

    const lineA = createRadialLine(center, startAngleDeg, armLength);
    const lineB = createRadialLine(center, endAngleDeg, armLength);

    const tolerance = Math.round(expDecayInterpolate(12.0, 1.5, clampedLevel) * 10) / 10;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      targetAngleDeg,
      startAngleDeg,
      lineA,
      lineB,
      tolerance,
    };
  }

  if (mode === 'ANGLE_COMPARISON_2AFC') {
    const baseAngle = Math.floor(Math.random() * 110) + 30;
    const deltaAngle = Math.round(expDecayInterpolate(25.0, 1.2, clampedLevel) * 10) / 10;

    const largerAngle = Math.min(170, baseAngle + deltaAngle);
    const smallerAngle = Math.max(10, baseAngle);

    const isALarger = Math.random() < 0.5;
    const angleA = isALarger ? largerAngle : smallerAngle;
    const angleB = isALarger ? smallerAngle : largerAngle;

    const center: Point = { x: ANGLE_2AFC_SIZE / 2, y: ANGLE_2AFC_SIZE / 2 };
    const armLength = ANGLE_2AFC_SIZE * 0.38;

    const startA = Math.floor(Math.random() * 360);
    const startB = Math.floor(Math.random() * 360);

    const linesA: [LineSegment, LineSegment] = [
      createRadialLine(center, startA, armLength),
      createRadialLine(center, (startA + angleA) % 360, armLength),
    ];
    const linesB: [LineSegment, LineSegment] = [
      createRadialLine(center, startB, armLength),
      createRadialLine(center, (startB + angleB) % 360, armLength),
    ];

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      angleA,
      angleB,
      linesA,
      linesB,
      largerSide: isALarger ? 'A' : 'B',
      tolerance: deltaAngle,
    };
  }

  const baseAngle = Math.floor(Math.random() * 360);
  const angularDeviation = Math.round(expDecayInterpolate(16.0, 1.0, clampedLevel) * 10) / 10;
  const deviationSign = Math.random() < 0.5 ? 1 : -1;
  const distractorAngle = (baseAngle + angularDeviation * deviationSign + 360) % 360;

  const promptCenter: Point = {
    x: ANGLE_PROMPT_SIZE / 2,
    y: ANGLE_PROMPT_SIZE / 2,
  };
  const promptLine = createCenteredLine(promptCenter, baseAngle, ANGLE_PROMPT_SIZE * 0.68);

  const optCenterA: Point = {
    x: ANGLE_2AFC_SIZE / 2 + (Math.random() * 20 - 10),
    y: ANGLE_2AFC_SIZE / 2 + (Math.random() * 20 - 10),
  };
  const optCenterB: Point = {
    x: ANGLE_2AFC_SIZE / 2 + (Math.random() * 20 - 10),
    y: ANGLE_2AFC_SIZE / 2 + (Math.random() * 20 - 10),
  };

  const lineLength = ANGLE_2AFC_SIZE * 0.65;
  const isAParallel = Math.random() < 0.5;

  const lineOptionA = isAParallel
    ? createCenteredLine(optCenterA, baseAngle, lineLength)
    : createCenteredLine(optCenterA, distractorAngle, lineLength);

  const lineOptionB = isAParallel
    ? createCenteredLine(optCenterB, distractorAngle, lineLength)
    : createCenteredLine(optCenterB, baseAngle, lineLength);

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    promptLine,
    lineOptionA,
    lineOptionB,
    parallelSide: isAParallel ? 'A' : 'B',
    angularDeviation,
    tolerance: angularDeviation,
  };
}

export function checkAngleHit(
  userAnswer: number | 'A' | 'B',
  question: AngleQuestionData,
): AngleHitResult {
  const { mode } = question;

  if (mode === 'ANGLE_ESTIMATION') {
    const userVal = typeof userAnswer === 'number' ? userAnswer : 90;
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

  const choice = userAnswer as 'A' | 'B';
  const correctChoice =
    mode === 'ANGLE_COMPARISON_2AFC'
      ? (question.largerSide ?? 'A')
      : (question.parallelSide ?? 'A');

  const isHit = choice === correctChoice;

  return {
    isHit,
    userChoice: choice,
    correctChoice,
    errorValue: isHit ? 0 : 1,
    tolerance: question.tolerance,
  };
}
