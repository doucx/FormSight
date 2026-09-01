import { Palette } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import {
  type RelativeColorHitResult,
  type RelativeColorQuestionData,
  checkRelativeColorHit,
  generateHueInductionQuestion,
} from '../../core/color/relativeColor';
import type { RelativeColorSettings } from '../../storage/settings';
import { RelHueInductionView } from './RelHueInductionView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

export const relHueInductionCard: CardManifest<
  RelativeColorQuestionData,
  RelativeColorHitResult,
  [number, number, number],
  RelativeColorSettings
> = {
  id: 'rel_hue_induction',
  domain: 'color_and_value',
  icon: Palette,
  tags: {
    domain: ['color_and_value'],
    path: ['relational_mapping'],
    challenge: ['illusion_piercing'],
    interaction: ['multi_choice'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  training: {
    generateQuestion: (level) => generateHueInductionQuestion(level),
    evaluateAnswer: (userVal, q) => checkRelativeColorHit('HUE_INDUCTION', userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      bgLeft: q.bgLeft,
      bgRight: q.bgRight,
      targetLeftCenter: q.targetLeftCenter,
      idealRightCenter: q.idealRightCenter,
      userRightColor: userVal,
      options: q.options,
      correctIndex: q.correctIndex,
      deltaEError: hitResult.deltaEError,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <RelHueInductionView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={(settings.showCanvasHints as boolean) ?? true}
      />
    ),
  },
};

export default relHueInductionCard;
