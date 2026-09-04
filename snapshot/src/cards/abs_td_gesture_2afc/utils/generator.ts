

import type { HitResult, QuestionData } from '../types';
import {
  CANVAS_THEME,
  expDecayInterpolate,
  Point,
  setup2DCanvas
} from '@formsight/card-sdk';

export const THUMB_SIZE = 160;
export const OPTION_SIZE = 260;

export function drawSpinePromptCanvas(
  canvas: HTMLCanvasElement | null,
  spine?: Point[],
  size = THUMB_SIZE,
) {
  if (!spine || spine.length < 2) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  const [p1, p2] = spine;
  ctx.strokeStyle = CANVAS_THEME.status.accent;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  ctx.fillStyle = CANVAS_THEME.status.accent;
  ctx.beginPath();
  ctx.arc(p1.x, p1.y, 4, 0, Math.PI * 2);
  ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
  ctx.fill();
}

export function drawParticlesCanvas(
  canvas: HTMLCanvasElement | null,
  particles?: Point[],
  size = OPTION_SIZE,
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
}

export function generateFlowParticlesWithClutter(
  angleDeg: number,
  spreadRatio: number,
  clutterRatio = 0,
  size = OPTION_SIZE,
): Point[] {
  const rad = (angleDeg * Math.PI) / 180;
  const count = 45 + Math.floor(Math.random() * 20);
  const cx = size / 2;
  const cy = size / 2;
  const majorLen = size * 0.38;
  const minorLen = majorLen * spreadRatio;

  const points: Point[] = [];
  const clutterCount = Math.floor(count * clutterRatio);
  const flowCount = count - clutterCount;

  for (let i = 0; i < flowCount; i++) {
    const u = (Math.random() * 2 - 1) * majorLen;
    const v = (Math.random() * 2 - 1) * minorLen;

    const x = Math.round(cx + u * Math.cos(rad) - v * Math.sin(rad));
    const y = Math.round(cy + u * Math.sin(rad) + v * Math.cos(rad));
    points.push({
      x: Math.max(15, Math.min(size - 15, x)),
      y: Math.max(15, Math.min(size - 15, y)),
    });
  }

  for (let i = 0; i < clutterCount; i++) {
    const r = Math.sqrt(Math.random()) * majorLen * 0.95;
    const theta = Math.random() * Math.PI * 2;
    const x = Math.round(cx + r * Math.cos(theta));
    const y = Math.round(cy + r * Math.sin(theta));
    points.push({
      x: Math.max(15, Math.min(size - 15, x)),
      y: Math.max(15, Math.min(size - 15, y)),
    });
  }

  return points;
}

export function generateQuestion(level: number): QuestionData {
  const id = `abs_tdg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34;

  const targetAngle = Math.floor(Math.random() * 180);
  const angleDelta = expDecayInterpolate(36.0, 4.0, clampedLevel);
  const sign = Math.random() < 0.5 ? 1 : -1;
  const distractorAngle = (targetAngle + sign * angleDelta + 180) % 180;

  const rad = (targetAngle * Math.PI) / 180;
  const L = THUMB_SIZE * 0.36;
  const cx = THUMB_SIZE / 2;
  const cy = THUMB_SIZE / 2;
  const promptSpine: Point[] = [
    { x: cx - L * Math.cos(rad), y: cy - L * Math.sin(rad) },
    { x: cx + L * Math.cos(rad), y: cy + L * Math.sin(rad) },
  ];

  const spreadRatio = 0.18 + t * 0.38;
  const clutterRatio = t * 0.28;

  const partA = generateFlowParticlesWithClutter(
    targetAngle,
    spreadRatio,
    clutterRatio,
    OPTION_SIZE,
  );
  const partB = generateFlowParticlesWithClutter(
    distractorAngle,
    spreadRatio,
    clutterRatio,
    OPTION_SIZE,
  );

  const isA = Math.random() < 0.5;
  return {
    id,
    difficultyLevel: clampedLevel,
    promptSpine,
    particlesA: isA ? partA : partB,
    particlesB: isA ? partB : partA,
    correctParticleChoice: isA ? 'A' : 'B',
    tolerance: 0,
  };
}

export function checkHit(userChoice: 'A' | 'B', question: QuestionData): HitResult {
  const isHit = userChoice === question.correctParticleChoice;
  return {
    isHit,
    userChoice,
    correctChoice: question.correctParticleChoice,
    errorValue: isHit ? 0 : 1,
    tolerance: 0,
  };
}
