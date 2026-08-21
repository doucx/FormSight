import { AngleCanvas } from '../../components/AngleCanvas';
import {
  type AngleHitResult,
  type AngleMode,
  type AngleQuestionData,
  checkAngleHit,
  generateAngleQuestion,
} from '../../utils/angleUtils';
import type { BaseModuleSettings } from '../../utils/settings';
import type { TrainingPlugin } from '../trainingPlugins';

export const anglePlugin: TrainingPlugin<
  AngleQuestionData,
  AngleHitResult,
  number | 'A' | 'B',
  BaseModuleSettings
> = {
  domain: 'angle',
  title: '角度感知',
  getModeBadge: (mode) => {
    const map: Record<string, string> = {
      ANGLE_ESTIMATION: '夹角大小估算',
      ANGLE_COMPARISON_2AFC: '角度二分对比',
      PARALLEL_ALIGNMENT_2AFC: '平行线基准辨识',
    };
    return map[mode] || mode;
  },
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