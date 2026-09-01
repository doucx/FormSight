import { Sun } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import { AbsNotanThresholdView } from './AbsNotanThresholdView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const absNotanThresholdCard: CardManifest<QuestionData, HitResult, number, BaseModuleSettings> = {
  id: 'abs_notan_threshold',
  domain: 'rhythm_and_notan',
  icon: Sun,
  tags: {
    domain: ['rhythm_and_notan'],
    path: ['extraction'],
    challenge: ['figure_ground_reversal'],
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
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, question) => checkHit(userVal, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      userAnswer: userVal,
      targetValue: q.idealNotanThreshold,
      errorValue: hitResult.errorValue,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsNotanThresholdView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        hitMargin={settings.sliderHitMargin as number}
        showToleranceBand={settings.showToleranceBand as boolean}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
  },
};

export default absNotanThresholdCard;