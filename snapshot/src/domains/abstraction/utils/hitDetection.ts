import type { AbstractionHitResult, AbstractionQuestionData } from './types';

export function checkAbstractionHit(
  userAnswer: number | 'A' | 'B' | [number, number, number],
  question: AbstractionQuestionData,
): AbstractionHitResult {
  const { mode } = question;

  if (mode === 'GESTURE_AXIS') {
    const userDeg = typeof userAnswer === 'number' ? userAnswer : 0;
    const targetDeg = question.targetAngleDeg ?? 0;
    let diff = Math.abs(userDeg - targetDeg);
    diff = Math.min(diff, 180 - diff);
    const isHit = diff <= question.tolerance;

    return {
      isHit,
      userValue: userDeg,
      targetValue: targetDeg,
      errorValue: Math.round(diff * 10) / 10,
      tolerance: question.tolerance,
    };
  }

  if (mode === 'POLYGON_DECIMATION') {
    const choice = userAnswer as 'A' | 'B';
    const isHit = choice === question.correctPolyChoice;
    return {
      isHit,
      userChoice: choice,
      correctChoice: question.correctPolyChoice,
      errorValue: isHit ? 0 : 1,
      tolerance: 0,
    };
  }

  if (mode === 'NOTAN_THRESHOLD') {
    const userVal = typeof userAnswer === 'number' ? userAnswer : 50;
    const targetVal = question.idealNotanThreshold ?? 50;
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

  if (mode === 'PALETTE_CLUSTERING') {
    const chosenIndex = typeof userAnswer === 'number' ? userAnswer : 0;
    const isHit = chosenIndex === question.correctPaletteIndex;
    return {
      isHit,
      userChoiceIndex: chosenIndex,
      correctIndex: question.correctPaletteIndex,
      errorValue: isHit ? 0 : 1,
      tolerance: question.tolerance,
    };
  }

  if (mode === 'TD_PALETTE_2AFC') {
    const chosenIndex =
      typeof userAnswer === 'number'
        ? userAnswer
        : userAnswer === 'A'
          ? 0
          : userAnswer === 'B'
            ? 1
            : 0;
    const isHit = chosenIndex === question.correctPatternIndex;
    return {
      isHit,
      userChoiceIndex: chosenIndex,
      correctIndex: question.correctPatternIndex,
      errorValue: isHit ? 0 : 1,
      tolerance: 0,
    };
  }

  // 2AFC Top-Down 通用处理
  const choice = userAnswer as 'A' | 'B';
  let correctChoice: 'A' | 'B' = 'A';
  if (mode === 'TD_GESTURE_2AFC') correctChoice = question.correctParticleChoice ?? 'A';
  if (mode === 'TD_HULL_2AFC') correctChoice = question.correctHullChoice ?? 'A';
  if (mode === 'TD_NOTAN_2AFC') correctChoice = question.correctNotanChoice ?? 'A';

  const isHit = choice === correctChoice;
  return {
    isHit,
    userChoice: choice,
    correctChoice,
    errorValue: isHit ? 0 : 1,
    tolerance: 0,
  };
}
