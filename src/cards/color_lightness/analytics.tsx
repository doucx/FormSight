import {
  CANVAS_THEME,
  Callout,
  type CardAnalyticsView,
  type ScopedTranslator,
  type SectorStat,
  type UnifiedTrialRecord,
  calculateBasicOverallStats,
  hsvToHex,
  initSquareHiDpiCanvas,
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

interface ColorLightnessTrialRecord extends UnifiedTrialRecord {
  targetHSV: [number, number, number];
  truthPercentage: number;
  userValue: number;
  errorValue: number;
}

/**
 * 聚合 12 个色相扇区的样本量、正确率与平均带符号明度偏差
 */
function calculateLightnessSectorStats(rawRecords: UnifiedTrialRecord[], t: ScopedTranslator) {
  const records = rawRecords as ColorLightnessTrialRecord[];
  const sectorBuckets = Array.from({ length: 12 }, () => ({
    total: 0,
    hits: 0,
    sumError: 0,
    sumBias: 0,
  }));

  for (const r of records) {
    const hue = r.targetHSV?.[0] ?? 0;
    const idx = Math.max(0, Math.min(11, Math.floor(hue / 30)));
    const signedBias = (r.userValue ?? 0) - (r.truthPercentage ?? 0);

    sectorBuckets[idx].total += 1;
    if (r.isHit) sectorBuckets[idx].hits += 1;
    sectorBuckets[idx].sumError += r.errorValue ?? 0;
    sectorBuckets[idx].sumBias += signedBias;
  }

  return sectorBuckets.map((b, i) => ({
    sectorIdx: i,
    label: t(COLOR_SECTOR_KEYS[i]),
    total: b.total,
    accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
    avgError: b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0,
    avgBias: b.total > 0 ? Math.round((b.sumBias / b.total) * 10) / 10 : 0,
  }));
}

/**
 * 绘制色相-明度偏差分布图：横轴 12 色相，纵轴明度估测偏置 (-25% ~ +25%)
 */
function renderLightnessBiasChartCanvas(
  canvas: HTMLCanvasElement,
  rawRecords: UnifiedTrialRecord[],
): void {
  const init = initSquareHiDpiCanvas(canvas, 340, CANVAS_THEME.bg.secondary);
  if (!init) return;
  const { ctx, size } = init;

  const records = rawRecords as ColorLightnessTrialRecord[];
  const padLeft = 40;
  const padRight = 20;
  const padTop = 30;
  const padBottom = 40;
  const chartW = size - padLeft - padRight;
  const chartH = size - padTop - padBottom;
  const midY = padTop + chartH / 2;
  const maxBiasRange = 25; // 坐标系上限 ±25%

  // 1. 坐标背景网格与刻度线
  ctx.strokeStyle = CANVAS_THEME.axis.grid;
  ctx.lineWidth = 1;

  const gridSteps = [-20, -10, 0, 10, 20];
  ctx.font = '10px ui-monospace, SFMono-Regular, monospace';
  ctx.fillStyle = CANVAS_THEME.text.muted;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (const step of gridSteps) {
    const y = midY - (step / maxBiasRange) * (chartH / 2);
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(size - padRight, y);
    ctx.stroke();

    ctx.fillText(`${step > 0 ? `+${step}` : step}%`, padLeft - 6, y);
  }

  // 2. 0% 中心基准高亮线
  ctx.strokeStyle = CANVAS_THEME.axis.highlight;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padLeft, midY);
  ctx.lineTo(size - padRight, midY);
  ctx.stroke();

  // 3. 统计 12 个色相柱状图数据
  const sectorBuckets = Array.from({ length: 12 }, () => ({
    count: 0,
    sumBias: 0,
  }));

  for (const r of records) {
    const hue = r.targetHSV?.[0] ?? 0;
    const idx = Math.max(0, Math.min(11, Math.floor(hue / 30)));
    const bias = (r.userValue ?? 0) - (r.truthPercentage ?? 0);
    sectorBuckets[idx].count += 1;
    sectorBuckets[idx].sumBias += bias;
  }

  const colW = chartW / 12;

  // 4. 绘制各色相扇区平均偏差柱状条与底部色相标点
  for (let i = 0; i < 12; i++) {
    const xCenter = padLeft + i * colW + colW / 2;
    const b = sectorBuckets[i];
    const avgBias = b.count > 0 ? b.sumBias / b.count : 0;
    const clampedBias = Math.max(-maxBiasRange, Math.min(maxBiasRange, avgBias));
    const barHeight = (clampedBias / maxBiasRange) * (chartH / 2);

    // 柱状体：正偏差（高估）用琥珀暖色，负偏差（低估）用冷色
    if (b.count > 0) {
      ctx.fillStyle = avgBias >= 0 ? 'rgba(245, 158, 11, 0.75)' : 'rgba(99, 102, 241, 0.75)';
      const barY = avgBias >= 0 ? midY - barHeight : midY;
      ctx.fillRect(xCenter - colW * 0.32, barY, colW * 0.64, Math.abs(barHeight));
    }

    // 底部色相圆形色标
    const sectorHue = i * 30 + 15;
    ctx.fillStyle = hsvToHex(sectorHue, 100, 100);
    ctx.beginPath();
    ctx.arc(xCenter, size - padBottom + 12, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = CANVAS_THEME.axis.line;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 5. 绘制单题散点 (半透明微点)
  for (const r of records) {
    const hue = r.targetHSV?.[0] ?? 0;
    const x = padLeft + (hue / 360) * chartW;
    const bias = (r.userValue ?? 0) - (r.truthPercentage ?? 0);
    const clampedBias = Math.max(-maxBiasRange, Math.min(maxBiasRange, bias));
    const y = midY - (clampedBias / maxBiasRange) * (chartH / 2);

    ctx.fillStyle = r.isHit ? 'rgba(16, 185, 129, 0.45)' : 'rgba(244, 63, 94, 0.45)';
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function createColorLightnessAnalytics(): CardAnalyticsView[] {
  return [
    {
      id: 'lightness_bias_chart',
      tabLabel: 'analytics.lightnessBias.tabLabel',
      title: 'analytics.lightnessBias.title',
      subTitle: 'analytics.lightnessBias.subTitle',
      icon: Sparkles,
      renderVisualizer: (canvas, records) => {
        renderLightnessBiasChartCanvas(canvas, records);
      },
      renderDiagnostics: (rawRecords, t) => {
        const records = rawRecords as ColorLightnessTrialRecord[];
        const totalCount = records.length;
        if (totalCount === 0) return null;

        let sumSignedBias = 0;
        for (const r of records) {
          sumSignedBias += (r.userValue ?? 0) - (r.truthPercentage ?? 0);
        }
        const avgSignedBias = Math.round((sumSignedBias / totalCount) * 10) / 10;

        const sectorStats = calculateLightnessSectorStats(rawRecords, t);
        const validSectors = sectorStats.filter((s) => s.total >= 3);
        const maxBiasSector =
          validSectors.length > 0
            ? validSectors.reduce((prev, curr) =>
                Math.abs(curr.avgBias) > Math.abs(prev.avgBias) ? curr : prev,
              )
            : null;

        const signedBiasText =
          avgSignedBias > 0
            ? t('analytics.lightnessBias.overestimated', { val: avgSignedBias })
            : avgSignedBias < 0
              ? t('analytics.lightnessBias.underestimated', { val: avgSignedBias })
              : '0%';

        return (
          <Callout
            variant="warning"
            icon={AlertCircle}
            title={t('analytics.lightnessBias.cardTitle')}
          >
            <div className="space-y-2 text-xs text-foreground pt-1">
              <div className="flex justify-between bg-card p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/60 shadow-xs font-mono">
                <span className="text-muted-foreground">
                  {t('analytics.lightnessBias.avgSignedBias')}
                </span>
                <span
                  className={`font-bold ${
                    avgSignedBias > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : avgSignedBias < 0
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-foreground'
                  }`}
                >
                  {signedBiasText}
                </span>
              </div>

              {maxBiasSector ? (
                <div className="space-y-1.5">
                  <p className="text-muted-foreground">
                    {t('analytics.lightnessBias.maxBiasSector')}
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
                      {t('analytics.lightnessBias.avgBias')}{' '}
                      {maxBiasSector.avgBias > 0
                        ? `+${maxBiasSector.avgBias}%`
                        : `${maxBiasSector.avgBias}%`}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  {t('analytics.lightnessBias.needMoreTrials')}
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
            <div className="flex justify-between text-indigo-700 dark:text-indigo-400 font-bold border-t border-border/60 pt-1 text-xs font-mono">
              <span>{t('analytics.lightnessBias.avgAbsError')}</span>
              <span>{avgError}%</span>
            </div>
          ),
        };
      },
    },
    {
      id: 'lightness_ring',
      tabLabel: 'analytics.lightnessRing.tabLabel',
      title: 'analytics.lightnessRing.title',
      subTitle: 'analytics.lightnessRing.subTitle',
      icon: PieChart,
      renderVisualizer: (canvas, records, t) => {
        const sectorStats = calculateLightnessSectorStats(records, t) as SectorStat[];
        renderHueRingCanvas(canvas, sectorStats, t('title'), t('common.accuracy'));
      },
      renderDiagnostics: (records, t) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const sectorStats = calculateLightnessSectorStats(records, t);
        const validSectors = sectorStats.filter((s) => s.total >= 3);
        const weakestSector =
          validSectors.length > 0
            ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
            : null;

        return (
          <Callout
            variant="warning"
            icon={AlertCircle}
            title={t('analytics.lightnessRing.cardTitle')}
          >
            {weakestSector ? (
              <div className="space-y-2 pt-1">
                <p className="text-foreground text-xs">
                  {t('analytics.lightnessRing.weakestHint', {
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
                  <span className="font-black text-rose-600 dark:text-rose-400 text-sm font-mono">
                    {t('analytics.lightnessRing.accuracyRate', {
                      accuracy: weakestSector.accuracy,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                {t('analytics.lightnessRing.needMoreTrials')}
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
            <div className="flex justify-between text-indigo-700 dark:text-indigo-400 font-bold border-t border-border/60 pt-1 text-xs font-mono">
              <span>{t('analytics.lightnessBias.avgAbsError')}</span>
              <span>{avgError}%</span>
            </div>
          ),
        };
      },
    },
  ];
}
