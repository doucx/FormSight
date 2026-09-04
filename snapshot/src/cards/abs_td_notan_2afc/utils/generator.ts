
import type { HitResult, QuestionData } from '../types';
import { calculateOtsuThreshold, createNoise2D, fbm2D } from '@formsight/card-sdk';

export const THUMB_SIZE = 160;
export const OPTION_SIZE = 260;

export function drawRawGrayscaleNoiseField(
  canvas: HTMLCanvasElement | null,
  buffer?: number[],
  dim = 120,
  size = OPTION_SIZE,
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

export function generateQuestion(level: number): QuestionData {
  const id = `abs_tdn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34;

  const fieldDim = 120;
  const totalPixels = fieldDim * fieldDim;

  const targetMacroNoise = createNoise2D(Math.random());
  const distractorMacroNoise = createNoise2D(Math.random() + 100);
  const microNoise = createNoise2D(Math.random() + 200);

  const keyType = Math.random();
  const baseKey =
    keyType < 0.35
      ? 24 + Math.random() * 12
      : keyType < 0.7
        ? 64 + Math.random() * 12
        : 45 + Math.random() * 10;

  const macroScale = 0.012 + Math.random() * 0.008;
  const macroAmp = 42 + Math.random() * 10;
  const microScale = 0.08 + Math.random() * 0.04;
  const microAmp = 10 + t * 38;

  const macroSimilarityWeight = t * 0.68;
  const blendNorm = Math.sqrt((1 - macroSimilarityWeight) ** 2 + macroSimilarityWeight ** 2);

  const targetMacroBuffer = new Uint8Array(totalPixels);
  const targetSceneBuffer = new Uint8Array(totalPixels);
  const distractorSceneBuffer = new Uint8Array(totalPixels);

  for (let y = 0; y < fieldDim; y++) {
    for (let x = 0; x < fieldDim; x++) {
      const idx = y * fieldDim + x;
      const targetMacroVal =
        (fbm2D(x * macroScale, y * macroScale, 2, targetMacroNoise) - 0.5) * 2 * macroAmp;
      const rawIndependentDistractorVal =
        (fbm2D(x * macroScale, y * macroScale, 2, distractorMacroNoise) - 0.5) * 2 * macroAmp;

      const distractorMacroVal =
        ((1 - macroSimilarityWeight) * rawIndependentDistractorVal +
          macroSimilarityWeight * targetMacroVal) /
        blendNorm;

      const microVal = (fbm2D(x * microScale, y * microScale, 3, microNoise) - 0.5) * 2 * microAmp;

      const macroRaw = Math.max(0, Math.min(100, baseKey + targetMacroVal));
      targetMacroBuffer[idx] = Math.round((macroRaw / 100) * 255);

      const targetSceneRaw = Math.max(0, Math.min(100, baseKey + targetMacroVal + microVal));
      targetSceneBuffer[idx] = Math.round((targetSceneRaw / 100) * 255);

      const distractorSceneRaw = Math.max(
        0,
        Math.min(100, baseKey + distractorMacroVal + microVal),
      );
      distractorSceneBuffer[idx] = Math.round((distractorSceneRaw / 100) * 255);
    }
  }

  const otsuByte = calculateOtsuThreshold(targetMacroBuffer);
  const promptBuffer = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    promptBuffer[i] = targetMacroBuffer[i] <= otsuByte ? 15 : 248;
  }

  const isA = Math.random() < 0.5;
  return {
    id,
    difficultyLevel: clampedLevel,
    promptNotanBuffer: Array.from(promptBuffer),
    notanSceneBufferA: isA ? Array.from(targetSceneBuffer) : Array.from(distractorSceneBuffer),
    notanSceneBufferB: isA ? Array.from(distractorSceneBuffer) : Array.from(targetSceneBuffer),
    notanFieldDim: fieldDim,
    correctNotanChoice: isA ? 'A' : 'B',
    tolerance: 0,
  };
}

export function checkHit(userChoice: 'A' | 'B', question: QuestionData): HitResult {
  const isHit = userChoice === question.correctNotanChoice;
  return {
    isHit,
    userChoice,
    correctChoice: question.correctNotanChoice,
    errorValue: isHit ? 0 : 1,
    tolerance: 0,
  };
}
