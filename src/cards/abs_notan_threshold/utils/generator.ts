import { expDecayInterpolate } from '../../../core/math/mathUtils';
import { calculateOtsuThreshold, createNoise2D, fbm2D } from '../../../core/math/noiseUtils';
import type { HitResult, QuestionData } from '../types';

export const CANVAS_SIZE = 260;

export function drawRawGrayscaleNoiseField(
  canvas: HTMLCanvasElement | null,
  buffer?: number[],
  dim = 120,
  size = CANVAS_SIZE,
) {
  if (!canvas || !buffer) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const offscreen = document.createElement('canvas');
  offscreen.width = dim;
  offscreen.height = dim;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  const imgData = offCtx.createImageData(dim, dim);
  const pixels = imgData.data;

  for (let i = 0; i < buffer.length; i++) {
    const val = buffer[i];
    const pIdx = i * 4;
    pixels[pIdx] = val;
    pixels[pIdx + 1] = val;
    pixels[pIdx + 2] = val;
    pixels[pIdx + 3] = 255;
  }
  offCtx.putImageData(imgData, 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(offscreen, 0, 0, size, size);
}

export function drawNotanNoiseField(
  canvas: HTMLCanvasElement | null,
  buffer?: number[],
  dim = 120,
  thresholdPercent = 50,
  size = CANVAS_SIZE,
) {
  if (!canvas || !buffer) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const thresholdByte = Math.round((thresholdPercent / 100) * 255);

  const offscreen = document.createElement('canvas');
  offscreen.width = dim;
  offscreen.height = dim;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  const imgData = offCtx.createImageData(dim, dim);
  const pixels = imgData.data;

  for (let i = 0; i < buffer.length; i++) {
    const isDark = buffer[i] <= thresholdByte;
    const color = isDark ? 15 : 248;
    const pIdx = i * 4;
    pixels[pIdx] = color;
    pixels[pIdx + 1] = color === 15 ? 23 : 250;
    pixels[pIdx + 2] = color === 15 ? 42 : 252;
    pixels[pIdx + 3] = 255;
  }
  offCtx.putImageData(imgData, 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(offscreen, 0, 0, size, size);
}

export function generateQuestion(level: number): QuestionData {
  const id = `abs_nt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34;

  const fieldDim = 120;
  const buffer = new Uint8Array(fieldDim * fieldDim);

  const macroNoise = createNoise2D(Math.random());
  const microNoise = createNoise2D(Math.random());

  const keyType = Math.random();
  const baseKey =
    keyType < 0.35
      ? 22 + Math.random() * 14
      : keyType < 0.7
        ? 64 + Math.random() * 14
        : 44 + Math.random() * 12;

  const macroScale = 0.012 + Math.random() * 0.008;
  const macroAmp = 42 + Math.random() * 10;

  const microScale = 0.08 + Math.random() * 0.04;
  const microAmp = 10 + t * 38;

  for (let y = 0; y < fieldDim; y++) {
    for (let x = 0; x < fieldDim; x++) {
      const idx = y * fieldDim + x;
      const macroVal = (fbm2D(x * macroScale, y * macroScale, 2, macroNoise) - 0.5) * 2 * macroAmp;
      const microVal = (fbm2D(x * microScale, y * microScale, 3, microNoise) - 0.5) * 2 * microAmp;

      const raw = baseKey + macroVal + microVal;
      const clamped0to100 = Math.max(0, Math.min(100, raw));
      buffer[idx] = Math.round((clamped0to100 / 100) * 255);
    }
  }

  const otsuByte = calculateOtsuThreshold(buffer);
  const idealNotanThreshold = Math.round((otsuByte / 255) * 100);
  const tolerance = Math.round(expDecayInterpolate(10.0, 2.0, clampedLevel) * 10) / 10;

  return {
    id,
    difficultyLevel: clampedLevel,
    notanBuffer: Array.from(buffer),
    notanFieldDim: fieldDim,
    idealNotanThreshold,
    tolerance,
  };
}

export function checkHit(userVal: number, question: QuestionData): HitResult {
  const targetVal = question.idealNotanThreshold;
  const errorVal = Math.round(Math.abs(userVal - targetVal) * 10) / 10;
  const isHit = errorVal <= question.tolerance;

  return {
    isHit,
    userValue: userVal,
    targetValue: targetVal,
    errorValue: errorVal,
    tolerance: question.tolerance,
  };
}
