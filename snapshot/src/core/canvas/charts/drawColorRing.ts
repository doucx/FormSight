import { initSquareHiDpiCanvas } from '../hidpi';
import { hsvToHex } from '../../color/colorUtils';
import { CANVAS_THEME, getAccuracyFillColor, hexToRgba } from '../../../utils/theme';
import type { SectorStat } from './drawCompass';

export function renderHueRingCanvas(canvas: HTMLCanvasElement, sectorStats: SectorStat[]) {
  const init = initSquareHiDpiCanvas(canvas, 340);
  if (!init) return;
  const { ctx, size } = init;
  const width = size;
  const height = size;

  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 40;
  const innerRadius = outerRadius - 20;

  const sectorAngle = (Math.PI * 2) / 12;
  const startOffset = -Math.PI / 2;

  for (let i = 0; i < 12; i++) {
    const stat = sectorStats[i];
    const startA = startOffset + i * sectorAngle;
    const endA = startA + sectorAngle;

    const hueAngle = i * 30 + 15;
    const hexColor = hsvToHex(hueAngle, 100, 100);

    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius + 12, startA, endA);
    ctx.arc(cx, cy, outerRadius + 2, endA, startA, true);
    ctx.fillStyle = hexColor;
    ctx.fill();

    const accRatio = stat.total > 0 ? Math.max(0.1, stat.accuracy / 100) : 0;
    const r = innerRadius + (outerRadius - innerRadius) * accRatio;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startA, endA);
    ctx.closePath();

    if (stat.total === 0) {
      ctx.fillStyle = hexToRgba(CANVAS_THEME.axis.line, 0.7);
    } else {
      ctx.fillStyle = getAccuracyFillColor(
        stat.accuracy,
        stat.accuracy >= 80 ? 0.35 : stat.accuracy >= 60 ? 0.45 : 0.55,
      );
    }
    ctx.fill();
    ctx.strokeStyle = CANVAS_THEME.axis.grid;
    ctx.lineWidth = 1;
    ctx.stroke();

    const midA = startA + sectorAngle / 2;
    const labelR = outerRadius + 25;
    const lx = cx + Math.cos(midA) * labelR;
    const ly = cy + Math.sin(midA) * labelR;

    ctx.fillStyle =
      stat.accuracy < 60 && stat.total >= 3
        ? CANVAS_THEME.status.missDark
        : CANVAS_THEME.text.secondary;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const shortName = stat.label.split(' ')[0];
    ctx.fillText(shortName, lx, ly);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = CANVAS_THEME.bg.primary;
  ctx.fill();
  ctx.strokeStyle = CANVAS_THEME.axis.line;
  ctx.stroke();

  ctx.fillStyle = CANVAS_THEME.text.primary;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Hue', cx, cy - 5);
  ctx.fillStyle = CANVAS_THEME.text.secondary;
  ctx.font = '9px sans-serif';
  ctx.fillText('Accuracy', cx, cy + 8);
}
