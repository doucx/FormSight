import { setup2DCanvas } from '../../../core/canvas/hidpi';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';
import type { HitResult, QuestionData } from '../types';

export const CANVAS_SIZE = 400;

export function calcPCAOrientation(points: Point[]): number {
  const n = points.length;
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  const cx = sumX / n;
  const cy = sumY / n;

  let covXX = 0;
  let covYY = 0;
  let covXY = 0;
  for (const p of points) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    covXX += dx * dx;
    covYY += dy * dy;
    covXY += dx * dy;
  }

  const theta = 0.5 * Math.atan2(2 * covXY, covXX - covYY);
  let deg = (theta * 180) / Math.PI;
  deg = ((deg % 180) + 180) % 180;
  return Math.round(deg * 10) / 10;
}

export function generateFlowParticles(
  angleDeg: number,
  spreadRatio: number,
  size = CANVAS_SIZE,
): Point[] {
  const rad = (angleDeg * Math.PI) / 180;
  const count = 45 + Math.floor(Math.random() * 20);
  const cx = size / 2;
  const cy = size / 2;
  const majorLen = size * 0.38;
  const minorLen = majorLen * spreadRatio;

  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const u = (Math.random() * 2 - 1) * majorLen;
    const v = (Math.random() * 2 - 1) * minorLen;

    const x = Math.round(cx + u * Math.cos(rad) - v * Math.sin(rad));
    const y = Math.round(cy + u * Math.sin(rad) + v * Math.cos(rad));
    points.push({
      x: Math.max(15, Math.min(size - 15, x)),
      y: Math.max(15, Math.min(size - 15, y)),
    });
  }
  return points;
}

export function drawParticlesCanvas(
  canvas: HTMLCanvasElement | null,
  particles?: Point[],
  size = CANVAS_SIZE,
  axisAngle?: number,
  axisColor: string = CANVAS_THEME.status.hit,
  userAxisAngle?: number,
  isHit?: boolean,
) {
  if (!particles) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = CANVAS_THEME.shape.fill;
    ctx.fill();
  }

  if (userAxisAngle !== undefined && userAxisAngle !== axisAngle) {
    const radU = (userAxisAngle * Math.PI) / 180;
    const cx = size / 2;
    const cy = size / 2;
    const L = size * 0.44;

    ctx.strokeStyle = isHit ? CANVAS_THEME.status.hit : CANVAS_THEME.status.miss;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx - L * Math.cos(radU), cy - L * Math.sin(radU));
    ctx.lineTo(cx + L * Math.cos(radU), cy + L * Math.sin(radU));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (axisAngle !== undefined) {
    const rad = (axisAngle * Math.PI) / 180;
    const cx = size / 2;
    const cy = size / 2;
    const L = size * 0.44;

    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - L * Math.cos(rad), cy - L * Math.sin(rad));
    ctx.lineTo(cx + L * Math.cos(rad), cy + L * Math.sin(rad));
    ctx.stroke();
  }
}

export function generateQuestion(level: number): QuestionData {
  const id = `abs_ga_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34;

  const targetAngleDeg = Math.floor(Math.random() * 180);
  const spreadRatio = 0.15 + t * 0.5;
  const particles = generateFlowParticles(targetAngleDeg, spreadRatio);
  const realPCA = calcPCAOrientation(particles);
  const tolerance = Math.round(expDecayInterpolate(18.0, 2.5, clampedLevel) * 10) / 10;

  return {
    id,
    difficultyLevel: clampedLevel,
    particles,
    targetAngleDeg: realPCA,
    tolerance,
  };
}

export function checkHit(userAnswer: number, question: QuestionData): HitResult {
  const targetDeg = question.targetAngleDeg;
  let diff = Math.abs(userAnswer - targetDeg);
  diff = Math.min(diff, 180 - diff);
  const isHit = diff <= question.tolerance;

  return {
    isHit,
    userValue: userAnswer,
    targetValue: targetDeg,
    errorValue: Math.round(diff * 10) / 10,
    tolerance: question.tolerance,
  };
}