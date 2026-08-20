我已为你规划了完整的优化方案。本计划将通过自适应 LOD（细节层次分级）、Label 防碰撞算法、以及 2D 密度分箱（Binning）采样，彻底解决大数据量下折线图拥挤重叠与散点图墨渍卡顿的问题。

## [WIP] perf(canvas): 优化海量数据下图表自适应分级渲染与密度分箱

### 用户需求
在长时/高频训练（如单会话 200+ 题、全局累计 10,000+ 记录）场景下，解决图表绘制性能瓶颈与视觉重叠问题：
1. 会话折线图文字与圆点互相遮挡挤压，出现“毛毛虫”与黑色文字块。
2. 空间偏置图与色相偏差图在万级样本时遍历渲染慢、散点完全饱和变实心（墨渍效应）。

### 评论
数据规模增长与固定画布像素之间的物理冲突，是数据可视化系统必须解决的架构问题。通过引入数据分箱与视觉密度自适应降采样，可以在保持物理常数级 $O(1)$ 渲染开销的同时，大幅提高极端数据规模下的可读性与专业感。

### 目标
1. **重构 `drawTrendChart.ts`**：
   - 在 `renderSessionTrendChartCanvas` 中引入基于题量 $N$ 的自适应 LOD 机制（小数据量精细圆点，大数据量平滑曲线 + 关键极值锚点）。
   - 实现 X 轴文字 Label 碰撞检测，彻底消除重叠字块。
2. **重构 `drawHeatmap.ts`**：
   - 引入 2D 空间分箱热力图算法（Density Grid Binning），当样本量较大时采用热力网格与 Alpha 动态调制，表层抽样高亮最新点，杜绝墨渍效应与掉帧。
3. **重构 `drawHueBiasChart.ts`**：
   - 引入动态透明度衰减与自适应网格采样，保证即使在万级样本下依然能清晰透视出核心偏色分布带与离群点。

### 基本原理
1. **LOD（Level of Detail）视觉阶梯**：
   - $N \le 30$：全量显示普通圆点与拐点 Label。
   - $30 < N \le 80$：缩小圆点半径，仅保留步长 $\ge 24\text{px}$ 的关键层阶变更 Label。
   - $N > 80$：隐藏普通数据点实心圆，仅绘制渐变平滑折线，文字仅标注起点、终点和历史最高峰值。
2. **2D 密度网格（Density Binning）**：
   - 将连续坐标映射到离散的 $32 \times 32$ 二维空间网格，单遍统计每个网格的样本计数，用对数标尺（Log Scale）映射颜色热力强度，保证渲染复杂度与原始数据量完全解耦。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/canvas-charts #task/action/optimization #task/state/begin

---

### Script

#### Acts 1: 优化会话总结与全局趋势折线图的自适应 LOD 与防碰撞逻辑

我们将重构 `src/utils/canvas/drawTrendChart.ts`，增加点数分级显示与动态 Label 冲突避免算法。

~~~~~act
write_file
src/utils/canvas/drawTrendChart.ts
~~~~~
~~~~~typescript
import type { SessionHistoryItem } from '../../components/SessionSummaryModal';
import { setupHiDpiCanvas } from './hidpi';

export function renderTrendChartCanvas(
  canvas: HTMLCanvasElement,
  dailyData: Record<string, { total: number; maxLevel: number }>,
) {
  const width = 340;
  const height = 150;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const padding = { top: 20, right: 20, bottom: 25, left: 30 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);

  const activeDates = Object.keys(dailyData).sort();
  const recentDates = activeDates.slice(-30);

  if (recentDates.length === 0) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('当前筛选条件下暂无做答轨迹', width / 2, height / 2);
    return;
  }

  const levels = recentDates.map((d) => dailyData[d].maxLevel);
  const maxLevel = Math.max(...levels, 35);
  const minLevel = 1;

  const getY = (val: number) =>
    padding.top + (1 - (val - minLevel) / (maxLevel - minLevel || 1)) * chartH;
  const getX = (idx: number) => padding.left + (idx / Math.max(1, recentDates.length - 1)) * chartW;

  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const l of [minLevel, Math.round(maxLevel / 2), maxLevel]) {
    const y = getY(l);
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = '#6366F1';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.moveTo(getX(0), getY(levels[0]));
  for (let i = 1; i < levels.length; i++) {
    ctx.lineTo(getX(i), getY(levels[i]));
  }
  ctx.stroke();

  // 动态控制圆点尺寸
  const pointRadius = recentDates.length > 20 ? 2.5 : 3.5;
  for (let i = 0; i < levels.length; i++) {
    ctx.beginPath();
    ctx.arc(getX(i), getY(levels[i]), pointRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const l of [minLevel, maxLevel]) {
    ctx.fillText(`L${l}`, padding.left - 5, getY(l));
  }
  ctx.textAlign = 'center';
  ctx.fillText('最近活跃日演进趋势 ➔', width / 2, height - 5);
}

export function renderSessionTrendChartCanvas(
  canvas: HTMLCanvasElement,
  history: SessionHistoryItem[],
) {
  const width = 440;
  const height = 160;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx || history.length === 0) return;

  const padding = { top: 30, right: 30, bottom: 35, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 0, width, height);

  const totalPoints = history.length;
  const levels = history.map((h) => h.level);
  const maxLevel = Math.max(...levels, 35);
  const minLevel = Math.min(...levels, 1);

  const getY = (val: number) => {
    const ratio = (val - minLevel) / (maxLevel - minLevel || 1);
    return padding.top + (1 - ratio) * chartH;
  };

  const getX = (index: number) => {
    if (totalPoints === 1) return padding.left + chartW / 2;
    return padding.left + (index / (totalPoints - 1)) * chartW;
  };

  // 背景刻度线
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#334155';
  ctx.fillStyle = '#64748B';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const yTicks = [maxLevel, Math.round((maxLevel + minLevel) / 2), minLevel];
  const uniqueYTicks = Array.from(new Set(yTicks));

  for (const tickVal of uniqueYTicks) {
    const y = getY(tickVal);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillText(`Lvl ${tickVal}`, padding.left - 8, y);
  }

  // 面积渐变背景
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
  gradient.addColorStop(1, 'rgba(99, 102, 241, 0.02)');

  ctx.beginPath();
  ctx.moveTo(getX(0), getY(history[0].level));
  for (let i = 1; i < totalPoints; i++) {
    ctx.lineTo(getX(i), getY(history[i].level));
  }
  ctx.lineTo(getX(totalPoints - 1), height - padding.bottom);
  ctx.lineTo(getX(0), height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // 主折线
  ctx.beginPath();
  ctx.strokeStyle = '#818CF8';
  ctx.lineWidth = totalPoints > 100 ? 1.8 : 2.5;
  ctx.lineJoin = 'round';
  ctx.moveTo(getX(0), getY(history[0].level));
  for (let i = 1; i < totalPoints; i++) {
    ctx.lineTo(getX(i), getY(history[i].level));
  }
  ctx.stroke();

  // 自适应 LOD 与文字防碰撞策略
  const isCrowded = totalPoints > 35;
  const isSuperCrowded = totalPoints > 80;

  // 寻找极值点与关键转折点
  let highestIndex = 0;
  let highestLevel = levels[0];
  for (let i = 1; i < totalPoints; i++) {
    if (levels[i] > highestLevel) {
      highestLevel = levels[i];
      highestIndex = i;
    }
  }

  // 1. 绘制数据圆点
  if (!isSuperCrowded) {
    const dotRadius = isCrowded ? 2 : 3.5;
    for (let i = 0; i < totalPoints; i++) {
      const h = history[i];
      const x = getX(i);
      const y = getY(h.level);

      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = h.isHit ? '#22C55E' : '#EF4444';
      ctx.fill();
      if (!isCrowded) {
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  } else {
    // 超大样本量 (80~200+)：仅在起止点与最高点绘制光标圆环
    const keyIndices = Array.from(new Set([0, highestIndex, totalPoints - 1]));
    for (const idx of keyIndices) {
      const h = history[idx];
      const x = getX(idx);
      const y = getY(h.level);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = idx === highestIndex ? '#F59E0B' : h.isHit ? '#22C55E' : '#EF4444';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // 2. 文字 Label 自适应防碰撞绘制
  ctx.fillStyle = '#CBD5E1';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';

  if (!isCrowded) {
    // 点数较少：显示变化点
    for (let i = 0; i < totalPoints; i++) {
      const h = history[i];
      if (
        totalPoints <= 10 ||
        i === 0 ||
        i === totalPoints - 1 ||
        h.level !== history[i - 1]?.level
      ) {
        ctx.fillText(`L${h.level}`, getX(i), getY(h.level) - 8);
      }
    }
  } else if (!isSuperCrowded) {
    // 35 ~ 80 题：限制相邻 Label 的 X 轴最小间距 >= 30px
    let lastLabeledX = -999;
    for (let i = 0; i < totalPoints; i++) {
      const h = history[i];
      const x = getX(i);
      const isKey = i === 0 || i === totalPoints - 1 || i === highestIndex;
      const isLevelChanged = i > 0 && h.level !== history[i - 1]?.level;

      if ((isKey || isLevelChanged) && x - lastLabeledX >= 30) {
        ctx.fillText(`L${h.level}`, x, getY(h.level) - 8);
        lastLabeledX = x;
      }
    }
  } else {
    // 80 ~ 200+ 题：仅精确标注起点、终点和最高难度点，杜绝任何文字拥挤
    const labelSet = [
      { idx: 0, text: `起点 L${levels[0]}` },
      { idx: highestIndex, text: `峰值 L${highestLevel}` },
      { idx: totalPoints - 1, text: `终点 L${levels[totalPoints - 1]}` },
    ];

    // 按索引排序去重并绘制
    const uniqueLabels = labelSet
      .filter((item, pos, self) => self.findIndex((t) => t.idx === item.idx) === pos)
      .sort((a, b) => a.idx - b.idx);

    for (const item of uniqueLabels) {
      const x = getX(item.idx);
      const y = getY(levels[item.idx]);
      ctx.fillStyle = item.idx === highestIndex ? '#FDE68A' : '#CBD5E1';
      ctx.fillText(item.text, x, y - 9);
    }
  }

  ctx.strokeStyle = '#475569';
  ctx.beginPath();
  ctx.moveTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('题目做答序列 ➔', width / 2, height - 10);
}
~~~~~

#### Acts 2: 优化空间偏置分析图（`drawHeatmap.ts`）的 2D 密度分箱与大数据量自适应

我们将为 `src/utils/canvas/drawHeatmap.ts` 引入 2D 密度网格与自适应 Alpha 调节，在大样本量下生成细腻的连续密度分布，消除过度绘制和卡顿。

~~~~~act
write_file
src/utils/canvas/drawHeatmap.ts
~~~~~
~~~~~typescript
import type { UnifiedTrialRecord } from '../db';
import { setupHiDpiCanvas } from './hidpi';

export function renderHeatmapCanvas(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
  avgDx: number,
  avgDy: number,
  totalCount: number,
) {
  const width = 320;
  const height = 320;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const cx = width / 2;
  const cy = height / 2;
  const scale = 5;

  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 0, width, height);

  // 1. 背景同心圆标尺
  const rings = [5, 10, 20, 30];
  ctx.lineWidth = 1;
  for (const r of rings) {
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#64748B';
    ctx.font = '10px monospace';
    ctx.fillText(`${r}`, cx + r * scale + 2, cy - 4);
  }

  // 十字辅助基准线
  ctx.strokeStyle = '#475569';
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
          ? `rgba(34, 197, 94, ${alpha})`
          : `rgba(239, 68, 68, ${alpha * 1.1})`;
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
            ctx.fillStyle = `rgba(99, 102, 241, ${Math.min(0.85, 0.15 + intensity * 0.7)})`;
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
        ctx.fillStyle = r.isHit ? 'rgba(34, 197, 94, 0.75)' : 'rgba(239, 68, 68, 0.75)';
        ctx.fill();
      }
    }
  }

  // 3. 绝对真理中心点
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#22C55E';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 4. 系统性平均偏置向量
  if (totalCount > 0) {
    const avgPx = cx + avgDx * scale;
    const avgPy = cy + avgDy * scale;

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(avgPx, avgPy);
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(avgPx, avgPy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}
~~~~~

#### Acts 3: 优化色相偏差分析图（`drawHueBiasChart.ts`）的动态透明度与趋势线

优化 `src/utils/canvas/drawHueBiasChart.ts`，使其在大样本量下自动根据点数衰减散点 Alpha，并在计算 12 扇区趋势线时消除过度拥塞。

~~~~~act
write_file
src/utils/canvas/drawHueBiasChart.ts
~~~~~
~~~~~typescript
import type { UnifiedTrialRecord } from '../db';
import { setupHiDpiCanvas } from './hidpi';

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
  const width = 320;
  const height = 320;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  // 画布边距
  const padding = { top: 25, right: 20, bottom: 45, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // 背景填充
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 0, width, height);

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
    ctx.strokeStyle = tick === 0 ? 'rgba(148, 163, 184, 0.4)' : 'rgba(51, 65, 85, 0.6)';
    ctx.setLineDash(tick === 0 ? [] : [2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = tick === 0 ? '#CBD5E1' : '#64748B';
    const label = tick > 0 ? `+${tick}°` : `${tick}°`;
    ctx.fillText(label, padding.left - 5, y);
  }
  ctx.setLineDash([]);

  // 2. 绘制 X 轴色相刻度竖线 (0°, 90°, 180°, 270°, 360°)
  const xTicks = [0, 90, 180, 270, 360];
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
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
  barGradient.addColorStop(0 / 6, '#FF0000');
  barGradient.addColorStop(1 / 6, '#FFFF00');
  barGradient.addColorStop(2 / 6, '#00FF00');
  barGradient.addColorStop(3 / 6, '#00FFFF');
  barGradient.addColorStop(4 / 6, '#0000FF');
  barGradient.addColorStop(5 / 6, '#FF00FF');
  barGradient.addColorStop(6 / 6, '#FF0000');

  ctx.fillStyle = barGradient;
  ctx.beginPath();
  ctx.roundRect
    ? ctx.roundRect(padding.left, barY, chartW, barH, 4)
    : ctx.fillRect(padding.left, barY, chartW, barH);
  ctx.fill();

  // 底部 X 轴标签
  ctx.fillStyle = '#94A3B8';
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
      ? `rgba(34, 197, 94, ${dotAlpha})`
      : `rgba(239, 68, 68, ${dotAlpha * 1.1})`;
    ctx.fill();
    if (totalCount <= 150) {
      ctx.strokeStyle = pt.isHit ? '#15803D' : '#991B1B';
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
    ctx.strokeStyle = '#F59E0B';
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
      ctx.fillStyle = '#F59E0B';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // 顶部标题提示
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('偏大(+)', padding.left, padding.top - 10);
  ctx.textAlign = 'right';
  ctx.fillText('偏小(-)', width - padding.right, height - padding.bottom - 4);
}
~~~~~

### 下一步建议
1. **代码风格与类型检查**：运行 `npm run check` 确保格式规范和类型安全无警告。
2. **长序列实测**：可以在自适应训练模式下快速答题或模拟多轮测试，验证 200+ 题后总结弹窗中折线图的清晰度与 Label 呈现效果。
