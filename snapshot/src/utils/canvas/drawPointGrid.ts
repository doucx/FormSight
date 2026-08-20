import type { Point } from '../../types';
import { getDynamicCrosshairMetrics, getDynamicDotRadius } from '../geometry';

/**
 * 绘制单个圆点
 */
export function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  radius: number,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

export interface RenderInteractivePointGridOptions {
  ctx: CanvasRenderingContext2D;
  canvasSize: number;
  gridPoints: Point[];
  targetPoint?: Point;
  userNearestPoint?: Point;
  hoverPoint?: Point | null;
  anchors?: (Point | null | undefined)[];
  showAnswer: boolean;
  isHit?: boolean;
  disabled?: boolean;
}

/**
 * 统一渲染可交互点阵、锚点、悬停高亮与答案揭晓视觉反馈
 */
export function renderInteractivePointGrid({
  ctx,
  canvasSize,
  gridPoints,
  targetPoint,
  userNearestPoint,
  hoverPoint,
  anchors = [],
  showAnswer,
  isHit = false,
  disabled = false,
}: RenderInteractivePointGridOptions): void {
  // 清屏背景
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  const dotRadius = getDynamicDotRadius(gridPoints);
  const hoverRadius = Math.max(2.5, dotRadius * 1.6);

  // 1. 绘制底层干扰点阵
  for (const p of gridPoints) {
    drawDot(ctx, p.x, p.y, '#888888', dotRadius);
  }

  // 2. 鼠标悬停高亮点
  if (!disabled && !showAnswer && hoverPoint) {
    drawDot(ctx, hoverPoint.x, hoverPoint.y, '#4F46E5', hoverRadius);
  }

  // 3. 绘制锚点
  for (const anchor of anchors) {
    if (anchor) {
      drawDot(ctx, anchor.x, anchor.y, '#000000', dotRadius);
    }
  }

  // 4. 答案揭晓反馈
  if (showAnswer && targetPoint) {
    const { size: chSize, lineWidth: chLineWidth } = getDynamicCrosshairMetrics(gridPoints);

    // 真理点实体
    drawDot(ctx, targetPoint.x, targetPoint.y, '#000000', dotRadius);

    // 绿色十字准星
    ctx.strokeStyle = '#00AA00';
    ctx.lineWidth = chLineWidth;
    ctx.beginPath();
    ctx.moveTo(targetPoint.x - chSize, targetPoint.y);
    ctx.lineTo(targetPoint.x + chSize, targetPoint.y);
    ctx.moveTo(targetPoint.x, targetPoint.y - chSize);
    ctx.lineTo(targetPoint.x, targetPoint.y + chSize);
    ctx.stroke();

    // 答错指示
    if (userNearestPoint && !isHit) {
      const dashLength = Math.max(2, Math.min(4, chSize * 0.4));
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = Math.max(1, chLineWidth * 0.85);
      ctx.setLineDash([dashLength, dashLength]);
      ctx.beginPath();
      ctx.moveTo(userNearestPoint.x, userNearestPoint.y);
      ctx.lineTo(targetPoint.x, targetPoint.y);
      ctx.stroke();
      ctx.setLineDash([]);

      drawDot(ctx, userNearestPoint.x, userNearestPoint.y, '#FF0000', dotRadius);
    }
  }
}