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