import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { hsvToHex } from '../../core/color/colorUtils';
import type { SectorStat } from './drawCompass';

export function renderHueRingCanvas(canvas: HTMLCanvasElement, sectorStats: SectorStat[]) {
  const width = 320;
  const height = 320;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 40;
  const innerRadius = outerRadius - 20;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

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
      ctx.fillStyle = 'rgba(226, 232, 240, 0.7)';
    } else if (stat.accuracy >= 80) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
    } else if (stat.accuracy >= 60) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
    } else {
      ctx.fillStyle = 'rgba(244, 63, 94, 0.55)';
    }
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.stroke();

    const midA = startA + sectorAngle / 2;
    const labelR = outerRadius + 25;
    const lx = cx + Math.cos(midA) * labelR;
    const ly = cy + Math.sin(midA) * labelR;

    ctx.fillStyle = stat.accuracy < 60 && stat.total >= 3 ? '#E11D48' : '#64748B';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const shortName = stat.label.split(' ')[0];
    ctx.fillText(shortName, lx, ly);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.stroke();

  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Hue', cx, cy - 5);
  ctx.fillStyle = '#64748B';
  ctx.font = '9px sans-serif';
  ctx.fillText('Accuracy', cx, cy + 8);
}
