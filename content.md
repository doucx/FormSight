我已为你规划并准备执行完整的重构计划：清理死代码与空壳转发文件，将各个业务领域的视图组件与领域算法完整下沉归位到对应的 `src/domains/<domain>/` 目录中，实现领域高度内聚（Domain Colocation），并保持系统行为完全一致。

## [WIP] refactor(domains): 下沉领域组件与算法至对应 domains 目录并清理死代码

### 用户需求
1. 删除死代码 `ContinuousTrackPanel.tsx` 与所有未使用的 `src/utils/*Utils.ts` 空壳转发文件。
2. 将 `src/components/{abstraction,angle,negativeSpace,relativeColor}/` 下的组件物理移动至 `src/domains/<domain>/components/`。
3. 将 `src/utils/{abstraction,negativeSpace,relativeColor,geometry}/` 下的算法物理移动至 `src/domains/<domain>/utils/`。
4. 将 `analyticsPlugins` 弱点分析插件下沉至对应领域内部自注册，解除中央硬编码依赖。
5. 保证所有引用路径修正正确，编译、测试及所有训练流程体验一致。

### 评论
该重构将彻底解决领域逻辑与视图碎片化分散在全局 `components`、`utils`、`config`、`domains` 4个不同目录的问题，形成完全自治的 Domain 插件化结构。

### 目标
1. 移除死代码与无用 shims 文件。
2. 将各领域特有组件与工具函数下沉至所属 `src/domains/<domain>/`。
3. 将分析插件声明就地收敛至所属领域。
4. 更新所有跨模块 import 路径，确保 TypeScript 类型检查通过。

### 基本原理
通过 `move_file` 配合就地 `patch_file` 修复相对导入路径，以极高的重构效率完成文件迁移，避免冗余 token 消耗；通过 Domain Manifest 原生聚合卡片、插件、算法与分析视图。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #concept/state #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/domain-colocation #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 删除死代码与多余空壳转发文件

我们将删除从未被引用的 `ContinuousTrackPanel.tsx`、中央化 `analyticsPlugins.tsx`、以及一系列 `src/utils/*Utils.ts` 透传文件。

~~~~~act
delete_file
src/components/common/ContinuousTrackPanel.tsx
~~~~~
~~~~~act
delete_file
src/config/analyticsPlugins.tsx
~~~~~
~~~~~act
delete_file
src/config/cards.ts
~~~~~
~~~~~act
delete_file
src/config/registry.ts
~~~~~
~~~~~act
delete_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~act
delete_file
src/utils/adaptiveEngine.ts
~~~~~
~~~~~act
delete_file
src/utils/angleUtils.ts
~~~~~
~~~~~act
delete_file
src/utils/colorUtils.ts
~~~~~
~~~~~act
delete_file
src/utils/geometry.ts
~~~~~
~~~~~act
delete_file
src/utils/mathUtils.ts
~~~~~
~~~~~act
delete_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~act
delete_file
src/utils/noiseUtils.ts
~~~~~
~~~~~act
delete_file
src/utils/oklchUtils.ts
~~~~~
~~~~~act
delete_file
src/utils/relativeColorUtils.ts
~~~~~
~~~~~act
delete_file
src/utils/canvas/drawPointGrid.ts
~~~~~
~~~~~act
delete_file
src/utils/canvas/drawPolygon.ts
~~~~~
~~~~~act
delete_file
src/utils/canvas/hidpi.ts
~~~~~

#### Acts 2: 迁移各领域组件与工具文件 (move_file)

将组件和算法按领域下沉到各自的 `src/domains/<domain>/` 目录。

~~~~~act
move_file
src/components/abstraction/GestureAxisView.tsx
src/domains/abstraction/components/GestureAxisView.tsx
~~~~~
~~~~~act
move_file
src/components/abstraction/NotanThresholdView.tsx
src/domains/abstraction/components/NotanThresholdView.tsx
~~~~~
~~~~~act
move_file
src/components/abstraction/PaletteClusteringView.tsx
src/domains/abstraction/components/PaletteClusteringView.tsx
~~~~~
~~~~~act
move_file
src/components/abstraction/TopDown2AfcView.tsx
src/domains/abstraction/components/TopDown2AfcView.tsx
~~~~~
~~~~~act
move_file
src/components/abstraction/TopDownPatternView.tsx
src/domains/abstraction/components/TopDownPatternView.tsx
~~~~~
~~~~~act
move_file
src/utils/abstraction/types.ts
src/domains/abstraction/utils/types.ts
~~~~~
~~~~~act
move_file
src/utils/abstraction/pca.ts
src/domains/abstraction/utils/pca.ts
~~~~~
~~~~~act
move_file
src/utils/abstraction/polygon.ts
src/domains/abstraction/utils/polygon.ts
~~~~~
~~~~~act
move_file
src/utils/abstraction/questionGenerator.ts
src/domains/abstraction/utils/questionGenerator.ts
~~~~~
~~~~~act
move_file
src/utils/abstraction/hitDetection.ts
src/domains/abstraction/utils/hitDetection.ts
~~~~~
~~~~~act
move_file
src/utils/abstraction/index.ts
src/domains/abstraction/utils/index.ts
~~~~~

~~~~~act
move_file
src/components/angle/AngleComparison2AfcView.tsx
src/domains/angle/components/AngleComparison2AfcView.tsx
~~~~~
~~~~~act
move_file
src/components/angle/AngleEstimationView.tsx
src/domains/angle/components/AngleEstimationView.tsx
~~~~~
~~~~~act
move_file
src/components/angle/AngleParallel2AfcView.tsx
src/domains/angle/components/AngleParallel2AfcView.tsx
~~~~~

~~~~~act
move_file
src/components/negativeSpace/AreaComparison2AfcView.tsx
src/domains/negative_space/components/AreaComparison2AfcView.tsx
~~~~~
~~~~~act
move_file
src/components/negativeSpace/RatioEstimationView.tsx
src/domains/negative_space/components/RatioEstimationView.tsx
~~~~~
~~~~~act
move_file
src/components/negativeSpace/ShapeMemory2AfcView.tsx
src/domains/negative_space/components/ShapeMemory2AfcView.tsx
~~~~~
~~~~~act
move_file
src/components/negativeSpace/VertexFittingView.tsx
src/domains/negative_space/components/VertexFittingView.tsx
~~~~~
~~~~~act
move_file
src/utils/negativeSpace/types.ts
src/domains/negative_space/utils/types.ts
~~~~~
~~~~~act
move_file
src/utils/negativeSpace/polygonMath.ts
src/domains/negative_space/utils/polygonMath.ts
~~~~~
~~~~~act
move_file
src/utils/negativeSpace/questionGenerator.ts
src/domains/negative_space/utils/questionGenerator.ts
~~~~~
~~~~~act
move_file
src/utils/negativeSpace/hitDetection.ts
src/domains/negative_space/utils/hitDetection.ts
~~~~~
~~~~~act
move_file
src/utils/negativeSpace/index.ts
src/domains/negative_space/utils/index.ts
~~~~~

~~~~~act
move_file
src/components/relativeColor/AlbersInductionView.tsx
src/domains/relative_color/components/AlbersInductionView.tsx
~~~~~
~~~~~act
move_file
src/components/relativeColor/Decontextual2AfcView.tsx
src/domains/relative_color/components/Decontextual2AfcView.tsx
~~~~~
~~~~~act
move_file
src/components/relativeColor/HueInductionView.tsx
src/domains/relative_color/components/HueInductionView.tsx
~~~~~
~~~~~act
move_file
src/components/relativeColor/VectorShiftView.tsx
src/domains/relative_color/components/VectorShiftView.tsx
~~~~~
~~~~~act
move_file
src/utils/relativeColor/types.ts
src/domains/relative_color/utils/types.ts
~~~~~
~~~~~act
move_file
src/utils/relativeColor/inductionMath.ts
src/domains/relative_color/utils/inductionMath.ts
~~~~~
~~~~~act
move_file
src/utils/relativeColor/generators.ts
src/domains/relative_color/utils/generators.ts
~~~~~
~~~~~act
move_file
src/utils/relativeColor/hitDetection.ts
src/domains/relative_color/utils/hitDetection.ts
~~~~~
~~~~~act
move_file
src/utils/relativeColor/index.ts
src/domains/relative_color/utils/index.ts
~~~~~

~~~~~act
move_file
src/utils/geometry/pointMath.ts
src/domains/star/utils/pointMath.ts
~~~~~
~~~~~act
move_file
src/utils/geometry/gridGenerators.ts
src/domains/star/utils/gridGenerators.ts
~~~~~
~~~~~act
move_file
src/utils/geometry/hitDetection.ts
src/domains/star/utils/hitDetection.ts
~~~~~
~~~~~act
move_file
src/utils/geometry/questionGenerator.ts
src/domains/star/utils/questionGenerator.ts
~~~~~
~~~~~act
move_file
src/utils/geometry/index.ts
src/domains/star/utils/index.ts
~~~~~

#### Acts 3: 核心契约与分析插件类型就地定义

在 `src/core/contracts.ts` 中声明分析插件类型 `CardAnalyticsPlugin`，避免反向依赖 config 目录。并在 `star`, `color`, `negative_space` 内部创建专属 `analytics.tsx`。

~~~~~act
patch_file
src/core/contracts.ts
~~~~~
~~~~~typescript.old
import type { CardAnalyticsPlugin } from '../config/analyticsPlugins';
import type { DomainMeta } from '../config/domains';
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db/schema';
import type { BaseModuleSettings } from '../utils/settings';

/**
 * 领域包清单 (Domain Manifest)
 * 每一个垂直领域模块 (如 angle, star, color) 必须在 index.ts 中默认导出此对象
 */
export interface DomainManifest {
  domain: TrainingDomain;
  meta: DomainMeta;
  cards: CardDefinition[];
  trainingPlugin: AnyTrainingPlugin;
  analyticsPlugins?: Record<string, CardAnalyticsPlugin>;
  defaultCardSettings?: Record<string, Partial<BaseModuleSettings>>;
}
~~~~~
~~~~~typescript.new
import type { ComponentChildren } from 'preact';
import type { DomainMeta } from '../config/domains';
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain, UnifiedTrialRecord } from '../utils/db/schema';
import type { BaseModuleSettings } from '../utils/settings';

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

/**
 * 领域包清单 (Domain Manifest)
 * 每一个垂直领域模块 (如 angle, star, color) 必须在 index.ts 中默认导出此对象
 */
export interface DomainManifest {
  domain: TrainingDomain;
  meta: DomainMeta;
  cards: CardDefinition[];
  trainingPlugin: AnyTrainingPlugin;
  analyticsPlugins?: Record<string, CardAnalyticsPlugin>;
  defaultCardSettings?: Record<string, Partial<BaseModuleSettings>>;
}
~~~~~

~~~~~act
write_file
src/domains/star/analytics.tsx
~~~~~
~~~~~typescript
import { Compass, Target } from 'lucide-preact';
import type { CardAnalyticsPlugin } from '../../core/contracts';
import { type SectorStat, renderCompassCanvas } from '../../utils/canvas/drawCompass';
import { renderHeatmapCanvas } from '../../utils/canvas/drawHeatmap';
import { getTrialRecordsByCard } from '../../utils/db';

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

export function createStarAnalyticsPlugin(cardId: string, title: string): CardAnalyticsPlugin {
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
          const sectorBuckets = Array.from({ length: 8 }, () => ({
            total: 0,
            hits: 0,
            sumDist: 0,
          }));
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
                    你在 <span className="font-bold text-indigo-800">{weakest.label}</span>{' '}
                    方位上命中率最低：
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
~~~~~

~~~~~act
write_file
src/domains/color/analytics.tsx
~~~~~
~~~~~typescript
import { AlertCircle, PieChart, Sparkles } from 'lucide-preact';
import type { CardAnalyticsPlugin } from '../../core/contracts';
import { renderHueRingCanvas } from '../../utils/canvas/drawColorRing';
import type { SectorStat } from '../../utils/canvas/drawCompass';
import { calcSignedHueBias, renderHueBiasChartCanvas } from '../../utils/canvas/drawHueBiasChart';
import { hsvToHex } from '../../utils/colorUtils';
import { getTrialRecordsByCard } from '../../utils/db';

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
                    最大偏差扇区：
                    <span className="font-bold text-amber-800">{maxBiasSector.label}</span>
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
                      平均偏差:{' '}
                      {maxBiasSector.avgBias > 0
                        ? `+${maxBiasSector.avgBias}°`
                        : `${maxBiasSector.avgBias}°`}
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
        const sectorBuckets = Array.from({ length: 12 }, () => ({
          total: 0,
          hits: 0,
          sumError: 0,
        }));
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

        const sectorBuckets = Array.from({ length: 12 }, () => ({
          total: 0,
          hits: 0,
          sumError: 0,
        }));
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
~~~~~

~~~~~act
write_file
src/domains/negative_space/analytics.tsx
~~~~~
~~~~~typescript
import { Crosshair } from 'lucide-preact';
import type { CardAnalyticsPlugin } from '../../core/contracts';
import { getTrialRecordsByCard } from '../../utils/db';

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
~~~~~

#### Acts 4: 修复领域内部引用与 Manifest 声明

更新各个 domain 下的 `index.ts`, `plugin.tsx`, `components/*`, `utils/*` 内部相互引用路径。

~~~~~act
patch_file
src/domains/star/index.ts
~~~~~
~~~~~typescript.old
import { Compass, Crosshair, RotateCw, Target } from 'lucide-preact';
import { CARD_ANALYTICS_PLUGINS } from '../../config/analyticsPlugins';
import { STAR_SCHEMAS } from '../../config/schemas';
import type { DomainManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { starPlugin } from './plugin';
~~~~~
~~~~~typescript.new
import { Compass, Crosshair, RotateCw, Target } from 'lucide-preact';
import { STAR_SCHEMAS } from '../../config/schemas';
import type { DomainManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { createStarAnalyticsPlugin } from './analytics';
import { starPlugin } from './plugin';
~~~~~

~~~~~act
patch_file
src/domains/star/index.ts
~~~~~
~~~~~typescript.old
  analyticsPlugins: {
    star_single: CARD_ANALYTICS_PLUGINS.star_single,
    star_double_h: CARD_ANALYTICS_PLUGINS.star_double_h,
    star_double_r: CARD_ANALYTICS_PLUGINS.star_double_r,
  },
};
~~~~~
~~~~~typescript.new
  analyticsPlugins: {
    star_single: createStarAnalyticsPlugin('star_single', '单锚点'),
    star_double_h: createStarAnalyticsPlugin('star_double_h', '水平双锚点'),
    star_double_r: createStarAnalyticsPlugin('star_double_r', '旋转双锚点'),
  },
};
~~~~~

~~~~~act
patch_file
src/domains/star/plugin.tsx
~~~~~
~~~~~typescript.old
import type { TrainingPlugin } from '../../config/trainingPlugins';
import type { HitResult, Point, QuestionData } from '../../types';
import { type QuestionGenerateOptions, checkHit, generateQuestion } from '../../utils/geometry';
import type { StarSettings } from '../../utils/settings';
import { StarCanvas } from './views/StarCanvas';
~~~~~
~~~~~typescript.new
import type { TrainingPlugin } from '../../config/trainingPlugins';
import type { HitResult, Point, QuestionData } from '../../types';
import type { StarSettings } from '../../utils/settings';
import { type QuestionGenerateOptions, checkHit, generateQuestion } from './utils/index';
import { StarCanvas } from './views/StarCanvas';
~~~~~

~~~~~act
patch_file
src/domains/color/index.ts
~~~~~
~~~~~typescript.old
import { Droplet, Palette, RotateCw, Sun } from 'lucide-preact';
import { colorHueAnalyticsPlugin } from '../../config/analyticsPlugins';
import { COLOR_ALL_SCHEMAS, HUE_SCHEMAS, SLIDER_COMMON_SCHEMAS } from '../../config/schemas';
import type { DomainManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { colorPlugin } from './plugin';
~~~~~
~~~~~typescript.new
import { Droplet, Palette, RotateCw, Sun } from 'lucide-preact';
import { COLOR_ALL_SCHEMAS, HUE_SCHEMAS, SLIDER_COMMON_SCHEMAS } from '../../config/schemas';
import type { DomainManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { colorHueAnalyticsPlugin } from './analytics';
import { colorPlugin } from './plugin';
~~~~~

~~~~~act
patch_file
src/domains/negative_space/index.ts
~~~~~
~~~~~typescript.old
import { Columns, Crosshair, Maximize2, Sparkles } from 'lucide-preact';
import { negRatioAnalyticsPlugin } from '../../config/analyticsPlugins';
import { SLIDER_COMMON_SCHEMAS } from '../../config/schemas';
import type { DomainManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { negativeSpacePlugin } from './plugin';
~~~~~
~~~~~typescript.new
import { Columns, Crosshair, Maximize2, Sparkles } from 'lucide-preact';
import { SLIDER_COMMON_SCHEMAS } from '../../config/schemas';
import type { DomainManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { negRatioAnalyticsPlugin } from './analytics';
import { negativeSpacePlugin } from './plugin';
~~~~~

~~~~~act
patch_file
src/domains/negative_space/plugin.tsx
~~~~~
~~~~~typescript.old
import type { TrainingPlugin } from '../../config/trainingPlugins';
import type { Point } from '../../types';
import {
  type NegativeSpaceHitResult,
  type NegativeSpaceMode,
  type NegativeSpaceQuestionData,
  checkNegativeSpaceHit,
  generateNegativeSpaceQuestion,
} from '../../utils/negativeSpaceUtils';
import type { NegativeSpaceSettings } from '../../utils/settings';
import { NegativeSpaceCanvas } from './views/NegativeSpaceCanvas';
~~~~~
~~~~~typescript.new
import type { TrainingPlugin } from '../../config/trainingPlugins';
import type { Point } from '../../types';
import type { NegativeSpaceSettings } from '../../utils/settings';
import {
  type NegativeSpaceHitResult,
  type NegativeSpaceMode,
  type NegativeSpaceQuestionData,
  checkNegativeSpaceHit,
  generateNegativeSpaceQuestion,
} from './utils/index';
import { NegativeSpaceCanvas } from './views/NegativeSpaceCanvas';
~~~~~

~~~~~act
patch_file
src/domains/negative_space/views/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
import { AreaComparison2AfcView } from '../../../components/negativeSpace/AreaComparison2AfcView';
import { RatioEstimationView } from '../../../components/negativeSpace/RatioEstimationView';
import { ShapeMemory2AfcView } from '../../../components/negativeSpace/ShapeMemory2AfcView';
import { VertexFittingView } from '../../../components/negativeSpace/VertexFittingView';
import type { Point } from '../../../types';
import type {
  NegativeSpaceHitResult,
  NegativeSpaceQuestionData,
} from '../../../utils/negativeSpace';
~~~~~
~~~~~typescript.new
import type { Point } from '../../../types';
import { AreaComparison2AfcView } from '../components/AreaComparison2AfcView';
import { RatioEstimationView } from '../components/RatioEstimationView';
import { ShapeMemory2AfcView } from '../components/ShapeMemory2AfcView';
import { VertexFittingView } from '../components/VertexFittingView';
import type {
  NegativeSpaceHitResult,
  NegativeSpaceQuestionData,
} from '../utils/index';
~~~~~

~~~~~act
patch_file
src/domains/negative_space/components/AreaComparison2AfcView.tsx
~~~~~
~~~~~typescript.old
import { Columns } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { drawPolygonCanvas } from '../../utils/canvas/drawPolygon';
import {
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
  TWO_AFC_CANVAS_SIZE,
} from '../../utils/negativeSpace';
import { Choice2AfcContainer } from '../common/Choice2AfcContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';
~~~~~
~~~~~typescript.new
import { Columns } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Choice2AfcContainer } from '../../../components/common/Choice2AfcContainer';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import {
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
  TWO_AFC_CANVAS_SIZE,
} from '../utils/index';
~~~~~

~~~~~act
patch_file
src/domains/negative_space/components/RatioEstimationView.tsx
~~~~~
~~~~~typescript.old
import { Maximize2 } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../../hooks/useTrackPointer';
import { drawPolygonCanvas } from '../../utils/canvas/drawPolygon';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../../utils/negativeSpace';
import { QuestionCardShell } from '../common/QuestionCardShell';
~~~~~
~~~~~typescript.new
import { Maximize2 } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import { useTrackPointer } from '../../../hooks/useTrackPointer';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../utils/index';
~~~~~

~~~~~act
patch_file
src/domains/negative_space/components/ShapeMemory2AfcView.tsx
~~~~~
~~~~~typescript.old
import { Sparkles } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { drawPolygonCanvas } from '../../utils/canvas/drawPolygon';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../../utils/negativeSpace';
import { Choice2AfcContainer } from '../common/Choice2AfcContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';
~~~~~
~~~~~typescript.new
import { Sparkles } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Choice2AfcContainer } from '../../../components/common/Choice2AfcContainer';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../utils/index';
~~~~~

~~~~~act
patch_file
src/domains/negative_space/components/VertexFittingView.tsx
~~~~~
~~~~~typescript.old
import { Columns } from 'lucide-preact';
import { useCallback, useEffect, useRef } from 'preact/hooks';
import type { Point } from '../../types';
import { drawPolygonCanvas } from '../../utils/canvas/drawPolygon';
import {
  FITTING_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../../utils/negativeSpace';
import { DualViewportContainer } from '../common/DualViewportContainer';
import { PointClickCanvas } from '../common/PointClickCanvas';
import { QuestionCardShell } from '../common/QuestionCardShell';
~~~~~
~~~~~typescript.new
import { Columns } from 'lucide-preact';
import { useCallback, useEffect, useRef } from 'preact/hooks';
import { DualViewportContainer } from '../../../components/common/DualViewportContainer';
import { PointClickCanvas } from '../../../components/common/PointClickCanvas';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import type { Point } from '../../../types';
import {
  FITTING_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../utils/index';
~~~~~

~~~~~act
patch_file
src/domains/negative_space/utils/hitDetection.ts
~~~~~
~~~~~typescript.old
import type { Point } from '../../types';
import { checkHit } from '../geometry';
import type { NegativeSpaceHitResult, NegativeSpaceQuestionData } from './types';
~~~~~
~~~~~typescript.new
import type { Point } from '../../../types';
import { checkHit } from '../../star/utils/index';
import type { NegativeSpaceHitResult, NegativeSpaceQuestionData } from './types';
~~~~~

~~~~~act
patch_file
src/domains/negative_space/utils/polygonMath.ts
~~~~~
~~~~~typescript.old
import type { Point } from '../../types';
import { expDecayInterpolate } from '../mathUtils';
import { NEGATIVE_SPACE_CANVAS_SIZE, TWO_AFC_CANVAS_SIZE } from './types';
~~~~~
~~~~~typescript.new
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
import { NEGATIVE_SPACE_CANVAS_SIZE, TWO_AFC_CANVAS_SIZE } from './types';
~~~~~

~~~~~act
patch_file
src/domains/negative_space/utils/questionGenerator.ts
~~~~~
~~~~~typescript.old
import type { Point } from '../../types';
import {
  calcPolygonArea,
  generateRandomPolygon,
  get2AfcdeltaForLevel,
  getNegativeSpaceToleranceForLevel,
  perturbPolygon,
  scalePolygonToArea,
} from './polygonMath';
~~~~~
~~~~~typescript.new
import type { Point } from '../../../types';
import {
  calcPolygonArea,
  generateRandomPolygon,
  get2AfcdeltaForLevel,
  getNegativeSpaceToleranceForLevel,
  perturbPolygon,
  scalePolygonToArea,
} from './polygonMath';
~~~~~

~~~~~act
patch_file
src/domains/abstraction/plugin.tsx
~~~~~
~~~~~typescript.old
import type { TrainingPlugin } from '../../config/trainingPlugins';
import {
  type AbstractionHitResult,
  type AbstractionMode,
  type AbstractionQuestionData,
  checkAbstractionHit,
  generateAbstractionQuestion,
} from '../../utils/abstractionUtils';
import type { BaseModuleSettings } from '../../utils/settings';
import { AbstractionCanvas } from './views/AbstractionCanvas';
~~~~~
~~~~~typescript.new
import type { TrainingPlugin } from '../../config/trainingPlugins';
import type { BaseModuleSettings } from '../../utils/settings';
import {
  type AbstractionHitResult,
  type AbstractionMode,
  type AbstractionQuestionData,
  checkAbstractionHit,
  generateAbstractionQuestion,
} from './utils/index';
import { AbstractionCanvas } from './views/AbstractionCanvas';
~~~~~

~~~~~act
patch_file
src/domains/abstraction/views/AbstractionCanvas.tsx
~~~~~
~~~~~typescript.old
import { GestureAxisView } from '../../../components/abstraction/GestureAxisView';
import { NotanThresholdView } from '../../../components/abstraction/NotanThresholdView';
import { PaletteClusteringView } from '../../../components/abstraction/PaletteClusteringView';
import { TopDown2AfcView } from '../../../components/abstraction/TopDown2AfcView';
import { TopDownPatternView } from '../../../components/abstraction/TopDownPatternView';
import type { AbstractionHitResult, AbstractionQuestionData } from '../../../utils/abstraction';
~~~~~
~~~~~typescript.new
import { GestureAxisView } from '../components/GestureAxisView';
import { NotanThresholdView } from '../components/NotanThresholdView';
import { PaletteClusteringView } from '../components/PaletteClusteringView';
import { TopDown2AfcView } from '../components/TopDown2AfcView';
import { TopDownPatternView } from '../components/TopDownPatternView';
import type { AbstractionHitResult, AbstractionQuestionData } from '../utils/index';
~~~~~

~~~~~act
patch_file
src/domains/abstraction/components/GestureAxisView.tsx
~~~~~
~~~~~typescript.old
import { Eye } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../../hooks/useTrackPointer';
import {
  ABSTRACTION_CANVAS_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../../utils/abstraction';
import { drawParticlesCanvas } from '../../utils/canvas/drawParticles';
import { QuestionCardShell } from '../common/QuestionCardShell';
~~~~~
~~~~~typescript.new
import { Eye } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { useTrackPointer } from '../../../hooks/useTrackPointer';
import { drawParticlesCanvas } from '../../../utils/canvas/drawParticles';
import {
  ABSTRACTION_CANVAS_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';
~~~~~

~~~~~act
patch_file
src/domains/abstraction/components/NotanThresholdView.tsx
~~~~~
~~~~~typescript.old
import { Eye } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../../hooks/useTrackPointer';
import {
  ABSTRACTION_2AFC_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../../utils/abstraction';
import { drawNotanNoiseField, drawRawGrayscaleNoiseField } from '../../utils/canvas/drawNotanField';
import { DualViewportContainer } from '../common/DualViewportContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';
~~~~~
~~~~~typescript.new
import { Eye } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { DualViewportContainer } from '../../../components/common/DualViewportContainer';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { useTrackPointer } from '../../../hooks/useTrackPointer';
import { drawNotanNoiseField, drawRawGrayscaleNoiseField } from '../../../utils/canvas/drawNotanField';
import {
  ABSTRACTION_2AFC_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';
~~~~~

~~~~~act
patch_file
src/domains/abstraction/components/PaletteClusteringView.tsx
~~~~~
~~~~~typescript.old
import { Sparkles } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  ABSTRACTION_CANVAS_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../../utils/abstraction';
import { drawPaletteTilesCanvas } from '../../utils/canvas/drawPaletteTiles';
import { hsvToHex } from '../../utils/colorUtils';
import { ChoiceNafcContainer } from '../common/ChoiceNafcContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';
~~~~~
~~~~~typescript.new
import { Sparkles } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ChoiceNafcContainer } from '../../../components/common/ChoiceNafcContainer';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { hsvToHex } from '../../../core/color/colorUtils';
import { drawPaletteTilesCanvas } from '../../../utils/canvas/drawPaletteTiles';
import {
  ABSTRACTION_CANVAS_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';
~~~~~

~~~~~act
patch_file
src/domains/abstraction/components/TopDown2AfcView.tsx
~~~~~
~~~~~typescript.old
import { Columns } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  ABSTRACTION_2AFC_SIZE,
  ABSTRACTION_CANVAS_SIZE,
  ABSTRACTION_THUMB_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../../utils/abstraction';
import { drawRawGrayscaleNoiseField } from '../../utils/canvas/drawNotanField';
import { drawParticlesCanvas, drawSpinePromptCanvas } from '../../utils/canvas/drawParticles';
import { drawPolygonCanvas } from '../../utils/canvas/drawPolygon';
import { Choice2AfcContainer } from '../common/Choice2AfcContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';
~~~~~
~~~~~typescript.new
import { Columns } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Choice2AfcContainer } from '../../../components/common/Choice2AfcContainer';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import { drawRawGrayscaleNoiseField } from '../../../utils/canvas/drawNotanField';
import { drawParticlesCanvas, drawSpinePromptCanvas } from '../../../utils/canvas/drawParticles';
import {
  ABSTRACTION_2AFC_SIZE,
  ABSTRACTION_CANVAS_SIZE,
  ABSTRACTION_THUMB_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';
~~~~~

~~~~~act
patch_file
src/domains/abstraction/components/TopDownPatternView.tsx
~~~~~
~~~~~typescript.old
import { Sparkles } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  ABSTRACTION_2AFC_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../../utils/abstraction';
import { drawPaletteTilesCanvas } from '../../utils/canvas/drawPaletteTiles';
import { hsvToHex } from '../../utils/colorUtils';
import { ChoiceNafcContainer } from '../common/ChoiceNafcContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';
~~~~~
~~~~~typescript.new
import { Sparkles } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ChoiceNafcContainer } from '../../../components/common/ChoiceNafcContainer';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { hsvToHex } from '../../../core/color/colorUtils';
import { drawPaletteTilesCanvas } from '../../../utils/canvas/drawPaletteTiles';
import {
  ABSTRACTION_2AFC_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';
~~~~~

~~~~~act
patch_file
src/domains/abstraction/utils/pca.ts
~~~~~
~~~~~typescript.old
import type { Point } from '../../types';
import { ABSTRACTION_CANVAS_SIZE } from './types';
~~~~~
~~~~~typescript.new
import type { Point } from '../../../types';
import { ABSTRACTION_CANVAS_SIZE } from './types';
~~~~~

~~~~~act
patch_file
src/domains/abstraction/utils/polygon.ts
~~~~~
~~~~~typescript.old
import type { Point } from '../../types';
import { ABSTRACTION_2AFC_SIZE, ABSTRACTION_CANVAS_SIZE } from './types';
~~~~~
~~~~~typescript.new
import type { Point } from '../../../types';
import { ABSTRACTION_2AFC_SIZE, ABSTRACTION_CANVAS_SIZE } from './types';
~~~~~

~~~~~act
patch_file
src/domains/abstraction/utils/questionGenerator.ts
~~~~~
~~~~~typescript.old
import type { Point } from '../../types';
import { expDecayInterpolate } from '../mathUtils';
import { calculateOtsuThreshold, createNoise2D, fbm2D } from '../noiseUtils';
import { generateTetrahedralDistractors, hsvToOkLab } from '../oklchUtils';
import { getDistractorDistanceForLevel } from '../relativeColorUtils';
import { calcPCAOrientation, generateFlowParticles, generateFlowParticlesWithClutter } from './pca';
~~~~~
~~~~~typescript.new
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import { calculateOtsuThreshold, createNoise2D, fbm2D } from '../../../core/math/noiseUtils';
import { generateTetrahedralDistractors, hsvToOkLab } from '../../../core/color/oklchUtils';
import type { Point } from '../../../types';
import { getDistractorDistanceForLevel } from '../../relative_color/utils/inductionMath';
import { calcPCAOrientation, generateFlowParticles, generateFlowParticlesWithClutter } from './pca';
~~~~~

~~~~~act
patch_file
src/domains/abstraction/utils/types.ts
~~~~~
~~~~~typescript.old
import type { Point } from '../../types';
import type { PaletteTile } from '../canvas/drawPaletteTiles';
~~~~~
~~~~~typescript.new
import type { Point } from '../../../types';
import type { PaletteTile } from '../../../utils/canvas/drawPaletteTiles';
~~~~~

~~~~~act
patch_file
src/domains/angle/views/AngleCanvas.tsx
~~~~~
~~~~~typescript.old
import { AngleComparison2AfcView } from '../../../components/angle/AngleComparison2AfcView';
import { AngleEstimationView } from '../../../components/angle/AngleEstimationView';
import { AngleParallel2AfcView } from '../../../components/angle/AngleParallel2AfcView';
import type { AngleHitResult, AngleQuestionData } from '../utils/angleUtils';
~~~~~
~~~~~typescript.new
import { AngleComparison2AfcView } from '../components/AngleComparison2AfcView';
import { AngleEstimationView } from '../components/AngleEstimationView';
import { AngleParallel2AfcView } from '../components/AngleParallel2AfcView';
import type { AngleHitResult, AngleQuestionData } from '../utils/angleUtils';
~~~~~

~~~~~act
patch_file
src/domains/angle/components/AngleComparison2AfcView.tsx
~~~~~
~~~~~typescript.old
import { Columns } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  ANGLE_2AFC_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawAngleCanvas,
} from '../../utils/angleUtils';
import { Choice2AfcContainer } from '../common/Choice2AfcContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';
~~~~~
~~~~~typescript.new
import { Columns } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Choice2AfcContainer } from '../../../components/common/Choice2AfcContainer';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import {
  ANGLE_2AFC_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawAngleCanvas,
} from '../utils/angleUtils';
~~~~~

~~~~~act
patch_file
src/domains/angle/components/AngleEstimationView.tsx
~~~~~
~~~~~typescript.old
import { Eye } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../../hooks/useTrackPointer';
import {
  ANGLE_CANVAS_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawAngleCanvas,
} from '../../utils/angleUtils';
import { QuestionCardShell } from '../common/QuestionCardShell';
~~~~~
~~~~~typescript.new
import { Eye } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { useTrackPointer } from '../../../hooks/useTrackPointer';
import {
  ANGLE_CANVAS_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawAngleCanvas,
} from '../utils/angleUtils';
~~~~~

~~~~~act
patch_file
src/domains/angle/components/AngleParallel2AfcView.tsx
~~~~~
~~~~~typescript.old
import { Split } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  ANGLE_2AFC_SIZE,
  ANGLE_PROMPT_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawSingleLineCanvas,
} from '../../utils/angleUtils';
import { Choice2AfcContainer } from '../common/Choice2AfcContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';
~~~~~
~~~~~typescript.new
import { Split } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Choice2AfcContainer } from '../../../components/common/Choice2AfcContainer';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import {
  ANGLE_2AFC_SIZE,
  ANGLE_PROMPT_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawSingleLineCanvas,
} from '../utils/angleUtils';
~~~~~

~~~~~act
patch_file
src/domains/relative_color/views/RelativeColorCanvas.tsx
~~~~~
~~~~~typescript.old
import { useCallback, useEffect, useState } from 'preact/hooks';
import { AlbersInductionView } from '../../../components/relativeColor/AlbersInductionView';
import { Decontextual2AfcView } from '../../../components/relativeColor/Decontextual2AfcView';
import { HueInductionView } from '../../../components/relativeColor/HueInductionView';
import { VectorShiftView } from '../../../components/relativeColor/VectorShiftView';
import type {
  RelativeColorHitResult,
  RelativeColorQuestionData,
} from '../../../utils/relativeColor';
~~~~~
~~~~~typescript.new
import { useCallback, useEffect, useState } from 'preact/hooks';
import { AlbersInductionView } from '../components/AlbersInductionView';
import { Decontextual2AfcView } from '../components/Decontextual2AfcView';
import { HueInductionView } from '../components/HueInductionView';
import { VectorShiftView } from '../components/VectorShiftView';
import type {
  RelativeColorHitResult,
  RelativeColorQuestionData,
} from '../utils/index';
~~~~~

~~~~~act
patch_file
src/domains/relative_color/plugin.tsx
~~~~~
~~~~~typescript.old
import type { TrainingPlugin } from '../../config/trainingPlugins';
import {
  type RelativeColorHitResult,
  type RelativeColorMode,
  type RelativeColorQuestionData,
  checkRelativeColorHit,
  generateRelativeColorQuestion,
} from '../../utils/relativeColorUtils';
import type { RelativeColorSettings } from '../../utils/settings';
import { RelativeColorCanvas } from './views/RelativeColorCanvas';
~~~~~
~~~~~typescript.new
import type { TrainingPlugin } from '../../config/trainingPlugins';
import type { RelativeColorSettings } from '../../utils/settings';
import {
  type RelativeColorHitResult,
  type RelativeColorMode,
  type RelativeColorQuestionData,
  checkRelativeColorHit,
  generateRelativeColorQuestion,
} from './utils/index';
import { RelativeColorCanvas } from './views/RelativeColorCanvas';
~~~~~

~~~~~act
patch_file
src/domains/relative_color/components/AlbersInductionView.tsx
~~~~~
~~~~~typescript.old
import { Eye } from 'lucide-preact';
import { hsvToHex } from '../../utils/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../../utils/relativeColor';
import { HsvTrackSlider } from '../HsvTrackSlider';
import { DualViewportContainer } from '../common/DualViewportContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';
~~~~~
~~~~~typescript.new
import { Eye } from 'lucide-preact';
import { HsvTrackSlider } from '../../../components/HsvTrackSlider';
import { DualViewportContainer } from '../../../components/common/DualViewportContainer';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { hsvToHex } from '../../../core/color/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../utils/index';
~~~~~

~~~~~act
patch_file
src/domains/relative_color/components/Decontextual2AfcView.tsx
~~~~~
~~~~~typescript.old
import { Eye } from 'lucide-preact';
import { hsvToHex } from '../../utils/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../../utils/relativeColor';
import { Choice2AfcContainer } from '../common/Choice2AfcContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';
~~~~~
~~~~~typescript.new
import { Eye } from 'lucide-preact';
import { Choice2AfcContainer } from '../../../components/common/Choice2AfcContainer';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { hsvToHex } from '../../../core/color/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../utils/index';
~~~~~

~~~~~act
patch_file
src/domains/relative_color/components/HueInductionView.tsx
~~~~~
~~~~~typescript.old
import { Sparkles } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { hsvToHex } from '../../utils/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../../utils/relativeColor';
import { ChoiceNafcContainer } from '../common/ChoiceNafcContainer';
import { DualViewportContainer } from '../common/DualViewportContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';
~~~~~
~~~~~typescript.new
import { Sparkles } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { ChoiceNafcContainer } from '../../../components/common/ChoiceNafcContainer';
import { DualViewportContainer } from '../../../components/common/DualViewportContainer';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { hsvToHex } from '../../../core/color/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../utils/index';
~~~~~

~~~~~act
patch_file
src/domains/relative_color/components/VectorShiftView.tsx
~~~~~
~~~~~typescript.old
import { ArrowRight, Shuffle } from 'lucide-preact';
import { useEffect } from 'preact/hooks';
import { hsvToHex } from '../../utils/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../../utils/relativeColor';
import { HsvTrackSlider } from '../HsvTrackSlider';
import { ChoiceNafcContainer } from '../common/ChoiceNafcContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';
~~~~~
~~~~~typescript.new
import { ArrowRight, Shuffle } from 'lucide-preact';
import { useEffect } from 'preact/hooks';
import { HsvTrackSlider } from '../../../components/HsvTrackSlider';
import { ChoiceNafcContainer } from '../../../components/common/ChoiceNafcContainer';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { hsvToHex } from '../../../core/color/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../utils/index';
~~~~~

~~~~~act
patch_file
src/domains/relative_color/utils/generators.ts
~~~~~
~~~~~typescript.old
import {
  generateTetrahedralDistractors,
  getTargetDeltaEForLevel,
  hasGamutMargin,
  hsvToOkLab,
  okLabToHsv,
} from '../oklchUtils';
~~~~~
~~~~~typescript.new
import {
  generateTetrahedralDistractors,
  getTargetDeltaEForLevel,
  hasGamutMargin,
  hsvToOkLab,
  okLabToHsv,
} from '../../../core/color/oklchUtils';
~~~~~

~~~~~act
patch_file
src/domains/relative_color/utils/hitDetection.ts
~~~~~
~~~~~typescript.old
import { getTargetDeltaEForLevel, hsvToOkLab } from '../oklchUtils';
import { calcDeltaEOk } from '../oklchUtils';
import type { RelativeColorHitResult, RelativeColorMode, RelativeColorQuestionData } from './types';
~~~~~
~~~~~typescript.new
import { calcDeltaEOk, getTargetDeltaEForLevel, hsvToOkLab } from '../../../core/color/oklchUtils';
import type { RelativeColorHitResult, RelativeColorMode, RelativeColorQuestionData } from './types';
~~~~~

~~~~~act
patch_file
src/domains/relative_color/utils/index.ts
~~~~~
~~~~~typescript.old
export * from './types';
export * from './inductionMath';
export * from './generators';
export * from './hitDetection';
export { okLabToHsv, isOkLabInGamut } from '../oklchUtils';
~~~~~
~~~~~typescript.new
export * from './types';
export * from './inductionMath';
export * from './generators';
export * from './hitDetection';
export { okLabToHsv, isOkLabInGamut } from '../../../core/color/oklchUtils';
~~~~~

~~~~~act
patch_file
src/domains/star/views/StarCanvas.tsx
~~~~~
~~~~~typescript.old
import { useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../../components/common/PointClickCanvas';
import type { HitResult, Point, QuestionData } from '../../../types';
import { drawDot } from '../../../utils/canvas/drawPointGrid';
import { CANVAS_SIZE, checkHit, getDynamicDotRadius } from '../../../utils/geometry';
~~~~~
~~~~~typescript.new
import { useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../../components/common/PointClickCanvas';
import { drawDot } from '../../../core/canvas/drawPointGrid';
import type { HitResult, Point, QuestionData } from '../../../types';
import { CANVAS_SIZE, checkHit, getDynamicDotRadius } from '../utils/index';
~~~~~

#### Acts 5: 修复全局组件与外部工具的导入路径

修正 `WeaknessAnalyticsModal`, `HsvTrackSlider`, `drawColorRing`, `drawPaletteTiles`, `importExport`, `queries` 等文件中的直接导入路径，移除对已删除文件的依赖。

~~~~~act
patch_file
src/components/WeaknessAnalyticsModal.tsx
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
import { BarChart2, Info, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { registry } from '../core/registry';
import type { CardDefinition } from '../types/card';
import type { UnifiedTrialRecord } from '../utils/db';

interface WeaknessAnalyticsModalProps {
  card: CardDefinition;
  onClose: () => void;
}

export function WeaknessAnalyticsModal({ card, onClose }: WeaknessAnalyticsModalProps) {
  const plugin = registry.getAnalyticsPluginByCardId(card.id);
~~~~~

~~~~~act
patch_file
src/components/HsvTrackSlider.tsx
~~~~~
~~~~~typescript.old
import { useTrackPointer } from '../hooks/useTrackPointer';
import { getToleranceSpan } from '../utils/colorUtils';
~~~~~
~~~~~typescript.new
import { getToleranceSpan } from '../core/color/colorUtils';
import { useTrackPointer } from '../hooks/useTrackPointer';
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawColorRing.ts
~~~~~
~~~~~typescript.old
import { hsvToHex } from '../colorUtils';
import type { SectorStat } from './drawCompass';
import { setupHiDpiCanvas } from './hidpi';
~~~~~
~~~~~typescript.new
import { hsvToHex } from '../../core/color/colorUtils';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import type { SectorStat } from './drawCompass';
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawPaletteTiles.ts
~~~~~
~~~~~typescript.old
import { hsvToHex } from '../colorUtils';
~~~~~
~~~~~typescript.new
import { hsvToHex } from '../../core/color/colorUtils';
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawCompass.ts
~~~~~
~~~~~typescript.old
import { setupHiDpiCanvas } from './hidpi';
~~~~~
~~~~~typescript.new
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawHeatmap.ts
~~~~~
~~~~~typescript.old
import type { UnifiedTrialRecord } from '../db';
import { setupHiDpiCanvas } from './hidpi';
~~~~~
~~~~~typescript.new
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import type { UnifiedTrialRecord } from '../db';
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawHueBiasChart.ts
~~~~~
~~~~~typescript.old
import type { UnifiedTrialRecord } from '../db';
import { setupHiDpiCanvas } from './hidpi';
~~~~~
~~~~~typescript.new
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import type { UnifiedTrialRecord } from '../db';
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawTrendChart.ts
~~~~~
~~~~~typescript.old
import type { SessionHistoryItem } from '../../components/SessionSummaryModal';
import { setupHiDpiCanvas } from './hidpi';
~~~~~
~~~~~typescript.new
import type { SessionHistoryItem } from '../../components/SessionSummaryModal';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
~~~~~

~~~~~act
patch_file
src/utils/db/importExport.ts
~~~~~
~~~~~typescript.old
import { getCardById } from '../../config/cards';
import {
  loadPlanStorageState,
  loadTrainingPlan,
  resetPlansToDefault,
  savePlanStorageState,
  saveTrainingPlan,
} from '../planStorage';
~~~~~
~~~~~typescript.new
import { registry } from '../../core/registry';
import {
  loadPlanStorageState,
  loadTrainingPlan,
  resetPlansToDefault,
  savePlanStorageState,
  saveTrainingPlan,
} from '../planStorage';
~~~~~

~~~~~act
patch_file
src/utils/db/importExport.ts
~~~~~
~~~~~typescript.old
      for (const p of data.profiles) {
        const cardId = p.cardId || p.mode;
        const card = getCardById(cardId);
        const domain = card ? card.domain : ((p.domain || 'star') as TrainingDomain);
        const totalTrials = p.totalTrials ?? 0;
        await tx.objectStore('user_profiles').put({ ...p, cardId, domain, totalTrials });
      }
~~~~~
~~~~~typescript.new
      for (const p of data.profiles) {
        const cardId = p.cardId || p.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.domain : ((p.domain || 'star') as TrainingDomain);
        const totalTrials = p.totalTrials ?? 0;
        await tx.objectStore('user_profiles').put({ ...p, cardId, domain, totalTrials });
      }
~~~~~

~~~~~act
patch_file
src/utils/db/queries.ts
~~~~~
~~~~~typescript.old
import { getCardById } from '../../config/cards';
import {
  type TrainingDomain,
  type UnifiedProfileData,
  type UnifiedSessionData,
  type UnifiedTrialRecord,
  getDB,
} from './schema';
~~~~~
~~~~~typescript.new
import { registry } from '../../core/registry';
import {
  type TrainingDomain,
  type UnifiedProfileData,
  type UnifiedSessionData,
  type UnifiedTrialRecord,
  getDB,
} from './schema';
~~~~~

~~~~~act
patch_file
src/utils/db/queries.ts
~~~~~
~~~~~typescript.old
async function updateProfile(
  cardId: string,
  domain: TrainingDomain,
  mode: string,
  isHit: boolean,
  currentLevel: number,
): Promise<void> {
  const db = await getDB();
  const card = getCardById(cardId);
  const canonicalDomain = card ? card.domain : domain;
~~~~~
~~~~~typescript.new
async function updateProfile(
  cardId: string,
  domain: TrainingDomain,
  mode: string,
  isHit: boolean,
  currentLevel: number,
): Promise<void> {
  const db = await getDB();
  const card = registry.getCardById(cardId);
  const canonicalDomain = card ? card.domain : domain;
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript.old
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/SessionSummaryModal';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import { type AdaptiveMode, type StepGranularity, loadSettings } from '../utils/settings';
import { playHitSound, playMissSound } from '../utils/sound';
~~~~~
~~~~~typescript.new
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/SessionSummaryModal';
import { AdaptiveEngine } from '../core/engine/adaptiveEngine';
import { type AdaptiveMode, type StepGranularity, loadSettings } from '../utils/settings';
import { playHitSound, playMissSound } from '../utils/sound';
~~~~~

~~~~~act
patch_file
piconfig.json
~~~~~
~~~~~json.old
{
  "presets": {
    "cards": {
      "format": "xml",
      "extension": ["ts", "tsx"],
      "paths": [
        "src/views/Home.tsx",
        "src/hooks/useHashRoute.ts",
        "src/app.tsx",
        "src/components/GlobalStatsModal.tsx",
        "src/components/settings/DynamicDomainSettings.tsx",
        "src/types/card.ts",
        "src/types/index.ts",
        "src/utils/db/schema.ts",
        "src/utils/settings.ts",
        "src/utils/mathUtils.ts",
        "src/utils/colorUtils.ts",
        "src/utils/oklchUtils.ts",
        "src/config/domains.ts",
        "src/config/cards.ts",
        "src/config/trainingPlugins.tsx",
        "src/config/plugins/index.ts",
        "src/config/plugins/starPlugin.tsx",
        "src/config/plugins/abstractionPlugin.tsx",
        "src/components/common/QuestionCardShell.tsx",
        "src/components/common/DualViewportContainer.tsx",
        "src/components/common/PointClickCanvas.tsx",
        "src/components/common/ContinuousTrackPanel.tsx",
        "src/components/common/Choice2AfcContainer.tsx",
        "src/components/common/ChoiceNafcContainer.tsx",
        "src/components/StarCanvas.tsx",
        "src/components/abstraction/GestureAxisView.tsx",
        "src/components/abstraction/PaletteClusteringView.tsx",
        "src/components/abstraction/TopDown2AfcView.tsx",
        "src/components/negativeSpace/AreaComparison2AfcView.tsx",
        "src/utils/geometry/questionGenerator.ts",
        "src/utils/geometry/hitDetection.ts",
        "src/utils/abstraction/questionGenerator.ts",
        "src/utils/abstraction/hitDetection.ts",
        "src/utils/abstraction/types.ts"
      ]
    },
    "core": {
      "format": "xml",
      "extension": ["ts", "tsx"],
      "paths": [
        "src/types/plan.ts",
        "src/types/card.ts",
        "src/types/index.ts",
        "src/config/planTemplates.ts",
        "src/config/cards.ts",
        "src/config/domains.ts",
        "src/config/trainingPlugins.tsx",
        "src/config/plugins/index.ts",
        "src/utils/planStorage.ts",
        "src/utils/adaptiveEngine.ts",
        "src/utils/settings.ts",
        "src/utils/db/schema.ts",
        "src/utils/db/queries.ts",
        "src/utils/db/importExport.ts",
        "src/hooks/useTrainingSession.ts",
        "src/hooks/useHashRoute.ts",
        "src/hooks/useTodayStats.ts",
        "src/components/training/TrainingShell.tsx",
        "src/components/SessionSummaryModal.tsx",
        "src/components/plan/PlanHeroCard.tsx",
        "src/components/plan/PlanEditorModal.tsx",
        "src/components/plan/PlanSummaryModal.tsx",
        "src/components/plan/PlanStepTransitionOverlay.tsx",
        "src/components/plan/editor/PlanStageList.tsx",
        "src/components/plan/editor/PlanLibraryDrawer.tsx",
        "src/components/plan/editor/CardPickerPanel.tsx",
        "src/views/PlanTrainingView.tsx",
        "src/views/GenericTrainingView.tsx",
        "src/views/Home.tsx",
        "src/app.tsx"
      ]
    }
  }
}
~~~~~
~~~~~json.new
{
  "presets": {
    "cards": {
      "format": "xml",
      "extension": ["ts", "tsx"],
      "paths": [
        "src/views/Home.tsx",
        "src/hooks/useHashRoute.ts",
        "src/app.tsx",
        "src/components/GlobalStatsModal.tsx",
        "src/components/settings/DynamicDomainSettings.tsx",
        "src/types/card.ts",
        "src/types/index.ts",
        "src/utils/db/schema.ts",
        "src/utils/settings.ts",
        "src/core/math/mathUtils.ts",
        "src/core/color/colorUtils.ts",
        "src/core/color/oklchUtils.ts",
        "src/config/domains.ts",
        "src/config/trainingPlugins.tsx",
        "src/components/common/QuestionCardShell.tsx",
        "src/components/common/DualViewportContainer.tsx",
        "src/components/common/PointClickCanvas.tsx",
        "src/components/common/Choice2AfcContainer.tsx",
        "src/components/common/ChoiceNafcContainer.tsx",
        "src/domains/abstraction/components/GestureAxisView.tsx",
        "src/domains/abstraction/components/PaletteClusteringView.tsx",
        "src/domains/abstraction/components/TopDown2AfcView.tsx",
        "src/domains/negative_space/components/AreaComparison2AfcView.tsx",
        "src/domains/star/utils/questionGenerator.ts",
        "src/domains/star/utils/hitDetection.ts",
        "src/domains/abstraction/utils/questionGenerator.ts",
        "src/domains/abstraction/utils/hitDetection.ts",
        "src/domains/abstraction/utils/types.ts"
      ]
    },
    "core": {
      "format": "xml",
      "extension": ["ts", "tsx"],
      "paths": [
        "src/types/plan.ts",
        "src/types/card.ts",
        "src/types/index.ts",
        "src/config/planTemplates.ts",
        "src/config/domains.ts",
        "src/config/trainingPlugins.tsx",
        "src/core/registry.ts",
        "src/core/contracts.ts",
        "src/utils/planStorage.ts",
        "src/core/engine/adaptiveEngine.ts",
        "src/utils/settings.ts",
        "src/utils/db/schema.ts",
        "src/utils/db/queries.ts",
        "src/utils/db/importExport.ts",
        "src/hooks/useTrainingSession.ts",
        "src/hooks/useHashRoute.ts",
        "src/hooks/useTodayStats.ts",
        "src/components/training/TrainingShell.tsx",
        "src/components/SessionSummaryModal.tsx",
        "src/components/plan/PlanHeroCard.tsx",
        "src/components/plan/PlanEditorModal.tsx",
        "src/components/plan/PlanSummaryModal.tsx",
        "src/components/plan/editor/PlanStageList.tsx",
        "src/components/plan/editor/PlanLibraryDrawer.tsx",
        "src/components/plan/editor/CardPickerPanel.tsx",
        "src/views/PlanTrainingView.tsx",
        "src/views/GenericTrainingView.tsx",
        "src/views/Home.tsx",
        "src/app.tsx"
      ]
    }
  }
}
~~~~~

### 下一步建议
1. 运行 `npm run check` (Biome) 与 `npm run build` (TypeScript 类型检查) 验证迁移完整性与无报错。
2. 运行 `npm test` 确认单元测试全绿。
3. 若无问题，可执行 Git Commit 计划归档本次架构下沉优化。
