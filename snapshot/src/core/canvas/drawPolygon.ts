import type { Point } from '../../types';

export interface DrawPolygonOptions {
  canvas: HTMLCanvasElement | null;
  vertices?: Point[];
  size: number;
  fillColor?: string;
  strokeColor?: string;
  lineWidth?: number;
  bgColor?: string;
  isHighlighted?: boolean;
  highlightColor?: string;
}

/**
 * 在 Canvas 上清屏并绘制多边形
 */
import { setupHiDpiCanvas } from './hidpi';

export function drawPolygonCanvas({
  canvas,
  vertices,
  size,
  fillColor = '#0F172A',
  strokeColor = '#1E293B',
  lineWidth = 2,
  bgColor = '#FFFFFF',
  isHighlighted = false,
  highlightColor = '#22C55E',
}: DrawPolygonOptions): void {
  if (!canvas || !vertices || vertices.length < 3) return;
  const ctx = setupHiDpiCanvas(canvas, size, size);
  if (!ctx) return;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);

  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    ctx.lineTo(vertices[i].x, vertices[i].y);
  }
  ctx.closePath();

  ctx.fillStyle = fillColor;
  ctx.fill();

  ctx.strokeStyle = isHighlighted ? highlightColor : strokeColor;
  ctx.lineWidth = isHighlighted ? lineWidth + 1.5 : lineWidth;
  ctx.stroke();
}
