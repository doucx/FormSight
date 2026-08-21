import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { Point } from '../../../types';
import type { NegativeSpaceHitResult, NegativeSpaceQuestionData } from './types';

export function checkNegativeSpaceHit(
  userAnswer: number | 'A' | 'B' | Point,
  question: NegativeSpaceQuestionData,
): NegativeSpaceHitResult {
  if (question.mode === 'NEGATIVE_VERTEX_FITTING') {
    const clickPoint = userAnswer as Point;
    const targetPoint = question.targetPoint ?? { x: 0, y: 0 };
    const distractorPoints = question.distractorPoints ?? [];

    const hitRes = evaluatePointGridHit(clickPoint, targetPoint, distractorPoints);
    return {
      isHit: hitRes.isHit,
      clickPoint,
      nearestGridPoint: hitRes.nearestGridPoint,
      errorValue: hitRes.errorDistance,
      tolerance: question.tolerance,
      isWithinRange: hitRes.isWithinRange,
    };
  }

  if (question.mode === 'AREA_COMPARISON_2AFC') {
    const userChoice = userAnswer as 'A' | 'B';
    const isHit = userChoice === question.largerSide;

    return {
      isHit,
      userChoice,
      correctChoice: question.largerSide,
      negRatioA: question.negRatioA,
      negRatioB: question.negRatioB,
      errorValue: isHit ? 0 : (question.areaDeltaPercent ?? 0),
      tolerance: question.tolerance,
    };
  }

  if (question.mode === 'SHAPE_MATCH_2AFC') {
    let userChoiceIndex: number;
    if (typeof userAnswer === 'number') {
      userChoiceIndex = userAnswer;
    } else if (userAnswer === 'A') {
      userChoiceIndex = 0;
    } else if (userAnswer === 'B') {
      userChoiceIndex = 1;
    } else {
      userChoiceIndex = 0;
    }

    const isHit = userChoiceIndex === question.correctOptionIndex;
    const userChoice = userChoiceIndex === 0 ? 'A' : 'B';

    return {
      isHit,
      userChoice,
      userChoiceIndex,
      correctChoice: question.correctChoice,
      correctOptionIndex: question.correctOptionIndex,
      errorValue: isHit ? 0 : 1,
      tolerance: 0,
    };
  }

  const userRatio = typeof userAnswer === 'number' ? userAnswer : 50;
  const targetRatio = question.targetNegativeRatio ?? 50;
  const errorValue = Math.round(Math.abs(userRatio - targetRatio) * 10) / 10;
  const isHit = errorValue <= question.tolerance;

  return {
    isHit,
    userRatio,
    targetRatio,
    errorValue,
    tolerance: question.tolerance,
  };
}
