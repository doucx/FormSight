import { Crosshair, RotateCw } from 'lucide-preact';

import {
  Button,
  type CardManifest,
  type ColorHitResult,
  type ColorQuestionData,
  type ColorSenseSettings,
  SettingToggleItem,
  checkColorHit,
  generateColorQuestion,
  useCardTranslation,
} from '@formsight/card-sdk';
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
        <div className="space-y-2 pt-2 border-t border-border/65">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Crosshair className="w-4 h-4 text-primary" />
            {t('settings.targetingTitle')}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'off', label: t('settingsModal.targetingOff') },
              { id: 'manual', label: t('settingsModal.targetingManual') },
            ].map((m) => (
              <Button
                key={m.id}
                variant={(settings.targetingMode ?? 'off') === m.id ? 'default' : 'outline'}
                onClick={() => updateSettings({ targetingMode: m.id as 'off' | 'manual' })}
                className="py-2 h-auto"
              >
                {m.label}
              </Button>
            ))}
          </div>

          {settings.targetingMode === 'manual' && (
            <div className="bg-muted/60 p-3 rounded-2xl border border-border/60 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">
                {t('settings.targetingSubTitle')}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {COLOR_SECTOR_KEYS.map((name, idx) => {
                  const selected = (settings.manualTargetSectors ?? []).includes(idx);
                  const label = t(name);
                  return (
                    <Button
                      key={name}
                      variant={selected ? 'accent' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const current = settings.manualTargetSectors ?? [];
                        const next = current.includes(idx)
                          ? current.filter((s) => s !== idx)
                          : [...current, idx];
                        updateSettings({ manualTargetSectors: next });
                      }}
                      className="py-1.5 px-1 text-xs h-auto"
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
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
