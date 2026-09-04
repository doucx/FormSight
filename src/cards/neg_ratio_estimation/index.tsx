import { Maximize2 } from 'lucide-preact';

import {
  type CardManifest,
  type NegativeSpaceSettings,
  SettingToggleItem,
  useCardTranslation,
} from '@formsight/card-sdk';
import { NegRatioEstimationView } from './NegRatioEstimationView';
import { createNegRatioAnalytics } from './analytics';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { evaluateAnswer, generateQuestion } from './utils/generator';

export const negRatioEstimationCard: CardManifest<
  QuestionData,
  HitResult,
  number,
  NegativeSpaceSettings
> = {
  id: 'neg_ratio_estimation',
  domain: 'form_and_proportion',
  tags: {
    domain: ['form_and_proportion'],
    path: ['absolute_estimation'],
    challenge: ['figure_ground_reversal'],
    interaction: ['continuous_mod'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
  engine: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, question) => evaluateAnswer(userVal, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      targetNegativeRatio: q.targetNegativeRatio,
      userRatio: userVal,
      errorValue: hitResult.errorValue,
      positiveArea: q.positiveArea,
      negativeArea: q.negativeArea,
    }),
  },
  ui: {
    icon: Maximize2,
    renderSettings: ({ settings, updateSettings }) => {
      const { t } = useCardTranslation('neg_ratio_estimation');
      return (
        <div className="space-y-4">
          <SettingToggleItem
            title={t('settings.showToleranceBandTitle')}
            description={t('settings.showToleranceBandDesc')}
            checked={(settings.showToleranceBand as boolean) ?? true}
            onChange={(val) => updateSettings({ showToleranceBand: val })}
          />
        </div>
      );
    },
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <NegRatioEstimationView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        hitMargin={settings.sliderHitMargin ?? 12}
        showToleranceBand={settings.showToleranceBand ?? true}
      />
    ),
  },
  analytics: {
    views: createNegRatioAnalytics(),
  },
};

export default negRatioEstimationCard;
