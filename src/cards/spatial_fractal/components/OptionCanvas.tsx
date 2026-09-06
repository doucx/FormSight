import { setupHiDpiCanvas } from '@formsight/card-sdk';
import { useEffect, useRef } from 'preact/hooks';
import type { PlaneConfig } from '../types';
import { evaluateSDF } from '../utils/sdf';

interface OptionCanvasProps {
  config: PlaneConfig;
  level: number;
  seed: number;
}

export function OptionCanvas({ config, level, seed }: OptionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 使用固定的 140x140 分辨率进行离线绘制，保证主线程不会出现卡顿
    const size = 140;

    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = size;
    rawCanvas.height = size;
    const ctx = rawCanvas.getContext('2d');
    if (!ctx) return;

    const span = 1.55;
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let py = 0; py < size; py++) {
      const vFrac = -(py / size - 0.5) * 2 * span;
      for (let px = 0; px < size; px++) {
        const uFrac = (px / size - 0.5) * 2 * span;

        const worldX = config.center.x + config.u.x * uFrac + config.v.x * vFrac;
        const worldY = config.center.y + config.u.y * uFrac + config.v.y * vFrac;
        const worldZ = config.center.z + config.u.z * uFrac + config.v.z * vFrac;

        const val = evaluateSDF(worldX, worldY, worldZ, level, seed);
        const pIdx = (py * size + px) * 4;

        if (val <= 0) {
          const edgeDist = Math.min(1.0, -val * 3.2);
          data[pIdx] = Math.round(99 + edgeDist * 45);
          data[pIdx + 1] = Math.round(102 + edgeDist * 65);
          data[pIdx + 2] = Math.round(241 + edgeDist * 14);
          data[pIdx + 3] = 255;
        } else if (val < 0.035) {
          data[pIdx] = 52;
          data[pIdx + 1] = 211;
          data[pIdx + 2] = 153;
          data[pIdx + 3] = 255;
        } else {
          // 契合夜间模式的主题色板 (slate-950)
          data[pIdx] = 2;
          data[pIdx + 1] = 6;
          data[pIdx + 2] = 23;
          data[pIdx + 3] = 255;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(0, 0, size, 4);

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, 0, 4, size);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, size, size);

    // 将渲染好的纹理通过 HiDPI 上下文投射，保障边缘锐利度
    const displayCtx = setupHiDpiCanvas(canvas, size, size);
    if (displayCtx) {
      displayCtx.drawImage(rawCanvas, 0, 0, size, size);
    }
  }, [config, level, seed]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full aspect-square rounded-lg border border-border shadow-inner"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
