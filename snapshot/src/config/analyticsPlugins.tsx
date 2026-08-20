import { AlertCircle, CheckCircle, Columns, Compass, Crosshair, Eye, Sparkles, Sun, Target } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { renderHueRingCanvas } from '../utils/canvas/drawColorRing';
import { type SectorStat, renderCompassCanvas } from '../utils/canvas/drawCompass';
import { renderHeatmapCanvas } from '../utils/canvas/drawHeatmap';
import { hsvToHex } from '../utils/colorUtils';
import { type TrainingDomain, type UnifiedTrialRecord, getTrialRecords } from '../utils/db';

export interface AnalyticsPluginContext {
  state: Record<string, unknown>;
  setState: (patch: Record<string, unknown>) => void;
}

export interface WeaknessAnalyticsPlugin<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  domain: TrainingDomain;
  title: string;
  subTitle: string;
  fetchRecords: (contextState: Record<string, unknown>) => Promise<TRecord[]>;
  renderControls?: (ctx: AnalyticsPluginContext) => ComponentChildren;
  renderVisualizer: (canvas: HTMLCanvasElement, records: TRecord[], ctx: AnalyticsPluginContext) => void;
  renderDiagnostics: (records: TRecord[], ctx: AnalyticsPluginContext) => ComponentChildren;
  getOverallStats?: (records: TRecord[]) => { accuracy: number; total: number; customSummary?: ComponentChildren };
}

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

// 1. 寻星分析插件
export const starAnalyticsPlugin: WeaknessAnalyticsPlugin = {
  domain: 'star',
  title: '视角误差与弱点分析',
  subTitle: '洞察你的视觉系统空间偏置与视角盲区',
  fetchRecords: async (ctx) => {
    const selectedMode = (ctx.starMode as string) || 'all';
    const mode = selectedMode === 'all' ? undefined : selectedMode;
    return await getTrialRecords('star', mode);
  },
  renderControls: ({ state, setState }) => {
    const starMode = (state.starMode as string) || 'all';
    const starTab = (state.starTab as string) || 'heatmap';

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-1">
          {[
            { id: 'all', name: '全部模式' },
            { id: 'single', name: '单锚点' },
            { id: 'double_h', name: '水平双锚点' },
            { id: 'double_r', name: '旋转双锚点' },
          ].map((m) => (
            <button
              type="button"
              key={m.id}
              onClick={() => setState({ starMode: m.id })}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                starMode === m.id
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setState({ starTab: 'heatmap' })}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              starTab === 'heatmap'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            偏差热力图
          </button>
          <button
            type="button"
            onClick={() => setState({ starTab: 'compass' })}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              starTab === 'compass'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            8方向罗盘
          </button>
        </div>
      </div>
    );
  },
  renderVisualizer: (canvas, records, ctx) => {
    const starTab = (ctx.state.starTab as string) || 'heatmap';
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

    if (starTab === 'heatmap') {
      renderHeatmapCanvas(canvas, records as any, avgDx, avgDy, totalCount);
    } else {
      const sectorBuckets = Array.from({ length: 8 }, () => ({ total: 0, hits: 0, sumError: 0 }));
      for (const r of records) {
        const deg = (r.angleDegree as number) ?? 0;
        const idx = Math.floor(((deg + 22.5) % 360) / 45);
        sectorBuckets[idx].total += 1;
        if (r.isHit) sectorBuckets[idx].hits += 1;
        sectorBuckets[idx].sumError += (r.errorPixelDistance as number) || 0;
      }
      const sectorStats: SectorStat[] = sectorBuckets.map((b, i) => ({
        sectorIdx: i,
        label: STAR_SECTORS[i],
        total: b.total,
        accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
        avgError: b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0,
      }));
      renderCompassCanvas(canvas, sectorStats);
    }
  },
  renderDiagnostics: (records, ctx) => {
    const starTab = (ctx.state.starTab as string) || 'heatmap';
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

    if (starTab === 'heatmap') {
      return (
        <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-2 text-xs">
          <div className="font-bold text-indigo-900 flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-indigo-600" />
            系统空间偏置 (Systematic Bias)
          </div>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            中心绿点为绝对真理点。散点越收敛代表空间直觉越敏锐。
          </p>
          <div className="pt-1 space-y-1 font-mono text-slate-700">
            <div className="flex justify-between">
              <span>平均 X 轴偏移:</span>
              <span className="font-bold">{avgDx > 0 ? `右 +${avgDx}` : avgDx < 0 ? `左 ${avgDx}` : '0'}</span>
            </div>
            <div className="flex justify-between">
              <span>平均 Y 轴偏移:</span>
              <span className="font-bold">{avgDy > 0 ? `下 +${avgDy}` : avgDy < 0 ? `上 ${avgDy}` : '0'}</span>
            </div>
            <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-200/60 pt-1">
              <span>平均像素误差:</span>
              <span>{avgDist}px</span>
            </div>
          </div>
        </div>
      );
    }

    const sectorBuckets = Array.from({ length: 8 }, () => ({ total: 0, hits: 0, sumError: 0 }));
    for (const r of records) {
      const deg = (r.angleDegree as number) ?? 0;
      const idx = Math.floor(((deg + 22.5) % 360) / 45);
      sectorBuckets[idx].total += 1;
      if (r.isHit) sectorBuckets[idx].hits += 1;
      sectorBuckets[idx].sumError += (r.errorPixelDistance as number) || 0;
    }
    const sectorStats: SectorStat[] = sectorBuckets.map((b, i) => ({
      sectorIdx: i,
      label: STAR_SECTORS[i],
      total: b.total,
      accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
      avgError: b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0,
    }));
    const validSectors = sectorStats.filter((s) => s.total >= 2);
    const weakestSector =
      validSectors.length > 0
        ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
        : null;

    return (
      <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-100 space-y-2 text-xs">
        <div className="font-bold text-amber-900 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          视角盲区与弱点扇区
        </div>
        {weakestSector ? (
          <div className="space-y-2">
            <p className="text-slate-700 text-[11px]">
              你在 <span className="font-bold text-amber-700">{weakestSector.label}</span> 方向上正确率最低：
            </p>
            <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-amber-200/60 shadow-sm">
              <span className="font-bold text-slate-800">{weakestSector.label}</span>
              <span className="font-black text-rose-600 text-sm">{weakestSector.accuracy}% 正确率</span>
            </div>
          </div>
        ) : (
          <p className="text-slate-600 text-[11px]">各方向表现均衡，继续保持！</p>
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
};

// 2. 绝对色感分析插件
export const colorAnalyticsPlugin: WeaknessAnalyticsPlugin = {
  domain: 'color',
  title: '色相感知弱点分析',
  subTitle: '洞察你对 OKLab 色彩空间 12 色相扇区的敏感度分布',
  fetchRecords: async () => {
    return await getTrialRecords('color', 'H');
  },
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
              你在 <span className="font-bold text-amber-700">{weakestSector.label}</span> 色相上辨识度最低：
            </p>
            <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-amber-200/60 shadow-sm">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full border border-slate-200"
                  style={{
                    backgroundColor: hsvToHex(weakestSector.sectorIdx * 30 + 15, 100, 100),
                  }}
                />
                <span className="font-bold text-slate-800">{weakestSector.label.split(' ')[0]}</span>
              </div>
              <span className="font-black text-rose-600 text-sm">{weakestSector.accuracy}% 正确率</span>
            </div>
          </div>
        ) : (
          <p className="text-slate-600 text-[11px]">需每个色相扇区完成至少 3 题才能生成弱点诊断。</p>
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

// 3. 相对色感分析插件
export const relativeColorAnalyticsPlugin: WeaknessAnalyticsPlugin = {
  domain: 'relative_color',
  title: '相对色感与光影偏转分析',
  subTitle: '洞察你在环境诱导视错觉下的色彩恒常性与矢量迁移敏锐度',
  fetchRecords: async () => {
    return await getTrialRecords('relative_color');
  },
  renderVisualizer: (canvas, records) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, w, h);

    const modes = [
      { id: 'VECTOR_SHIFT', label: '矢量迁移', icon: Sparkles },
      { id: 'LIGHTNESS_INDUCTION', label: '明度补偿', icon: Sun },
      { id: 'HUE_INDUCTION', label: '补色调和', icon: Eye },
      { id: 'DECONTEXTUAL_2AFC', label: '环境穿透', icon: Columns },
    ];

    const barW = (w - 60) / modes.length;
    const maxBarH = h - 70;

    modes.forEach((m, idx) => {
      const modeRecs = records.filter((r) => r.mode === m.id);
      const total = modeRecs.length;
      const hits = modeRecs.filter((r) => r.isHit).length;
      const acc = total > 0 ? hits / total : 0;

      const x = 30 + idx * barW + 10;
      const barHeight = Math.max(8, acc * maxBarH);
      const y = h - 35 - barHeight;

      // 柱体背景
      ctx.fillStyle = '#334155';
      ctx.fillRect(x, h - 35 - maxBarH, barW - 20, maxBarH);

      // 柱体实际进度
      const grad = ctx.createLinearGradient(0, y, 0, h - 35);
      if (acc >= 0.8) {
        grad.addColorStop(0, '#22C55E');
        grad.addColorStop(1, '#15803D');
      } else if (acc >= 0.6) {
        grad.addColorStop(0, '#F59E0B');
        grad.addColorStop(1, '#B45309');
      } else {
        grad.addColorStop(0, '#EF4444');
        grad.addColorStop(1, '#B91C1C');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barW - 20, barHeight);

      // 百分比文案
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(total > 0 ? `${Math.round(acc * 100)}%` : '--', x + (barW - 20) / 2, y - 6);

      // 底部标签
      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px sans-serif';
      ctx.fillText(m.label, x + (barW - 20) / 2, h - 15);
    });
  },
  renderDiagnostics: (records) => {
    const totalCount = records.length;
    if (totalCount === 0) return null;

    const modes = [
      { id: 'VECTOR_SHIFT', label: '色彩矢量迁移' },
      { id: 'LIGHTNESS_INDUCTION', label: '明度反差补偿' },
      { id: 'HUE_INDUCTION', label: '补色残像调和' },
      { id: 'DECONTEXTUAL_2AFC', label: '环境穿透判别' },
    ];

    const stats = modes.map((m) => {
      const subset = records.filter((r) => r.mode === m.id);
      const hits = subset.filter((r) => r.isHit).length;
      return {
        label: m.label,
        total: subset.length,
        acc: subset.length > 0 ? Math.round((hits / subset.length) * 100) : 0,
      };
    });

    const activeStats = stats.filter((s) => s.total >= 2);
    const weakest = activeStats.length > 0
      ? activeStats.reduce((prev, curr) => (curr.acc < prev.acc ? curr : prev))
      : null;

    return (
      <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-2 text-xs">
        <div className="font-bold text-indigo-900 flex items-center gap-1">
          <Eye className="w-3.5 h-3.5 text-indigo-600" />
          视错觉穿透与色彩恒常性诊断
        </div>
        {weakest ? (
          <div className="space-y-1 text-[11px] text-slate-700">
            <p>
              你在 <span className="font-bold text-indigo-700">{weakest.label}</span> 子项上表现相对薄弱 ({weakest.acc}%)。
            </p>
            <p className="text-slate-500">
              建议通过“环境穿透判别”训练大脑剥离背景明度欺骗，强化在强光与阴影下的纯粹固有色识别。
            </p>
          </div>
        ) : (
          <p className="text-slate-600 text-[11px]">相对色感各维度表现均衡，光影感知稳定！</p>
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
};

// 4. 正负形感知分析插件
export const negativeSpaceAnalyticsPlugin: WeaknessAnalyticsPlugin = {
  domain: 'negative_space',
  title: '正负形留白与比例分析',
  subTitle: '洞察你对留白空间面积占比估算与负形边界定点的几何敏感度',
  fetchRecords: async () => {
    return await getTrialRecords('negative_space');
  },
  renderVisualizer: (canvas, records) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, w, h);

    const modes = [
      { id: 'RATIO_ESTIMATION', label: '占比估算' },
      { id: 'AREA_COMPARISON_2AFC', label: '二分判别' },
      { id: 'NEGATIVE_VERTEX_FITTING', label: '反切定点' },
      { id: 'SHAPE_MATCH_2AFC', label: '轮廓匹配' },
    ];

    const barW = (w - 60) / modes.length;
    const maxBarH = h - 70;

    modes.forEach((m, idx) => {
      const modeRecs = records.filter((r) => r.mode === m.id);
      const total = modeRecs.length;
      const hits = modeRecs.filter((r) => r.isHit).length;
      const acc = total > 0 ? hits / total : 0;

      const x = 30 + idx * barW + 10;
      const barHeight = Math.max(8, acc * maxBarH);
      const y = h - 35 - barHeight;

      // 背景柱
      ctx.fillStyle = '#334155';
      ctx.fillRect(x, h - 35 - maxBarH, barW - 20, maxBarH);

      // 进度柱
      const grad = ctx.createLinearGradient(0, y, 0, h - 35);
      if (acc >= 0.8) {
        grad.addColorStop(0, '#10B981');
        grad.addColorStop(1, '#047857');
      } else if (acc >= 0.6) {
        grad.addColorStop(0, '#F59E0B');
        grad.addColorStop(1, '#B45309');
      } else {
        grad.addColorStop(0, '#EF4444');
        grad.addColorStop(1, '#B91C1C');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barW - 20, barHeight);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(total > 0 ? `${Math.round(acc * 100)}%` : '--', x + (barW - 20) / 2, y - 6);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px sans-serif';
      ctx.fillText(m.label, x + (barW - 20) / 2, h - 15);
    });
  },
  renderDiagnostics: (records) => {
    const totalCount = records.length;
    if (totalCount === 0) return null;

    const ratioRecs = records.filter((r) => r.mode === 'RATIO_ESTIMATION');
    const avgRatioErr =
      ratioRecs.length > 0
        ? Math.round(
            (ratioRecs.reduce((acc, c) => acc + Number(c.errorValue || 0), 0) / ratioRecs.length) *
              10,
          ) / 10
        : 0;

    return (
      <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100 space-y-2 text-xs">
        <div className="font-bold text-emerald-900 flex items-center gap-1">
          <Crosshair className="w-3.5 h-3.5 text-emerald-600" />
          空间起形与留白敏感度诊断
        </div>
        <div className="space-y-1.5 text-[11px] text-slate-700">
          {ratioRecs.length > 0 && (
            <div className="flex justify-between font-mono bg-white p-2 rounded-xl border border-emerald-100">
              <span className="text-slate-600">负形占比平均绝对误差:</span>
              <span className="font-bold text-emerald-700">±{avgRatioErr}%</span>
            </div>
          )}
          <p className="text-slate-500 leading-relaxed">
            负形训练通过抑制对具象实体的先验认知，强化对纯几何空白的捕捉能力。
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
};

export const ANALYTICS_PLUGINS: Record<TrainingDomain, WeaknessAnalyticsPlugin> = {
  star: starAnalyticsPlugin,
  color: colorAnalyticsPlugin,
  relative_color: relativeColorAnalyticsPlugin,
  negative_space: negativeSpaceAnalyticsPlugin,
};