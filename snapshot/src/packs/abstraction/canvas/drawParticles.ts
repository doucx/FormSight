import type { Point } from '../../../types';

export function drawParticlesCanvas(
  canvas: HTMLCanvasElement | null,
  particles?: Point[],
  size = 400,
  axisAngle?: number,
  axisColor = '#22C55E',
  userAxisAngle?: number,
  isHit?: boolean,
) {
  if (!canvas || !particles) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // 绘制散点
  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
  }

  // 若存在用户作答角度且已揭晓，先绘制用户选择的势线（命中绿，未命中红）
  if (userAxisAngle !== undefined && userAxisAngle !== axisAngle) {
    const radU = (userAxisAngle * Math.PI) / 180;
    const cx = size / 2;
    const cy = size / 2;
    const L = size * 0.44;

    ctx.strokeStyle = isHit ? '#22C55E' : '#EF4444';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx - L * Math.cos(radU), cy - L * Math.sin(radU));
    ctx.lineTo(cx + L * Math.cos(radU), cy + L * Math.sin(radU));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 绘制指示势线 (标准真理线)
  if (axisAngle !== undefined) {
    const rad = (axisAngle * Math.PI) / 180;
    const cx = size / 2;
    const cy = size / 2;
    const L = size * 0.44;

    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - L * Math.cos(rad), cy - L * Math.sin(rad));
    ctx.lineTo(cx + L * Math.cos(rad), cy + L * Math.sin(rad));
    ctx.stroke();
  }
}

export function drawSpinePromptCanvas(
  canvas: HTMLCanvasElement | null,
  spine?: Point[],
  size = 160,
) {
  if (!canvas || !spine || spine.length < 2) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  const [p1, p2] = spine;
  ctx.strokeStyle = '#4F46E5';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  ctx.fillStyle = '#4F46E5';
  ctx.beginPath();
  ctx.arc(p1.x, p1.y, 4, 0, Math.PI * 2);
  ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
  ctx.fill();
}