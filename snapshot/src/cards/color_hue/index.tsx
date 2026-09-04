import { RotateCw } from 'lucide-preact';
import { SettingToggleItem } from '../../components/settings/common/SettingToggleItem';
import { TargetingSection } from '../../components/settings/common/TargetingSection';
import type { CardManifest } from '../../core/cardContract';
import {
  type ColorHitResult,
  type ColorQuestionData,
  checkColorHit,
  generateColorQuestion,
} from '../../core/color/colorUtils';
import { useCardTranslation } from '../../core/i18n';
import type { ColorSenseSettings } from '../../storage/settings';
import { ColorHueView } from './ColorHueView';
import { createColorHueAnalytics } from './analytics';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

const COLOR_SECTOR_KEYS = [
  'sectors.red',
  'sectors.orange',
  'sectors.yellow',
  'sectors.yellowGreen',
  'sectors.green',
  'sectors.cyanGreen',
  'sectors.cyan',
  'sectors.blue',
  'sectors.blueViolet',
  'sectors.violet',
  'sectors.magenta',
  'sectors.rose',
];

export const colorHueCard: CardManifest<
  ColorQuestionData,
  ColorHitResult,
  number,
  ColorSenseSettings
> = {
  id: 'color_hue',
  domain: 'color_and_value',
  icon: RotateCw,
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
    const { t } = useCardTranslation('color_hue');
    return (
      <div className="space-y-4">
        <SettingToggleItem
          title={t('settings.showToleranceBandTitle')}
          description={t('settings.showToleranceBandDesc')}
          checked={(settings.showToleranceBand as boolean) ?? true}
          onChange={(val) => updateSettings({ showToleranceBand: val })}
        />
        <TargetingSection
          title={t('settings.targetingTitle')}
          subTitle={t('settings.targetingSubTitle')}
          mode={settings.targetingMode ?? 'off'}
          onModeChange={(m) => updateSettings({ targetingMode: m })}
          sectors={COLOR_SECTOR_KEYS}
          selectedSectors={settings.manualTargetSectors ?? []}
          onToggleSector={(idx) => {
            const current = settings.manualTargetSectors ?? [];
            const next = current.includes(idx)
              ? current.filter((s) => s !== idx)
              : [...current, idx];
            updateSettings({ manualTargetSectors: next });
          }}
          gridCols="grid-cols-3"
        />
      </div>
    );
  },
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  training: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) =>
      generateColorQuestion('H', level, {
        targetingMode: settings.targetingMode,
        targetSectors: settings.manualTargetSectors,
      }),
    evaluateAnswer: (userVal, q) => checkColorHit('H', userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      targetHSV: [q.targetH, q.targetS, q.targetV],
      userHSV: [userVal, q.targetS, q.targetV],
      errorValue: hitResult.errorValue,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <ColorHueView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        settings={settings}
      />
    ),
  },
  analytics: {
    views: createColorHueAnalytics(),
  },
};

export default colorHueCard;
