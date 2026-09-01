import { setup2DCanvas } from '../../../core/canvas/hidpi';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';
import type { LineSegment, Obstacle, PerspGestaltHitResult, PerspGestaltQuestion } from '../types';

export const PERSPECTIVE_2AFC_SIZE = 240;

export function drawGestaltCanvas(
  canvas: HTMLCanvasElement | null,
  obstacle: Obstacle | undefined,
  incomingLine: LineSegment | undefined,
  outgoingLine: LineSegment | undefined,
  size = PERSPECTIVE_2AFC_SIZE,
): void {
  if (!obstacle || !incomingLine || !outgoingLine) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  ctx.strokeStyle = CANVAS_THEME.shape.fill;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(incomingLine.p1.x, incomingLine.p1.y);
  ctx.lineTo(incomingLine.p2.x, incomingLine.p2.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(outgoingLine.p1.x, outgoingLine.p1.y);
  ctx.lineTo(outgoingLine.p2.x, outgoingLine.p2.y);
  ctx.stroke();

  ctx.fillStyle = CANVAS_THEME.axis.grid;
  ctx.strokeStyle = CANVAS_THEME.text.secondary;
  ctx.lineWidth = 2;

  if (obstacle.type === 'circle') {
    ctx.beginPath();
    ctx.arc(obstacle.cx, obstacle.cy, obstacle.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    const half = obstacle.size / 2;
    ctx.fillRect(obstacle.cx - half, obstacle.cy - half, obstacle.size, obstacle.size);
    ctx.strokeRect(obstacle.cx - half, obstacle.cy - half, obstacle.size, obstacle.size);
  }
}

export function generateQuestion(level: number): PerspGestaltQuestion {
  const id = `psp_ges_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  const center = PERSPECTIVE_2AFC_SIZE / 2;
  const obstacleType = Math.random() < 0.5 ? 'circle' : 'rect';
  const obstacleSize = 65;

  const obstacle: Obstacle = {
    type: obstacleType,
    cx: center,
    cy: center,
    size: obstacleSize,
  };

  const lineAngle = (Math.random() * 80 + 10) * (Math.PI / 180);
  const dirX = Math.cos(lineAngle);
  const dirY = Math.sin(lineAngle);

  const inStart: Point = { x: center - 90 * dirX, y: center - 90 * dirY };
  const inEnd: Point = { x: center - 35 * dirX, y: center - 35 * dirY };
  const outStart: Point = { x: center + 35 * dirX, y: center + 35 * dirY };
  const outEnd: Point = { x: center + 90 * dirX, y: center + 90 * dirY };

  const parallelOffset = Math.round(expDecayInterpolate(20, 2.5, clampedLevel) * 10) / 10;
  const perpX = -dirY * parallelOffset;
  const perpY = dirX * parallelOffset;

  const distractorStart: Point = { x: outStart.x + perpX, y: outStart.y + perpY };
  const distractorEnd: Point = { x: outEnd.x + perpX, y: outEnd.y + perpY };

  const isACorrect = Math.random() < 0.5;

  return {
    id,
    difficultyLevel: clampedLevel,
    obstacle,
    incomingLine: { p1: inStart, p2: inEnd },
    lineOptionA: isACorrect
      ? { p1: outStart, p2: outEnd }
      : { p1: distractorStart, p2: distractorEnd },
    lineOptionB: isACorrect
      ? { p1: distractorStart, p2: distractorEnd }
      : { p1: outStart, p2: outEnd },
    correctChoice: isACorrect ? 'A' : 'B',
    parallelOffset,
    tolerance: parallelOffset,
  };
}

export function checkHit(choice: 'A' | 'B', question: PerspGestaltQuestion): PerspGestaltHitResult {
  const isHit = choice === question.correctChoice;
  return {
    isHit,
    userChoice: choice,
    correctChoice: question.correctChoice,
    errorValue: isHit ? 0 : 1,
    tolerance: question.tolerance,
  };
}