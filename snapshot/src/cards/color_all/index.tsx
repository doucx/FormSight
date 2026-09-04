import { Palette } from 'lucide-preact';
import { ColorAllView } from './ColorAllView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import {
  SettingToggleItem,
  checkHit,
  generateQuestion,
  useCardTranslation,
} from '@formsight/card-sdk';
import type { CardManifest, ColorSenseSettings } from '@formsight/card-sdk';

export const colorAllCard: CardManifest<
  QuestionData,
  HitResult,
  [number, number, number],
  ColorSenseSettings
> = {
  id: 'color_all',
  domain: 'color_and_value',
  icon: Palette,
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
    const { t } = useCardTranslation('color_all');
    return (
      <div className="space-y-4">
        <SettingToggleItem
          title={t('settings.showToleranceBandTitle')}
          description={t('settings.showToleranceBandDesc')}
          checked={(settings.showToleranceBand as boolean) ?? true}
          onChange={(val) => updateSettings({ showToleranceBand: val })}
        />
        <SettingToggleItem
          title={t('settings.enableHoverColorPreviewTitle')}
          description={t('settings.enableHoverColorPreviewDesc')}
          checked={(settings.enableHoverColorPreview as boolean) ?? true}
          onChange={(val) => updateSettings({ enableHoverColorPreview: val })}
        />
      </div>
    );
  },
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
    enableHoverColorPreview: true,
  },
  training: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, q) => checkHit(userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      targetHSV: [q.targetH, q.targetS, q.targetV],
      userHSV: userVal,
      deltaEError: hitResult.deltaEError,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <ColorAllView
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

export default colorAllCard;
