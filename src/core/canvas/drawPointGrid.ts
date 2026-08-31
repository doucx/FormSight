import type { Point } from '../../types';

/**
 * 计算点阵中任意两点间的最小欧氏间距
 */
export function getGridMinSpacing(gridPoints: Point[]): number {
  if (!gridPoints || gridPoints.length < 2) return 25;
  let minDist = Number.MAX_VALUE;
  for (let i = 0; i < gridPoints.length; i++) {
    for (let j = i + 1; j < gridPoints.length; j++) {
      const dx = gridPoints[i].x - gridPoints[j].x;
      const dy = gridPoints[i].y - gridPoints[j].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0 && d < minDist) {
        minDist = d;
      }
    }
  }
  return minDist === Number.MAX_VALUE ? 25 : minDist;
}

/**
 * 根据点阵间距动态计算渲染圆点的半径
 */
export function getDynamicDotRadius(gridPoints: Point[]): number {
  const minDist = getGridMinSpacing(gridPoints);
  return Math.max(1.2, Math.min(3.5, minDist * 0.25));
}

/**
 * 根据点阵间距动态计算十字准星的臂长与线宽
 */
export function getDynamicCrosshairMetrics(gridPoints: Point[]): {
  size: number;
  lineWidth: number;
} {
  const minDist = getGridMinSpacing(gridPoints);
  const size = Math.max(3.5, Math.min(12, minDist * 0.42));
  const lineWidth = Math.max(1, Math.min(2, minDist * 0.08));
  return { size, lineWidth };
}

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
import { CANVAS_THEME } from '../../utils/theme';

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
  ctx.fillStyle = CANVAS_THEME.bg.primary;
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  const dotRadius = getDynamicDotRadius(gridPoints);
  const hoverRadius = Math.max(2.5, dotRadius * 1.6);

  for (const p of gridPoints) {
    drawDot(ctx, p.x, p.y, CANVAS_THEME.pointGrid.dotDefault, dotRadius);
  }

  if (!disabled && !showAnswer && hoverPoint) {
    drawDot(ctx, hoverPoint.x, hoverPoint.y, CANVAS_THEME.pointGrid.dotHover, hoverRadius);
  }

  for (const anchor of anchors) {
    if (anchor) {
      drawDot(ctx, anchor.x, anchor.y, CANVAS_THEME.pointGrid.dotAnchor, dotRadius);
    }
  }

  if (showAnswer && targetPoint) {
    const { size: chSize, lineWidth: chLineWidth } = getDynamicCrosshairMetrics(gridPoints);

    drawDot(ctx, targetPoint.x, targetPoint.y, CANVAS_THEME.pointGrid.dotAnchor, dotRadius);

    ctx.strokeStyle = CANVAS_THEME.pointGrid.crosshairTarget;
    ctx.lineWidth = chLineWidth;
    ctx.beginPath();
    ctx.moveTo(targetPoint.x - chSize, targetPoint.y);
    ctx.lineTo(targetPoint.x + chSize, targetPoint.y);
    ctx.moveTo(targetPoint.x, targetPoint.y - chSize);
    ctx.lineTo(targetPoint.x, targetPoint.y + chSize);
    ctx.stroke();

    if (userNearestPoint && !isHit) {
      const dashLength = Math.max(2, Math.min(4, chSize * 0.4));
      ctx.strokeStyle = CANVAS_THEME.pointGrid.dotMiss;
      ctx.lineWidth = Math.max(1, chLineWidth * 0.85);
      ctx.setLineDash([dashLength, dashLength]);
      ctx.beginPath();
      ctx.moveTo(userNearestPoint.x, userNearestPoint.y);
      ctx.lineTo(targetPoint.x, targetPoint.y);
      ctx.stroke();
      ctx.setLineDash([]);

      drawDot(
        ctx,
        userNearestPoint.x,
        userNearestPoint.y,
        CANVAS_THEME.pointGrid.dotMiss,
        dotRadius,
      );
    }
  }
}
