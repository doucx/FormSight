import {
  CANVAS_THEME,
  createShuffledChoices,
  generateTetrahedralDistractors,
  getDistractorDistanceForLevel,
  hexToRgba,
  hsvToHex,
  hsvToOkLab,
  setup2DCanvas,
} from '@formsight/card-sdk';
import type { HitResult, PaletteTile, QuestionData } from '../types';

export const CANVAS_SIZE = 400;

export function drawPaletteTilesCanvas(
  canvas: HTMLCanvasElement | null,
  tiles?: PaletteTile[],
  size = CANVAS_SIZE,
) {
  if (!tiles) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  for (const t of tiles) {
    ctx.fillStyle = hsvToHex(...t.hsv);
    ctx.fillRect(t.x, t.y, t.w, t.h);
    ctx.strokeStyle = hexToRgba(CANVAS_THEME.bg.primary, 0.4);
    ctx.strokeRect(t.x, t.y, t.w, t.h);
  }
}

export function generateQuestion(level: number): QuestionData {
  const id = `abs_pc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34; // 0..1 归一化难度

  const baseH = Math.floor(Math.random() * 360);
  const baseS = Math.floor(Math.random() * 40) + 40;
  const baseV = Math.floor(Math.random() * 40) + 40;

  const dominantColorHsv: [number, number, number] = [baseH, baseS, baseV];
  const paletteTiles: PaletteTile[] = [];
  const gridSize = 4;
  const tileSize = CANVAS_SIZE / gridSize;

  // 动态计算色相、饱和度、明度的随机抖动幅度：低难度收敛于同类色，高难度大幅发散
  const hJitterMax = Math.round(4 + t * 20); // Level 1: ±4°, Level 35: ±24°
  const sJitterMax = Math.round(3 + t * 15); // Level 1: ±3%, Level 35: ±18%
  const vJitterMax = Math.round(3 + t * 15); // Level 1: ±3%, Level 35: ±18%

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const jitterH =
        (baseH + (Math.floor(Math.random() * (hJitterMax * 2 + 1)) - hJitterMax) + 360) % 360;
      const jitterS = Math.max(
        10,
        Math.min(100, baseS + (Math.floor(Math.random() * (sJitterMax * 2 + 1)) - sJitterMax)),
      );
      const jitterV = Math.max(
        15,
        Math.min(100, baseV + (Math.floor(Math.random() * (vJitterMax * 2 + 1)) - vJitterMax)),
      );
      paletteTiles.push({
        x: c * tileSize,
        y: r * tileSize,
        w: tileSize,
        h: tileSize,
        hsv: [jitterH, jitterS, jitterV],
        weight: 1,
      });
    }
  }

  const distractorDeltaE = getDistractorDistanceForLevel(clampedLevel);
  const labDom = hsvToOkLab(...dominantColorHsv);
  const distractors = generateTetrahedralDistractors(labDom, distractorDeltaE);
  const { options: paletteOptions, correctIndex: correctPaletteIndex } = createShuffledChoices(
    dominantColorHsv,
    distractors,
  );

  return {
    id,
    difficultyLevel: clampedLevel,
    paletteTiles,
    dominantColorHsv,
    paletteOptions,
    correctPaletteIndex,
    tolerance: distractorDeltaE,
  };
}

export function checkHit(userChoiceIndex: number, question: QuestionData): HitResult {
  const isHit = userChoiceIndex === question.correctPaletteIndex;
  return {
    isHit,
    userChoiceIndex,
    correctIndex: question.correctPaletteIndex,
    errorValue: isHit ? 0 : 1,
    tolerance: question.tolerance,
  };
}