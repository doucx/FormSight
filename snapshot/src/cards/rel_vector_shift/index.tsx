import { Shuffle } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import {
  type RelativeColorHitResult,
  type RelativeColorQuestionData,
  checkRelativeColorHit,
  generateVectorShiftQuestion,
} from '../../core/color/relativeColor';
import type { RelativeColorSettings } from '../../storage/settings';
import { RelVectorShiftView } from './RelVectorShiftView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

export const relVectorShiftCard: CardManifest<
  RelativeColorQuestionData,
  RelativeColorHitResult,
  [number, number, number],
  RelativeColorSettings
> = {
  id: 'rel_vector_shift',
  domain: 'color_and_value',
  icon: Shuffle,
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
    generateQuestion: (level) => generateVectorShiftQuestion(level),
    evaluateAnswer: (userVal, q) => checkRelativeColorHit('VECTOR_SHIFT', userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      colorA: q.colorA,
      colorB: q.colorB,
      colorC: q.colorC,
      targetD: q.targetD,
      userD: userVal,
      deltaEError: hitResult.deltaEError,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <RelVectorShiftView
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

export default relVectorShiftCard;
