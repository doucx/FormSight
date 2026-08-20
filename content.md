好的，我将为你实现**色相偏差度分析**功能。

我们将设计一个专业的色相偏差度坐标系图表：
- **横坐标 (X 轴)**：目标色相角度（$0^\circ \sim 360^\circ$），并在 X 轴底部提供直观的 12 色相全彩渐变色阶尺；
- **纵坐标 (Y 轴)**：角度偏差值（$-30^\circ \sim +30^\circ$），以 $0^\circ$ 为中轴水平基准线；
- **散点与偏置曲线**：直观散点标注每次答题偏离情况（绿色击中 / 红色失误），并拟合各色相区间的系统性偏移趋势线（诊断是否存在系统性偏暖/偏冷或偏高/偏低直觉偏差）。

## [WIP] feat(analytics): 添加色相偏差度分析图表与弱点诊断

### 用户需求
在色感模块中添加“色相偏差度分析”弱点分析面板，横坐标为色相（$0^\circ \sim 360^\circ$），纵坐标为偏差值，帮助用户定位在不同色相区间上的系统性偏差倾向。

### 评论
色彩直觉测量中，带方向的角度偏差分布（Signed Hue Bias）能极好地揭示用户视觉感知上的系统性偏色倾向（例如在黄绿区间倾向往黄色偏，在蓝紫区间倾向往蓝色偏）。将其可视化为横轴色相、纵轴偏差的坐标图，极大提升了弱点诊断的深度和针对性。

### 目标
1. 新建 `src/utils/canvas/drawHueBiasChart.ts`，基于 HiDPI Canvas 绘制横坐标色相、纵坐标偏差值的专业散点与趋势图。
2. 更新 `src/config/analyticsPlugins.tsx` 中的 `colorHueAnalyticsPlugin`，接入色相偏差度分析图表及系统性偏色诊断逻辑。

### 基本原理
1. **带符号偏差计算**：对于每个色相题目，计算 `signedBias = ((userHue - targetHue + 540) % 360) - 180`，映射到纵轴坐标系，中轴 $0^\circ$ 表示绝对无偏差。
2. **渐变坐标系与动态缩放**：横轴映射 $0^\circ \sim 360^\circ$ 并附带 HSV 全光谱渐变指示条；纵轴自适应最大绝对偏差（默认 $\pm 30^\circ$ 范围）。
3. **扇区偏置趋势**：按 12 色相扇区统计平均符号偏差，绘制平滑偏置连线，诊断系统性感知偏向。

### 标签
#intent/build #flow/ready #priority/high
#comp/interfaces #comp/ui #scope/ux
#ai/instruct
#task/domain/analytics #task/object/hue-bias-analysis #task/action/implementation
#task/state/begin #task/status/active

---

### Script

#### Acts 1: 新建色相偏差度图表绘制函数 `drawHueBiasChart.ts`

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
  return (((userHue - targetHue + 540) % 360) - 180);
}

/**
 * 绘制色相偏差度散点与趋势分析图 (横轴: 色相 0°~360°, 纵轴: 偏差度 °)
 */
export function renderHueBiasChartCanvas(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
) {
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
  const getY = (bias: number) =>
    padding.top + chartH / 2 - (bias / maxBiasRange) * (chartH / 2);

  // 1. 绘制网格线与 Y 轴参考刻度
  const yTicks = [maxBiasRange, Math.round(maxBiasRange / 2), 0, -Math.round(maxBiasRange / 2), -maxBiasRange];
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

  // 4. 绘制做答记录散点
  for (const pt of pointData) {
    const px = getX(pt.targetH);
    const py = getY(pt.bias);

    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = pt.isHit ? 'rgba(34, 197, 94, 0.75)' : 'rgba(239, 68, 68, 0.75)';
    ctx.fill();
    ctx.strokeStyle = pt.isHit ? '#15803D' : '#991B1B';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 5. 计算 12 个色相扇区的平均偏差并绘制趋势平滑线
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
    ctx.lineWidth = 2;
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

#### Acts 2: 更新 `analyticsPlugins.tsx` 中的 `colorHueAnalyticsPlugin` 接入色相偏差度分析

~~~~~act
patch_file
src/config/analyticsPlugins.tsx
~~~~~
~~~~~typescript
import { renderHueRingCanvas } from '../utils/canvas/drawColorRing';
import type { SectorStat } from '../utils/canvas/drawCompass';
import { renderHeatmapCanvas } from '../utils/canvas/drawHeatmap';
~~~~~
~~~~~typescript
import { calcSignedHueBias, renderHueBiasChartCanvas } from '../utils/canvas/drawHueBiasChart';
import type { SectorStat } from '../utils/canvas/drawCompass';
import { renderHeatmapCanvas } from '../utils/canvas/drawHeatmap';
~~~~~

~~~~~act
patch_file
src/config/analyticsPlugins.tsx
~~~~~
~~~~~typescript
// 色相分析插件
export const colorHueAnalyticsPlugin: CardAnalyticsPlugin = {
  cardId: 'color_hue',
  title: '色相感知弱点分析',
  subTitle: '洞察你对 OKLab 色彩空间 12 色相扇区的敏感度分布',
  fetchRecords: async (id) => getTrialRecordsByCard(id),
  renderVisualizer: (canvas, records) => {
    const sectorBuckets = Array.from({ length: 12 }, () => ({ total: 0, hits: 0, sumError: 0 }));
    for (const r of records) {
      const tHsv = (r.targetHSV as [number, number, number]) || [0, 0, 0];
      const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
      sectorBuckets[idx].total += 1;
      if (r.isHit) sectorBuckets[idx].hits += 1;
      sectorBuckets[idx].sumError += Number(r.errorValue ?? 0);
    }
    const sectorStats: SectorStat[] = sectorBuckets.map((b, i) => ({
      sectorIdx: i,
      label: COLOR_SECTORS[i],
      total: b.total,
      accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
      avgError: b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0,
    }));
    renderHueRingCanvas(canvas, sectorStats);
  },
  renderDiagnostics: (records) => {
    const totalCount = records.length;
    if (totalCount === 0) return null;

    const sectorBuckets = Array.from({ length: 12 }, () => ({ total: 0, hits: 0, sumError: 0 }));
    for (const r of records) {
      const tHsv = (r.targetHSV as [number, number, number]) || [0, 0, 0];
      const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
      sectorBuckets[idx].total += 1;
      if (r.isHit) sectorBuckets[idx].hits += 1;
      sectorBuckets[idx].sumError += Number(r.errorValue ?? 0);
    }
    const sectorStats: SectorStat[] = sectorBuckets.map((b, i) => ({
      sectorIdx: i,
      label: COLOR_SECTORS[i],
      total: b.total,
      accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
      avgError: b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0,
    }));
    const validSectors = sectorStats.filter((s) => s.total >= 3);
    const weakestSector =
      validSectors.length > 0
        ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
        : null;

    return (
      <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-100 space-y-2 text-xs">
        <div className="font-bold text-amber-900 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          色相盲区诊断
        </div>
        {weakestSector ? (
          <div className="space-y-2">
            <p className="text-slate-700 text-[11px]">
              你在 <span className="font-bold text-amber-700">{weakestSector.label}</span>{' '}
              色相上辨识度最低：
            </p>
            <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-amber-200/60 shadow-sm">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full border border-slate-200"
                  style={{
                    backgroundColor: hsvToHex(weakestSector.sectorIdx * 30 + 15, 100, 100),
                  }}
                />
                <span className="font-bold text-slate-800">
                  {weakestSector.label.split(' ')[0]}
                </span>
              </div>
              <span className="font-black text-rose-600 text-sm">
                {weakestSector.accuracy}% 正确率
              </span>
            </div>
          </div>
        ) : (
          <p className="text-slate-600 text-[11px]">
            需每个色相扇区完成至少 3 题才能生成弱点诊断。
          </p>
        )}
      </div>
    );
  },
  getOverallStats: (records) => {
    const total = records.length;
    const hits = records.filter((r) => r.isHit).length;
    const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
    const sumError = records.reduce((acc, curr) => acc + Number(curr.errorValue || 0), 0);
    const avgError = total > 0 ? Math.round((sumError / total) * 10) / 10 : 0;

    return {
      accuracy,
      total,
      customSummary: (
        <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-100 pt-1 text-xs">
          <span>平均绝对角度误差:</span>
          <span>{avgError}°</span>
        </div>
      ),
    };
  },
};
~~~~~
~~~~~typescript
// 色相偏差度分析插件
export const colorHueAnalyticsPlugin: CardAnalyticsPlugin = {
  cardId: 'color_hue',
  title: '色相偏差度分析',
  subTitle: '横轴色相与纵轴偏差分布，揭示系统性偏色倾向',
  fetchRecords: async (id) => getTrialRecordsByCard(id),
  renderVisualizer: (canvas, records) => {
    renderHueBiasChartCanvas(canvas, records);
  },
  renderDiagnostics: (records) => {
    const totalCount = records.length;
    if (totalCount === 0) return null;

    let sumSignedBias = 0;
    const sectorBuckets = Array.from({ length: 12 }, () => ({ total: 0, hits: 0, sumBias: 0 }));
    for (const r of records) {
      const tHsv = (r.targetHSV as [number, number, number]) || [0, 0, 0];
      const uHsv = (r.userHSV as [number, number, number]) || tHsv;
      const bias = calcSignedHueBias(tHsv[0], uHsv[0]);
      sumSignedBias += bias;

      const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
      sectorBuckets[idx].total += 1;
      if (r.isHit) sectorBuckets[idx].hits += 1;
      sectorBuckets[idx].sumBias += bias;
    }

    const avgSignedBias = Math.round((sumSignedBias / totalCount) * 10) / 10;
    const validSectors = sectorBuckets
      .map((b, i) => ({
        sectorIdx: i,
        label: COLOR_SECTORS[i],
        total: b.total,
        accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
        avgBias: b.total > 0 ? Math.round((b.sumBias / b.total) * 10) / 10 : 0,
      }))
      .filter((s) => s.total >= 3);

    const maxBiasSector =
      validSectors.length > 0
        ? validSectors.reduce((prev, curr) =>
            Math.abs(curr.avgBias) > Math.abs(prev.avgBias) ? curr : prev,
          )
        : null;

    return (
      <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-100 space-y-2 text-xs">
        <div className="font-bold text-amber-900 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          系统性偏色倾向诊断
        </div>

        <div className="space-y-1 text-[11px] text-slate-700">
          <div className="flex justify-between bg-white p-2 rounded-xl border border-amber-200/60 shadow-sm font-mono">
            <span>全局平均偏转角:</span>
            <span className={`font-bold ${avgSignedBias > 0 ? 'text-amber-600' : avgSignedBias < 0 ? 'text-indigo-600' : 'text-slate-700'}`}>
              {avgSignedBias > 0 ? `+${avgSignedBias}° (顺时针)` : avgSignedBias < 0 ? `${avgSignedBias}° (逆时针)` : '0°'}
            </span>
          </div>

          {maxBiasSector ? (
            <div className="mt-2 space-y-1.5">
              <p className="text-slate-600">
                最大偏差扇区：<span className="font-bold text-amber-800">{maxBiasSector.label}</span>
              </p>
              <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-amber-200/60 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full border border-slate-200"
                    style={{
                      backgroundColor: hsvToHex(maxBiasSector.sectorIdx * 30 + 15, 100, 100),
                    }}
                  />
                  <span className="font-bold text-slate-800">
                    {maxBiasSector.label.split(' ')[0]}
                  </span>
                </div>
                <span className="font-black text-amber-700 font-mono text-xs">
                  平均偏差: {maxBiasSector.avgBias > 0 ? `+${maxBiasSector.avgBias}°` : `${maxBiasSector.avgBias}°`}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-[10px] mt-1">
              样本量达到每个扇区至少 3 题后可生成精准扇区偏向诊断。
            </p>
          )}
        </div>
      </div>
    );
  },
  getOverallStats: (records) => {
    const total = records.length;
    const hits = records.filter((r) => r.isHit).length;
    const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
    const sumError = records.reduce((acc, curr) => acc + Number(curr.errorValue || 0), 0);
    const avgError = total > 0 ? Math.round((sumError / total) * 10) / 10 : 0;

    return {
      accuracy,
      total,
      customSummary: (
        <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-100 pt-1 text-xs">
          <span>平均绝对角度误差:</span>
          <span>{avgError}°</span>
        </div>
      ),
    };
  },
};
~~~~~

### 下一步建议

1. **测试与运行验证**：运行应用，进入“绝对色感 - 色相 (Hue)”模块完成数道题目后，打开卡片专属弱点分析，验证色相偏差度坐标轴、全光谱渐变条、散点分布与偏色趋势线是否呈现良好。
2. **提交计划**：若效果满意，可生成 `[COMMIT]` 计划将改动提交至版本控制。
