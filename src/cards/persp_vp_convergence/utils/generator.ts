import { CANVAS_THEME, type Point, expDecayInterpolate, setup2DCanvas } from '@formsight/card-sdk';
import type { LineSegment, PerspVpHitResult, PerspVpQuestion } from '../types';

export const PERSPECTIVE_CANVAS_SIZE = 340;

/**
 * 沿给定点的正反两方向延伸绘制贯穿画布视口的无限直线
 */
function drawInfiniteLine(
  ctx: CanvasRenderingContext2D,
  anchor: Point,
  angleRad: number,
  extent = PERSPECTIVE_CANVAS_SIZE * 3,
): void {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  ctx.beginPath();
  ctx.moveTo(anchor.x - cos * extent, anchor.y - sin * extent);
  ctx.lineTo(anchor.x + cos * extent, anchor.y + sin * extent);
  ctx.stroke();
}

export function drawVpConvergenceCanvas(
  canvas: HTMLCanvasElement | null,
  referenceLines: [LineSegment, LineSegment] | undefined,
  anchor: Point | undefined,
  angleDeg: number,
  _length?: number,
  size = PERSPECTIVE_CANVAS_SIZE,
  showAnswer = false,
  targetAngleDeg?: number,
  isHit = false,
): void {
  if (!referenceLines || !anchor) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  // 1. 绘制已有参考线 (贯穿整个画布的无限直线)
  ctx.strokeStyle = CANVAS_THEME.text.secondary;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  for (const line of referenceLines) {
    const refAngleRad = Math.atan2(line.p2.y - line.p1.y, line.p2.x - line.p1.x);
    drawInfiniteLine(ctx, line.p1, refAngleRad, size * 3);
  }

  // 2. 绘制测试直线所围绕旋转的锚点支点
  ctx.fillStyle = CANVAS_THEME.status.accent;
  ctx.beginPath();
  ctx.arc(anchor.x, anchor.y, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // 3. 绘制用户当前调整的测试直线 (贯穿整个画布)
  const rad = (angleDeg * Math.PI) / 180;
  ctx.strokeStyle = showAnswer
    ? isHit
      ? CANVAS_THEME.status.hit
      : CANVAS_THEME.status.miss
    : CANVAS_THEME.shape.fill;
  ctx.lineWidth = 3;
  drawInfiniteLine(ctx, anchor, rad, size * 3);

  // 4. 答案揭晓时高亮绘制绝对正确真理直线
  if (showAnswer && targetAngleDeg !== undefined) {
    const targetRad = (targetAngleDeg * Math.PI) / 180;
    ctx.strokeStyle = CANVAS_THEME.status.hit;
    ctx.lineWidth = 3;
    drawInfiniteLine(ctx, anchor, targetRad, size * 3);
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

  // 在两条参考线之间添加非中心垂直偏移 (避开 0 中点，保持安全可见间距)
  const sign = Math.random() < 0.5 ? -1 : 1;
  const testOffset = sign * (Math.random() * 26 + 9); // 偏移绝对值在 9px ~ 35px 之间
  const testRay = getCenteredRay(testOffset);

  const testAnchor = testRay.p1;
  const targetRad = Math.atan2(vpPoint.y - testAnchor.y, vpPoint.x - testAnchor.x);
  const rawTargetAngleDeg = (targetRad * 180) / Math.PI;

  // 严格将直线倾角收敛映射至 [0, 180) 空间
  const normalizedAngle = ((rawTargetAngleDeg % 180) + 180) % 180;
  let targetAngleDeg = Math.round(normalizedAngle * 10) / 10;
  if (targetAngleDeg >= 180) {
    targetAngleDeg = 0;
  }

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
  const rawUser = typeof userVal === 'number' ? userVal : 0;
  let userAngle = ((rawUser % 180) + 180) % 180;
  userAngle = Math.round(userAngle * 10) / 10;
  if (userAngle >= 180) {
    userAngle = 0;
  }

  const targetAngle = question.targetAngleDeg ?? 0;
  const diff = Math.abs(userAngle - targetAngle);
  // 180° 直线周期对称最小环形角差
  const errorVal = Math.min(diff, 180 - diff);
  const isHit = errorVal <= question.tolerance;

  return {
    isHit,
    userValue: userAngle,
    targetValue: targetAngle,
    errorValue: Math.round(errorVal * 10) / 10,
    tolerance: question.tolerance,
  };
}
