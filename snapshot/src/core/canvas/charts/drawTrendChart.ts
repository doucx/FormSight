import type { SessionHistoryItem } from '../../../components/modals/SessionSummaryModal';
import { CANVAS_THEME, hexToRgba } from '../../../utils/theme';
import { i18n } from '../../i18n';
import { lttbDownsample } from '../../math/downsample';
import { setupHiDpiCanvas } from '../hidpi';

export function renderTrendChartCanvas(
  canvas: HTMLCanvasElement,
  dailyData: Record<string, { total: number; maxLevel: number }>,
) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.round(rect.width) || canvas.parentElement?.clientWidth || 480;
  const height = 160;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const padding = { top: 20, right: 20, bottom: 25, left: 30 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);

  const activeDates = Object.keys(dailyData).sort();
  const recentDates = activeDates.slice(-30);

  if (recentDates.length === 0) {
    ctx.fillStyle = CANVAS_THEME.text.muted;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(i18n.t('stats.noTrace'), width / 2, height / 2);
    return;
  }

  const rawPoints = recentDates.map((d, idx) => ({
    x: idx,
    y: dailyData[d].maxLevel,
    date: d,
  }));

  // 若采样点超过 60 个，自适应执行 LTTB 降采样
  const sampledPoints = rawPoints.length > 60 ? lttbDownsample(rawPoints, 40) : rawPoints;

  const levels = sampledPoints.map((p) => p.y);
  const maxLevel = Math.max(...levels, 35);
  const minLevel = 1;

  const getY = (val: number) =>
    padding.top + (1 - (val - minLevel) / (maxLevel - minLevel || 1)) * chartH;
  const getX = (idx: number) =>
    padding.left + (idx / Math.max(1, sampledPoints.length - 1)) * chartW;

  ctx.strokeStyle = CANVAS_THEME.axis.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const l of [minLevel, Math.round(maxLevel / 2), maxLevel]) {
    const y = getY(l);
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = CANVAS_THEME.status.accentHover;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.moveTo(getX(0), getY(levels[0]));
  for (let i = 1; i < levels.length; i++) {
    ctx.lineTo(getX(i), getY(levels[i]));
  }
  ctx.stroke();

  const pointRadius = sampledPoints.length > 20 ? 2.5 : 3.5;
  for (let i = 0; i < levels.length; i++) {
    ctx.beginPath();
    ctx.arc(getX(i), getY(levels[i]), pointRadius, 0, Math.PI * 2);
    ctx.fillStyle = CANVAS_THEME.bg.primary;
    ctx.fill();
    ctx.strokeStyle = CANVAS_THEME.status.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = CANVAS_THEME.text.muted;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const l of [minLevel, maxLevel]) {
    ctx.fillText(`L${l}`, padding.left - 5, getY(l));
  }
  ctx.textAlign = 'center';
  ctx.fillText(i18n.t('stats.trendAxisNotice'), width / 2, height - 5);
}

export function renderSessionTrendChartCanvas(
  canvas: HTMLCanvasElement,
  history: SessionHistoryItem[],
) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.round(rect.width) || canvas.parentElement?.clientWidth || 440;
  const height = 160;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx || history.length === 0) return;

  const padding = { top: 25, right: 25, bottom: 30, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = CANVAS_THEME.bg.secondary;
  ctx.fillRect(0, 0, width, height);

  // 构造序列
  const rawPoints = [
    { x: 0, y: history[0].levelBefore, isHit: true },
    ...history.map((h, i) => ({
      x: i + 1,
      y: h.levelAfter,
      isHit: h.isHit,
    })),
  ];

  // 当会话题量 > 120 题时执行 LTTB 降采样至 80 点
  const sampledPoints = rawPoints.length > 120 ? lttbDownsample(rawPoints, 80) : rawPoints;

  const totalPoints = sampledPoints.length;
  const levelSequence = sampledPoints.map((p) => p.y);
  const maxLevel = Math.max(...levelSequence, 35);
  const minLevel = Math.min(...levelSequence, 1);

  const getY = (val: number) => {
    const ratio = (val - minLevel) / (maxLevel - minLevel || 1);
    return padding.top + (1 - ratio) * chartH;
  };

  const getX = (index: number) => {
    if (totalPoints === 1) return padding.left + chartW / 2;
    return padding.left + (index / (totalPoints - 1)) * chartW;
  };

  // 背景刻度线
  ctx.lineWidth = 1;
  ctx.strokeStyle = CANVAS_THEME.axis.line;
  ctx.fillStyle = CANVAS_THEME.text.secondary;
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const yTicks = [maxLevel, Math.round((maxLevel + minLevel) / 2), minLevel];
  const uniqueYTicks = Array.from(new Set(yTicks));

  for (const tickVal of uniqueYTicks) {
    const y = getY(tickVal);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillText(`Lvl ${tickVal}`, padding.left - 8, y);
  }

  // 面积渐变背景
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, hexToRgba(CANVAS_THEME.status.accent, 0.18));
  gradient.addColorStop(1, hexToRgba(CANVAS_THEME.status.accent, 0.01));

  ctx.beginPath();
  ctx.moveTo(getX(0), getY(levelSequence[0]));
  for (let i = 1; i < totalPoints; i++) {
    ctx.lineTo(getX(i), getY(levelSequence[i]));
  }
  ctx.lineTo(getX(totalPoints - 1), height - padding.bottom);
  ctx.lineTo(getX(0), height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // 主折线
  ctx.beginPath();
  ctx.strokeStyle = CANVAS_THEME.status.accent;
  ctx.lineWidth = totalPoints > 60 ? 1.8 : 2.5;
  ctx.lineJoin = 'round';
  ctx.moveTo(getX(0), getY(levelSequence[0]));
  for (let i = 1; i < totalPoints; i++) {
    ctx.lineTo(getX(i), getY(levelSequence[i]));
  }
  ctx.stroke();

  // 绘制各个试炼对应的判定结果圆点
  const isCrowded = totalPoints > 35;
  const isSuperCrowded = totalPoints > 80;

  if (!isSuperCrowded) {
    const dotRadius = isCrowded ? 2.5 : 3.5;
    for (let i = 0; i < sampledPoints.length; i++) {
      const p = sampledPoints[i];
      const x = getX(i);
      const y = getY(p.y);

      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = p.isHit ? CANVAS_THEME.status.hit : CANVAS_THEME.status.miss;
      ctx.fill();
      ctx.strokeStyle = CANVAS_THEME.bg.primary;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  ctx.strokeStyle = CANVAS_THEME.axis.grid;
  ctx.beginPath();
  ctx.moveTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();

  ctx.fillStyle = CANVAS_THEME.text.muted;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(i18n.t('stats.sessionSeqNotice'), width / 2, height - 8);
}
