import { Crosshair, RotateCw } from 'lucide-preact';

import {
  Button,
  type CardManifest,
  type Point,
  type StarSettings,
  useCardTranslation,
} from '@formsight/card-sdk';
import { StarDoubleRView } from './StarDoubleRView';
import { createStarDoubleRAnalytics } from './analytics';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

const SECTOR_KEYS = [
  'sectors.e',
  'sectors.ne',
  'sectors.n',
  'sectors.nw',
  'sectors.w',
  'sectors.sw',
  'sectors.s',
  'sectors.se',
];

export const starDoubleRCard: CardManifest<QuestionData, HitResult, Point, StarSettings> = {
  id: 'star_double_r',
  domain: 'spatial_structure',
  tags: {
    domain: ['spatial_structure', 'form_and_proportion'],
    path: ['absolute_estimation', 'relational_mapping'],
    challenge: ['dimensional_translation'],
    interaction: ['spatial_locate'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  defaultSettings: {
    gridSize: 3,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  engine: {
    isTargeting: (settings) => settings.targetingMode === 'manual',
    generateQuestion: (level, settings) =>
      generateQuestion(level, {
        gridSize: settings.gridSize,
        targetingMode: settings.targetingMode,
        targetSectors: settings.manualTargetSectors,
      }),
    evaluateAnswer: (userPoint, question) => checkHit(userPoint, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      anchorA: [q.anchorA.x, q.anchorA.y],
      anchorC: [q.anchorC.x, q.anchorC.y],
      targetB: [q.targetB.x, q.targetB.y],
      userClick: [userVal.x, userVal.y],
      angleDegree: q.angleDegree,
      distanceRatio: q.distanceRatio,
      errorPixelDistance: hitResult.errorDistance,
    }),
  },
  ui: {
    icon: RotateCw,
    renderSettings: ({ settings, updateSettings }) => {
      const { t } = useCardTranslation('star_double_r');
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-foreground">
              {t('settings.gridSizeTitle')}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[2, 3, 4, 5].map((size) => (
                <Button
                  key={size}
                  variant={settings.gridSize === size ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateSettings({ gridSize: size })}
                  className="py-2 h-auto"
                >
                  {size}x{size}
                </Button>
              ))}
            </div>
          </div>
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
                <div className="grid grid-cols-4 gap-1.5">
                  {SECTOR_KEYS.map((name, idx) => {
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
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <StarDoubleRView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
  },
  analytics: {
    views: createStarDoubleRAnalytics(),
  },
};

export default starDoubleRCard;
