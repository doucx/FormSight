import { setup2DCanvas } from '../../../core/canvas/hidpi';
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';

export const ANGLE_CANVAS_SIZE = 340;
export const ANGLE_2AFC_SIZE = 240;
export const ANGLE_PROMPT_SIZE = 140;

export interface LineSegment {
  p1: Point;
  p2: Point;
}

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

export function drawSingleLineCanvas(
  canvas: HTMLCanvasElement | null,
  line: LineSegment | undefined,
  size = ANGLE_2AFC_SIZE,
  strokeColor: string = CANVAS_THEME.shape.fill,
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

export function createCenteredLine(center: Point, angleDeg: number, length: number): LineSegment {
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

export function createRadialLine(center: Point, angleDeg: number, length: number): LineSegment {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    p1: { x: center.x, y: center.y },
    p2: {
      x: Math.round((center.x + length * Math.cos(rad)) * 10) / 10,
      y: Math.round((center.y - length * Math.sin(rad)) * 10) / 10,
    },
  };
}