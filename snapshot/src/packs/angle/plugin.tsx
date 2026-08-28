import type { TrainingPlugin } from '../../config/trainingPlugins';
import type { BaseModuleSettings } from '../../utils/settings';
import {
  type AngleHitResult,
  type AngleMode,
  type AngleQuestionData,
  checkAngleHit,
  generateAngleQuestion,
} from './utils/angleUtils';
import { AngleCanvas } from './views/AngleCanvas';

export const anglePlugin: TrainingPlugin<
  AngleQuestionData,
  AngleHitResult,
  number | 'A' | 'B',
  BaseModuleSettings
> = {
  packId: 'angle',
  title: 'angle',
  getModeBadge: (mode) => mode,
  generateQuestion: (mode, level) => generateAngleQuestion(mode as AngleMode, level),
  evaluateAnswer: (userVal, q) => checkAngleHit(userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (_q, hitResult, userVal, mode) => ({
    mode,
    userAnswer: userVal,
    errorValue: hitResult.errorValue,
    tolerance: hitResult.tolerance,
  }),
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <AngleCanvas
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
