import type { HitResult, PaletteTile, QuestionData } from '../types';
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

  const baseH = Math.floor(Math.random() * 360);
  const baseS = Math.floor(Math.random() * 40) + 40;
  const baseV = Math.floor(Math.random() * 40) + 40;

  const dominantColorHsv: [number, number, number] = [baseH, baseS, baseV];
  const paletteTiles: PaletteTile[] = [];
  const gridSize = 4;
  const tileSize = CANVAS_SIZE / gridSize;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const jitterH = (baseH + (Math.floor(Math.random() * 40) - 20) + 360) % 360;
      const jitterS = Math.max(10, Math.min(100, baseS + (Math.floor(Math.random() * 30) - 15)));
      const jitterV = Math.max(15, Math.min(100, baseV + (Math.floor(Math.random() * 30) - 15)));
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
