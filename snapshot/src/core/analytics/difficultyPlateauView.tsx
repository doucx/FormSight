import type { ComponentChildren } from 'preact';
import type { UnifiedTrialRecord } from '../../storage/db/schema';
import {
  CANVAS_THEME,
  getAccuracyBadgeClass,
  getAccuracyColor,
  hexToRgba,
} from '../../utils/theme';
import { initSquareHiDpiCanvas } from '../canvas/hidpi';
import { i18n } from '../i18n';

export interface LevelBinStat {
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
  _t?: unknown,
) {
  const init = initSquareHiDpiCanvas(canvas, 340);
  if (!init) return;
  const { ctx, size } = init;
  const width = size;
  const height = size;

  const padding = { top: 35, right: 20, bottom: 45, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const levelStats = calculateLevelStats(records);
  if (levelStats.length === 0) return;

  // Y 轴参考线
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

  const slotW = chartW / levelStats.length;
  const points = levelStats.map((stat, idx) => {
    const x = padding.left + (idx + 0.5) * slotW;
    const y = padding.top + (1 - stat.accuracy / 100) * chartH;
    return { x, y, stat };
  });

  // 渐变面积背景
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, hexToRgba(CANVAS_THEME.status.accent, 0.16));
  gradient.addColorStop(1, hexToRgba(CANVAS_THEME.status.accent, 0.01));

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
  ctx.strokeStyle = CANVAS_THEME.status.accent;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  // 绘制数据节点与标签
  for (const { x, y, stat } of points) {
    const dotColor = getAccuracyColor(stat.accuracy);

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = CANVAS_THEME.bg.primary;
    ctx.fill();
    ctx.strokeStyle = dotColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 顶部胜率文字
    ctx.fillStyle = CANVAS_THEME.text.primary;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${stat.accuracy}%`, x, y - 6);

    // 底部 X 轴标签（Level）
    ctx.fillStyle = CANVAS_THEME.text.secondary;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`L${stat.level}`, x, height - padding.bottom + 6);

    // 底部题量标签
    ctx.fillStyle = CANVAS_THEME.text.muted;
    ctx.font = '8px sans-serif';
    ctx.fillText(`${stat.total}${i18n.t('common.trialsUnit')}`, x, height - padding.bottom + 18);
  }
}

export function diagnoseDifficultyPlateau(
  records: UnifiedTrialRecord[],
  _t?: unknown,
): ComponentChildren {
  const levelStats = calculateLevelStats(records);
  const totalTrials = records.length;

  if (totalTrials === 0) {
    return (
      <div className="p-3 bg-muted/60 border border-border rounded-2xl text-xs text-muted-foreground">
        {i18n.t('analyticsModal.needMoreSamples')}
      </div>
    );
  }

  const mainLevel = [...levelStats].sort((a, b) => b.total - a.total)[0];
  const maxLevel = Math.max(...levelStats.map((s) => s.level));

  return (
    <div className="space-y-2">
      {mainLevel && (
        <div className="p-3 bg-accent border border-border/60 dark:border-border/60 rounded-2xl text-xs text-foreground leading-relaxed">
          <span className="font-bold">{i18n.t('analyticsModal.levelFocusSummaryTitle')}: </span>
          {i18n.t('analyticsModal.levelFocusSummaryDesc', {
            max: maxLevel,
            focus: mainLevel.level,
            count: mainLevel.total,
            acc: mainLevel.accuracy,
          })}
        </div>
      )}

      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 pt-1">
        {i18n.t('analyticsModal.levelDistributionTitle')}
      </div>

      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
        {levelStats.map((stat) => {
          const ratio = Math.round((stat.total / totalTrials) * 100);
          return (
            <div
              key={stat.level}
              className="p-2.5 bg-card border border-border rounded-xl flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs font-black text-foreground min-w-[45px]">
                  Lvl {stat.level}
                </span>
                <span className="text-xs text-muted-foreground">
                  {stat.total} {i18n.t('common.trialsUnit')} ({ratio}%)
                </span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg ${getAccuracyBadgeClass(
                    stat.accuracy,
                    stat.total,
                  )}`}
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
