import { setup2DCanvas } from '../../../core/canvas/hidpi';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';
import type { LineSegment, PerspVpHitResult, PerspVpQuestion } from '../types';

export const PERSPECTIVE_CANVAS_SIZE = 340;

export function drawVpConvergenceCanvas(
  canvas: HTMLCanvasElement | null,
  referenceLines: [LineSegment, LineSegment] | undefined,
  anchor: Point | undefined,
  angleDeg: number,
  length: number,
  size = PERSPECTIVE_CANVAS_SIZE,
  showAnswer = false,
  targetAngleDeg?: number,
): void {
  if (!referenceLines || !anchor) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  // 1. 绘制已有参考线
  ctx.strokeStyle = CANVAS_THEME.text.secondary;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  for (const line of referenceLines) {
    ctx.beginPath();
    ctx.moveTo(line.p1.x, line.p1.y);
    ctx.lineTo(line.p2.x, line.p2.y);
    ctx.stroke();
  }

  // 2. 绘制锚点
  ctx.fillStyle = CANVAS_THEME.status.accent;
  ctx.beginPath();
  ctx.arc(anchor.x, anchor.y, 4, 0, Math.PI * 2);
  ctx.fill();

  // 3. 绘制用户当前调整的测试线段
  const rad = (angleDeg * Math.PI) / 180;
  const endX = anchor.x + length * Math.cos(rad);
  const endY = anchor.y + length * Math.sin(rad);

  ctx.strokeStyle = showAnswer ? CANVAS_THEME.text.muted : CANVAS_THEME.shape.fill;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(anchor.x, anchor.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // 4. 答案揭晓时绘制绝对正确线段
  if (showAnswer && targetAngleDeg !== undefined) {
    const targetRad = (targetAngleDeg * Math.PI) / 180;
    const tEndX = anchor.x + length * Math.cos(targetRad);
    const tEndY = anchor.y + length * Math.sin(targetRad);

    ctx.strokeStyle = CANVAS_THEME.status.hit;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y);
    ctx.lineTo(tEndX, tEndY);
    ctx.stroke();
  }
}

export function generateQuestion(level: number): PerspVpQuestion {
  const id = `psp_vp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  const vpDist = expDecayInterpolate(400, 1800, clampedLevel);
  const vpAngle = (Math.floor(Math.random() * 360) * Math.PI) / 180;
  const center = PERSPECTIVE_CANVAS_SIZE / 2;

  const dirX = Math.cos(vpAngle);
  const dirY = Math.sin(vpAngle);
  const perpX = -dirY;
  const perpY = dirX;

  const vpPoint: Point = {
    x: center + vpDist * dirX,
    y: center + vpDist * dirY,
  };

  const lineLength = 95;

  const getCenteredRay = (perpOffset: number, length = lineLength) => {
    const anchorX = center - dirX * (length * 0.5) + perpX * perpOffset;
    const anchorY = center - dirY * (length * 0.5) + perpY * perpOffset;
    const ang = Math.atan2(vpPoint.y - anchorY, vpPoint.x - anchorX);

    return {
      p1: { x: Math.round(anchorX * 10) / 10, y: Math.round(anchorY * 10) / 10 },
      p2: {
        x: Math.round((anchorX + length * Math.cos(ang)) * 10) / 10,
        y: Math.round((anchorY + length * Math.sin(ang)) * 10) / 10,
      },
    };
  };

  const refLine1 = getCenteredRay(-55);
  const refLine2 = getCenteredRay(55);
  const testRay = getCenteredRay(0);

  const testAnchor = testRay.p1;
  const targetRad = Math.atan2(vpPoint.y - testAnchor.y, vpPoint.x - testAnchor.x);
  const targetAngleDeg = Math.round((((targetRad * 180) / Math.PI + 360) % 360) * 10) / 10;
  const tolerance = Math.round(expDecayInterpolate(8.0, 0.6, clampedLevel) * 10) / 10;

  return {
    id,
    difficultyLevel: clampedLevel,
    vpPoint,
    referenceLines: [refLine1, refLine2],
    testLineAnchor: testAnchor,
    testLineLength: lineLength,
    targetAngleDeg,
    tolerance,
  };
}

export function checkHit(userVal: number, question: PerspVpQuestion): PerspVpHitResult {
  const userAngle = typeof userVal === 'number' ? userVal : 0;
  const targetAngle = question.targetAngleDeg ?? 0;
  const diff = Math.abs(userAngle - targetAngle);
  const errorVal = Math.min(diff, 360 - diff);
  const isHit = errorVal <= question.tolerance;

  return {
    isHit,
    userValue: userAngle,
    targetValue: targetAngle,
    errorValue: Math.round(errorVal * 10) / 10,
    tolerance: question.tolerance,
  };
}