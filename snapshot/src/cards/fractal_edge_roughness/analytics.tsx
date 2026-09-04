import { AlertCircle, BarChart2, Sparkles } from 'lucide-preact';
import { Callout } from '../../components/ui/callout';
import type { CardAnalyticsView } from '../../core/cardContract';
import { calculateBasicOverallStats } from '../../core/contracts';
import type { FractalEdgeRoughnessTrialRecord } from './types';
import { renderRoughnessBandChart, renderRoughnessBiasChart } from './utils/charts';
import { getRoughnessSectorIdx } from './utils/generator';

const SECTOR_KEYS = ['sectors.highFrequency', 'sectors.mediumFrequency', 'sectors.lowFrequency'];

export function createFractalEdgeRoughnessAnalytics(): CardAnalyticsView[] {
  return [
    {
      id: 'roughness_bias',
      tabLabel: 'analytics.roughnessBias.tabLabel',
      title: 'analytics.roughnessBias.title',
      subTitle: 'analytics.roughnessBias.subTitle',
      icon: Sparkles,
      renderVisualizer: (canvas, records, t) => {
        renderRoughnessBiasChart(canvas, records, t);
      },
      renderDiagnostics: (rawRecords, t) => {
        const records = rawRecords as FractalEdgeRoughnessTrialRecord[];
        const totalCount = records.length;
        if (totalCount === 0) return null;

        let sumSignedBias = 0;
        let sumAbsError = 0;

        for (const r of records) {
          sumSignedBias += r.signedBias;
          sumAbsError += r.errorValue;
        }

        const avgSignedBias = Math.round((sumSignedBias / totalCount) * 1000) / 1000;

        const signedBiasText =
          avgSignedBias > 0
            ? t('analytics.roughnessBias.underestimateRoughness', { val: avgSignedBias })
            : avgSignedBias < 0
              ? t('analytics.roughnessBias.overestimateRoughness', {
                  val: Math.abs(avgSignedBias),
                })
              : t('analytics.roughnessBias.neutral');

        return (
          <Callout variant="info" icon={AlertCircle} title={t('analytics.roughnessBias.cardTitle')}>
            <div className="space-y-2 text-xs text-foreground pt-1">
              <p className="text-muted-foreground leading-relaxed">
                {t('analytics.roughnessBias.desc')}
              </p>

              <div className="flex justify-between bg-card p-2 rounded-xl border border-border/60 font-mono shadow-xs">
                <span className="text-muted-foreground">
                  {t('analytics.roughnessBias.avgSignedBias')}
                </span>
                <span
                  className={`font-bold ${
                    avgSignedBias > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : avgSignedBias < 0
                        ? 'text-primary'
                        : 'text-foreground'
                  }`}
                >
                  {signedBiasText}
                </span>
              </div>
            </div>
          </Callout>
        );
      },
      getOverallStats: (records, t) => {
        const baseStats = calculateBasicOverallStats(records);
        const sumAbsError = records.reduce((acc, curr) => acc + Number(curr.errorValue || 0), 0);
        const avgAbsError =
          baseStats.total > 0 ? Math.round((sumAbsError / baseStats.total) * 1000) / 1000 : 0;

        return {
          ...baseStats,
          customSummary: (
            <div className="flex justify-between text-indigo-700 font-bold border-t border-border/60 pt-1 text-xs font-mono">
              <span>{t('analytics.roughnessBias.avgAbsError')}</span>
              <span>{avgAbsError}</span>
            </div>
          ),
        };
      },
    },
    {
      id: 'band_sensitivity',
      tabLabel: 'analytics.bandSensitivity.tabLabel',
      title: 'analytics.bandSensitivity.title',
      subTitle: 'analytics.bandSensitivity.subTitle',
      icon: BarChart2,
      renderVisualizer: (canvas, records, t) => {
        renderRoughnessBandChart(canvas, records, t);
      },
      renderDiagnostics: (rawRecords, t) => {
        const records = rawRecords as FractalEdgeRoughnessTrialRecord[];
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const sectorBuckets = Array.from({ length: 3 }, () => ({ total: 0, hits: 0 }));
        for (const r of records) {
          const sIdx = getRoughnessSectorIdx(r.targetH);
          sectorBuckets[sIdx].total += 1;
          if (r.isHit) sectorBuckets[sIdx].hits += 1;
        }

        const validSectors = sectorBuckets
          .map((b, i) => ({
            label: t(SECTOR_KEYS[i]),
            total: b.total,
            accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
          }))
          .filter((s) => s.total >= 3);

        const weakest =
          validSectors.length > 0
            ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
            : null;

        return (
          <Callout
            variant="warning"
            icon={AlertCircle}
            title={t('analytics.bandSensitivity.cardTitle')}
          >
            {weakest ? (
              <div className="space-y-1.5 text-xs text-foreground pt-1">
                <p>
                  {t('analytics.bandSensitivity.weakestHint', {
                    sector: weakest.label,
                  })}
                </p>
                <div className="flex justify-between items-center bg-card p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/60 font-mono shadow-xs">
                  <span>{weakest.label}</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {t('analytics.bandSensitivity.accuracyRate', {
                      accuracy: weakest.accuracy,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                {t('analytics.bandSensitivity.needMoreTrials')}
              </p>
            )}
          </Callout>
        );
      },
      getOverallStats: (records) => calculateBasicOverallStats(records),
    },
  ];
}
