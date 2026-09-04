import { Crosshair } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import { TargetingSection } from '../../components/settings/common/TargetingSection';
import { Button } from '../../components/ui/button';
import { useCardTranslation } from '../../core/i18n';
import type { StarSettings } from '../../storage/settings';
import type { Point } from '../../types';
import { StarDoubleHView } from './StarDoubleHView';
import { createStarDoubleHAnalytics } from './analytics';
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

export const starDoubleHCard: CardManifest<QuestionData, HitResult, Point, StarSettings> = {
  id: 'star_double_h',
  domain: 'spatial_structure',
  icon: Crosshair,
  tags: {
    domain: ['spatial_structure', 'form_and_proportion'],
    path: ['absolute_estimation', 'relational_mapping'],
    interaction: ['spatial_locate'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  renderSettings: ({ settings, updateSettings }) => {
    const { t } = useCardTranslation('star_double_h');
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">{t('settings.gridSizeTitle')}</div>
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
        <TargetingSection
          title={t('settings.targetingTitle')}
          subTitle={t('settings.targetingSubTitle')}
          mode={settings.targetingMode ?? 'off'}
          onModeChange={(m) => updateSettings({ targetingMode: m })}
          sectors={SECTOR_KEYS}
          selectedSectors={settings.manualTargetSectors ?? []}
          onToggleSector={(idx) => {
            const current = settings.manualTargetSectors ?? [];
            const next = current.includes(idx)
              ? current.filter((s) => s !== idx)
              : [...current, idx];
            updateSettings({ manualTargetSectors: next });
          }}
          gridCols="grid-cols-4"
        />
      </div>
    );
  },
  defaultSettings: {
    gridSize: 3,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  training: {
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
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <StarDoubleHView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
  analytics: {
    views: createStarDoubleHAnalytics(),
  },
};

export default starDoubleHCard;
