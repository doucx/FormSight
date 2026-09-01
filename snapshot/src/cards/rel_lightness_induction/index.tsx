import { Sun } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import {
  type RelativeColorHitResult,
  type RelativeColorQuestionData,
  checkRelativeColorHit,
  generateLightnessInductionQuestion,
} from '../../core/color/relativeColor';
import type { RelativeColorSettings } from '../../storage/settings';
import { RelLightnessInductionView } from './RelLightnessInductionView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

export const relLightnessInductionCard: CardManifest<
  RelativeColorQuestionData,
  RelativeColorHitResult,
  [number, number, number],
  RelativeColorSettings
> = {
  id: 'rel_lightness_induction',
  domain: 'color_and_value',
  icon: Sun,
  tags: {
    domain: ['color_and_value'],
    path: ['relational_mapping'],
    challenge: ['illusion_piercing'],
    interaction: ['continuous_mod'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: 'settings.showToleranceBandTitle',
      description: 'settings.showToleranceBandDesc',
    },
  ],
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
  training: {
    generateQuestion: (level) => generateLightnessInductionQuestion(level),
    evaluateAnswer: (userVal, q) => checkRelativeColorHit('LIGHTNESS_INDUCTION', userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      bgLeft: q.bgLeft,
      bgRight: q.bgRight,
      targetLeftCenter: q.targetLeftCenter,
      idealRightCenter: q.idealRightCenter,
      userRightColor: userVal,
      deltaEError: hitResult.deltaEError,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <RelLightnessInductionView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        settings={settings}
      />
    ),
  },
};

export default relLightnessInductionCard;