import type { TrainingPlugin } from '../../config/trainingPlugins';
import {
  type AbstractionHitResult,
  type AbstractionMode,
  type AbstractionQuestionData,
  checkAbstractionHit,
  generateAbstractionQuestion,
} from '../../utils/abstractionUtils';
import type { BaseModuleSettings } from '../../utils/settings';
import { AbstractionCanvas } from './views/AbstractionCanvas';

export const abstractionPlugin: TrainingPlugin<
  AbstractionQuestionData,
  AbstractionHitResult,
  number | 'A' | 'B',
  BaseModuleSettings
> = {
  domain: 'abstraction',
  title: '视知觉概括',
  getModeBadge: (mode) => {
    const map: Record<string, string> = {
      GESTURE_AXIS: '动态势线提取',
      POLYGON_DECIMATION: '折线低模大形',
      NOTAN_THRESHOLD: '黑白素描归组',
      PALETTE_CLUSTERING: '主调色群提炼',
      TD_GESTURE_2AFC: '动态势线寻源',
      TD_HULL_2AFC: '几何大模寻形',
      TD_NOTAN_2AFC: '黑白素描骨架',
      TD_PALETTE_2AFC: '调性基底归位',
    };
    return map[mode] || mode;
  },
  generateQuestion: (mode, level) => generateAbstractionQuestion(mode as AbstractionMode, level),
  evaluateAnswer: (userVal, q) => checkAbstractionHit(userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (_q, hitResult, userVal, mode) => ({
    mode,
    userAnswer: userVal,
    errorValue: hitResult.errorValue,
  }),
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <AbstractionCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={(settings.sliderHitMargin as number) ?? 12}
      showToleranceBand={(settings.showToleranceBand as boolean) ?? true}
      showCanvasHints={(settings.showCanvasHints as boolean) ?? true}
    />
  ),
};