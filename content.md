好的，现在我们开始执行 **Phase 2: 弱点分析插件化（OCP）与业务功能闭环**。

本阶段的核心改造包括：
1. **弱点分析插件化架构（Strategy Pattern）**：抽离 `WeaknessAnalyticsPlugin` 接口，将寻星、绝对色感、相对色感、正负形四大领域的分析逻辑完全解耦为独立插件模块。
2. **全域弱点洞察开启**：为相对色感（阿尔伯斯环境诱导与矢量迁移误差）与正负形（留白占比与顶点反切定位）新增专属的诊断图谱与统计面板，并在四大看板全量开放弱点分析入口。
3. **修复训练结算弹窗（SessionSummaryModal）的硬编码**：移除 `TrainingShell` 内硬编码的 `mode="single"`，支持按卡片动态显示训练模式、维度标签及个性化指标总结。

## [WIP] feat: 重构弱点分析为插件化策略并补全全域分析支持

### 用户需求
1. 彻底解耦 `WeaknessAnalyticsModal` 中的领域特异性逻辑，遵循开闭原则（OCP），新增统一的分析插件策略架构。
2. 为相对色感与正负形空间感知实现专有的弱点分析与诊断图谱，并在全局 4 个训练领域均开启弱点分析。
3. 修复 `SessionSummaryModal` 在非寻星单锚点模式下的标题与模式硬编码，使其动态适配所有训练卡片。

### 评论
当前分析弹窗通过硬编码 `domain === 'star' ? ... : ...` 违背了面向对象开闭原则，导致新增领域时必须侵入式修改弹窗核心代码。将其抽离为插件策略后，每个领域都能自由定制其特有的 Canvas 诊断视图、统计分析逻辑与筛选控件，架构清晰度与可扩展性大幅提升。

### 目标
1. 新建 `src/config/analyticsPlugins.tsx`，定义统一的分析策略接口 `WeaknessAnalyticsPlugin`，并实现 4 个领域的分析插件。
2. 重构 `WeaknessAnalyticsModal.tsx` 为通用的插件容器壳层。
3. 更新 `src/config/domains.ts`，为所有领域开启 `hasWeaknessAnalytics: true`。
4. 更新 `src/app.tsx` 支持全域弱点分析弹窗状态派发。
5. 重构 `SessionSummaryModal.tsx` 和 `TrainingShell.tsx`，消除 `mode="single"` 硬编码，支持按当前 `CardDefinition` 进行多态呈现。

### 基本原理
1. 通过策略模式（Strategy Pattern），`WeaknessAnalyticsModal` 仅负责弹窗生命周期、通用加载态及基础指标，具体的筛选控件、Canvas 绘图与诊断解读完全下放至各个领域的 `WeaknessAnalyticsPlugin`。
2. `SessionSummaryModal` 接收卡片元数据，基于卡片所属领域和做答指标输出精准的反馈（如正负形误差率、色差 $\Delta E$、像素偏差）。

### 标签
#intent/build #flow/ready #priority/high #comp/engine #concept/history #scope/core #scope/ux #ai/instruct #task/domain/analytics #task/object/plugin-architecture #task/action/implementation #task/state/continue

---

### Script

#### Acts 1: 新建 `src/config/analyticsPlugins.tsx` 弱点分析插件库

~~~~~act
write_file
src/config/analyticsPlugins.tsx
~~~~~
~~~~~typescript
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
~~~~~

#### Acts 2: 重构 `WeaknessAnalyticsModal.tsx` 为通用的策略壳层

~~~~~act
write_file
src/components/WeaknessAnalyticsModal.tsx
~~~~~
~~~~~typescript
import { BarChart2, Info, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ANALYTICS_PLUGINS } from '../config/analyticsPlugins';
import type { TrainingDomain, UnifiedTrialRecord } from '../utils/db';

interface WeaknessAnalyticsModalProps {
  domain: TrainingDomain;
  onClose: () => void;
}

export function WeaknessAnalyticsModal({ domain, onClose }: WeaknessAnalyticsModalProps) {
  const plugin = ANALYTICS_PLUGINS[domain];
  const [contextState, setContextState] = useState<Record<string, unknown>>({});
  const [records, setRecords] = useState<UnifiedTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleUpdateContext = (patch: Record<string, unknown>) => {
    setContextState((prev) => ({ ...prev, ...patch }));
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    plugin.fetchRecords(contextState).then((data) => {
      if (isMounted) {
        setRecords(data);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [plugin, contextState]);

  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    plugin.renderVisualizer(canvas, records, {
      state: contextState,
      setState: handleUpdateContext,
    });
  }, [plugin, loading, records, contextState]);

  const stats = plugin.getOverallStats
    ? plugin.getOverallStats(records)
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
              <h2 className="text-lg font-bold text-slate-800">{plugin.title}</h2>
              <p className="text-xs text-slate-400">{plugin.subTitle}</p>
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

        {/* 插件自定义筛选控制区 */}
        {plugin.renderControls &&
          plugin.renderControls({
            state: contextState,
            setState: handleUpdateContext,
          })}

        {/* 内容展示区 */}
        {loading ? (
          <div className="h-72 flex items-center justify-center text-slate-400 text-xs">
            正在分析历史答题数据...
          </div>
        ) : records.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Info className="w-8 h-8 text-slate-300" />
            暂无当前条件下的练习记录，先去完成几轮练习吧！
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* 左侧 Canvas 可视化区 */}
            <div className="md:col-span-7 flex justify-center bg-slate-900 p-4 rounded-2xl border border-slate-800 relative">
              <canvas
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
              {plugin.renderDiagnostics(records, {
                state: contextState,
                setState: handleUpdateContext,
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
~~~~~

#### Acts 3: 开启全域弱点分析 `src/config/domains.ts` 与更新 `src/app.tsx`

~~~~~act
patch_file
src/config/domains.ts
~~~~~
~~~~~typescript.old
  relative_color: {
    domain: 'relative_color',
    appId: 'relative-color',
    title: '相对色感',
    subTitle: 'Relative Color',
    homeTitle: '相对色感 (Relative Color Perception)',
    homeDesc:
      '基于 OKLab 感知均匀色彩空间，通过固有色与环境光的推移矢量 (Vector v_AB)，建立客观光影下相对色彩推移与对比关系的硬核艺术敏锐度。',
    themeColor: 'purple',
    icon: Shuffle,
    hasWeaknessAnalytics: false,
    get cards() {
      return getCardsByDomain('relative_color');
    },
  },
  negative_space: {
    domain: 'negative_space',
    appId: 'negative-space',
    title: '正负形感知',
    subTitle: 'Negative Space',
    homeTitle: '正负形空间感知 (Negative Space)',
    homeDesc:
      '切换观察视角，通过对几何剪影周围留白（负形）面积占比的估算与反切定点，打破具象认知偏见，培养专业起形与比例感知力。',
    themeColor: 'emerald',
    icon: Maximize2,
    hasWeaknessAnalytics: false,
    get cards() {
      return getCardsByDomain('negative_space');
    },
  },
~~~~~
~~~~~typescript.new
  relative_color: {
    domain: 'relative_color',
    appId: 'relative-color',
    title: '相对色感',
    subTitle: 'Relative Color',
    homeTitle: '相对色感 (Relative Color Perception)',
    homeDesc:
      '基于 OKLab 感知均匀色彩空间，通过固有色与环境光的推移矢量 (Vector v_AB)，建立客观光影下相对色彩推移与对比关系的硬核艺术敏锐度。',
    themeColor: 'purple',
    icon: Shuffle,
    hasWeaknessAnalytics: true,
    get cards() {
      return getCardsByDomain('relative_color');
    },
  },
  negative_space: {
    domain: 'negative_space',
    appId: 'negative-space',
    title: '正负形感知',
    subTitle: 'Negative Space',
    homeTitle: '正负形空间感知 (Negative Space)',
    homeDesc:
      '切换观察视角，通过对几何剪影周围留白（负形）面积占比的估算与反切定点，打破具象认知偏见，培养专业起形与比例感知力。',
    themeColor: 'emerald',
    icon: Maximize2,
    hasWeaknessAnalytics: true,
    get cards() {
      return getCardsByDomain('negative_space');
    },
  },
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
  const [activeAnalyticsDomain, setActiveAnalyticsDomain] = useState<'star' | 'color' | null>(null);
  const [settings, setSettings] = useState<UserSettings>(loadSettings);
~~~~~
~~~~~typescript.new
  const [activeAnalyticsDomain, setActiveAnalyticsDomain] = useState<TrainingDomain | null>(null);
  const [settings, setSettings] = useState<UserSettings>(loadSettings);
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
                onOpenAnalytics={() => {
                  if (domain === 'star' || domain === 'color') {
                    setActiveAnalyticsDomain(domain);
                  }
                }}
              />
            );
          }
~~~~~
~~~~~typescript.new
                onOpenAnalytics={() => {
                  setActiveAnalyticsDomain(domain);
                }}
              />
            );
          }
~~~~~

#### Acts 4: 重构 `SessionSummaryModal.tsx` 动态适配任意卡片

~~~~~act
write_file
src/components/SessionSummaryModal.tsx
~~~~~
~~~~~typescript
import { ArrowRight, Award, Clock, Home, RotateCcw, Target, Zap } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import type { CardDefinition } from '../types/card';
import { renderSessionTrendChartCanvas } from '../utils/canvas/drawTrendChart';

export interface SessionHistoryItem {
  trialIndex: number;
  level: number;
  isHit: boolean;
  responseTimeMs: number;
}

interface SessionSummaryModalProps {
  card: CardDefinition;
  sessionType: 'training' | 'benchmark';
  elapsedSeconds: number;
  history: SessionHistoryItem[];
  onClose: () => void;
  onRestart: () => void;
}

export function SessionSummaryModal({
  card,
  sessionType,
  elapsedSeconds,
  history,
  onClose,
  onRestart,
}: SessionSummaryModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const totalTrials = history.length;
  const hitCount = history.filter((h) => h.isHit).length;
  const accuracy = totalTrials > 0 ? Math.round((hitCount / totalTrials) * 100) : 0;

  const startLevel = history.length > 0 ? history[0].level : 5;
  const endLevel = history.length > 0 ? history[history.length - 1].level : 5;
  const levelDiff = endLevel - startLevel;

  const avgResponseTimeSec =
    totalTrials > 0
      ? (history.reduce((acc, curr) => acc + curr.responseTimeMs, 0) / totalTrials / 1000).toFixed(
          1,
        )
      : '0.0';

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && history.length > 0) {
      renderSessionTrendChartCanvas(canvas, history);
    }
  }, [history]);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Escape' || e.key === 'Enter')) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Award className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">训练总结与成果</h2>
              <p className="text-xs text-slate-400">
                {card.title} • {sessionType === 'benchmark' ? '20 题基准测试' : '自适应训练'}
              </p>
            </div>
          </div>
        </div>

        {/* 核心指标统计卡片 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              正确率 / 题数
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800">{accuracy}%</span>
              <span className="text-xs font-semibold text-slate-400">
                ({hitCount}/{totalTrials} 题)
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              训练时长
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800">
                {formatTime(elapsedSeconds)}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                ({avgResponseTimeSec}秒/题)
              </span>
            </div>
          </div>
        </div>

        {/* 层阶提升高亮卡片 */}
        <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 text-white rounded-xl">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-900">能力层阶演进</div>
              <div className="text-[11px] text-indigo-600">
                {levelDiff > 0
                  ? `难度层阶提升了 ${levelDiff} 级！`
                  : levelDiff < 0
                    ? `难度层阶回调了 ${Math.abs(levelDiff)} 级`
                    : '稳健维持当前难度层阶'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono font-black text-slate-800 text-base">
            <span className="bg-white px-2.5 py-1 rounded-xl border border-indigo-100 shadow-sm">
              Lvl {startLevel}
            </span>
            <ArrowRight className="w-4 h-4 text-indigo-500" />
            <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-xl shadow-sm">
              Lvl {endLevel}
            </span>
          </div>
        </div>

        {/* 折线图 Canvas 区 */}
        <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
          <div className="flex justify-between items-center px-1 mb-2">
            <span className="text-[11px] font-bold text-slate-400">难度层阶变化曲线</span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> 击中
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> 未击中
              </span>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={440}
            height={160}
            className="w-full aspect-[11/4] rounded-xl"
          />
        </div>

        {/* 底部操作按钮 */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Home className="w-4 h-4" />
            返回主页
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            再练一轮
          </button>
        </div>
      </div>
    </div>
  );
}
~~~~~

#### Acts 5: 更新 `TrainingShell.tsx` 传递完整 `card` 给结算弹窗

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript.old
import { ArrowLeft, ChevronRight, Clock, Crosshair } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import type { SessionHistoryItem } from '../SessionSummaryModal';
import { SessionSummaryModal } from '../SessionSummaryModal';
import { IdlePauseOverlay } from '../common/IdlePauseOverlay';
~~~~~
~~~~~typescript.new
import { ArrowLeft, ChevronRight, Clock, Crosshair } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import type { CardDefinition } from '../../types/card';
import type { SessionHistoryItem } from '../SessionSummaryModal';
import { SessionSummaryModal } from '../SessionSummaryModal';
import { IdlePauseOverlay } from '../common/IdlePauseOverlay';
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript.old
interface TrainingShellProps {
  title: string;
  badge: string;
  sessionType: 'training' | 'benchmark';
  currentLevel: number;
  isTargeting?: boolean;
  autoNext: boolean;
  session: TrainingSessionHandle;
  onExit: () => void;
  children: (state: { disabled: boolean; isIdle: boolean }) => ComponentChildren;
}

export function TrainingShell({
  title,
  badge,
  sessionType,
  currentLevel,
  isTargeting = false,
  autoNext,
  session,
  children,
}: TrainingShellProps) {
~~~~~
~~~~~typescript.new
interface TrainingShellProps {
  card: CardDefinition;
  sessionType: 'training' | 'benchmark';
  currentLevel: number;
  isTargeting?: boolean;
  autoNext: boolean;
  session: TrainingSessionHandle;
  onExit: () => void;
  children: (state: { disabled: boolean; isIdle: boolean }) => ComponentChildren;
}

export function TrainingShell({
  card,
  sessionType,
  currentLevel,
  isTargeting = false,
  autoNext,
  session,
  children,
}: TrainingShellProps) {
  const { title } = card;
  const badge = card.tags.target[0];
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript.old
      {/* 统一结课总结弹窗 */}
      {showSummaryModal && (
        <SessionSummaryModal
          mode="single"
          sessionType={sessionType}
          elapsedSeconds={elapsedSeconds}
          history={sessionHistory}
          onClose={handleFinishSession}
          onRestart={handleRestartSession}
        />
      )}
    </div>
  );
}
~~~~~
~~~~~typescript.new
      {/* 统一结课总结弹窗 */}
      {showSummaryModal && (
        <SessionSummaryModal
          card={card}
          sessionType={sessionType}
          elapsedSeconds={elapsedSeconds}
          history={sessionHistory}
          onClose={handleFinishSession}
          onRestart={handleRestartSession}
        />
      )}
    </div>
  );
}
~~~~~

#### Acts 6: 更新 `GenericTrainingView.tsx` 匹配 `TrainingShell` 的 `card` 属性

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript.old
  return (
    <TrainingShell
      title={card.title}
      badge={card.tags.target[0]}
      sessionType={sessionType}
      currentLevel={session.question ? plugin.getQuestionLevel(session.question) : initialLevel}
      isTargeting={isTargeting}
      autoNext={settings.autoNext}
      session={session}
      onExit={onExit}
    >
      {({ disabled, isIdle }) =>
~~~~~
~~~~~typescript.new
  return (
    <TrainingShell
      card={card}
      sessionType={sessionType}
      currentLevel={session.question ? plugin.getQuestionLevel(session.question) : initialLevel}
      isTargeting={isTargeting}
      autoNext={settings.autoNext}
      session={session}
      onExit={onExit}
    >
      {({ disabled, isIdle }) =>
~~~~~

### 下一步建议

执行质量检测：
~~~~~
npm run check
npm run test:coverage || npm run test
~~~~~

1. 确认四大模块的弱点分析与通用结算弹窗功能正常。
2. 开启 **Phase 3: 路由与 UI 现代化**，引入声明式 Hash 路由并封装 Toast / Confirm 模态弹窗。
