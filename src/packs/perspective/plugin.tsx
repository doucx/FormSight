import type { TrainingPlugin } from '../../core/contracts';
import type { BaseModuleSettings } from '../../storage/settings';
import type { Point } from '../../types';
import {
  type PerspectiveHitResult,
  type PerspectiveMode,
  type PerspectiveQuestionData,
  checkPerspectiveHit,
  generatePerspectiveQuestion,
} from './utils/perspectiveUtils';
import { PerspectiveCanvas } from './views/PerspectiveCanvas';

export const perspectivePlugin: TrainingPlugin<
  PerspectiveQuestionData,
  PerspectiveHitResult,
  number | 'A' | 'B' | Point,
  BaseModuleSettings
> = {
  packId: 'perspective',
  title: 'perspective',
  getModeBadge: (mode) => mode,
  generateQuestion: (mode, level) => generatePerspectiveQuestion(mode as PerspectiveMode, level),
  evaluateAnswer: (userVal, q) => checkPerspectiveHit(userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (_q, hitResult, userVal, mode) => ({
    mode,
    userAnswer: userVal,
    errorValue: hitResult.errorValue,
    tolerance: hitResult.tolerance,
  }),
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <PerspectiveCanvas
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
