import { Compass, SlidersHorizontal } from 'lucide-preact';

import {
  type BaseModuleSettings,
  Button,
  type CardManifest,
  SettingToggleItem,
  useCardTranslation,
} from '@formsight/card-sdk';
import { AngleEstimationView } from './AngleEstimationView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { AngleEstimationHitResult, AngleEstimationQuestion, AngleRangePreset } from './types';
import { checkHit, generateQuestion } from './utils/generator';

const ALL_ANGLE_RANGES: AngleRangePreset[] = ['0_45', '45_90', '90_135', '135_180'];

export interface AngleEstimationSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
  angleRanges?: AngleRangePreset[];
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
    angleRanges: ['0_45', '45_90', '90_135', '135_180'],
  },
  engine: {
    generateQuestion: (level, settings) =>
      generateQuestion(level, {
        angleRanges: settings.angleRanges,
      }),
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
      const currentRanges = settings.angleRanges ?? ALL_ANGLE_RANGES;

      const toggleRange = (range: AngleRangePreset) => {
        const next = currentRanges.includes(range)
          ? currentRanges.filter((r) => r !== range)
          : [...currentRanges, range];
        // 至少保留当前项，避免全部取消导致空区间
        updateSettings({ angleRanges: next.length > 0 ? next : [range] });
      };

      const setPreset = (ranges: AngleRangePreset[]) => {
        updateSettings({ angleRanges: ranges });
      };

      return (
        <div className="space-y-4">
          <SettingToggleItem
            title={t('settings.showToleranceBandTitle')}
            description={t('settings.showToleranceBandDesc')}
            checked={(settings.showToleranceBand as boolean) ?? true}
            onChange={(val) => updateSettings({ showToleranceBand: val })}
          />

          <div className="space-y-2.5 pt-2 border-t border-border/65">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              <span>{t('settings.angleRangesTitle')}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('settings.angleRangesDesc')}</p>

            {/* 快速预设按钮 */}
            <div className="grid grid-cols-3 gap-1.5">
              <Button
                variant={currentRanges.length === 4 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreset(ALL_ANGLE_RANGES)}
                className="py-1.5 text-xs h-auto"
              >
                {t('settings.presetAll')}
              </Button>
              <Button
                variant={
                  currentRanges.length === 2 &&
                  currentRanges.includes('0_45') &&
                  currentRanges.includes('45_90')
                    ? 'default'
                    : 'outline'
                }
                size="sm"
                onClick={() => setPreset(['0_45', '45_90'])}
                className="py-1.5 text-xs h-auto"
              >
                {t('settings.presetAcute')}
              </Button>
              <Button
                variant={
                  currentRanges.length === 2 &&
                  currentRanges.includes('90_135') &&
                  currentRanges.includes('135_180')
                    ? 'default'
                    : 'outline'
                }
                size="sm"
                onClick={() => setPreset(['90_135', '135_180'])}
                className="py-1.5 text-xs h-auto"
              >
                {t('settings.presetObtuse')}
              </Button>
            </div>

            {/* 细分区间多选按钮 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
              {ALL_ANGLE_RANGES.map((range) => {
                const isSelected = currentRanges.includes(range);
                return (
                  <Button
                    key={range}
                    variant={isSelected ? 'accent' : 'outline'}
                    size="sm"
                    onClick={() => toggleRange(range)}
                    className="py-2 text-xs font-mono h-auto"
                  >
                    {t(`settings.ranges.${range}`)}
                  </Button>
                );
              })}
            </div>
          </div>
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
