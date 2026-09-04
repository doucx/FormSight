import {
  Callout,
  type CardAnalyticsView,
  type ScopedTranslator,
  type SectorStat,
  type UnifiedTrialRecord,
  calcSignedHueBias,
  calculateBasicOverallStats,
  hsvToHex,
  renderHueBiasChartCanvas,
  renderHueRingCanvas,
} from '@formsight/card-sdk';
import { AlertCircle, PieChart, Sparkles } from 'lucide-preact';

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

interface ColorHueTrialRecord extends UnifiedTrialRecord {
  targetHSV: [number, number, number];
  userHSV: [number, number, number];
  errorValue: number;
}

/**
 * 聚合 12 个色相扇区的样本量、命中数与平均误差统计
 */
function calculateHueSectorStats(
  rawRecords: UnifiedTrialRecord[],
  t: ScopedTranslator,
): SectorStat[] {
  const records = rawRecords as ColorHueTrialRecord[];
  const sectorBuckets = Array.from({ length: 12 }, () => ({
    total: 0,
    hits: 0,
    sumError: 0,
  }));

  for (const r of records) {
    const idx = Math.max(0, Math.min(11, Math.floor(r.targetHSV[0] / 30)));
    sectorBuckets[idx].total += 1;
    if (r.isHit) sectorBuckets[idx].hits += 1;
    sectorBuckets[idx].sumError += r.errorValue;
  }

  return sectorBuckets.map((b, i) => ({
    sectorIdx: i,
    label: t(COLOR_SECTOR_KEYS[i]),
    total: b.total,
    accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
    avgError: b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0,
  }));
}

export function createColorHueAnalytics(): CardAnalyticsView[] {
  return [
    {
      id: 'hue_bias_chart',
      tabLabel: 'analytics.hueBias.tabLabel',
      title: 'analytics.hueBias.title',
      subTitle: 'analytics.hueBias.subTitle',
      icon: Sparkles,
      renderVisualizer: (canvas, records) => {
        renderHueBiasChartCanvas(canvas, records);
      },
      renderDiagnostics: (rawRecords, t) => {
        const records = rawRecords as ColorHueTrialRecord[];
        const totalCount = records.length;
        if (totalCount === 0) return null;

        let sumSignedBias = 0;
        const sectorBuckets = Array.from({ length: 12 }, () => ({
          total: 0,
          hits: 0,
          sumBias: 0,
        }));

        for (const r of records) {
          const bias = calcSignedHueBias(r.targetHSV[0], r.userHSV[0]);
          sumSignedBias += bias;

          const idx = Math.max(0, Math.min(11, Math.floor(r.targetHSV[0] / 30)));
          sectorBuckets[idx].total += 1;
          if (r.isHit) sectorBuckets[idx].hits += 1;
          sectorBuckets[idx].sumBias += bias;
        }

        const avgSignedBias = Math.round((sumSignedBias / totalCount) * 10) / 10;
        const validSectors = sectorBuckets
          .map((b, i) => ({
            sectorIdx: i,
            label: t(COLOR_SECTOR_KEYS[i]),
            total: b.total,
            accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
            avgBias: b.total > 0 ? Math.round((b.sumBias / b.total) * 10) / 10 : 0,
          }))
          .filter((s) => s.total >= 3);

        const maxBiasSector =
          validSectors.length > 0
            ? validSectors.reduce((prev, curr) =>
                Math.abs(curr.avgBias) > Math.abs(prev.avgBias) ? curr : prev,
              )
            : null;

        const signedBiasText =
          avgSignedBias > 0
            ? t('analytics.hueBias.clockwise', { val: avgSignedBias })
            : avgSignedBias < 0
              ? t('analytics.hueBias.counterClockwise', { val: avgSignedBias })
              : '0°';

        return (
          <Callout variant="warning" icon={AlertCircle} title={t('analytics.hueBias.cardTitle')}>
            <div className="space-y-2 text-xs text-foreground pt-1">
              <div className="flex justify-between bg-card p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/60 shadow-xs font-mono">
                <span className="text-muted-foreground">
                  {t('analytics.hueBias.avgSignedBias')}
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

              {maxBiasSector ? (
                <div className="space-y-1.5">
                  <p className="text-muted-foreground">
                    {t('analytics.hueBias.maxBiasSector')}
                    <span className="font-bold text-amber-700 dark:text-amber-300 ml-1">
                      {maxBiasSector.label}
                    </span>
                  </p>
                  <div className="flex justify-between items-center bg-card p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/60 shadow-xs">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-full border border-border"
                        style={{
                          backgroundColor: hsvToHex(maxBiasSector.sectorIdx * 30 + 15, 100, 100),
                        }}
                      />
                      <span className="font-bold text-foreground">
                        {maxBiasSector.label.split(' ')[0]}
                      </span>
                    </div>
                    <span className="font-black text-amber-700 dark:text-amber-300 font-mono text-xs">
                      {t('analytics.hueBias.avgBias')}{' '}
                      {maxBiasSector.avgBias > 0
                        ? `+${maxBiasSector.avgBias}°`
                        : `${maxBiasSector.avgBias}°`}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  {t('analytics.hueBias.needMoreTrials')}
                </p>
              )}
            </div>
          </Callout>
        );
      },
      getOverallStats: (records, t) => {
        const baseStats = calculateBasicOverallStats(records);
        const sumError = records.reduce((acc, curr) => acc + Number(curr.errorValue || 0), 0);
        const avgError =
          baseStats.total > 0 ? Math.round((sumError / baseStats.total) * 10) / 10 : 0;

        return {
          ...baseStats,
          customSummary: (
            <div className="flex justify-between text-indigo-700 font-bold border-t border-border/60 pt-1 text-xs">
              <span>{t('analytics.hueBias.avgAbsError')}</span>
              <span>{avgError}°</span>
            </div>
          ),
        };
      },
    },
    {
      id: 'hue_ring',
      tabLabel: 'analytics.hueRing.tabLabel',
      title: 'analytics.hueRing.title',
      subTitle: 'analytics.hueRing.subTitle',
      icon: PieChart,
      renderVisualizer: (canvas, records, t) => {
        const sectorStats = calculateHueSectorStats(records, t);
        renderHueRingCanvas(canvas, sectorStats, t('title'), t('common.accuracy'));
      },
      renderDiagnostics: (records, t) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const sectorStats = calculateHueSectorStats(records, t);
        const validSectors = sectorStats.filter((s) => s.total >= 3);
        const weakestSector =
          validSectors.length > 0
            ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
            : null;

        return (
          <Callout variant="warning" icon={AlertCircle} title={t('analytics.hueRing.cardTitle')}>
            {weakestSector ? (
              <div className="space-y-2 pt-1">
                <p className="text-foreground text-xs">
                  {t('analytics.hueRing.weakestHint', {
                    sector: weakestSector.label,
                  })}
                </p>
                <div className="flex justify-between items-center bg-card p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/60 shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full border border-border"
                      style={{
                        backgroundColor: hsvToHex(weakestSector.sectorIdx * 30 + 15, 100, 100),
                      }}
                    />
                    <span className="font-bold text-foreground">
                      {weakestSector.label.split(' ')[0]}
                    </span>
                  </div>
                  <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                    {t('analytics.hueRing.accuracyRate', {
                      accuracy: weakestSector.accuracy,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                {t('analytics.hueRing.needMoreTrials')}
              </p>
            )}
          </Callout>
        );
      },
      getOverallStats: (records, t) => {
        const baseStats = calculateBasicOverallStats(records);
        const sumError = records.reduce((acc, curr) => acc + Number(curr.errorValue || 0), 0);
        const avgError =
          baseStats.total > 0 ? Math.round((sumError / baseStats.total) * 10) / 10 : 0;

        return {
          ...baseStats,
          customSummary: (
            <div className="flex justify-between text-indigo-700 font-bold border-t border-border/60 pt-1 text-xs">
              <span>{t('analytics.hueBias.avgAbsError')}</span>
              <span>{avgError}°</span>
            </div>
          ),
        };
      },
    },
  ];
}
