import { Award, Clock, Flame, Zap } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import type { CardAnalyticsView } from '../contracts';
import { setupHiDpiCanvas } from '../canvas/hidpi';
import { i18n } from '../i18n';
import type { UnifiedTrialRecord } from '../../utils/db/schema';

// === 1. 速度-准确率权衡 (Speed-Accuracy Tradeoff, SAT) ===

interface SpeedBinStat {
  rangeLabel: string;
  minMs: number;
  maxMs: number;
  total: number;
  hits: number;
  accuracy: number;
}

function calculateSpeedBins(records: UnifiedTrialRecord[]): SpeedBinStat[] {
  const binsConfig: { rangeLabel: string; minMs: number; maxMs: number }[] = [
    { rangeLabel: '< 1.0s', minMs: 0, maxMs: 1000 },
    { rangeLabel: '1.0~1.8s', minMs: 1000, maxMs: 1800 },
    { rangeLabel: '1.8~2.8s', minMs: 1800, maxMs: 2800 },
    { rangeLabel: '2.8~4.5s', minMs: 2800, maxMs: 4500 },
    { rangeLabel: '> 4.5s', minMs: 4500, maxMs: Number.MAX_SAFE_INTEGER },
  ];

  return binsConfig.map((bin) => {
    const matched = records.filter(
      (r) => r.responseTimeMs >= bin.minMs && r.responseTimeMs < bin.maxMs,
    );
    const total = matched.length;
    const hits = matched.filter((r) => r.isHit).length;
    const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
    return { ...bin, total, hits, accuracy };
  });
}

function renderSpeedAccuracyVisualizer(canvas: HTMLCanvasElement, records: UnifiedTrialRecord[]) {
  const width = 320;
  const height = 320;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const bins = calculateSpeedBins(records);
  const padding = { top: 35, right: 20, bottom: 45, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  // 绘制 0%, 50%, 100% 水平参考线
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#E2E8F0';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (const percent of [100, 50, 0]) {
    const y = padding.top + chartH * (1 - percent / 100);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(`${percent}%`, padding.left - 5, y);
  }

  const barWidth = chartW / bins.length;

  bins.forEach((bin, idx) => {
    const x = padding.left + idx * barWidth;
    const barH = (bin.accuracy / 100) * chartH;
    const y = padding.top + chartH - barH;

    if (bin.total > 0) {
      // 柱体填充
      ctx.fillStyle =
        bin.accuracy >= 80
          ? 'rgba(16, 185, 129, 0.8)'
          : bin.accuracy >= 60
            ? 'rgba(245, 158, 11, 0.8)'
            : 'rgba(244, 63, 94, 0.8)';

      ctx.beginPath();
      ctx.roundRect(x + 5, y, barWidth - 10, barH, [4, 4, 0, 0]);
      ctx.fill();

      // 顶部数值
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${bin.accuracy}%`, x + barWidth / 2, Math.max(padding.top - 8, y - 6));
    } else {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.5)';
      ctx.beginPath();
      ctx.roundRect(x + 5, padding.top + chartH - 4, barWidth - 10, 4, 2);
      ctx.fill();
    }

    // X 轴时间标签与做答数
    ctx.fillStyle = '#64748B';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(bin.rangeLabel, x + barWidth / 2, height - padding.bottom + 14);

    ctx.fillStyle = '#94A3B8';
    ctx.fillText(
      bin.total > 0 ? `${bin.total}${i18n.t('common.trialsUnit')}` : '--',
      x + barWidth / 2,
      height - padding.bottom + 26,
    );
  });
}

function diagnoseSpeedAccuracy(records: UnifiedTrialRecord[]): ComponentChildren {
  const bins = calculateSpeedBins(records);
  const populatedBins = bins.filter((b) => b.total >= 3);

  let bestBin = populatedBins.length > 0 ? populatedBins[0] : null;
  for (const b of populatedBins) {
    if (!bestBin || b.accuracy > bestBin.accuracy) {
      bestBin = b;
    }
  }

  const fastBin = bins[0]; // < 1.0s
  const slowBin = bins[bins.length - 1]; // > 4.5s
  const isRushing = fastBin.total >= 5 && fastBin.accuracy < 60;
  const isOverthinking = slowBin.total >= 5 && slowBin.accuracy < 60;

  return (
    <div className="space-y-2.5">
      <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5 text-indigo-600" />
        <span>{i18n.t('stats.satPacingInsightTitle')}</span>
      </div>

      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-2 text-slate-600 leading-relaxed">
        {bestBin ? (
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
            <div>
              <span className="font-bold text-slate-800">{i18n.t('stats.satSweetSpot')}: </span>
              {i18n.t('stats.satSweetSpotDesc', {
                range: bestBin.rangeLabel,
                accuracy: bestBin.accuracy,
              })}
            </div>
          </div>
        ) : (
          <div className="text-slate-400">{i18n.t('stats.satNeedMoreSamples')}</div>
        )}

        {isRushing && (
          <div className="flex items-start gap-2 text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-100">
            <Flame className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{i18n.t('stats.satRushingWarning')}</span>
          </div>
        )}

        {isOverthinking && (
          <div className="flex items-start gap-2 text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-100">
            <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{i18n.t('stats.satOverthinkingWarning')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// === 2. 难度阶梯与能力分布 (Difficulty Plateau & Fragility) ===

interface LevelBandStat {
  bandLabel: string;
  minLevel: number;
  maxLevel: number;
  total: number;
  hits: number;
  accuracy: number;
}

function calculateLevelBands(records: UnifiedTrialRecord[]): LevelBandStat[] {
  const bandsConfig: { bandLabel: string; minLevel: number; maxLevel: number }[] = [
    { bandLabel: 'L1~7', minLevel: 1, maxLevel: 7 },
    { bandLabel: 'L8~14', minLevel: 8, maxLevel: 14 },
    { bandLabel: 'L15~21', minLevel: 15, maxLevel: 21 },
    { bandLabel: 'L22~28', minLevel: 22, maxLevel: 28 },
    { bandLabel: 'L29~35', minLevel: 29, maxLevel: 35 },
  ];

  return bandsConfig.map((b) => {
    const matched = records.filter(
      (r) => r.difficultyLevel >= b.minLevel && r.difficultyLevel <= b.maxLevel,
    );
    const total = matched.length;
    const hits = matched.filter((r) => r.isHit).length;
    const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
    return { ...b, total, hits, accuracy };
  });
}

function renderDifficultyPlateauVisualizer(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
) {
  const width = 320;
  const height = 320;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const bands = calculateLevelBands(records);
  const padding = { top: 35, right: 20, bottom: 45, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  ctx.lineWidth = 1;
  ctx.strokeStyle = '#E2E8F0';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (const percent of [100, 50, 0]) {
    const y = padding.top + chartH * (1 - percent / 100);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(`${percent}%`, padding.left - 5, y);
  }

  const barWidth = chartW / bands.length;

  bands.forEach((b, idx) => {
    const x = padding.left + idx * barWidth;
    const barH = (b.accuracy / 100) * chartH;
    const y = padding.top + chartH - barH;

    if (b.total > 0) {
      ctx.fillStyle =
        b.accuracy >= 80
          ? 'rgba(79, 70, 229, 0.85)'
          : b.accuracy >= 60
            ? 'rgba(99, 102, 241, 0.7)'
            : 'rgba(244, 63, 94, 0.8)';

      ctx.beginPath();
      ctx.roundRect(x + 5, y, barWidth - 10, barH, [4, 4, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${b.accuracy}%`, x + barWidth / 2, Math.max(padding.top - 8, y - 6));
    } else {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.5)';
      ctx.beginPath();
      ctx.roundRect(x + 5, padding.top + chartH - 4, barWidth - 10, 4, 2);
      ctx.fill();
    }

    ctx.fillStyle = '#64748B';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(b.bandLabel, x + barWidth / 2, height - padding.bottom + 14);

    ctx.fillStyle = '#94A3B8';
    ctx.fillText(
      b.total > 0 ? `${b.total}${i18n.t('common.trialsUnit')}` : '--',
      x + barWidth / 2,
      height - padding.bottom + 26,
    );
  });
}

function diagnoseDifficultyPlateau(records: UnifiedTrialRecord[]): ComponentChildren {
  const bands = calculateLevelBands(records);
  const comfortBand = bands.find((b) => b.total >= 5 && b.accuracy >= 80);
  const challengeBand = bands.find((b) => b.total >= 5 && b.accuracy >= 50 && b.accuracy < 80);
  const plateauBand = bands.find((b) => b.total >= 5 && b.accuracy < 50);

  return (
    <div className="space-y-2.5">
      <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
        <Award className="w-3.5 h-3.5 text-indigo-600" />
        <span>{i18n.t('stats.plateauInsightTitle')}</span>
      </div>

      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-2 text-slate-600 leading-relaxed">
        {comfortBand && (
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
            <div>
              <span className="font-bold text-slate-800">{i18n.t('stats.comfortZone')}: </span>
              {comfortBand.bandLabel} ({comfortBand.accuracy}%)
            </div>
          </div>
        )}

        {challengeBand && (
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
            <div>
              <span className="font-bold text-slate-800">{i18n.t('stats.growthZone')}: </span>
              {challengeBand.bandLabel} ({challengeBand.accuracy}%)
            </div>
          </div>
        )}

        {plateauBand && (
          <div className="flex items-start gap-2 text-rose-600">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
            <div>
              <span className="font-bold">{i18n.t('stats.bottleneckZone')}: </span>
              {plateauBand.bandLabel} ({plateauBand.accuracy}%)
            </div>
          </div>
        )}

        {!comfortBand && !challengeBand && !plateauBand && (
          <div className="text-slate-400">{i18n.t('stats.satNeedMoreSamples')}</div>
        )}
      </div>
    </div>
  );
}

// === 3. 导出所有通用视图 ===

export const UNIVERSAL_ANALYTICS_VIEWS: CardAnalyticsView[] = [
  {
    id: 'universal_speed_accuracy',
    tabLabel: 'stats.satTabLabel',
    title: 'stats.satViewTitle',
    subTitle: 'stats.satViewSubtitle',
    icon: Clock,
    renderVisualizer: renderSpeedAccuracyVisualizer,
    renderDiagnostics: diagnoseSpeedAccuracy,
  },
  {
    id: 'universal_difficulty_plateau',
    tabLabel: 'stats.plateauTabLabel',
    title: 'stats.plateauViewTitle',
    subTitle: 'stats.plateauViewSubtitle',
    icon: Award,
    renderVisualizer: renderDifficultyPlateauVisualizer,
    renderDiagnostics: diagnoseDifficultyPlateau,
  },
];