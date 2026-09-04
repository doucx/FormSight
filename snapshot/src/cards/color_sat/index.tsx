import { Droplet } from 'lucide-preact';

import { ColorSatView } from './ColorSatView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import {
  CardManifest,
  checkColorHit,
  ColorSenseSettings,
  generateColorQuestion,
  SettingToggleItem,
  useCardTranslation,
  type ColorHitResult,
  type ColorQuestionData
} from '@formsight/card-sdk';

export const colorSatCard: CardManifest<
  ColorQuestionData,
  ColorHitResult,
  number,
  ColorSenseSettings
> = {
  id: 'color_sat',
  domain: 'color_and_value',
  icon: Droplet,
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
  renderSettings: ({ settings, updateSettings }) => {
    const { t } = useCardTranslation('color_sat');
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
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
  training: {
    generateQuestion: (level) => generateColorQuestion('S', level),
    evaluateAnswer: (userVal, q) => checkColorHit('S', userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      targetHSV: [q.targetH, q.targetS, q.targetV],
      userHSV: [q.targetH, userVal, q.targetV],
      errorValue: hitResult.errorValue,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <ColorSatView
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

export default colorSatCard;
