import type { TrainingPlugin } from '../../config/trainingPlugins';
import {
  type ColorHitResult,
  type ColorMode,
  type ColorQuestionData,
  checkColorHit,
  generateColorQuestion,
} from '../../core/color/colorUtils';
import type { ColorSenseSettings } from '../../utils/settings';
import { ColorCanvas } from './views/ColorCanvas';

export const colorPlugin: TrainingPlugin<
  ColorQuestionData,
  ColorHitResult,
  number | [number, number, number],
  ColorSenseSettings
> = {
  packId: 'color',
  title: 'color',
  getModeBadge: (mode) => mode,
  isTargeting: (mode, settings) => settings.targetingMode === 'manual' && mode === 'H',
  generateQuestion: (mode, level, settings) =>
    generateColorQuestion(mode as ColorMode, level, {
      targetingMode: settings.targetingMode,
      targetSectors: settings.manualTargetSectors,
    }),
  evaluateAnswer: (userVal, q, mode) => checkColorHit(mode as ColorMode, userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => {
    const computedUserHSV: [number, number, number] =
      mode === 'ALL' && Array.isArray(userVal)
        ? userVal
        : [
            mode === 'H' ? (userVal as number) : q.targetH,
            mode === 'S' ? (userVal as number) : q.targetS,
            mode === 'V' ? (userVal as number) : q.targetV,
          ];
    return {
      targetHSV: [q.targetH, q.targetS, q.targetV],
      userHSV: computedUserHSV,
      errorValue: hitResult.errorValue,
    };
  },
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <ColorCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
      enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
    />
  ),
};
