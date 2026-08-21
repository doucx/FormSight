import { hsvToHex } from '../../core/color/colorUtils';

export interface PaletteTile {
  x: number;
  y: number;
  w: number;
  h: number;
  hsv: [number, number, number];
  weight: number;
}

export function drawPaletteTilesCanvas(
  canvas: HTMLCanvasElement | null,
  tiles?: PaletteTile[],
  size = 400,
) {
  if (!canvas || !tiles) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  for (const t of tiles) {
    ctx.fillStyle = hsvToHex(...t.hsv);
    ctx.fillRect(t.x, t.y, t.w, t.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.strokeRect(t.x, t.y, t.w, t.h);
  }
}
