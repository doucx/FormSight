import { setup2DCanvas } from '../../../core/canvas/hidpi';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
import { CANVAS_THEME, hexToRgba } from '../../../utils/theme';
import type { LineSegment, PerspPropMigrationHitResult, PerspPropMigrationQuestion } from '../types';

export const PERSPECTIVE_CANVAS_SIZE = 340;

export function drawProportionCanvas(
  canvas: HTMLCanvasElement | null,
  line: LineSegment | undefined,
  targetPoint: Point | undefined,
  userPoint: Point | null | undefined,
  hoverPoint?: Point | null,
  showAnswer = false,
  size = PERSPECTIVE_CANVAS_SIZE,
): void {
  if (!line) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  // 主干线段
  ctx.strokeStyle = CANVAS_THEME.shape.fill;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(line.p1.x, line.p1.y);
  ctx.lineTo(line.p2.x, line.p2.y);
  ctx.stroke();

  // 起点端点 (P1)
  ctx.strokeStyle = CANVAS_THEME.status.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(line.p1.x, line.p1.y, 7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = CANVAS_THEME.status.accent;
  ctx.beginPath();
  ctx.arc(line.p1.x, line.p1.y, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 终点端点 (P2)
  ctx.fillStyle = CANVAS_THEME.text.muted;
  ctx.beginPath();
  ctx.arc(line.p2.x, line.p2.y, 4, 0, Math.PI * 2);
  ctx.fill();

  // 悬停正交投影吸附点
  if (!showAnswer && hoverPoint) {
    ctx.fillStyle = hexToRgba(CANVAS_THEME.status.accent, 0.2);
    ctx.beginPath();
    ctx.arc(hoverPoint.x, hoverPoint.y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = CANVAS_THEME.status.accent;
    ctx.beginPath();
    ctx.arc(hoverPoint.x, hoverPoint.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 结果揭晓
  if (showAnswer) {
    if (targetPoint) {
      ctx.fillStyle = CANVAS_THEME.status.hit;
      ctx.beginPath();
      ctx.arc(targetPoint.x, targetPoint.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (userPoint) {
      ctx.fillStyle = CANVAS_THEME.status.miss;
      ctx.beginPath();
      ctx.arc(userPoint.x, userPoint.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawHorizontalReferenceCanvas(
  canvas: HTMLCanvasElement | null,
  targetRatio = 0.5,
  width = 280,
  height = 48,
): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = CANVAS_THEME.bg.primary;
  ctx.fillRect(0, 0, width, height);

  const marginX = 24;
  const y = height / 2;
  const lineW = width - marginX * 2;
  const p1 = { x: marginX, y };
  const p2 = { x: marginX + lineW, y };

  ctx.strokeStyle = CANVAS_THEME.shape.fill;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  ctx.strokeStyle = CANVAS_THEME.status.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p1.x, p1.y, 7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = CANVAS_THEME.status.accent;
  ctx.beginPath();
  ctx.arc(p1.x, p1.y, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = CANVAS_THEME.text.muted;
  ctx.beginPath();
  ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
  ctx.fill();

  const targetX = p1.x + lineW * targetRatio;
  ctx.fillStyle = CANVAS_THEME.status.accent;
  ctx.beginPath();
  ctx.arc(targetX, y, 5.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = CANVAS_THEME.status.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(targetX, y - 11);
  ctx.lineTo(targetX, y - 6);
  ctx.stroke();
}

export function generateQuestion(level: number): PerspPropMigrationQuestion {
  const id = `psp_mig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  const ratio = Math.round((Math.random() * 0.84 + 0.08) * 1000) / 1000;

  const angleRad = Math.random() * Math.PI * 2;
  const lineLen = 220;
  const center = PERSPECTIVE_CANVAS_SIZE / 2;

  const halfX = (lineLen / 2) * Math.cos(angleRad);
  const halfY = (lineLen / 2) * Math.sin(angleRad);

  const p1: Point = {
    x: Math.round(center - halfX),
    y: Math.round(center - halfY),
  };
  const p2: Point = {
    x: Math.round(center + halfX),
    y: Math.round(center + halfY),
  };

  const targetDivisionPoint: Point = {
    x: Math.round(p1.x + (p2.x - p1.x) * ratio),
    y: Math.round(p1.y + (p2.y - p1.y) * ratio),
  };

  const tolerance = Math.round(expDecayInterpolate(0.08, 0.015, clampedLevel) * 1000) / 1000;

  return {
    id,
    difficultyLevel: clampedLevel,
    divisionLine: { p1, p2 },
    targetRatio: ratio,
    targetDivisionPoint,
    tolerance,
  };
}

export function checkHit(clickPoint: Point, question: PerspPropMigrationQuestion): PerspPropMigrationHitResult {
  const line = question.divisionLine;
  const dx = line.p2.x - line.p1.x;
  const dy = line.p2.y - line.p1.y;
  const lenSq = dx * dx + dy * dy;
  const t = ((clickPoint.x - line.p1.x) * dx + (clickPoint.y - line.p1.y) * dy) / (lenSq || 1);
  const clampedT = Math.max(0, Math.min(1, t));

  const targetT = question.targetRatio ?? 0.5;
  const errorT = Math.abs(clampedT - targetT);
  const isHit = errorT <= question.tolerance;

  return {
    isHit,
    userValue: clickPoint,
    targetValue: question.targetDivisionPoint,
    errorValue: Math.round(errorT * 1000) / 1000,
    tolerance: question.tolerance,
    ratioProgress: Math.round(clampedT * 1000) / 1000,
  };
}