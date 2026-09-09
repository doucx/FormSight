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

export const OPTION_SIZE = 260;

export function drawPaletteTilesCanvas(
  canvas: HTMLCanvasElement | null,
  tiles?: PaletteTile[],
  size = OPTION_SIZE,
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
  const id = `abs_tdp4_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34; // 0..1 归一化难度

  const baseH = Math.floor(Math.random() * 360);
  const baseS = Math.floor(Math.random() * 40) + 40;
  const baseV = Math.floor(Math.random() * 40) + 40;
  const promptDominantColor: [number, number, number] = [baseH, baseS, baseV];

  // 3x3 色块在低难度压缩在极窄区间，高难度放大扰动
  const hJitterMax = Math.round(3 + t * 19); // Level 1: ±3°, Level 35: ±22°
  const sJitterMax = Math.round(2 + t * 14); // Level 1: ±2%, Level 35: ±16%
  const vJitterMax = Math.round(2 + t * 14); // Level 1: ±2%, Level 35: ±16%

  const makePatternTiles = (domH: number, domS: number, domV: number) => {
    const tiles: PaletteTile[] = [];
    const gridSize = 3;
    const tileDim = OPTION_SIZE / gridSize;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const jitterH =
          (domH + (Math.floor(Math.random() * (hJitterMax * 2 + 1)) - hJitterMax) + 360) % 360;
        const jitterS = Math.max(
          10,
          Math.min(100, domS + (Math.floor(Math.random() * (sJitterMax * 2 + 1)) - sJitterMax)),
        );
        const jitterV = Math.max(
          15,
          Math.min(100, domV + (Math.floor(Math.random() * (vJitterMax * 2 + 1)) - vJitterMax)),
        );
        tiles.push({
          x: c * tileDim,
          y: r * tileDim,
          w: tileDim,
          h: tileDim,
          hsv: [jitterH, jitterS, jitterV],
          weight: 1,
        });
      }
    }
    return tiles;
  };

  const distractorDeltaE = getDistractorDistanceForLevel(clampedLevel);
  const labDom = hsvToOkLab(...promptDominantColor);
  const distractorsDom = generateTetrahedralDistractors(labDom, distractorDeltaE);

  const { options: palettePatternOptions, correctIndex: correctPatternIndex } =
    createShuffledChoices(makePatternTiles(baseH, baseS, baseV), [
      makePatternTiles(...distractorsDom[0]),
      makePatternTiles(...distractorsDom[1]),
      makePatternTiles(...distractorsDom[2]),
    ]);

  return {
    id,
    difficultyLevel: clampedLevel,
    promptDominantColor,
    palettePatternOptions,
    correctPatternIndex,
    tolerance: 0,
  };
}

export function checkHit(userChoiceIndex: number, question: QuestionData): HitResult {
  const isHit = userChoiceIndex === question.correctPatternIndex;
  return {
    isHit,
    userChoiceIndex,
    correctIndex: question.correctPatternIndex,
    errorValue: isHit ? 0 : 1,
    tolerance: 0,
  };
}