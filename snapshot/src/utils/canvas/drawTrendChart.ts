import type { SessionHistoryItem } from '../../components/SessionSummaryModal';
import { setupHiDpiCanvas } from './hidpi';

export function renderTrendChartCanvas(
  canvas: HTMLCanvasElement,
  dailyData: Record<string, { total: number; maxLevel: number }>,
) {
  const width = 340;
  const height = 150;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const padding = { top: 20, right: 20, bottom: 25, left: 30 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);

  const activeDates = Object.keys(dailyData).sort();
  const recentDates = activeDates.slice(-30);

  if (recentDates.length === 0) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('当前筛选条件下暂无做答轨迹', width / 2, height / 2);
    return;
  }

  const levels = recentDates.map((d) => dailyData[d].maxLevel);
  const maxLevel = Math.max(...levels, 35);
  const minLevel = 1;

  const getY = (val: number) =>
    padding.top + (1 - (val - minLevel) / (maxLevel - minLevel || 1)) * chartH;
  const getX = (idx: number) => padding.left + (idx / Math.max(1, recentDates.length - 1)) * chartW;

  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const l of [minLevel, Math.round(maxLevel / 2), maxLevel]) {
    const y = getY(l);
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = '#6366F1';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.moveTo(getX(0), getY(levels[0]));
  for (let i = 1; i < levels.length; i++) {
    ctx.lineTo(getX(i), getY(levels[i]));
  }
  ctx.stroke();

  // 动态控制圆点尺寸
  const pointRadius = recentDates.length > 20 ? 2.5 : 3.5;
  for (let i = 0; i < levels.length; i++) {
    ctx.beginPath();
    ctx.arc(getX(i), getY(levels[i]), pointRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const l of [minLevel, maxLevel]) {
    ctx.fillText(`L${l}`, padding.left - 5, getY(l));
  }
  ctx.textAlign = 'center';
  ctx.fillText('最近活跃日演进趋势 ➔', width / 2, height - 5);
}

export function renderSessionTrendChartCanvas(
  canvas: HTMLCanvasElement,
  history: SessionHistoryItem[],
) {
  const width = 440;
  const height = 160;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx || history.length === 0) return;

  const padding = { top: 30, right: 30, bottom: 35, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 0, width, height);

  const totalPoints = history.length;
  const levels = history.map((h) => h.level);
  const maxLevel = Math.max(...levels, 35);
  const minLevel = Math.min(...levels, 1);

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
  ctx.strokeStyle = '#334155';
  ctx.fillStyle = '#64748B';
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
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
  gradient.addColorStop(1, 'rgba(99, 102, 241, 0.02)');

  ctx.beginPath();
  ctx.moveTo(getX(0), getY(history[0].level));
  for (let i = 1; i < totalPoints; i++) {
    ctx.lineTo(getX(i), getY(history[i].level));
  }
  ctx.lineTo(getX(totalPoints - 1), height - padding.bottom);
  ctx.lineTo(getX(0), height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // 主折线
  ctx.beginPath();
  ctx.strokeStyle = '#818CF8';
  ctx.lineWidth = totalPoints > 100 ? 1.8 : 2.5;
  ctx.lineJoin = 'round';
  ctx.moveTo(getX(0), getY(history[0].level));
  for (let i = 1; i < totalPoints; i++) {
    ctx.lineTo(getX(i), getY(history[i].level));
  }
  ctx.stroke();

  // 自适应 LOD 与文字防碰撞策略
  const isCrowded = totalPoints > 35;
  const isSuperCrowded = totalPoints > 80;

  // 寻找极值点与关键转折点
  let highestIndex = 0;
  let highestLevel = levels[0];
  for (let i = 1; i < totalPoints; i++) {
    if (levels[i] > highestLevel) {
      highestLevel = levels[i];
      highestIndex = i;
    }
  }

  // 1. 绘制数据圆点
  if (!isSuperCrowded) {
    const dotRadius = isCrowded ? 2 : 3.5;
    for (let i = 0; i < totalPoints; i++) {
      const h = history[i];
      const x = getX(i);
      const y = getY(h.level);

      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = h.isHit ? '#22C55E' : '#EF4444';
      ctx.fill();
      if (!isCrowded) {
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  } else {
    // 超大样本量 (80~200+)：仅在起止点与最高点绘制光标圆环
    const keyIndices = Array.from(new Set([0, highestIndex, totalPoints - 1]));
    for (const idx of keyIndices) {
      const h = history[idx];
      const x = getX(idx);
      const y = getY(h.level);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = idx === highestIndex ? '#F59E0B' : h.isHit ? '#22C55E' : '#EF4444';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // 2. 文字 Label 自适应防碰撞绘制
  ctx.fillStyle = '#CBD5E1';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';

  if (!isCrowded) {
    // 点数较少：显示变化点
    for (let i = 0; i < totalPoints; i++) {
      const h = history[i];
      if (
        totalPoints <= 10 ||
        i === 0 ||
        i === totalPoints - 1 ||
        h.level !== history[i - 1]?.level
      ) {
        ctx.fillText(`L${h.level}`, getX(i), getY(h.level) - 8);
      }
    }
  } else if (!isSuperCrowded) {
    // 35 ~ 80 题：限制相邻 Label 的 X 轴最小间距 >= 30px
    let lastLabeledX = -999;
    for (let i = 0; i < totalPoints; i++) {
      const h = history[i];
      const x = getX(i);
      const isKey = i === 0 || i === totalPoints - 1 || i === highestIndex;
      const isLevelChanged = i > 0 && h.level !== history[i - 1]?.level;

      if ((isKey || isLevelChanged) && x - lastLabeledX >= 30) {
        ctx.fillText(`L${h.level}`, x, getY(h.level) - 8);
        lastLabeledX = x;
      }
    }
  } else {
    // 80 ~ 200+ 题：仅精确标注起点、终点和最高难度点，杜绝任何文字拥挤
    const labelSet = [
      { idx: 0, text: `起点 L${levels[0]}` },
      { idx: highestIndex, text: `峰值 L${highestLevel}` },
      { idx: totalPoints - 1, text: `终点 L${levels[totalPoints - 1]}` },
    ];

    // 按索引排序去重并绘制
    const uniqueLabels = labelSet
      .filter((item, pos, self) => self.findIndex((t) => t.idx === item.idx) === pos)
      .sort((a, b) => a.idx - b.idx);

    for (const item of uniqueLabels) {
      const x = getX(item.idx);
      const y = getY(levels[item.idx]);
      ctx.fillStyle = item.idx === highestIndex ? '#FDE68A' : '#CBD5E1';
      ctx.fillText(item.text, x, y - 9);
    }
  }

  ctx.strokeStyle = '#475569';
  ctx.beginPath();
  ctx.moveTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('题目做答序列 ➔', width / 2, height - 10);
}