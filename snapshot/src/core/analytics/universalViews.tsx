import { Gauge, Zap } from 'lucide-preact';
import type { UnifiedTrialRecord } from '../../storage/schema';
import type { CardAnalyticsView } from '../contracts';
import { i18n } from '../i18n';
import {
  calculateLevelStats,
  diagnoseDifficultyPlateau,
  renderDifficultyPlateauVisualizer,
} from './difficultyPlateauView';
import {
  calculateSpeedBins,
  diagnoseSpeedAccuracy,
  renderSpeedAccuracyVisualizer,
} from './speedAccuracyView';

export * from './speedAccuracyView';
export * from './difficultyPlateauView';

export function getCognitiveOverviewInsights(records: UnifiedTrialRecord[]): {
  paceSummaryText: string;
  growthZoneText: string;
} {
  if (!records || records.length === 0) {
    return {
      paceSummaryText: i18n.t('analyticsModal.needMoreSamples'),
      growthZoneText: i18n.t('analyticsModal.needMoreSamples'),
    };
  }

  // 1. 客观作答节奏分布概括
  const bins = calculateSpeedBins(records);
  const avgSec = (
    records.reduce((acc, r) => acc + (Number(r.responseTimeMs) || 0), 0) /
    records.length /
    1000
  ).toFixed(1);

  const populatedBins = [...bins].filter((b) => b.total > 0);
  const mainBin = populatedBins.sort((a, b) => b.total - a.total)[0];

  let paceSummaryText = '';
  if (mainBin) {
    paceSummaryText = i18n.t('analyticsModal.paceSummaryDesc', {
      avg: avgSec,
      range: mainBin.rangeLabel,
      acc: mainBin.accuracy,
    });
  } else {
    paceSummaryText = `${avgSec} s`;
  }

  // 2. 客观核心难度层阶概括
  const levelStats = calculateLevelStats(records);
  const maxLevel = Math.max(...records.map((r) => Number(r.difficultyLevel) || 1));
  const mainLevel = [...levelStats].sort((a, b) => b.total - a.total)[0];

  let growthZoneText = '';
  if (mainLevel) {
    growthZoneText = i18n.t('analyticsModal.levelFocusSummaryDesc', {
      max: maxLevel,
      focus: mainLevel.level,
      count: mainLevel.total,
      acc: mainLevel.accuracy,
    });
  } else {
    growthZoneText = `Lvl ${maxLevel}`;
  }

  return {
    paceSummaryText,
    growthZoneText,
  };
}

export const UNIVERSAL_ANALYTICS_VIEWS: CardAnalyticsView[] = [
  {
    id: 'universal_sat',
    tabLabel: 'analyticsModal.satTabLabel',
    title: 'analyticsModal.satTitle',
    subTitle: 'analyticsModal.satSubtitle',
    icon: Zap,
    renderVisualizer: renderSpeedAccuracyVisualizer,
    renderDiagnostics: diagnoseSpeedAccuracy,
  },
  {
    id: 'universal_plateau',
    tabLabel: 'analyticsModal.plateauTabLabel',
    title: 'analyticsModal.plateauTitle',
    subTitle: 'analyticsModal.plateauSubtitle',
    icon: Gauge,
    renderVisualizer: renderDifficultyPlateauVisualizer,
    renderDiagnostics: diagnoseDifficultyPlateau,
  },
];
