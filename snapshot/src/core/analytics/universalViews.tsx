import { Gauge, Zap } from 'lucide-preact';
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
      {
        rangeLabel: '> 6.0s',
        minMs: 6000,
        maxMs: Number.MAX_SAFE_INTEGER,
        total: 0,
        hits: 0,
        accuracy: 0,
      },
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
    {
      minMs: thresholds[0],
      maxMs: thresholds[1],
      rangeLabel: `${formatSec(thresholds[0])}~${formatSec(thresholds[1])}`,
    },
    {
      minMs: thresholds[1],
      maxMs: thresholds[2],
      rangeLabel: `${formatSec(thresholds[1])}~${formatSec(thresholds[2])}`,
    },
    {
      minMs: thresholds[2],
      maxMs: thresholds[3],
      rangeLabel: `${formatSec(thresholds[2])}~${formatSec(thresholds[3])}`,
    },
    {
      minMs: thresholds[3],
      maxMs: Number.MAX_SAFE_INTEGER,
      rangeLabel: `> ${formatSec(thresholds[3])}`,
    },
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
  const padding = { top: 35, right: 20, bottom: 45, left: 35 };
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
    ctx.fillText(`${tick}%`, padding.left - 5, y);
  }
  ctx.setLineDash([]);

  const slotW = chartW / bins.length;
  const points = bins.map((bin, idx) => {
    const x = padding.left + (idx + 0.5) * slotW;
    const y = padding.top + (1 - bin.accuracy / 100) * chartH;
    return { x, y, bin };
  });

  const validPoints = points.filter((p) => p.bin.total > 0);

  // 绘制折线与渐变面积
  if (validPoints.length > 0) {
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.16)');
    gradient.addColorStop(1, 'rgba(79, 70, 229, 0.01)');

    ctx.beginPath();
    ctx.moveTo(validPoints[0].x, validPoints[0].y);
    for (let i = 1; i < validPoints.length; i++) {
      ctx.lineTo(validPoints[i].x, validPoints[i].y);
    }
    ctx.lineTo(validPoints[validPoints.length - 1].x, height - padding.bottom);
    ctx.lineTo(validPoints[0].x, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.moveTo(validPoints[0].x, validPoints[0].y);
    for (let i = 1; i < validPoints.length; i++) {
      ctx.lineTo(validPoints[i].x, validPoints[i].y);
    }
    ctx.stroke();
  }

  // 绘制数据节点与标签
  for (const p of points) {
    const { x, y, bin } = p;

    if (bin.total > 0) {
      const dotColor =
        bin.accuracy >= 80 ? '#10B981' : bin.accuracy >= 60 ? '#F59E0B' : '#F43F5E';

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = dotColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 准确率标签
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${bin.accuracy}%`, x, y - 6);
    } else {
      ctx.beginPath();
      ctx.arc(x, padding.top + chartH, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#CBD5E1';
      ctx.fill();
    }

    // X 轴时间与题数标签
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(bin.rangeLabel, x, height - padding.bottom + 6);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '8px sans-serif';
    ctx.fillText(
      `${bin.total}${i18n.t('common.trialsUnit')}`,
      x,
      height - padding.bottom + 18,
    );
  }
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

export function calculateLevelStats(records: UnifiedTrialRecord[]): LevelBinStat[] {
  const levelMap = new Map<number, { total: number; hits: number }>();
  for (const r of records) {
    const lvl = Number(r.difficultyLevel) || 1;
    const curr = levelMap.get(lvl) || { total: 0, hits: 0 };
    curr.total += 1;
    if (r.isHit) curr.hits += 1;
    levelMap.set(lvl, curr);
  }

  const levels = Array.from(levelMap.keys()).sort((a, b) => a - b);
  return levels
    .map((l) => {
      const data = levelMap.get(l);
      if (!data) return null;
      return {
        level: l,
        total: data.total,
        hits: data.hits,
        accuracy: Math.round((data.hits / data.total) * 100),
      };
    })
    .filter((item): item is LevelBinStat => item !== null);
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

  const padding = { top: 35, right: 20, bottom: 45, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  const levelStats = calculateLevelStats(records);
  if (levelStats.length === 0) return;

  // Y 轴参考线 (0%, 25%, 50%, 75%, 100%)
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
    ctx.fillText(`${tick}%`, padding.left - 5, y);
  }
  ctx.setLineDash([]);

  const slotW = chartW / levelStats.length;
  const points = levelStats.map((stat, idx) => {
    const x = padding.left + (idx + 0.5) * slotW;
    const y = padding.top + (1 - stat.accuracy / 100) * chartH;
    return { x, y, stat };
  });

  // 渐变面积背景
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, 'rgba(79, 70, 229, 0.16)');
  gradient.addColorStop(1, 'rgba(79, 70, 229, 0.01)');

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
  ctx.lineTo(points[0].x, height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // 主折线
  ctx.beginPath();
  ctx.strokeStyle = '#4F46E5';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  // 绘制数据节点与标签
  for (const { x, y, stat } of points) {
    const dotColor =
      stat.accuracy >= 80 ? '#10B981' : stat.accuracy >= 60 ? '#F59E0B' : '#F43F5E';

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = dotColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 顶部胜率文字
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${stat.accuracy}%`, x, y - 6);

    // 底部 X 轴标签（Level）
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`L${stat.level}`, x, height - padding.bottom + 6);

    // 底部题量标签
    ctx.fillStyle = '#94A3B8';
    ctx.font = '8px sans-serif';
    ctx.fillText(
      `${stat.total}${i18n.t('common.trialsUnit')}`,
      x,
      height - padding.bottom + 18,
    );
  }
}

export function diagnoseDifficultyPlateau(records: UnifiedTrialRecord[]): ComponentChildren {
  const levelStats = calculateLevelStats(records);
  const totalTrials = records.length;

  if (totalTrials === 0) {
    return (
      <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-500">
        {i18n.t('analyticsModal.needMoreSamples')}
      </div>
    );
  }

  const mainLevel = [...levelStats].sort((a, b) => b.total - a.total)[0];
  const maxLevel = Math.max(...levelStats.map((s) => s.level));

  return (
    <div className="space-y-2">
      {mainLevel && (
        <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs text-indigo-900 leading-relaxed">
          <span className="font-bold">{i18n.t('analyticsModal.levelFocusSummaryTitle')}: </span>
          {i18n.t('analyticsModal.levelFocusSummaryDesc', {
            max: maxLevel,
            focus: mainLevel.level,
            count: mainLevel.total,
            acc: mainLevel.accuracy,
          })}
        </div>
      )}

      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 pt-1">
        {i18n.t('analyticsModal.levelDistributionTitle')}
      </div>

      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
        {levelStats.map((stat) => {
          const ratio = Math.round((stat.total / totalTrials) * 100);
          return (
            <div
              key={stat.level}
              className="p-2.5 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs font-black text-slate-800 min-w-[45px]">
                  Lvl {stat.level}
                </span>
                <span className="text-[11px] text-slate-400">
                  {stat.total} {i18n.t('common.trialsUnit')} ({ratio}%)
                </span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg ${
                    stat.total === 0
                      ? 'bg-slate-100 text-slate-400'
                      : stat.accuracy >= 80
                        ? 'bg-emerald-50 text-emerald-700'
                        : stat.accuracy >= 60
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {stat.total > 0 ? `${stat.accuracy}%` : '--'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
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
