import type { ComponentChildren } from 'preact';
import type { UnifiedTrialRecord } from '../../utils/db/schema';
import {
  CANVAS_THEME,
  getAccuracyBadgeClass,
  getAccuracyColor,
  hexToRgba,
} from '../../utils/theme';
import { initSquareHiDpiCanvas } from '../canvas/hidpi';
import { i18n } from '../i18n';

export interface SatBinStat {
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
  const init = initSquareHiDpiCanvas(canvas, 340);
  if (!init) return;
  const { ctx, size } = init;
  const width = size;
  const height = size;

  const bins = calculateSpeedBins(records);
  const padding = { top: 35, right: 20, bottom: 45, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // 参考线
  const yTicks = [100, 75, 50, 25, 0];
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = '10px monospace';

  for (const tick of yTicks) {
    const y = padding.top + (1 - tick / 100) * chartH;
    ctx.strokeStyle = tick === 0 ? CANVAS_THEME.axis.grid : CANVAS_THEME.axis.line;
    ctx.setLineDash(tick === 0 ? [] : [2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = CANVAS_THEME.text.muted;
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
    gradient.addColorStop(0, hexToRgba(CANVAS_THEME.status.accent, 0.16));
    gradient.addColorStop(1, hexToRgba(CANVAS_THEME.status.accent, 0.01));

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
    ctx.strokeStyle = CANVAS_THEME.status.accent;
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
      const dotColor = getAccuracyColor(bin.accuracy);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = CANVAS_THEME.bg.primary;
      ctx.fill();
      ctx.strokeStyle = dotColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 准确率标签
      ctx.fillStyle = CANVAS_THEME.text.primary;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${bin.accuracy}%`, x, y - 6);
    } else {
      ctx.beginPath();
      ctx.arc(x, padding.top + chartH, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = CANVAS_THEME.axis.grid;
      ctx.fill();
    }

    // X 轴时间与题数标签
    ctx.fillStyle = CANVAS_THEME.text.secondary;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(bin.rangeLabel, x, height - padding.bottom + 6);

    ctx.fillStyle = CANVAS_THEME.text.muted;
    ctx.font = '8px sans-serif';
    ctx.fillText(`${bin.total}${i18n.t('common.trialsUnit')}`, x, height - padding.bottom + 18);
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
                  className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg ${getAccuracyBadgeClass(
                    bin.accuracy,
                    bin.total,
                  )}`}
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
