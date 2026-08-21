import { setupHiDpiCanvas } from '../../core/canvas/hidpi';

export interface SectorStat {
  sectorIdx: number;
  label: string;
  total: number;
  accuracy: number;
  avgError: number;
}

export function renderCompassCanvas(canvas: HTMLCanvasElement, sectorStats: SectorStat[]) {
  const width = 320;
  const height = 320;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 30;

  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 0, width, height);

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
      ctx.fillStyle = 'rgba(51, 65, 85, 0.4)';
    } else if (stat.accuracy >= 80) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.55)';
    } else if (stat.accuracy >= 60) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.65)';
    } else {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.75)';
    }
    ctx.fill();

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();

    const midA = startA + sectorAngle / 2;
    const labelR = outerRadius + 18;
    const lx = cx + Math.cos(midA) * labelR;
    const ly = cy + Math.sin(midA) * labelR;

    ctx.fillStyle = stat.accuracy < 60 && stat.total > 0 ? '#EF4444' : '#94A3B8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stat.label.split(' ')[0], lx, ly);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#0F172A';
  ctx.fill();
  ctx.strokeStyle = '#64748B';
  ctx.stroke();
}
