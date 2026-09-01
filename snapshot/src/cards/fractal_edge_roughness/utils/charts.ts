import { setupHiDpiCanvas } from '../../../core/canvas/hidpi';
import type { UnifiedTrialRecord } from '../../../storage/db/schema';
import { CANVAS_THEME, getAccuracyColor, hexToRgba } from '../../../utils/theme';
import { getRoughnessSectorIdx } from './generator';

const SECTOR_NAMES = [
  '高碎裂带 (H 0.10-0.40)',
  '中度纹理带 (H 0.40-0.70)',
  '平滑流线带 (H 0.70-1.00)',
];

/**
 * 绘制粗糙度偏置散点与趋势图 (Roughness Bias Chart)
 * 横轴: 目标 Hurst 指数 [0.1, 1.0]
 * 纵轴: 感知偏差 ΔH (正为偏平滑/低估，负为过度敏感)
 */
export function renderRoughnessBiasChart(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
): void {
  const rect = canvas.getBoundingClientRect();
  const width = Math.round(rect.width) || 520;
  const height = 260;

  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  // 背景填充
  ctx.fillStyle = CANVAS_THEME.bg.primary;
  ctx.fillRect(0, 0, width, height);

  const padding = { top: 32, right: 30, bottom: 42, left: 54 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const minH = 0.1;
  const maxH = 1.0;
  const maxBiasRange = 0.25; // 纵轴范围 [-0.25, +0.25]

  const getX = (h: number) => padding.left + ((h - minH) / (maxH - minH)) * plotWidth;
  const getY = (bias: number) => {
    const clampedBias = Math.max(-maxBiasRange, Math.min(maxBiasRange, bias));
    return padding.top + plotHeight / 2 - (clampedBias / maxBiasRange) * (plotHeight / 2);
  };

  // 1. 绘制网格与刻度
  ctx.strokeStyle = CANVAS_THEME.axis.line;
  ctx.lineWidth = 1;

  // 纵向网格线 (Hurst: 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0)
  ctx.fillStyle = CANVAS_THEME.text.muted;
  ctx.font = '10px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (let h = 0.1; h <= 1.01; h += 0.15) {
    const x = getX(h);
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotHeight);
    ctx.stroke();
    ctx.fillText(`H ${h.toFixed(2)}`, x, padding.top + plotHeight + 6);
  }

  // 横向中轴基准线 (Bias = 0)
  const zeroY = getY(0);
  ctx.strokeStyle = CANVAS_THEME.axis.highlight;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(padding.left, zeroY);
  ctx.lineTo(padding.left + plotWidth, zeroY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 纵向刻度标签
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CANVAS_THEME.text.muted;
  ctx.fillText('+0.20', padding.left - 6, getY(0.2));
  ctx.fillText('0.00', padding.left - 6, zeroY);
  ctx.fillText('-0.20', padding.left - 6, getY(-0.2));

  // 极性说明文字
  ctx.font = '10px sans-serif';
  ctx.fillStyle = CANVAS_THEME.status.warning;
  ctx.textAlign = 'left';
  ctx.fillText('↑ 低估粗糙度 (感知偏平滑)', padding.left, 14);

  ctx.fillStyle = CANVAS_THEME.status.accent;
  ctx.textAlign = 'right';
  ctx.fillText('↓ 高估粗糙度 (对毛刺敏感)', width - padding.right, 14);

  if (records.length === 0) return;

  // 2. 绘制散点
  for (const r of records) {
    const targetH = Number(r.targetH ?? 0.5);
    const signedBias = Number(r.signedBias ?? 0);
    const isHit = Boolean(r.isHit);

    const cx = getX(targetH);
    const cy = getY(signedBias);

    ctx.beginPath();
    ctx.arc(cx, cy, isHit ? 3.5 : 4, 0, Math.PI * 2);
    ctx.fillStyle = isHit
      ? hexToRgba(CANVAS_THEME.status.hit, 0.65)
      : hexToRgba(CANVAS_THEME.status.miss, 0.7);
    ctx.fill();
    ctx.strokeStyle = isHit ? CANVAS_THEME.status.hit : CANVAS_THEME.status.miss;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 3. 计算并绘制分桶平滑平均趋势线
  const buckets = [
    { min: 0.1, max: 0.35, sum: 0, count: 0, mid: 0.225 },
    { min: 0.35, max: 0.6, sum: 0, count: 0, mid: 0.475 },
    { min: 0.6, max: 0.85, sum: 0, count: 0, mid: 0.725 },
    { min: 0.85, max: 1.01, sum: 0, count: 0, mid: 0.925 },
  ];

  for (const r of records) {
    const targetH = Number(r.targetH ?? 0.5);
    const signedBias = Number(r.signedBias ?? 0);
    for (const b of buckets) {
      if (targetH >= b.min && targetH < b.max) {
        b.sum += signedBias;
        b.count++;
        break;
      }
    }
  }

  const validPoints = buckets
    .filter((b) => b.count > 0)
    .map((b) => ({
      x: getX(b.mid),
      y: getY(b.sum / b.count),
    }));

  if (validPoints.length >= 2) {
    ctx.strokeStyle = CANVAS_THEME.status.accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(validPoints[0].x, validPoints[0].y);
    for (let i = 1; i < validPoints.length; i++) {
      ctx.lineTo(validPoints[i].x, validPoints[i].y);
    }
    ctx.stroke();

    for (const pt of validPoints) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = CANVAS_THEME.bg.primary;
      ctx.fill();
      ctx.strokeStyle = CANVAS_THEME.status.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

/**
 * 绘制频段敏感度柱状指示图 (Roughness Band Sensitivity Chart)
 */
export function renderRoughnessBandChart(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
): void {
  const rect = canvas.getBoundingClientRect();
  const width = Math.round(rect.width) || 520;
  const height = 240;

  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  ctx.fillStyle = CANVAS_THEME.bg.primary;
  ctx.fillRect(0, 0, width, height);

  const sectorBuckets = Array.from({ length: 3 }, () => ({
    total: 0,
    hits: 0,
    sumError: 0,
  }));

  for (const r of records) {
    const targetH = Number(r.targetH ?? 0.5);
    const sIdx = getRoughnessSectorIdx(targetH);
    sectorBuckets[sIdx].total += 1;
    if (r.isHit) sectorBuckets[sIdx].hits += 1;
    sectorBuckets[sIdx].sumError += Number(r.errorValue ?? 0);
  }

  const startY = 32;
  const rowHeight = 58;
  const barLeft = 180;
  const barRight = width - 80;
  const barWidth = Math.max(80, barRight - barLeft);
  const barThickness = 14;

  for (let i = 0; i < 3; i++) {
    const b = sectorBuckets[i];
    const acc = b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0;
    const avgErr = b.total > 0 ? Math.round((b.sumError / b.total) * 1000) / 1000 : 0;
    const y = startY + i * rowHeight;

    // 频段标签
    ctx.fillStyle = CANVAS_THEME.text.primary;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(SECTOR_NAMES[i], 16, y);

    // 题目样本与误差信息
    ctx.fillStyle = CANVAS_THEME.text.muted;
    ctx.font = '11px ui-monospace, monospace';
    ctx.fillText(
      `${b.total} 题${b.total > 0 ? ` · 均差 ΔH ${avgErr}` : ''}`,
      16,
      y + 18,
    );

    // 背景槽
    const barY = y + 4;
    ctx.fillStyle = CANVAS_THEME.bg.subtle;
    ctx.beginPath();
    ctx.roundRect(barLeft, barY, barWidth, barThickness, 7);
    ctx.fill();

    // 填充条
    if (b.total > 0 && acc > 0) {
      const fillW = Math.max(barThickness, (acc / 100) * barWidth);
      ctx.fillStyle = getAccuracyColor(acc);
      ctx.beginPath();
      ctx.roundRect(barLeft, barY, fillW, barThickness, 7);
      ctx.fill();
    }

    // 正确率百分比数值
    ctx.fillStyle = b.total > 0 ? getAccuracyColor(acc) : CANVAS_THEME.text.muted;
    ctx.font = 'bold 12px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.total > 0 ? `${acc}%` : '--', width - 20, barY + barThickness / 2);
  }
}