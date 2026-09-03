import {
  calcDeltaEOk,
  generateTetrahedralDistractors,
  getDistractorDistanceForLevel,
  getTargetDeltaEForLevel,
  hsvToOkLab,
  okLabToHsv,
} from '../../../core/color/oklchUtils';
import { createShuffledChoices } from '../../../core/math/mathUtils';
import type { HitResult, QuestionData } from '../types';

export function calcInductionShift(
  bgLab: [number, number, number],
  centerLab: [number, number, number],
  intensity = 0.22,
): [number, number, number] {
  const dL = bgLab[0] - centerLab[0];
  const da = bgLab[1] - centerLab[1];
  const db = bgLab[2] - centerLab[2];
  return [-dL * intensity, -da * intensity, -db * intensity];
}

export function calcCompensatedRightColor(
  bgLeftLab: [number, number, number],
  centerLeftLab: [number, number, number],
  bgRightLab: [number, number, number],
  intensity = 0.22,
): [number, number, number] {
  const shiftL = calcInductionShift(bgLeftLab, centerLeftLab, intensity);
  const perceivedL: [number, number, number] = [
    centerLeftLab[0] + shiftL[0],
    centerLeftLab[1] + shiftL[1],
    centerLeftLab[2] + shiftL[2],
  ];

  const factor = 1 + intensity;
  return [
    (perceivedL[0] + intensity * bgRightLab[0]) / factor,
    (perceivedL[1] + intensity * bgRightLab[1]) / factor,
    (perceivedL[2] + intensity * bgRightLab[2]) / factor,
  ];
}

export function generateQuestion(level: number): QuestionData {
  const id = `ahi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const tolerance = getTargetDeltaEForLevel(clampedLevel);
  const distractorDeltaE = getDistractorDistanceForLevel(clampedLevel);

  const bgLHue = Math.floor(Math.random() * 360);
  const bgLSat = Math.floor(Math.random() * 30) + 70;
  const bgLVal = Math.floor(Math.random() * 30) + 50;
  const bgLeft: [number, number, number] = [bgLHue, bgLSat, bgLVal];

  const bgRHue = (bgLHue + 180 + (Math.floor(Math.random() * 40) - 20)) % 360;
  const bgRSat = Math.floor(Math.random() * 25);
  const bgRVal = Math.floor(Math.random() * 30) + 50;
  const bgRight: [number, number, number] = [bgRHue, bgRSat, bgRVal];

  const centerHue = (bgLHue + 60 + Math.floor(Math.random() * 120)) % 360;
  const centerSat = Math.floor(Math.random() * 30) + 30;
  const centerVal = Math.floor(Math.random() * 30) + 45;
  const targetLeftCenter: [number, number, number] = [centerHue, centerSat, centerVal];

  const labBgL = hsvToOkLab(...bgLeft);
  const labCenterL = hsvToOkLab(...targetLeftCenter);
  const labBgR = hsvToOkLab(...bgRight);

  const idealLabR = calcCompensatedRightColor(labBgL, labCenterL, labBgR, 0.22);
  const idealRightCenter = okLabToHsv(idealLabR);

  const distractors = generateTetrahedralDistractors(idealLabR, distractorDeltaE);
  const { options, correctIndex } = createShuffledChoices(idealRightCenter, distractors);

  return {
    id,
    difficultyLevel: clampedLevel,
    bgLeft,
    bgRight,
    targetLeftCenter,
    idealRightCenter,
    options,
    correctIndex,
    tolerance,
  };
}

export function checkHit(userColor: [number, number, number], question: QuestionData): HitResult {
  const labTarget = hsvToOkLab(...question.idealRightCenter);
  const labUser = hsvToOkLab(...userColor);
  const deltaEError = calcDeltaEOk(labTarget, labUser);

  const selectedIndex = question.options.findIndex(
    (opt) => opt[0] === userColor[0] && opt[1] === userColor[1] && opt[2] === userColor[2],
  );

  const isHit =
    selectedIndex !== -1
      ? selectedIndex === question.correctIndex
      : deltaEError <= question.tolerance;

  return {
    isHit,
    userColor,
    targetColor: question.idealRightCenter,
    deltaEError: Math.round(deltaEError * 1000) / 1000,
    tolerance: question.tolerance,
    selectedIndex: selectedIndex !== -1 ? selectedIndex : undefined,
  };
}