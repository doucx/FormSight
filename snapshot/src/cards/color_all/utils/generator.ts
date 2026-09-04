import {
  calcDeltaEOk,
  getOkChroma,
  getTargetDeltaEForLevel,
  hsvToOkLab,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from '../types';

export function generateQuestion(level: number): QuestionData {
  const id = `cq_all_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const tolerance = getTargetDeltaEForLevel(clampedLevel);

  let targetH = Math.floor(Math.random() * 360);
  let targetS = 100;
  let targetV = 100;

  let attempts = 0;
  while (attempts < 30) {
    attempts++;
    targetH = Math.floor(Math.random() * 360);
    targetS = Math.floor(Math.random() * 71) + 30; // 30..100
    targetV = Math.floor(Math.random() * 71) + 30; // 30..100

    const lab = hsvToOkLab(targetH, targetS, targetV);
    if (getOkChroma(lab) >= Math.min(0.04, tolerance * 1.5)) {
      break;
    }
  }

  return {
    id,
    difficultyLevel: clampedLevel,
    targetH,
    targetS,
    targetV,
    tolerance,
  };
}

export function checkHit(userHSV: [number, number, number], question: QuestionData): HitResult {
  const { targetH, targetS, targetV, difficultyLevel } = question;
  const targetLab = hsvToOkLab(targetH, targetS, targetV);
  const userLab = hsvToOkLab(...userHSV);
  const realDeltaE = calcDeltaEOk(targetLab, userLab);
  const targetDeltaE = getTargetDeltaEForLevel(difficultyLevel);
  const isHit = realDeltaE <= targetDeltaE;

  return {
    isHit,
    userHSV,
    targetHSV: [targetH, targetS, targetV],
    deltaEError: Math.round(realDeltaE * 1000) / 1000,
    tolerance: targetDeltaE,
  };
}
