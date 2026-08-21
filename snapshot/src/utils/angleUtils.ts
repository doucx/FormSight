import type { Point } from '../types';
import { expDecayInterpolate } from './mathUtils';

export type AngleMode =
  | 'ANGLE_ESTIMATION'
  | 'ANGLE_COMPARISON_2AFC'
  | 'PARALLEL_ALIGNMENT_2AFC';

export const ANGLE_CANVAS_SIZE = 340;
export const ANGLE_2AFC_SIZE = 240;

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface AngleQuestionData {
  id: string;
  mode: AngleMode;
  difficultyLevel: number;
  tolerance: number;

  // 1. ANGLE_ESTIMATION 字段
  targetAngleDeg?: number; // 实际夹角 (10°~170°)
  startAngleDeg?: number; // 起始基准旋转角
  lineA?: LineSegment;
  lineB?: LineSegment;

  // 2. ANGLE_COMPARISON_2AFC 字段
  angleA?: number;
  angleB?: number;
  linesA?: [LineSegment, LineSegment];
  linesB?: [LineSegment, LineSegment];
  largerSide?: 'A' | 'B';

  // 3. PARALLEL_ALIGNMENT_2AFC 字段
  parallelLinesA?: [LineSegment, LineSegment];
  parallelLinesB?: [LineSegment, LineSegment];
  parallelSide?: 'A' | 'B';
  angularDeviation?: number; // 干扰项偏离平行的微小角度
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

/**
 * 绘制两条相交构成的夹角线段 (极简纯黑白)
 */
export function drawAngleCanvas(
  canvas: HTMLCanvasElement | null,
  lines: [LineSegment, LineSegment] | undefined,
  size = ANGLE_CANVAS_SIZE,
  strokeColor = '#0F172A',
  lineWidth = 2.5,
): void {
  if (!canvas || !lines) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

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

/**
 * 绘制两根平行或微小偏转的独立线段
 */
export function drawParallelLinesCanvas(
  canvas: HTMLCanvasElement | null,
  lines: [LineSegment, LineSegment] | undefined,
  size = ANGLE_2AFC_SIZE,
  strokeColor = '#0F172A',
  lineWidth = 2.5,
): void {
  if (!canvas || !lines) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';

  for (const line of lines) {
    ctx.beginPath();
    ctx.moveTo(line.p1.x, line.p1.y);
    ctx.lineTo(line.p2.x, line.p2.y);
    ctx.stroke();
  }
}

/**
 * 根据极角生成一条由中心发散出去的线段
 */
function createRadialLine(
  center: Point,
  angleDeg: number,
  length: number,
): LineSegment {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    p1: { x: center.x, y: center.y },
    p2: {
      x: Math.round((center.x + length * Math.cos(rad)) * 10) / 10,
      y: Math.round((center.y - length * Math.sin(rad)) * 10) / 10,
    },
  };
}

/**
 * 生成空间中居中平行分布的两根线段
 */
function createParallelPair(
  center: Point,
  angleDeg: number,
  length: number,
  spacing: number,
  angularJitter = 0,
): [LineSegment, LineSegment] {
  const rad = (angleDeg * Math.PI) / 180;
  const normRad = rad + Math.PI / 2;

  const offsetX = (spacing / 2) * Math.cos(normRad);
  const offsetY = -(spacing / 2) * Math.sin(normRad);

  const c1: Point = { x: center.x + offsetX, y: center.y + offsetY };
  const c2: Point = { x: center.x - offsetX, y: center.y - offsetY };

  const halfL = length / 2;

  // 线 1
  const line1: LineSegment = {
    p1: {
      x: Math.round((c1.x - halfL * Math.cos(rad)) * 10) / 10,
      y: Math.round((c1.y + halfL * Math.sin(rad)) * 10) / 10,
    },
    p2: {
      x: Math.round((c1.x + halfL * Math.cos(rad)) * 10) / 10,
      y: Math.round((c1.y - halfL * Math.sin(rad)) * 10) / 10,
    },
  };

  // 线 2 (带有可选的微小偏转)
  const rad2 = ((angleDeg + angularJitter) * Math.PI) / 180;
  const line2: LineSegment = {
    p1: {
      x: Math.round((c2.x - halfL * Math.cos(rad2)) * 10) / 10,
      y: Math.round((c2.y + halfL * Math.sin(rad2)) * 10) / 10,
    },
    p2: {
      x: Math.round((c2.x + halfL * Math.cos(rad2)) * 10) / 10,
      y: Math.round((c2.y - halfL * Math.sin(rad2)) * 10) / 10,
    },
  };

  return [line1, line2];
}

export function generateAngleQuestion(
  mode: AngleMode,
  level: number,
): AngleQuestionData {
  const id = `ang_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  // 1. ANGLE_ESTIMATION (连续滑块估算夹角)
  if (mode === 'ANGLE_ESTIMATION') {
    const targetAngleDeg = Math.floor(Math.random() * 150) + 15; // 15° ~ 165°
    const startAngleDeg = Math.floor(Math.random() * 360);
    const endAngleDeg = (startAngleDeg + targetAngleDeg) % 360;

    const center: Point = { x: ANGLE_CANVAS_SIZE / 2, y: ANGLE_CANVAS_SIZE / 2 };
    const armLength = ANGLE_CANVAS_SIZE * 0.38;

    const lineA = createRadialLine(center, startAngleDeg, armLength);
    const lineB = createRadialLine(center, endAngleDeg, armLength);

    const tolerance =
      Math.round(expDecayInterpolate(12.0, 1.5, clampedLevel) * 10) / 10;

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

  // 2. ANGLE_COMPARISON_2AFC (角度大小对比)
  if (mode === 'ANGLE_COMPARISON_2AFC') {
    const baseAngle = Math.floor(Math.random() * 110) + 30; // 30° ~ 140°
    const deltaAngle =
      Math.round(expDecayInterpolate(25.0, 1.2, clampedLevel) * 10) / 10;

    const largerAngle = Math.min(170, baseAngle + deltaAngle);
    const smallerAngle = Math.max(10, baseAngle);

    const isALarger = Math.random() < 0.5;
    const angleA = isALarger ? largerAngle : smallerAngle;
    const angleB = isALarger ? smallerAngle : largerAngle;

    const center: Point = { x: ANGLE_2AFC_SIZE / 2, y: ANGLE_2AFC_SIZE / 2 };
    const armLength = ANGLE_2AFC_SIZE * 0.38;

    // 两侧采用独立的随机倾角起始，消除视觉坐标系基准偏置
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

  // 3. PARALLEL_ALIGNMENT_2AFC (平行线对偶辨识)
  const baseAngle = Math.floor(Math.random() * 360);
  const angularDeviation =
    Math.round(expDecayInterpolate(16.0, 1.0, clampedLevel) * 10) / 10;
  const deviationSign = Math.random() < 0.5 ? 1 : -1;
  const jitter = angularDeviation * deviationSign;

  const center: Point = { x: ANGLE_2AFC_SIZE / 2, y: ANGLE_2AFC_SIZE / 2 };
  const lineLength = ANGLE_2AFC_SIZE * 0.6;
  const spacing = ANGLE_2AFC_SIZE * 0.28;

  const anglePairA = Math.floor(Math.random() * 360);
  const anglePairB = Math.floor(Math.random() * 360);

  const isAParallel = Math.random() < 0.5;

  const parallelLinesA = isAParallel
    ? createParallelPair(center, anglePairA, lineLength, spacing, 0)
    : createParallelPair(center, anglePairA, lineLength, spacing, jitter);

  const parallelLinesB = isAParallel
    ? createParallelPair(center, anglePairB, lineLength, spacing, jitter)
    : createParallelPair(center, anglePairB, lineLength, spacing, 0);

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    parallelLinesA,
    parallelLinesB,
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
      ? question.largerSide ?? 'A'
      : question.parallelSide ?? 'A';

  const isHit = choice === correctChoice;

  return {
    isHit,
    userChoice: choice,
    correctChoice,
    errorValue: isHit ? 0 : 1,
    tolerance: question.tolerance,
  };
}