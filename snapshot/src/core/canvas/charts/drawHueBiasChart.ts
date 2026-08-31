import type { UnifiedTrialRecord } from '../../../storage/db/schema';
import { CANVAS_THEME, PALETTE, hexToRgba } from '../../../utils/theme';
import { i18n } from '../../i18n';
import { initSquareHiDpiCanvas } from '../hidpi';

/**
 * 计算带符号的角度偏差 (-180° ~ +180°)
 * 正值表示用户偏大/顺时针，负值表示用户偏小/逆时针
 */
export function calcSignedHueBias(targetHue: number, userHue: number): number {
  return ((userHue - targetHue + 540) % 360) - 180;
}

/**
 * 绘制色相偏差度散点与趋势分析图 (横轴: 色相 0°~360°, 纵轴: 偏差度 °)
 */
export function renderHueBiasChartCanvas(canvas: HTMLCanvasElement, records: UnifiedTrialRecord[]) {
  const init = initSquareHiDpiCanvas(canvas, 340);
  if (!init) return;
  const { ctx, size } = init;
  const width = size;
  const height = size;

  // 画布边距
  const padding = { top: 25, right: 20, bottom: 45, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // 计算最大纵轴范围 (默认至少 ±30°，若有更大误差则动态扩展)
  let maxBiasRange = 30;
  const pointData: { targetH: number; bias: number; isHit: boolean }[] = [];

  for (const r of records) {
    const tHsv = (r.targetHSV as [number, number, number]) || [0, 0, 0];
    const uHsv = (r.userHSV as [number, number, number]) || tHsv;
    const targetH = tHsv[0];
    const userH = uHsv[0];
    const bias = calcSignedHueBias(targetH, userH);

    pointData.push({ targetH, bias, isHit: Boolean(r.isHit) });
    if (Math.abs(bias) > maxBiasRange) {
      maxBiasRange = Math.min(90, Math.ceil(Math.abs(bias) / 10) * 10);
    }
  }

  const getX = (hue: number) => padding.left + (hue / 360) * chartW;
  const getY = (bias: number) => padding.top + chartH / 2 - (bias / maxBiasRange) * (chartH / 2);

  // 1. 绘制网格线与 Y 轴参考刻度
  const yTicks = [
    maxBiasRange,
    Math.round(maxBiasRange / 2),
    0,
    -Math.round(maxBiasRange / 2),
    -maxBiasRange,
  ];
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = '10px monospace';

  for (const tick of yTicks) {
    const y = getY(tick);
    ctx.strokeStyle = tick === 0 ? CANVAS_THEME.axis.grid : CANVAS_THEME.axis.line;
    ctx.setLineDash(tick === 0 ? [] : [2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = tick === 0 ? CANVAS_THEME.text.dark : CANVAS_THEME.text.secondary;
    const label = tick > 0 ? `+${tick}°` : `${tick}°`;
    ctx.fillText(label, padding.left - 5, y);
  }
  ctx.setLineDash([]);

  // 2. 绘制 X 轴色相刻度竖线 (0°, 90°, 180°, 270°, 360°)
  const xTicks = [0, 90, 180, 270, 360];
  ctx.strokeStyle = CANVAS_THEME.axis.line;
  ctx.setLineDash([2, 2]);
  for (const h of xTicks) {
    const x = getX(h);
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, height - padding.bottom);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // 3. 绘制底部色相环全光谱渐变指示条
  const barY = height - padding.bottom + 8;
  const barH = 8;
  const barGradient = ctx.createLinearGradient(padding.left, 0, width - padding.right, 0);
  barGradient.addColorStop(0 / 6, PALETTE.spectrum.red);
  barGradient.addColorStop(1 / 6, PALETTE.spectrum.yellow);
  barGradient.addColorStop(2 / 6, PALETTE.spectrum.green);
  barGradient.addColorStop(3 / 6, PALETTE.spectrum.cyan);
  barGradient.addColorStop(4 / 6, PALETTE.spectrum.blue);
  barGradient.addColorStop(5 / 6, PALETTE.spectrum.magenta);
  barGradient.addColorStop(6 / 6, PALETTE.spectrum.red);

  ctx.fillStyle = barGradient;
  ctx.beginPath();
  ctx.roundRect(padding.left, barY, chartW, barH, 4);
  ctx.fill();

  // 底部 X 轴标签
  ctx.fillStyle = CANVAS_THEME.text.muted;
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('0°', getX(0), barY + barH + 4);
  ctx.fillText('90°', getX(90), barY + barH + 4);
  ctx.fillText('180°', getX(180), barY + barH + 4);
  ctx.fillText('270°', getX(270), barY + barH + 4);
  ctx.fillText('360°', getX(360), barY + barH + 4);

  // 4. 自适应透明度与半径绘制做答记录散点 (样本量自适应下调 Alpha)
  const totalCount = pointData.length;
  const dotAlpha = totalCount > 500 ? 0.2 : totalCount > 150 ? 0.45 : 0.75;
  const dotRadius = totalCount > 500 ? 2.5 : 3.5;

  // 限制最大绘制散点数为最近 800 个，兼顾极端数据下的渲染流畅度
  const renderPoints = totalCount > 800 ? pointData.slice(-800) : pointData;

  for (const pt of renderPoints) {
    const px = getX(pt.targetH);
    const py = getY(pt.bias);

    ctx.beginPath();
    ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = pt.isHit
      ? hexToRgba(CANVAS_THEME.status.hit, dotAlpha)
      : hexToRgba(CANVAS_THEME.status.miss, Math.min(1, dotAlpha * 1.1));
    ctx.fill();
    if (totalCount <= 150) {
      ctx.strokeStyle = pt.isHit ? CANVAS_THEME.status.hitDark : CANVAS_THEME.status.missDark;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // 5. 计算 12 个色相扇区的平均偏差并绘制趋势平滑线 (使用全部样本计算统计均值)
  const sectorSums = Array.from({ length: 12 }, () => ({ sumBias: 0, count: 0 }));
  for (const pt of pointData) {
    const sIdx = Math.max(0, Math.min(11, Math.floor(pt.targetH / 30)));
    sectorSums[sIdx].sumBias += pt.bias;
    sectorSums[sIdx].count += 1;
  }

  const trendPoints: { x: number; y: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const centerHue = i * 30 + 15;
    if (sectorSums[i].count > 0) {
      const avgBias = sectorSums[i].sumBias / sectorSums[i].count;
      trendPoints.push({ x: getX(centerHue), y: getY(avgBias) });
    }
  }

  if (trendPoints.length >= 2) {
    ctx.strokeStyle = CANVAS_THEME.status.warning;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(trendPoints[0].x, trendPoints[0].y);
    for (let i = 1; i < trendPoints.length; i++) {
      ctx.lineTo(trendPoints[i].x, trendPoints[i].y);
    }
    ctx.stroke();

    for (const tp of trendPoints) {
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = CANVAS_THEME.status.warning;
      ctx.fill();
      ctx.strokeStyle = CANVAS_THEME.bg.primary;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // 顶部标题提示
  ctx.fillStyle = CANVAS_THEME.text.muted;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(i18n.t('stats.biasPositive'), padding.left, padding.top - 10);
  ctx.textAlign = 'right';
  ctx.fillText(i18n.t('stats.biasNegative'), width - padding.right, height - padding.bottom - 4);
}
