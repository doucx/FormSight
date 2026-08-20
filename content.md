## [WIP] feat(analytics): 为弱点分析弹窗引入多页标签切换并恢复色相环及罗盘视图

### 用户需求
1. 查明色相环缺失原因并排查潜在遗漏视图。
2. 在弱点分析弹窗中引入多页/多视图设计，允许在同一卡片下切换不同分析维度（如色相偏差度 vs 色相环、空间偏置 vs 方位罗盘）。

### 评论
将弱点分析架构升级为多视图标签页（Multi-View Analytics Tab），不仅彻底解决了新图表覆盖旧图表的问题，还释放了沉睡的八向罗盘分析能力，使视觉感知诊断体系更立体、更专业。

### 目标
1. 重构 `src/config/analyticsPlugins.tsx`，将单视图插件模型升级为支持包含多个 `views` 的多页插件架构。
2. 在 `src/config/analyticsPlugins.tsx` 中为 `color_hue` 配置色相偏差度和色相环双视图，为寻星模式配置偏置散点与八向罗盘双视图。
3. 改造 `src/components/WeaknessAnalyticsModal.tsx`，添加多页 Tab 切换导航条，支持响应式切换与动态 Canvas 重新渲染。

### 基本原理
- 将 `CardAnalyticsPlugin` 解耦为 `views: CardAnalyticsView[]`，每个视图拥有独立的 `id`、`tabLabel`、`renderVisualizer` 与 `renderDiagnostics`。
- 在弹窗中维护 `activeViewId`，切换标签时自动触发当前活动视图的 Canvas 重绘与右侧诊断卡片更新。

### 标签
#intent/build #flow/ready #priority/high
#comp/interfaces #comp/ui #scope/ux
#ai/instruct
#task/domain/analytics #task/object/multiview-analytics-modal #task/action/refactor
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 重构 `analyticsPlugins.tsx` 支持多视图定义并接入色相环与罗盘

~~~~~act
write_file
src/config/analyticsPlugins.tsx
~~~~~
~~~~~typescript
import { AlertCircle, Compass, Crosshair, PieChart, Sparkles, Target } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { renderHueRingCanvas } from '../utils/canvas/drawColorRing';
import { type SectorStat, renderCompassCanvas } from '../utils/canvas/drawCompass';
import { renderHeatmapCanvas } from '../utils/canvas/drawHeatmap';
import { calcSignedHueBias, renderHueBiasChartCanvas } from '../utils/canvas/drawHueBiasChart';
import { hsvToHex } from '../utils/colorUtils';
import { type UnifiedTrialRecord, getTrialRecordsByCard } from '../utils/db';

export interface CardAnalyticsView<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  id: string;
  tabLabel: string;
  title: string;
  subTitle: string;
  icon?: (props: { className?: string }) => ComponentChildren;
  renderVisualizer: (canvas: HTMLCanvasElement, records: TRecord[]) => void;
  renderDiagnostics: (records: TRecord[]) => ComponentChildren;
  getOverallStats?: (records: TRecord[]) => {
    accuracy: number;
    total: number;
    customSummary?: ComponentChildren;
  };
}

export interface CardAnalyticsPlugin<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  cardId: string;
  fetchRecords: (cardId: string) => Promise<TRecord[]>;
  views: CardAnalyticsView<TRecord>[];
}

const COLOR_SECTORS = [
  '红 (0°-30°)',
  '橙 (30°-60°)',
  '黄 (60°-90°)',
  '黄绿 (90°-120°)',
  '绿 (120°-150°)',
  '青绿 (150°-180°)',
  '青 (180°-210°)',
  '蓝 (210°-240°)',
  '蓝紫 (240°-270°)',
  '紫 (270°-300°)',
  '品红 (300°-330°)',
  '紫红 (330°-360°)',
];

const STAR_SECTORS = [
  '正东 (0°)',
  '东北 (45°)',
  '正北 (90°)',
  '西北 (135°)',
  '正西 (180°)',
  '西南 (225°)',
  '正南 (270°)',
  '东南 (315°)',
];

// 寻星通用分析插件工厂 (支持 空间偏置 + 八向罗盘 双视图)
function createStarAnalyticsPlugin(cardId: string, title: string): CardAnalyticsPlugin {
  return {
    cardId,
    fetchRecords: async (id) => getTrialRecordsByCard(id),
    views: [
      {
        id: 'spatial_bias',
        tabLabel: '空间偏置散点',
        title: `${title} · 空间偏置分析`,
        subTitle: '中心绿点为绝对真理点，散点分布揭示手眼定位偏移',
        icon: Target,
        renderVisualizer: (canvas, records) => {
          const totalCount = records.length;
          let sumDx = 0;
          let sumDy = 0;
          for (const r of records) {
            const uClick = (r.userClick as [number, number]) || [0, 0];
            const tB = (r.targetB as [number, number]) || [0, 0];
            sumDx += uClick[0] - tB[0];
            sumDy += uClick[1] - tB[1];
          }
          const avgDx = totalCount > 0 ? Math.round((sumDx / totalCount) * 10) / 10 : 0;
          const avgDy = totalCount > 0 ? Math.round((sumDy / totalCount) * 10) / 10 : 0;
          renderHeatmapCanvas(canvas, records, avgDx, avgDy, totalCount);
        },
        renderDiagnostics: (records) => {
          const totalCount = records.length;
          if (totalCount === 0) return null;

          let sumDx = 0;
          let sumDy = 0;
          let sumDist = 0;
          for (const r of records) {
            const uClick = (r.userClick as [number, number]) || [0, 0];
            const tB = (r.targetB as [number, number]) || [0, 0];
            sumDx += uClick[0] - tB[0];
            sumDy += uClick[1] - tB[1];
            sumDist += (r.errorPixelDistance as number) || 0;
          }
          const avgDx = Math.round((sumDx / totalCount) * 10) / 10;
          const avgDy = Math.round((sumDy / totalCount) * 10) / 10;
          const avgDist = Math.round((sumDist / totalCount) * 10) / 10;

          return (
            <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-2 text-xs">
              <div className="font-bold text-indigo-900 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-indigo-600" />
                系统空间偏置 (Systematic Bias)
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                中心为绝对真理点。散点越收敛代表空间直觉越敏锐。
              </p>
              <div className="pt-1 space-y-1 font-mono text-slate-700">
                <div className="flex justify-between">
                  <span>平均 X 轴偏移:</span>
                  <span className="font-bold">
                    {avgDx > 0 ? `右 +${avgDx}` : avgDx < 0 ? `左 ${avgDx}` : '0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>平均 Y 轴偏移:</span>
                  <span className="font-bold">
                    {avgDy > 0 ? `下 +${avgDy}` : avgDy < 0 ? `上 ${avgDy}` : '0'}
                  </span>
                </div>
                <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-200/60 pt-1">
                  <span>平均像素误差:</span>
                  <span>{avgDist}px</span>
                </div>
              </div>
            </div>
          );
        },
        getOverallStats: (records) => {
          const total = records.length;
          const hits = records.filter((r) => r.isHit).length;
          const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
          return { accuracy, total };
        },
      },
      {
        id: 'directional_compass',
        tabLabel: '八向方位罗盘',
        title: `${title} · 八向方位敏感度`,
        subTitle: '洞察你在 8 个极坐标视角扇区上的定位准确率分布',
        icon: Compass,
        renderVisualizer: (canvas, records) => {
          const sectorBuckets = Array.from({ length: 8 }, () => ({ total: 0, hits: 0, sumDist: 0 }));
          for (const r of records) {
            const angle = Number(r.angleDegree ?? 0);
            const normAngle = ((angle % 360) + 360) % 360;
            const sectorIdx = Math.floor(((normAngle + 22.5) % 360) / 45);
            sectorBuckets[sectorIdx].total += 1;
            if (r.isHit) sectorBuckets[sectorIdx].hits += 1;
            sectorBuckets[sectorIdx].sumDist += Number(r.errorPixelDistance || 0);
          }

          const sectorStats: SectorStat[] = sectorBuckets.map((b, i) => ({
            sectorIdx: i,
            label: STAR_SECTORS[i],
            total: b.total,
            accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
            avgError: b.total > 0 ? Math.round((b.sumDist / b.total) * 10) / 10 : 0,
          }));

          renderCompassCanvas(canvas, sectorStats);
        },
        renderDiagnostics: (records) => {
          const totalCount = records.length;
          if (totalCount === 0) return null;

          const sectorBuckets = Array.from({ length: 8 }, () => ({ total: 0, hits: 0 }));
          for (const r of records) {
            const angle = Number(r.angleDegree ?? 0);
            const normAngle = ((angle % 360) + 360) % 360;
            const sectorIdx = Math.floor(((normAngle + 22.5) % 360) / 45);
            sectorBuckets[sectorIdx].total += 1;
            if (r.isHit) sectorBuckets[sectorIdx].hits += 1;
          }

          const validSectors = sectorBuckets
            .map((b, i) => ({
              label: STAR_SECTORS[i],
              total: b.total,
              accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
            }))
            .filter((s) => s.total >= 3);

          const weakest =
            validSectors.length > 0
              ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
              : null;

          return (
            <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-2 text-xs">
              <div className="font-bold text-indigo-900 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-indigo-600" />
                方位盲区诊断
              </div>
              {weakest ? (
                <div className="space-y-1.5 text-[11px] text-slate-700">
                  <p>
                    你在 <span className="font-bold text-indigo-800">{weakest.label}</span> 方位上命中率最低：
                  </p>
                  <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-indigo-100 font-mono">
                    <span>{weakest.label}</span>
                    <span className="font-bold text-rose-600">{weakest.accuracy}% 准确率</span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-[11px]">
                  各方位完成至少 3 题后可生成薄弱扇区诊断。
                </p>
              )}
            </div>
          );
        },
        getOverallStats: (records) => {
          const total = records.length;
          const hits = records.filter((r) => r.isHit).length;
          const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
          return { accuracy, total };
        },
      },
    ],
  };
}

// 色相分析插件 (支持 色相偏差度 + 12色相敏感度环 双视图)
export const colorHueAnalyticsPlugin: CardAnalyticsPlugin = {
  cardId: 'color_hue',
  fetchRecords: async (id) => getTrialRecordsByCard(id),
  views: [
    {
      id: 'hue_bias_chart',
      tabLabel: '色相偏差度',
      title: '色相偏差度分析',
      subTitle: '横轴色相与纵轴偏差分布，揭示系统性偏色倾向',
      icon: Sparkles,
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
                <span
                  className={`font-bold ${
                    avgSignedBias > 0
                      ? 'text-amber-600'
                      : avgSignedBias < 0
                        ? 'text-indigo-600'
                        : 'text-slate-700'
                  }`}
                >
                  {avgSignedBias > 0
                    ? `+${avgSignedBias}° (顺时针)`
                    : avgSignedBias < 0
                      ? `${avgSignedBias}° (逆时针)`
                      : '0°'}
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
    },
    {
      id: 'hue_ring',
      tabLabel: '12 色相敏感度',
      title: '12 色相敏感度分析',
      subTitle: '洞察你对 OKLab 色彩空间 12 色相扇区的敏感度与正确率分布',
      icon: PieChart,
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
    },
  ],
};

// 负形留白占比估算分析插件
export const negRatioAnalyticsPlugin: CardAnalyticsPlugin = {
  cardId: 'neg_ratio_estimation',
  fetchRecords: async (id) => getTrialRecordsByCard(id),
  views: [
    {
      id: 'ratio_scatter',
      tabLabel: '留白占比评估',
      title: '负形留白占比评估分析',
      subTitle: '洞察你对留白空间面积占比估算的直觉灵敏度',
      icon: Crosshair,
      renderVisualizer: (canvas, records) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(0, 0, w, h);

        // 绘制散点图 (真实负形比 vs 用户估计比)
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, h - 30);
        ctx.lineTo(w - 20, 20);
        ctx.stroke();

        for (const r of records) {
          const target = Number(r.targetNegativeRatio ?? 50);
          const user = Number(r.userRatio ?? 50);
          const px = 30 + (target / 100) * (w - 50);
          const py = h - 30 - (user / 100) * (h - 50);

          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = r.isHit ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)';
          ctx.fill();
        }
      },
      renderDiagnostics: (records) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const avgRatioErr =
          totalCount > 0
            ? Math.round(
                (records.reduce((acc, c) => acc + Number(c.errorValue || 0), 0) / totalCount) * 10,
              ) / 10
            : 0;

        return (
          <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100 space-y-2 text-xs">
            <div className="font-bold text-emerald-900 flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-emerald-600" />
              空间留白敏感度诊断
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-700">
              <div className="flex justify-between font-mono bg-white p-2 rounded-xl border border-emerald-100">
                <span className="text-slate-600">负形占比平均绝对误差:</span>
                <span className="font-bold text-emerald-700">±{avgRatioErr}%</span>
              </div>
              <p className="text-slate-500 leading-relaxed">
                散点越紧贴对角线，代表对负形几何空隙的面积直觉越敏锐精准。
              </p>
            </div>
          </div>
        );
      },
      getOverallStats: (records) => {
        const total = records.length;
        const hits = records.filter((r) => r.isHit).length;
        const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
        return { accuracy, total };
      },
    },
  ],
};

export const CARD_ANALYTICS_PLUGINS: Record<string, CardAnalyticsPlugin> = {
  star_single: createStarAnalyticsPlugin('star_single', '单锚点'),
  star_double_h: createStarAnalyticsPlugin('star_double_h', '水平双锚点'),
  star_double_r: createStarAnalyticsPlugin('star_double_r', '旋转双锚点'),
  color_hue: colorHueAnalyticsPlugin,
  neg_ratio_estimation: negRatioAnalyticsPlugin,
};
~~~~~

#### Acts 2: 改造 `WeaknessAnalyticsModal.tsx` 支持多页 Tab 切换交互

~~~~~act
write_file
src/components/WeaknessAnalyticsModal.tsx
~~~~~
~~~~~typescript
import { BarChart2, Info, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { CARD_ANALYTICS_PLUGINS } from '../config/analyticsPlugins';
import type { CardDefinition } from '../types/card';
import type { UnifiedTrialRecord } from '../utils/db';

interface WeaknessAnalyticsModalProps {
  card: CardDefinition;
  onClose: () => void;
}

export function WeaknessAnalyticsModal({ card, onClose }: WeaknessAnalyticsModalProps) {
  const plugin = CARD_ANALYTICS_PLUGINS[card.id];
  const [records, setRecords] = useState<UnifiedTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeViewIndex, setActiveViewIndex] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const views = plugin?.views ?? [];
  const currentView = views[activeViewIndex] || views[0];

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (plugin) {
      plugin.fetchRecords(card.id).then((data) => {
        if (isMounted) {
          setRecords(data);
          setLoading(false);
        }
      });
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [plugin, card.id]);

  useEffect(() => {
    if (loading || !currentView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    currentView.renderVisualizer(canvas, records);
  }, [currentView, loading, records]);

  if (!plugin || views.length === 0) return null;

  const stats = currentView.getOverallStats
    ? currentView.getOverallStats(records)
    : {
        accuracy:
          records.length > 0
            ? Math.round((records.filter((r) => r.isHit).length / records.length) * 100)
            : 0,
        total: records.length,
      };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Escape' || e.key === 'Enter')) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{currentView.title}</h2>
              <p className="text-xs text-slate-400">{currentView.subTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 多页 Tab 切换栏 (当有多个视图时展示) */}
        {views.length > 1 && (
          <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl">
            {views.map((v, idx) => {
              const Icon = v.icon;
              const isActive = idx === activeViewIndex;
              return (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => setActiveViewIndex(idx)}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {v.tabLabel}
                </button>
              );
            })}
          </div>
        )}

        {/* 内容展示区 */}
        {loading ? (
          <div className="h-72 flex items-center justify-center text-slate-400 text-xs">
            正在分析历史答题数据...
          </div>
        ) : records.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Info className="w-8 h-8 text-slate-300" />
            暂无【{card.title}】的练习记录，先去完成几轮练习吧！
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* 左侧 Canvas 可视化区 */}
            <div className="md:col-span-7 flex justify-center bg-slate-900 p-4 rounded-2xl border border-slate-800 relative">
              <canvas
                key={`${card.id}-${currentView.id}`}
                ref={canvasRef}
                width={320}
                height={320}
                className="w-full max-w-[300px] aspect-square rounded-xl"
              />
            </div>

            {/* 右侧数据统计面板 */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase">总体评估</div>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-black text-slate-800">{stats.accuracy}%</span>
                  <span className="text-xs font-semibold text-slate-400 mb-1">
                    样本量: {stats.total} 题
                  </span>
                </div>
                {stats.customSummary}
              </div>

              {/* 插件个性化诊断 */}
              {currentView.renderDiagnostics(records)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
~~~~~

### 下一步建议

1. **多视图切换测试**：
   - 打开「色相 (Hue)」弱点分析：点击顶部的 **「色相偏差度」** 与 **「12 色相敏感度」** 标签，验证色相偏差折线图与 12 色相环是否均可流畅切换与渲染；
   - 打开「寻星练习」弱点分析：点击 **「空间偏置散点」** 与 **「八向方位罗盘」** 标签，验证散点热力图与八向罗盘图是否正常工作。
2. **提交版本**：若验证无误，可回复确认生成 `[COMMIT]` 计划。


### 1. 原因分析与未显示内容排查

1. **为什么原来的色相环看不到了？**
   - **根本原因**：在上一轮修改中，`colorHueAnalyticsPlugin`（即 `CARD_ANALYTICS_PLUGINS['color_hue']`）的 `renderVisualizer` 与诊断文案被**直接替换覆盖**成了新的色相偏差度图表（`renderHueBiasChartCanvas`），导致原本调用 `renderHueRingCanvas` 的 12 色相环被替代。
2. **是否存在其他无法显示的内容？**
   - **排查发现**：项目中已存在 `src/utils/canvas/drawCompass.ts`（八向方位感知罗盘图），但在寻星模式（Star-Hopping）插件中，先前只绑定了 `renderHeatmapCanvas`（空间偏置散点图），导致**八向罗盘图一直处于闲置未被激活状态**。
   - **架构瓶颈**：原先的 `CardAnalyticsPlugin` 仅支持单张卡片绑定单一视图，无法在一个练习项目中同时承载多个分析维度。

### 2. 解决方案

我们将重构弱点分析体系，为 `WeaknessAnalyticsModal` 引入**多页 Tab 切换设计**：
- **色相模块**：提供 **「色相偏差度」**（横轴色相/纵轴偏差）与 **「12 色相敏感度」**（色相环）双视图无缝切换；
- **寻星模块**：提供 **「空间偏置散点」** 与 **「八向方位罗盘」** 双视图无缝切换；
- **负形模块**：保留 **「留白占比敏感度」** 散点图并适配统一的多视图架构。

---

