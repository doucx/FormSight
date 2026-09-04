import { Sun } from 'lucide-preact';

import {
  type CardManifest,
  type ColorHitResult,
  type ColorQuestionData,
  type ColorSenseSettings,
  SettingToggleItem,
  checkColorHit,
  generateColorQuestion,
  useCardTranslation,
} from '@formsight/card-sdk';
import { ColorValView } from './ColorValView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

export const colorValCard: CardManifest<
  ColorQuestionData,
  ColorHitResult,
  number,
  ColorSenseSettings
> = {
  id: 'color_val',
  domain: 'color_and_value',
  tags: {
    domain: ['color_and_value'],
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
    generateQuestion: (level) => generateColorQuestion('V', level),
    evaluateAnswer: (userVal, q) => checkColorHit('V', userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      targetHSV: [q.targetH, q.targetS, q.targetV],
      userHSV: [q.targetH, q.targetS, userVal],
      errorValue: hitResult.errorValue,
    }),
  },
  ui: {
    icon: Sun,
    renderSettings: ({ settings, updateSettings }) => {
      const { t } = useCardTranslation('color_val');
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
      <ColorValView
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

export default colorValCard;
