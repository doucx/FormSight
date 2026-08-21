import {
  generateTetrahedralDistractors,
  getDistractorDistanceForLevel,
  hsvToOkLab,
} from '../../../core/color/oklchUtils';
import { createShuffledChoices, expDecayInterpolate } from '../../../core/math/mathUtils';
import { calculateOtsuThreshold, createNoise2D, fbm2D } from '../../../core/math/noiseUtils';
import type { Point } from '../../../types';
import { calcPCAOrientation, generateFlowParticles, generateFlowParticlesWithClutter } from './pca';
import {
  fractalizePolygon,
  generateAdversarialDistractorHull,
  generateDetailedPolygon,
} from './polygon';
import {
  ABSTRACTION_2AFC_SIZE,
  ABSTRACTION_CANVAS_SIZE,
  ABSTRACTION_THUMB_SIZE,
  type AbstractionMode,
  type AbstractionQuestionData,
  type PaletteTile,
} from './types';

export function generateAbstractionQuestion(
  mode: AbstractionMode,
  level: number,
): AbstractionQuestionData {
  const id = `abs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34;

  // 1. GESTURE_AXIS 势线角度提取
  if (mode === 'GESTURE_AXIS') {
    const targetAngleDeg = Math.floor(Math.random() * 180);
    const spreadRatio = 0.15 + t * 0.5;
    const particles = generateFlowParticles(targetAngleDeg, spreadRatio);
    const realPCA = calcPCAOrientation(particles);
    const tolerance = Math.round(expDecayInterpolate(18.0, 2.5, clampedLevel) * 10) / 10;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      particles,
      targetAngleDeg: realPCA,
      tolerance,
    };
  }

  // 2. POLYGON_DECIMATION 折线大形 (2AFC)
  if (mode === 'POLYGON_DECIMATION') {
    const minVerts = 4 + Math.floor(t * 3);
    const maxVerts = 5 + Math.floor(t * 4);
    const vertCount = Math.floor(Math.random() * (maxVerts - minVerts + 1)) + minVerts;

    const targetHull = generateDetailedPolygon(vertCount, ABSTRACTION_2AFC_SIZE);
    const distractorHull = generateAdversarialDistractorHull(
      targetHull,
      clampedLevel,
      ABSTRACTION_2AFC_SIZE,
    );

    const scaleToMain = ABSTRACTION_CANVAS_SIZE / ABSTRACTION_2AFC_SIZE;
    const baseForDetailed = targetHull.map((p) => ({
      x: Math.round(p.x * scaleToMain),
      y: Math.round(p.y * scaleToMain),
    }));

    const noiseFactor = 0.4 + t * 0.9;
    const detailedPolygon = fractalizePolygon(baseForDetailed, 2, noiseFactor);

    const isA = Math.random() < 0.5;
    const simplifiedOptions = isA ? [targetHull, distractorHull] : [distractorHull, targetHull];

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      detailedPolygon,
      simplifiedOptions,
      correctPolyIndex: isA ? 0 : 1,
      correctPolyChoice: isA ? 'A' : 'B',
      tolerance: 0,
    };
  }

  // 3. NOTAN_THRESHOLD 黑白素描二值归组
  if (mode === 'NOTAN_THRESHOLD') {
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
        const macroVal =
          (fbm2D(x * macroScale, y * macroScale, 2, macroNoise) - 0.5) * 2 * macroAmp;
        const microVal =
          (fbm2D(x * microScale, y * microScale, 3, microNoise) - 0.5) * 2 * microAmp;

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
      mode,
      difficultyLevel: clampedLevel,
      notanBuffer: Array.from(buffer),
      notanFieldDim: fieldDim,
      idealNotanThreshold,
      tolerance,
    };
  }

  // 4. PALETTE_CLUSTERING 主调色群提炼 (4AFC)
  if (mode === 'PALETTE_CLUSTERING') {
    const baseH = Math.floor(Math.random() * 360);
    const baseS = Math.floor(Math.random() * 40) + 40;
    const baseV = Math.floor(Math.random() * 40) + 40;

    const dominantColorHsv: [number, number, number] = [baseH, baseS, baseV];
    const paletteTiles: PaletteTile[] = [];
    const gridSize = 4;
    const tileSize = ABSTRACTION_CANVAS_SIZE / gridSize;

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
      mode,
      difficultyLevel: clampedLevel,
      paletteTiles,
      dominantColorHsv,
      paletteOptions,
      correctPaletteIndex,
      tolerance: distractorDeltaE,
    };
  }

  // 5. TD_GESTURE_2AFC 自顶向下势线寻源 (2AFC)
  if (mode === 'TD_GESTURE_2AFC') {
    const targetAngle = Math.floor(Math.random() * 180);
    const angleDelta = expDecayInterpolate(36.0, 4.0, clampedLevel);
    const sign = Math.random() < 0.5 ? 1 : -1;
    const distractorAngle = (targetAngle + sign * angleDelta + 180) % 180;

    const rad = (targetAngle * Math.PI) / 180;
    const L = ABSTRACTION_THUMB_SIZE * 0.36;
    const cx = ABSTRACTION_THUMB_SIZE / 2;
    const cy = ABSTRACTION_THUMB_SIZE / 2;
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
      ABSTRACTION_2AFC_SIZE,
    );
    const partB = generateFlowParticlesWithClutter(
      distractorAngle,
      spreadRatio,
      clutterRatio,
      ABSTRACTION_2AFC_SIZE,
    );

    const isA = Math.random() < 0.5;
    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      promptSpine,
      particlesA: isA ? partA : partB,
      particlesB: isA ? partB : partA,
      correctParticleChoice: isA ? 'A' : 'B',
      tolerance: 0,
    };
  }

  // 6. TD_HULL_2AFC 自顶向下大模寻形 (2AFC)
  if (mode === 'TD_HULL_2AFC') {
    const minVerts = 4 + Math.floor(t * 2);
    const maxVerts = 5 + Math.floor(t * 4);
    const vertCount = Math.floor(Math.random() * (maxVerts - minVerts + 1)) + minVerts;

    const promptHull = generateDetailedPolygon(vertCount, ABSTRACTION_THUMB_SIZE);
    const scale = ABSTRACTION_2AFC_SIZE / ABSTRACTION_THUMB_SIZE;

    const targetBase = promptHull.map((p) => ({
      x: Math.round(p.x * scale),
      y: Math.round(p.y * scale),
    }));

    const distractorBase = generateAdversarialDistractorHull(
      targetBase,
      clampedLevel,
      ABSTRACTION_2AFC_SIZE,
    );

    const noiseFactor = 0.45 + t * 0.85;
    const targetDetailed = fractalizePolygon(targetBase, 2, noiseFactor);
    const distractorDetailed = fractalizePolygon(distractorBase, 2, noiseFactor);

    const isA = Math.random() < 0.5;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      promptHull,
      hullDetailedA: isA ? targetDetailed : distractorDetailed,
      hullDetailedB: isA ? distractorDetailed : targetDetailed,
      correctHullChoice: isA ? 'A' : 'B',
      tolerance: 0,
    };
  }

  // 7. TD_NOTAN_2AFC 自顶向下素描骨架匹配 (2AFC)
  if (mode === 'TD_NOTAN_2AFC') {
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

        const microVal =
          (fbm2D(x * microScale, y * microScale, 3, microNoise) - 0.5) * 2 * microAmp;

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
      mode,
      difficultyLevel: clampedLevel,
      promptNotanBuffer: Array.from(promptBuffer),
      notanSceneBufferA: isA ? Array.from(targetSceneBuffer) : Array.from(distractorSceneBuffer),
      notanSceneBufferB: isA ? Array.from(distractorSceneBuffer) : Array.from(targetSceneBuffer),
      notanFieldDim: fieldDim,
      correctNotanChoice: isA ? 'A' : 'B',
      tolerance: 0,
    };
  }

  // 8. TD_PALETTE_2AFC (4AFC) 自顶向下调性基底归位
  const baseH = Math.floor(Math.random() * 360);
  const baseS = Math.floor(Math.random() * 40) + 40;
  const baseV = Math.floor(Math.random() * 40) + 40;
  const promptDominantColor: [number, number, number] = [baseH, baseS, baseV];

  const makePatternTiles = (domH: number, domS: number, domV: number) => {
    const tiles: PaletteTile[] = [];
    const gridSize = 3;
    const tileDim = ABSTRACTION_2AFC_SIZE / gridSize;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const jitterH = (domH + (Math.floor(Math.random() * 36) - 18) + 360) % 360;
        const jitterS = Math.max(10, Math.min(100, domS + (Math.floor(Math.random() * 26) - 13)));
        const jitterV = Math.max(15, Math.min(100, domV + (Math.floor(Math.random() * 26) - 13)));
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
    mode,
    difficultyLevel: clampedLevel,
    promptDominantColor,
    palettePatternOptions,
    correctPatternIndex,
    tolerance: 0,
  };
}
