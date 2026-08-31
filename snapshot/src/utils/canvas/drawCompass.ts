import { initSquareHiDpiCanvas } from '../../core/canvas/hidpi';
import { CANVAS_THEME, getAccuracyFillColor, hexToRgba } from '../theme';

export interface SectorStat {
  sectorIdx: number;
  label: string;
  total: number;
  accuracy: number;
  avgError: number;
}

export function renderCompassCanvas(canvas: HTMLCanvasElement, sectorStats: SectorStat[]) {
  const init = initSquareHiDpiCanvas(canvas, 340);
  if (!init) return;
  const { ctx, size } = init;
  const width = size;
  const height = size;

  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 30;

  const sectorAngle = (Math.PI * 2) / 8;
  const startOffset = -Math.PI / 8;

  for (let i = 0; i < sectorStats.length; i++) {
    const stat = sectorStats[i];
    const startA = startOffset + i * sectorAngle;
    const endA = startA + sectorAngle;

    const radiusRatio = stat.total > 0 ? 0.35 + (stat.accuracy / 100) * 0.65 : 0.25;
    const r = outerRadius * radiusRatio;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startA, endA);
    ctx.closePath();

    if (stat.total === 0) {
      ctx.fillStyle = hexToRgba(CANVAS_THEME.axis.line, 0.7);
    } else {
      ctx.fillStyle = getAccuracyFillColor(stat.accuracy, stat.accuracy >= 80 ? 0.35 : stat.accuracy >= 60 ? 0.45 : 0.55);
    }
    ctx.fill();

    ctx.strokeStyle = CANVAS_THEME.axis.grid;
    ctx.lineWidth = 1;
    ctx.stroke();

    const midA = startA + sectorAngle / 2;
    const labelR = outerRadius + 18;
    const lx = cx + Math.cos(midA) * labelR;
    const ly = cy + Math.sin(midA) * labelR;

    ctx.fillStyle = stat.accuracy < 60 && stat.total > 0 ? CANVAS_THEME.status.missDark : CANVAS_THEME.text.secondary;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stat.label.split(' ')[0], lx, ly);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fillStyle = CANVAS_THEME.status.accent;
  ctx.fill();
  ctx.strokeStyle = CANVAS_THEME.bg.primary;
  ctx.lineWidth = 2;
  ctx.stroke();
}
