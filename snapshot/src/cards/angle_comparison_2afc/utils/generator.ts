

import type { AngleComparisonHitResult, AngleComparisonQuestion, LineSegment } from '../types';
import {
  CANVAS_THEME,
  expDecayInterpolate,
  Point,
  setup2DCanvas
} from '@formsight/card-sdk';

export const ANGLE_2AFC_SIZE = 240;

export function drawAngleCanvas(
  canvas: HTMLCanvasElement | null,
  lines: [LineSegment, LineSegment] | undefined,
  size = ANGLE_2AFC_SIZE,
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

export function generateQuestion(level: number): AngleComparisonQuestion {
  const id = `ang_2afc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

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
    difficultyLevel: clampedLevel,
    angleA,
    angleB,
    linesA,
    linesB,
    largerSide: isALarger ? 'A' : 'B',
    tolerance: deltaAngle,
  };
}

export function checkHit(
  choice: 'A' | 'B',
  question: AngleComparisonQuestion,
): AngleComparisonHitResult {
  const correctChoice = question.largerSide ?? 'A';
  const isHit = choice === correctChoice;

  return {
    isHit,
    userChoice: choice,
    correctChoice,
    errorValue: isHit ? 0 : 1,
    tolerance: question.tolerance,
  };
}
