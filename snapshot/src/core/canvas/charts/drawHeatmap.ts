import type { UnifiedTrialRecord } from '../../../storage/db/schema';
import { CANVAS_THEME, hexToRgba } from '../../../utils/theme';
import { initSquareHiDpiCanvas } from '../hidpi';

export function renderHeatmapCanvas(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
  avgDx: number,
  avgDy: number,
  totalCount: number,
) {
  const init = initSquareHiDpiCanvas(canvas, 340);
  if (!init) return;
  const { ctx, size } = init;
  const width = size;
  const height = size;

  const cx = width / 2;
  const cy = height / 2;
  const scale = 5;

  // 1. 背景同心圆标尺
  const rings = [5, 10, 20, 30];
  ctx.lineWidth = 1;
  for (const r of rings) {
    ctx.strokeStyle = CANVAS_THEME.axis.line;
    ctx.beginPath();
    ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = CANVAS_THEME.text.muted;
    ctx.font = '10px monospace';
    ctx.fillText(`${r}`, cx + r * scale + 2, cy - 4);
  }

  // 十字辅助基准线
  ctx.strokeStyle = CANVAS_THEME.axis.grid;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(width, cy);
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, height);
  ctx.stroke();
  ctx.setLineDash([]);

  // 2. 数据点与密度分箱处理
  if (totalCount > 0) {
    if (totalCount <= 300) {
      // 样本量较少时：直接绘制带适度半透明的散点
      const alpha = Math.max(0.35, 1 - totalCount / 600);
      for (const r of records) {
        const uClick = (r.userClick as [number, number]) || [0, 0];
        const tB = (r.targetB as [number, number]) || [0, 0];
        const dx = uClick[0] - tB[0];
        const dy = uClick[1] - tB[1];

        const px = cx + dx * scale;
        const py = cy + dy * scale;

        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = r.isHit
          ? hexToRgba(CANVAS_THEME.status.hit, alpha)
          : hexToRgba(CANVAS_THEME.status.miss, Math.min(1, alpha * 1.1));
        ctx.fill();
      }
    } else {
      // 海量样本时 (300 ~ 10000+)：2D 网格分箱热力聚合 (Binning)
      const gridSize = 40; // 40x40 分箱网格
      const cellW = width / gridSize;
      const cellH = height / gridSize;
      const bins = new Uint16Array(gridSize * gridSize);
      let maxBinCount = 1;

      for (const r of records) {
        const uClick = (r.userClick as [number, number]) || [0, 0];
        const tB = (r.targetB as [number, number]) || [0, 0];
        const dx = uClick[0] - tB[0];
        const dy = uClick[1] - tB[1];

        const px = cx + dx * scale;
        const py = cy + dy * scale;

        if (px >= 0 && px < width && py >= 0 && py < height) {
          const col = Math.floor(px / cellW);
          const row = Math.floor(py / cellH);
          const idx = row * gridSize + col;
          bins[idx]++;
          if (bins[idx] > maxBinCount) {
            maxBinCount = bins[idx];
          }
        }
      }

      // 绘制热力色阶块 (对数强度映射)
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const count = bins[r * gridSize + c];
          if (count > 0) {
            const intensity = Math.log(count + 1) / Math.log(maxBinCount + 1);
            ctx.fillStyle = hexToRgba(
              CANVAS_THEME.status.accentHover,
              Math.min(0.85, 0.15 + intensity * 0.7),
            );
            ctx.fillRect(c * cellW, r * cellH, cellW + 0.5, cellH + 0.5);
          }
        }
      }

      // 叠加表层最近 100 道题的精细高亮散点，保留动态击中反馈
      const recentSample = records.slice(-100);
      for (const r of recentSample) {
        const uClick = (r.userClick as [number, number]) || [0, 0];
        const tB = (r.targetB as [number, number]) || [0, 0];
        const dx = uClick[0] - tB[0];
        const dy = uClick[1] - tB[1];
        const px = cx + dx * scale;
        const py = cy + dy * scale;

        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = r.isHit
          ? hexToRgba(CANVAS_THEME.status.hit, 0.75)
          : hexToRgba(CANVAS_THEME.status.miss, 0.75);
        ctx.fill();
      }
    }
  }

  // 3. 绝对真理中心点
  ctx.fillStyle = CANVAS_THEME.bg.primary;
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = CANVAS_THEME.status.hit;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 4. 系统性平均偏置向量
  if (totalCount > 0) {
    const avgPx = cx + avgDx * scale;
    const avgPy = cy + avgDy * scale;

    ctx.strokeStyle = CANVAS_THEME.status.warning;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(avgPx, avgPy);
    ctx.stroke();

    ctx.fillStyle = CANVAS_THEME.status.warning;
    ctx.beginPath();
    ctx.arc(avgPx, avgPy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}
