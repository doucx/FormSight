import { NegativeSpaceCanvas } from '../../components/NegativeSpaceCanvas';
import type { Point } from '../../types';
import {
  type NegativeSpaceHitResult,
  type NegativeSpaceMode,
  type NegativeSpaceQuestionData,
  checkNegativeSpaceHit,
  generateNegativeSpaceQuestion,
} from '../../utils/negativeSpaceUtils';
import type { NegativeSpaceSettings } from '../../utils/settings';
import type { TrainingPlugin } from '../trainingPlugins';

export const negativeSpacePlugin: TrainingPlugin<
  NegativeSpaceQuestionData,
  NegativeSpaceHitResult,
  number | 'A' | 'B' | Point,
  NegativeSpaceSettings
> = {
  domain: 'negative_space',
  title: '正负形感知',
  getModeBadge: (mode) =>
    mode === 'AREA_COMPARISON_2AFC'
      ? '负形面积二分判别'
      : mode === 'NEGATIVE_VERTEX_FITTING'
        ? '负形边界反切定点'
        : mode === 'SHAPE_MATCH_2AFC'
          ? '负形轮廓记忆匹配'
          : '负形占比估算',
  generateQuestion: (mode, level) =>
    generateNegativeSpaceQuestion(mode as NegativeSpaceMode, level),
  evaluateAnswer: (userVal, q) => checkNegativeSpaceHit(userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => {
    if (mode === 'NEGATIVE_VERTEX_FITTING') {
      return {
        mode: 'NEGATIVE_VERTEX_FITTING',
        targetVertexIndex: q.targetVertexIndex,
        targetPoint: q.targetPoint ? [q.targetPoint.x, q.targetPoint.y] : undefined,
        userClick: hitResult.nearestGridPoint
          ? [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y]
          : undefined,
        errorPixelDistance: hitResult.errorValue,
      };
    }
    if (mode === 'AREA_COMPARISON_2AFC') {
      return {
        mode: 'AREA_COMPARISON_2AFC',
        userChoice: userVal,
        correctChoice: q.largerSide,
        negRatioA: q.negRatioA,
        negRatioB: q.negRatioB,
        areaDeltaPercent: q.areaDeltaPercent,
        errorValue: hitResult.errorValue,
      };
    }
    if (mode === 'SHAPE_MATCH_2AFC') {
      return {
        mode: 'SHAPE_MATCH_2AFC',
        userChoice: userVal === 0 || userVal === 'A' ? 'A' : 'B',
        correctChoice: q.correctChoice,
        displayTimeMs: q.displayTimeMs,
        errorValue: hitResult.errorValue,
      };
    }
    return {
      targetNegativeRatio: q.targetNegativeRatio,
      userRatio: userVal,
      errorValue: hitResult.errorValue,
      positiveArea: q.positiveArea,
      negativeArea: q.negativeArea,
    };
  },
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <NegativeSpaceCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
      showCanvasHints={(settings.showCanvasHints as boolean) ?? true}
    />
  ),
};
