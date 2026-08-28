import { Activity, Gauge, TrendingUp, Zap } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import type { UnifiedTrialRecord } from '../../utils/db/schema';
import { setupHiDpiCanvas } from '../canvas/hidpi';
import type { CardAnalyticsView } from '../contracts';
import { i18n } from '../i18n';

interface SatBinStat {
  rangeLabel: string;
  minMs: number;
  maxMs: number;
  total: number;
  hits: number;
  accuracy: number;
}

export function calculateSpeedBins(records: UnifiedTrialRecord[]): SatBinStat[] {
  if (!records || records.length === 0) {
    return [
      { rangeLabel: '< 1.0s', minMs: 0, maxMs: 1000, total: 0, hits: 0, accuracy: 0 },
      { rangeLabel: '1.0~2.0s', minMs: 1000, maxMs: 2000, total: 0, hits: 0, accuracy: 0 },
      { rangeLabel: '2.0~3.5s', minMs: 2000, maxMs: 3500, total: 0, hits: 0, accuracy: 0 },
      { rangeLabel: '3.5~6.0s', minMs: 3500, maxMs: 6000, total: 0, hits: 0, accuracy: 0 },
      { rangeLabel: '> 6.0s', minMs: 6000, maxMs: Number.MAX_SAFE_INTEGER, total: 0, hits: 0, accuracy: 0 },
    ];
  }

  const times = records.map((r) => Number(r.responseTimeMs) || 0).sort((a, b) => a - b);
  const p95 = times[Math.min(times.length - 1, Math.floor(times.length * 0.95))];
  const maxBound = Math.max(2000, Math.ceil(p95 / 1000) * 1000);
  const step = maxBound / 5;

  const thresholds = [
    Math.round(step),
    Math.round(step * 2),
    Math.round(step * 3),
    Math.round(step * 4),
  ];

  const formatSec = (ms: number) => {
    const s = ms / 1000;
    return s >= 10 ? `${Math.round(s)}s` : `${s.toFixed(1)}s`;
  };

  const rawBins: { minMs: number; maxMs: number; rangeLabel: string }[] = [
    { minMs: 0, maxMs: thresholds[0], rangeLabel: `< ${formatSec(thresholds[0])}` },
    { minMs: thresholds[0], maxMs: thresholds[1], rangeLabel: `${formatSec(thresholds[0])}~${formatSec(thresholds[1])}` },
    { minMs: thresholds[1], maxMs: thresholds[2], rangeLabel: `${formatSec(thresholds[1])}~${formatSec(thresholds[2])}` },
    { minMs: thresholds[2], maxMs: thresholds[3], rangeLabel: `${formatSec(thresholds[2])}~${formatSec(thresholds[3])}` },
    { minMs: thresholds[3], maxMs: Number.MAX_SAFE_INTEGER, rangeLabel: `> ${formatSec(thresholds[3])}` },
  ];

  return rawBins.map((bin) => {
    const matched = records.filter(
      (r) => r.responseTimeMs >= bin.minMs && r.responseTimeMs < bin.maxMs,
    );
    const total = matched.length;
    const hits = matched.filter((r) => r.isHit).length;
    const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
    return { ...bin, total, hits, accuracy };
  });
}

export function renderSpeedAccuracyVisualizer(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
) {
  const rect = canvas.getBoundingClientRect();
  const size = Math.round(rect.width) || 340;
  const width = size;
  const height = size;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const bins = calculateSpeedBins(records);
  const padding = { top: 35, right: 20, bottom: 45, left: 30 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  // 参考线
  const yTicks = [100, 75, 50, 25, 0];
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = '10px monospace';

  for (const tick of yTicks) {
    const y = padding.top + (1 - tick / 100) * chartH;
    ctx.strokeStyle = tick === 0 ? '#CBD5E1' : '#E2E8F0';
    ctx.setLineDash(tick === 0 ? [] : [2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.fillText(`${tick}%`, padding.left - 4, y);
  }
  ctx.setLineDash([]);

  const barWidth = chartW / bins.length;

  bins.forEach((bin, idx) => {
    const x = padding.left + idx * barWidth;
    const barH = (bin.accuracy / 100) * chartH;
    const y = padding.top + chartH - barH;

    // 柱状图本体
    if (bin.total > 0) {
      ctx.fillStyle =
        bin.accuracy >= 80
          ? 'rgba(16, 185, 129, 0.85)'
          : bin.accuracy >= 60
            ? 'rgba(245, 158, 11, 0.85)'
            : 'rgba(244, 63, 94, 0.85)';

      ctx.beginPath();
      ctx.roundRect(x + 6, y, barWidth - 12, Math.max(3, barH), 6);
      ctx.fill();

      // 准确率标签
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${bin.accuracy}%`, x + barWidth / 2, y - 4);
    } else {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.6)';
      ctx.beginPath();
      ctx.roundRect(x + 6, padding.top + chartH - 4, barWidth - 12, 4, 2);
      ctx.fill();
    }

    // X 轴时间与题数标签
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(bin.rangeLabel, x + barWidth / 2, height - padding.bottom + 6);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '8px sans-serif';
    ctx.fillText(
      `${bin.total}${i18n.t('common.trialsUnit')}`,
      x + barWidth / 2,
      height - padding.bottom + 18,
    );
  });
}

export function diagnoseSpeedAccuracy(records: UnifiedTrialRecord[]): ComponentChildren {
  const bins = calculateSpeedBins(records);
  const totalTrials = records.length;

  if (totalTrials === 0) {
    return (
      <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-500">
        {i18n.t('analyticsModal.needMoreSamples')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
        {i18n.t('analyticsModal.satDistributionTitle')}
      </div>
      <div className="space-y-1.5">
        {bins.map((bin) => {
          const ratio = totalTrials > 0 ? Math.round((bin.total / totalTrials) * 100) : 0;
          return (
            <div
              key={bin.rangeLabel}
              className="p-2.5 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs font-bold text-slate-700 min-w-[70px]">
                  {bin.rangeLabel}
                </span>
                <span className="text-[11px] text-slate-400">
                  {bin.total} {i18n.t('common.trialsUnit')} ({ratio}%)
                </span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg ${
                    bin.total === 0
                      ? 'bg-slate-100 text-slate-400'
                      : bin.accuracy >= 80
                        ? 'bg-emerald-50 text-emerald-700'
                        : bin.accuracy >= 60
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {bin.total > 0 ? `${bin.accuracy}%` : '--'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface LevelBinStat {
  level: number;
  total: number;
  hits: number;
  accuracy: number;
}

function calculateLevelStats(records: UnifiedTrialRecord[]): LevelBinStat[] {
  const levelMap = new Map<number, { total: number; hits: number }>();
  for (const r of records) {
    const lvl = Number(r.difficultyLevel) || 1;
    const curr = levelMap.get(lvl) || { total: 0, hits: 0 };
    curr.total += 1;
    if (r.isHit) curr.hits += 1;
    levelMap.set(lvl, curr);
  }

  const result: LevelBinStat[] = [];
  for (let l = 1; l <= 35; l++) {
    const data = levelMap.get(l);
    if (data) {
      result.push({
        level: l,
        total: data.total,
        hits: data.hits,
        accuracy: Math.round((data.hits / data.total) * 100),
      });
    }
  }
  return result;
}

export function renderDifficultyPlateauVisualizer(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
) {
  const rect = canvas.getBoundingClientRect();
  const size = Math.round(rect.width) || 340;
  const width = size;
  const height = size;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const padding = { top: 35, right: 20, bottom: 40, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  const levelStats = calculateLevelStats(records);

  // Y 轴参考线
  const yTicks = [100, 80, 50, 0];
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = '10px monospace';

  for (const tick of yTicks) {
    const y = padding.top + (1 - tick / 100) * chartH;
    ctx.strokeStyle = tick === 80 ? '#A7F3D0' : tick === 50 ? '#FECDD3' : '#E2E8F0';
    ctx.setLineDash(tick === 0 ? [] : [2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = tick === 80 ? '#059669' : tick === 50 ? '#E11D48' : '#94A3B8';
    ctx.fillText(`${tick}%`, padding.left - 5, y);
  }
  ctx.setLineDash([]);

  // X 轴刻度
  const minLvl = 1;
  const maxLvl = 35;
  const getX = (lvl: number) => padding.left + ((lvl - minLvl) / (maxLvl - minLvl)) * chartW;
  const getY = (acc: number) => padding.top + (1 - acc / 100) * chartH;

  // 绘制散点与面积
  for (const stat of levelStats) {
    const x = getX(stat.level);
    const y = getY(stat.accuracy);
    const radius = Math.min(8, Math.max(3, Math.sqrt(stat.total) * 1.5));

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle =
      stat.accuracy >= 80
        ? 'rgba(16, 185, 129, 0.75)'
        : stat.accuracy >= 60
          ? 'rgba(245, 158, 11, 0.75)'
          : 'rgba(244, 63, 94, 0.75)';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // 绘制趋势连接线
  if (levelStats.length >= 2) {
    ctx.beginPath();
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 2;
    ctx.moveTo(getX(levelStats[0].level), getY(levelStats[0].accuracy));
    for (let i = 1; i < levelStats.length; i++) {
      ctx.lineTo(getX(levelStats[i].level), getY(levelStats[i].accuracy));
    }
    ctx.stroke();
  }

  // X 轴标签
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Lvl 1', getX(1), height - padding.bottom + 6);
  ctx.fillText('Lvl 18', getX(18), height - padding.bottom + 6);
  ctx.fillText('Lvl 35', getX(35), height - padding.bottom + 6);
}

export function diagnoseDifficultyPlateau(records: UnifiedTrialRecord[]): ComponentChildren {
  const levelStats = calculateLevelStats(records);
  const comfortLevels = levelStats.filter((s) => s.accuracy >= 80 && s.total >= 3);
  const growthLevels = levelStats.filter(
    (s) => s.accuracy >= 60 && s.accuracy < 80 && s.total >= 3,
  );
  const bottleneckLevels = levelStats.filter((s) => s.accuracy < 50 && s.total >= 3);

  const maxComfort = comfortLevels.length > 0 ? Math.max(...comfortLevels.map((s) => s.level)) : 1;
  const currentGrowth =
    growthLevels.length > 0 ? growthLevels.map((s) => `Lvl ${s.level}`).join(', ') : '暂未显现';
  const breakdownMin =
    bottleneckLevels.length > 0 ? Math.min(...bottleneckLevels.map((s) => s.level)) : null;

  return (
    <div className="space-y-2.5">
      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-2.5">
        <TrendingUp className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 leading-relaxed">
          <span className="font-bold">{i18n.t('analyticsModal.comfortZoneTitle')}: </span>
          {i18n.t('analyticsModal.comfortZoneDesc', { maxLevel: maxComfort })}
        </div>
      </div>

      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-2.5">
        <Activity className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 leading-relaxed">
          <span className="font-bold">{i18n.t('analyticsModal.growthZoneTitle')}: </span>
          {currentGrowth}
        </div>
      </div>

      {breakdownMin !== null && (
        <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2.5">
          <Gauge className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 leading-relaxed">
            <span className="font-bold">{i18n.t('analyticsModal.ceilingTitle')}: </span>
            {i18n.t('analyticsModal.ceilingDesc', { level: breakdownMin })}
          </div>
        </div>
      )}
    </div>
  );
}

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

  // 2. 难度突破区计算
  const levelStats = calculateLevelStats(records);
  const growthLevels = levelStats.filter(
    (s) => s.accuracy >= 60 && s.accuracy < 80 && s.total >= 2,
  );

  let growthZoneText = '';
  if (growthLevels.length > 0) {
    growthZoneText = growthLevels.map((s) => `Lvl ${s.level}`).join(', ');
  } else {
    const maxLvl = Math.max(...records.map((r) => Number(r.difficultyLevel) || 1));
    growthZoneText = `Lvl ${Math.max(1, maxLvl - 2)} ~ Lvl ${maxLvl}`;
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
