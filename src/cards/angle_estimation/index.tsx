import { Compass } from 'lucide-preact';

import {
  type BaseModuleSettings,
  type CardManifest,
  SettingToggleItem,
  useCardTranslation,
} from '@formsight/card-sdk';
import { AngleEstimationView } from './AngleEstimationView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { AngleEstimationHitResult, AngleEstimationQuestion } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export interface AngleEstimationSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
}

export const angleEstimationCard: CardManifest<
  AngleEstimationQuestion,
  AngleEstimationHitResult,
  number,
  AngleEstimationSettings
> = {
  id: 'angle_estimation',
  domain: 'form_and_proportion',
  tags: {
    domain: ['form_and_proportion', 'spatial_structure'],
    path: ['absolute_estimation'],
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
    evaluateAnswer: (userVal, question) => checkHit(userVal, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      userAnswer: userVal,
      targetValue: q.targetAngleDeg,
      errorValue: hitResult.errorValue,
      tolerance: hitResult.tolerance,
    }),
  },
  ui: {
    icon: Compass,
    renderSettings: ({ settings, updateSettings }) => {
      const { t } = useCardTranslation('angle_estimation');
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
      <AngleEstimationView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        hitMargin={settings?.sliderHitMargin ?? 12}
        showToleranceBand={settings?.showToleranceBand ?? true}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
  },
};

export default angleEstimationCard;
