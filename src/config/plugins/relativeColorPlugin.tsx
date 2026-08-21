import { RelativeColorCanvas } from '../../components/RelativeColorCanvas';
import {
  type RelativeColorHitResult,
  type RelativeColorMode,
  type RelativeColorQuestionData,
  checkRelativeColorHit,
  generateRelativeColorQuestion,
} from '../../utils/relativeColorUtils';
import type { RelativeColorSettings } from '../../utils/settings';
import type { TrainingPlugin } from '../trainingPlugins';

export const relativeColorPlugin: TrainingPlugin<
  RelativeColorQuestionData,
  RelativeColorHitResult,
  [number, number, number] | 'A' | 'B',
  RelativeColorSettings
> = {
  domain: 'relative_color',
  title: '相对色感',
  getModeBadge: (mode) =>
    mode === 'LIGHTNESS_INDUCTION'
      ? '明度反差补偿'
      : mode === 'HUE_INDUCTION'
        ? '补色残像调和'
        : mode === 'DECONTEXTUAL_2AFC'
          ? '环境穿透判别'
          : '色彩矢量迁移',
  generateQuestion: (mode, level) =>
    generateRelativeColorQuestion(mode as RelativeColorMode, level),
  evaluateAnswer: (userVal, q, mode) =>
    checkRelativeColorHit(mode as RelativeColorMode, userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => {
    if (mode === 'DECONTEXTUAL_2AFC') {
      return {
        mode,
        userChoice: userVal,
        correctChoice: q.largerPhysicalSide,
        physicalValueDiff: q.physicalValueDiff,
      };
    }
    if (mode === 'HUE_INDUCTION') {
      return {
        mode,
        bgLeft: q.bgLeft,
        bgRight: q.bgRight,
        targetLeftCenter: q.targetLeftCenter,
        idealRightCenter: q.idealRightCenter,
        userRightColor: userVal,
        options: q.options,
        correctIndex: q.correctIndex,
        deltaEError: hitResult.deltaEError,
      };
    }
    if (mode === 'LIGHTNESS_INDUCTION') {
      return {
        mode,
        bgLeft: q.bgLeft,
        bgRight: q.bgRight,
        targetLeftCenter: q.targetLeftCenter,
        idealRightCenter: q.idealRightCenter,
        userRightColor: userVal,
        deltaEError: hitResult.deltaEError,
      };
    }
    return {
      mode: 'VECTOR_SHIFT',
      colorA: q.colorA,
      colorB: q.colorB,
      colorC: q.colorC,
      targetD: q.targetD,
      userD: userVal,
      deltaEError: hitResult.deltaEError,
    };
  },
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <RelativeColorCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
      enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
      showCanvasHints={(settings.showCanvasHints as boolean) ?? true}
    />
  ),
};
