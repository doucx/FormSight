我将为你生成一个完整的重构计划，全面落实**方案 B（确立底层信任链，卡片私有轻量类型收窄）**：为各卡片的分析模块定义强类型非可选的私有记录接口，在图表与诊断函数入口处进行单行类型收窄，彻底移除低级防御回退代码，享受流畅透明的类型补全。

## [WIP] refactor(cards): 完整落地方案 B 卡片私有分析记录类型收窄与无守卫直读

### 用户需求
在现有卡片（`color_hue`、`star_single`、`star_double_h`、`star_double_r`、`neg_ratio_estimation`、`fractal_edge_roughness`）的分析模块（`analytics.tsx` 与相关 `charts.ts`）中，完整落实方案 B：
1. 声明非可选必选字段的卡片私有 `XxxTrialRecord` 接口。
2. 在函数/回调入口处进行单行强转（`const records = rawRecords as XxxTrialRecord[]`）。
3. 彻底删除内联 `as`、`|| [0, 0]`、`Number(...) ?? ...` 等防御性冗余，实现完全信赖底层存储数据的干净直读。

### 评论
当前架构已经明确删除了 Prune，底层存储数据契约由卡片的 `extractRecordDetails` 严格保证。卡片分析组件无需对自身产出的数据进行猜疑与低级防御。实施方案 B 能够在零侵入框架层 `CardManifest` 泛型的前提下，获得卡片自治、无防御回退与完备的静态类型安全。

### 目标
1. **`color_hue`**：将 `ColorHueTrialRecord` 字段转为必选，并在 `calculateHueSectorStats` 与 `renderDiagnostics` 入口单行收窄，删除 `|| [0, 0, 0]` 兜底。
2. **`star_single`**：将 `StarSingleTrialRecord` 字段转为必选，在各个 visualizer 与 diagnostics 入口收窄，直接读取点位与偏差。
3. **`star_double_h`**：补充定义 `StarDoubleHTrialRecord`，消除所有内联 `(r.userClick as [number, number])` 与冗余防御。
4. **`star_double_r`**：补充定义 `StarDoubleRTrialRecord`，消除所有内联强转与冗余防御。
5. **`neg_ratio_estimation`**：补充定义 `NegRatioTrialRecord`，消除 `Number(r.xxx ?? 50)` 防御代码。
6. **`fractal_edge_roughness`**：在 `types.ts` 中定义 `FractalEdgeRoughnessTrialRecord`，并在 `charts.ts` 与 `analytics.tsx` 中全面落地入口强转与直读。

### 基本原理
卡片架构遵循自包含模式，`extractRecordDetails` 写入数据库与 `analytics` 读取数据库属于同一卡片私有领域。通过在卡片内部建立与 `extractRecordDetails` 返回值 1:1 映射的扩展接口 `interface XxxTrialRecord extends UnifiedTrialRecord`，在分析函数入口完成单行断言后，整个消费流程均可享有 TS 智能补全与简洁直观的数据访问。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #concept/state #scope/core #scope/dx #ai/instruct #task/domain/analytics #task/object/private-record-narrowing #task/action/refactor #task/state/begin #task/status/active

---

### Script

#### Acts 1: 重构 `color_hue` 的私有类型收窄

我们将 `ColorHueTrialRecord` 调整为必选字段接口，并在入口处执行单行类型收窄，彻底移除兜底回退。

~~~~~act
patch_file
src/cards/color_hue/analytics.tsx
~~~~~
~~~~~typescript.old
interface ColorHueTrialRecord extends UnifiedTrialRecord {
  targetHSV?: [number, number, number];
  userHSV?: [number, number, number];
}

/**
 * 聚合 12 个色相扇区的样本量、命中数与平均误差统计
 */
function calculateHueSectorStats(records: UnifiedTrialRecord[], t: ScopedTranslator): SectorStat[] {
  const sectorBuckets = Array.from({ length: 12 }, () => ({
    total: 0,
    hits: 0,
    sumError: 0,
  }));

  for (const rec of records) {
    const r = rec as ColorHueTrialRecord;
    const tHsv = r.targetHSV || [0, 0, 0];
    const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
    sectorBuckets[idx].total += 1;
    if (r.isHit) sectorBuckets[idx].hits += 1;
    sectorBuckets[idx].sumError += Number(r.errorValue ?? 0);
  }

  return sectorBuckets.map((b, i) => ({
    sectorIdx: i,
    label: t(COLOR_SECTOR_KEYS[i]),
    total: b.total,
    accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
    avgError: b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0,
  }));
}
~~~~~
~~~~~typescript.new
interface ColorHueTrialRecord extends UnifiedTrialRecord {
  targetHSV: [number, number, number];
  userHSV: [number, number, number];
  errorValue: number;
}

/**
 * 聚合 12 个色相扇区的样本量、命中数与平均误差统计
 */
function calculateHueSectorStats(rawRecords: UnifiedTrialRecord[], t: ScopedTranslator): SectorStat[] {
  const records = rawRecords as ColorHueTrialRecord[];
  const sectorBuckets = Array.from({ length: 12 }, () => ({
    total: 0,
    hits: 0,
    sumError: 0,
  }));

  for (const r of records) {
    const idx = Math.max(0, Math.min(11, Math.floor(r.targetHSV[0] / 30)));
    sectorBuckets[idx].total += 1;
    if (r.isHit) sectorBuckets[idx].hits += 1;
    sectorBuckets[idx].sumError += r.errorValue;
  }

  return sectorBuckets.map((b, i) => ({
    sectorIdx: i,
    label: t(COLOR_SECTOR_KEYS[i]),
    total: b.total,
    accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
    avgError: b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0,
  }));
}
~~~~~

~~~~~act
patch_file
src/cards/color_hue/analytics.tsx
~~~~~
~~~~~typescript.old
      renderDiagnostics: (records, t) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        let sumSignedBias = 0;
        const sectorBuckets = Array.from({ length: 12 }, () => ({
          total: 0,
          hits: 0,
          sumBias: 0,
        }));

        for (const rec of records) {
          const r = rec as ColorHueTrialRecord;
          const tHsv = r.targetHSV || [0, 0, 0];
          const uHsv = r.userHSV || tHsv;
          const bias = calcSignedHueBias(tHsv[0], uHsv[0]);
          sumSignedBias += bias;

          const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
          sectorBuckets[idx].total += 1;
          if (r.isHit) sectorBuckets[idx].hits += 1;
          sectorBuckets[idx].sumBias += bias;
        }
~~~~~
~~~~~typescript.new
      renderDiagnostics: (rawRecords, t) => {
        const records = rawRecords as ColorHueTrialRecord[];
        const totalCount = records.length;
        if (totalCount === 0) return null;

        let sumSignedBias = 0;
        const sectorBuckets = Array.from({ length: 12 }, () => ({
          total: 0,
          hits: 0,
          sumBias: 0,
        }));

        for (const r of records) {
          const bias = calcSignedHueBias(r.targetHSV[0], r.userHSV[0]);
          sumSignedBias += bias;

          const idx = Math.max(0, Math.min(11, Math.floor(r.targetHSV[0] / 30)));
          sectorBuckets[idx].total += 1;
          if (r.isHit) sectorBuckets[idx].hits += 1;
          sectorBuckets[idx].sumBias += bias;
        }
~~~~~

#### Acts 2: 重构 `star_single` 的私有类型收窄

在 `star_single/analytics.tsx` 中确立必选字段并在入口单行强转收窄。

~~~~~act
patch_file
src/cards/star_single/analytics.tsx
~~~~~
~~~~~typescript.old
interface StarSingleTrialRecord extends UnifiedTrialRecord {
  userClick?: [number, number];
  targetB?: [number, number];
  errorPixelDistance?: number;
}

export function createStarSingleAnalytics(): CardAnalyticsView[] {
  return [
    {
      id: 'spatial_bias',
      tabLabel: 'analytics.spatialBias.tabLabel',
      title: 'analytics.spatialBias.title',
      subTitle: 'analytics.spatialBias.subTitle',
      icon: Target,
      renderVisualizer: (canvas, records) => {
        const totalCount = records.length;
        let sumDx = 0;
        let sumDy = 0;
        for (const rec of records) {
          const r = rec as StarSingleTrialRecord;
          const uClick = r.userClick || [0, 0];
          const tB = r.targetB || [0, 0];
          sumDx += uClick[0] - tB[0];
          sumDy += uClick[1] - tB[1];
        }
        const avgDx = totalCount > 0 ? Math.round((sumDx / totalCount) * 10) / 10 : 0;
        const avgDy = totalCount > 0 ? Math.round((sumDy / totalCount) * 10) / 10 : 0;
        renderHeatmapCanvas(canvas, records, avgDx, avgDy, totalCount);
      },
      renderDiagnostics: (records, t) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        let sumDx = 0;
        let sumDy = 0;
        let sumDist = 0;
        for (const rec of records) {
          const r = rec as StarSingleTrialRecord;
          const uClick = r.userClick || [0, 0];
          const tB = r.targetB || [0, 0];
          sumDx += uClick[0] - tB[0];
          sumDy += uClick[1] - tB[1];
          sumDist += Number(r.errorPixelDistance || 0);
        }
        const avgDx = Math.round((sumDx / totalCount) * 10) / 10;
        const avgDy = Math.round((sumDy / totalCount) * 10) / 10;
        const avgDist = Math.round((sumDist / totalCount) * 10) / 10;
~~~~~
~~~~~typescript.new
interface StarSingleTrialRecord extends UnifiedTrialRecord {
  anchorA: [number, number];
  targetB: [number, number];
  userClick: [number, number];
  angleDegree: number;
  distanceRatio: number;
  errorPixelDistance: number;
}

export function createStarSingleAnalytics(): CardAnalyticsView[] {
  return [
    {
      id: 'spatial_bias',
      tabLabel: 'analytics.spatialBias.tabLabel',
      title: 'analytics.spatialBias.title',
      subTitle: 'analytics.spatialBias.subTitle',
      icon: Target,
      renderVisualizer: (canvas, rawRecords) => {
        const records = rawRecords as StarSingleTrialRecord[];
        const totalCount = records.length;
        let sumDx = 0;
        let sumDy = 0;
        for (const r of records) {
          sumDx += r.userClick[0] - r.targetB[0];
          sumDy += r.userClick[1] - r.targetB[1];
        }
        const avgDx = totalCount > 0 ? Math.round((sumDx / totalCount) * 10) / 10 : 0;
        const avgDy = totalCount > 0 ? Math.round((sumDy / totalCount) * 10) / 10 : 0;
        renderHeatmapCanvas(canvas, records, avgDx, avgDy, totalCount);
      },
      renderDiagnostics: (rawRecords, t) => {
        const records = rawRecords as StarSingleTrialRecord[];
        const totalCount = records.length;
        if (totalCount === 0) return null;

        let sumDx = 0;
        let sumDy = 0;
        let sumDist = 0;
        for (const r of records) {
          sumDx += r.userClick[0] - r.targetB[0];
          sumDy += r.userClick[1] - r.targetB[1];
          sumDist += r.errorPixelDistance;
        }
        const avgDx = Math.round((sumDx / totalCount) * 10) / 10;
        const avgDy = Math.round((sumDy / totalCount) * 10) / 10;
        const avgDist = Math.round((sumDist / totalCount) * 10) / 10;
~~~~~

~~~~~act
patch_file
src/cards/star_single/analytics.tsx
~~~~~
~~~~~typescript.old
      renderVisualizer: (canvas, records, t) => {
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
          label: t(SECTOR_KEYS[i]),
          total: b.total,
          accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
          avgError: b.total > 0 ? Math.round((b.sumDist / b.total) * 10) / 10 : 0,
        }));

        renderCompassCanvas(canvas, sectorStats);
      },
      renderDiagnostics: (records, t) => {
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
~~~~~
~~~~~typescript.new
      renderVisualizer: (canvas, rawRecords, t) => {
        const records = rawRecords as StarSingleTrialRecord[];
        const sectorBuckets = Array.from({ length: 8 }, () => ({
          total: 0,
          hits: 0,
          sumDist: 0,
        }));
        for (const r of records) {
          const angle = r.angleDegree;
          const normAngle = ((angle % 360) + 360) % 360;
          const sectorIdx = Math.floor(((normAngle + 22.5) % 360) / 45);
          sectorBuckets[sectorIdx].total += 1;
          if (r.isHit) sectorBuckets[sectorIdx].hits += 1;
          sectorBuckets[sectorIdx].sumDist += r.errorPixelDistance;
        }

        const sectorStats: SectorStat[] = sectorBuckets.map((b, i) => ({
          sectorIdx: i,
          label: t(SECTOR_KEYS[i]),
          total: b.total,
          accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
          avgError: b.total > 0 ? Math.round((b.sumDist / b.total) * 10) / 10 : 0,
        }));

        renderCompassCanvas(canvas, sectorStats);
      },
      renderDiagnostics: (rawRecords, t) => {
        const records = rawRecords as StarSingleTrialRecord[];
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const sectorBuckets = Array.from({ length: 8 }, () => ({ total: 0, hits: 0 }));
        for (const r of records) {
          const angle = r.angleDegree;
          const normAngle = ((angle % 360) + 360) % 360;
          const sectorIdx = Math.floor(((normAngle + 22.5) % 360) / 45);
          sectorBuckets[sectorIdx].total += 1;
          if (r.isHit) sectorBuckets[sectorIdx].hits += 1;
        }
~~~~~

#### Acts 3: 重构 `star_double_h` 的私有类型收窄

声明 `StarDoubleHTrialRecord`，移除所有内联 `as` 和运行时 `|| [0, 0]` 兜底。

~~~~~act
patch_file
src/cards/star_double_h/analytics.tsx
~~~~~
~~~~~typescript.old
import { Compass, Target } from 'lucide-preact';
import { Callout } from '../../components/ui/callout';
import { type SectorStat, renderCompassCanvas } from '../../core/canvas/charts/drawCompass';
import { renderHeatmapCanvas } from '../../core/canvas/charts/drawHeatmap';
import type { CardAnalyticsView } from '../../core/cardContract';
import { calculateBasicOverallStats } from '../../core/contracts';

const SECTOR_KEYS = [
  'sectors.e',
  'sectors.ne',
  'sectors.n',
  'sectors.nw',
  'sectors.w',
  'sectors.sw',
  'sectors.s',
  'sectors.se',
];

export function createStarDoubleHAnalytics(): CardAnalyticsView[] {
  return [
    {
      id: 'spatial_bias',
      tabLabel: 'analytics.spatialBias.tabLabel',
      title: 'analytics.spatialBias.title',
      subTitle: 'analytics.spatialBias.subTitle',
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
      renderDiagnostics: (records, t) => {
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
~~~~~
~~~~~typescript.new
import { Compass, Target } from 'lucide-preact';
import { Callout } from '../../components/ui/callout';
import { type SectorStat, renderCompassCanvas } from '../../core/canvas/charts/drawCompass';
import { renderHeatmapCanvas } from '../../core/canvas/charts/drawHeatmap';
import type { CardAnalyticsView } from '../../core/cardContract';
import { calculateBasicOverallStats } from '../../core/contracts';
import type { UnifiedTrialRecord } from '../../storage/db/schema';

const SECTOR_KEYS = [
  'sectors.e',
  'sectors.ne',
  'sectors.n',
  'sectors.nw',
  'sectors.w',
  'sectors.sw',
  'sectors.s',
  'sectors.se',
];

interface StarDoubleHTrialRecord extends UnifiedTrialRecord {
  anchorA: [number, number];
  anchorC: [number, number];
  targetB: [number, number];
  userClick: [number, number];
  angleDegree: number;
  distanceRatio: number;
  errorPixelDistance: number;
}

export function createStarDoubleHAnalytics(): CardAnalyticsView[] {
  return [
    {
      id: 'spatial_bias',
      tabLabel: 'analytics.spatialBias.tabLabel',
      title: 'analytics.spatialBias.title',
      subTitle: 'analytics.spatialBias.subTitle',
      icon: Target,
      renderVisualizer: (canvas, rawRecords) => {
        const records = rawRecords as StarDoubleHTrialRecord[];
        const totalCount = records.length;
        let sumDx = 0;
        let sumDy = 0;
        for (const r of records) {
          sumDx += r.userClick[0] - r.targetB[0];
          sumDy += r.userClick[1] - r.targetB[1];
        }
        const avgDx = totalCount > 0 ? Math.round((sumDx / totalCount) * 10) / 10 : 0;
        const avgDy = totalCount > 0 ? Math.round((sumDy / totalCount) * 10) / 10 : 0;
        renderHeatmapCanvas(canvas, records, avgDx, avgDy, totalCount);
      },
      renderDiagnostics: (rawRecords, t) => {
        const records = rawRecords as StarDoubleHTrialRecord[];
        const totalCount = records.length;
        if (totalCount === 0) return null;

        let sumDx = 0;
        let sumDy = 0;
        let sumDist = 0;
        for (const r of records) {
          sumDx += r.userClick[0] - r.targetB[0];
          sumDy += r.userClick[1] - r.targetB[1];
          sumDist += r.errorPixelDistance;
        }
        const avgDx = Math.round((sumDx / totalCount) * 10) / 10;
        const avgDy = Math.round((sumDy / totalCount) * 10) / 10;
        const avgDist = Math.round((sumDist / totalCount) * 10) / 10;
~~~~~

~~~~~act
patch_file
src/cards/star_double_h/analytics.tsx
~~~~~
~~~~~typescript.old
      renderVisualizer: (canvas, records, t) => {
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
          label: t(SECTOR_KEYS[i]),
          total: b.total,
          accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
          avgError: b.total > 0 ? Math.round((b.sumDist / b.total) * 10) / 10 : 0,
        }));

        renderCompassCanvas(canvas, sectorStats);
      },
      renderDiagnostics: (records, t) => {
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
~~~~~
~~~~~typescript.new
      renderVisualizer: (canvas, rawRecords, t) => {
        const records = rawRecords as StarDoubleHTrialRecord[];
        const sectorBuckets = Array.from({ length: 8 }, () => ({
          total: 0,
          hits: 0,
          sumDist: 0,
        }));
        for (const r of records) {
          const angle = r.angleDegree;
          const normAngle = ((angle % 360) + 360) % 360;
          const sectorIdx = Math.floor(((normAngle + 22.5) % 360) / 45);
          sectorBuckets[sectorIdx].total += 1;
          if (r.isHit) sectorBuckets[sectorIdx].hits += 1;
          sectorBuckets[sectorIdx].sumDist += r.errorPixelDistance;
        }

        const sectorStats: SectorStat[] = sectorBuckets.map((b, i) => ({
          sectorIdx: i,
          label: t(SECTOR_KEYS[i]),
          total: b.total,
          accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
          avgError: b.total > 0 ? Math.round((b.sumDist / b.total) * 10) / 10 : 0,
        }));

        renderCompassCanvas(canvas, sectorStats);
      },
      renderDiagnostics: (rawRecords, t) => {
        const records = rawRecords as StarDoubleHTrialRecord[];
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const sectorBuckets = Array.from({ length: 8 }, () => ({ total: 0, hits: 0 }));
        for (const r of records) {
          const angle = r.angleDegree;
          const normAngle = ((angle % 360) + 360) % 360;
          const sectorIdx = Math.floor(((normAngle + 22.5) % 360) / 45);
          sectorBuckets[sectorIdx].total += 1;
          if (r.isHit) sectorBuckets[sectorIdx].hits += 1;
        }
~~~~~

#### Acts 4: 重构 `star_double_r` 的私有类型收窄

声明 `StarDoubleRTrialRecord`，并在各入口处强转，消除所有内联防御。

~~~~~act
patch_file
src/cards/star_double_r/analytics.tsx
~~~~~
~~~~~typescript.old
import { Compass, Target } from 'lucide-preact';
import { Callout } from '../../components/ui/callout';
import { type SectorStat, renderCompassCanvas } from '../../core/canvas/charts/drawCompass';
import { renderHeatmapCanvas } from '../../core/canvas/charts/drawHeatmap';
import type { CardAnalyticsView } from '../../core/cardContract';
import { calculateBasicOverallStats } from '../../core/contracts';

const SECTOR_KEYS = [
  'sectors.e',
  'sectors.ne',
  'sectors.n',
  'sectors.nw',
  'sectors.w',
  'sectors.sw',
  'sectors.s',
  'sectors.se',
];

export function createStarDoubleRAnalytics(): CardAnalyticsView[] {
  return [
    {
      id: 'spatial_bias',
      tabLabel: 'analytics.spatialBias.tabLabel',
      title: 'analytics.spatialBias.title',
      subTitle: 'analytics.spatialBias.subTitle',
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
      renderDiagnostics: (records, t) => {
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
~~~~~
~~~~~typescript.new
import { Compass, Target } from 'lucide-preact';
import { Callout } from '../../components/ui/callout';
import { type SectorStat, renderCompassCanvas } from '../../core/canvas/charts/drawCompass';
import { renderHeatmapCanvas } from '../../core/canvas/charts/drawHeatmap';
import type { CardAnalyticsView } from '../../core/cardContract';
import { calculateBasicOverallStats } from '../../core/contracts';
import type { UnifiedTrialRecord } from '../../storage/db/schema';

const SECTOR_KEYS = [
  'sectors.e',
  'sectors.ne',
  'sectors.n',
  'sectors.nw',
  'sectors.w',
  'sectors.sw',
  'sectors.s',
  'sectors.se',
];

interface StarDoubleRTrialRecord extends UnifiedTrialRecord {
  anchorA: [number, number];
  anchorC: [number, number];
  targetB: [number, number];
  userClick: [number, number];
  angleDegree: number;
  distanceRatio: number;
  errorPixelDistance: number;
}

export function createStarDoubleRAnalytics(): CardAnalyticsView[] {
  return [
    {
      id: 'spatial_bias',
      tabLabel: 'analytics.spatialBias.tabLabel',
      title: 'analytics.spatialBias.title',
      subTitle: 'analytics.spatialBias.subTitle',
      icon: Target,
      renderVisualizer: (canvas, rawRecords) => {
        const records = rawRecords as StarDoubleRTrialRecord[];
        const totalCount = records.length;
        let sumDx = 0;
        let sumDy = 0;
        for (const r of records) {
          sumDx += r.userClick[0] - r.targetB[0];
          sumDy += r.userClick[1] - r.targetB[1];
        }
        const avgDx = totalCount > 0 ? Math.round((sumDx / totalCount) * 10) / 10 : 0;
        const avgDy = totalCount > 0 ? Math.round((sumDy / totalCount) * 10) / 10 : 0;
        renderHeatmapCanvas(canvas, records, avgDx, avgDy, totalCount);
      },
      renderDiagnostics: (rawRecords, t) => {
        const records = rawRecords as StarDoubleRTrialRecord[];
        const totalCount = records.length;
        if (totalCount === 0) return null;

        let sumDx = 0;
        let sumDy = 0;
        let sumDist = 0;
        for (const r of records) {
          sumDx += r.userClick[0] - r.targetB[0];
          sumDy += r.userClick[1] - r.targetB[1];
          sumDist += r.errorPixelDistance;
        }
        const avgDx = Math.round((sumDx / totalCount) * 10) / 10;
        const avgDy = Math.round((sumDy / totalCount) * 10) / 10;
        const avgDist = Math.round((sumDist / totalCount) * 10) / 10;
~~~~~

~~~~~act
patch_file
src/cards/star_double_r/analytics.tsx
~~~~~
~~~~~typescript.old
      renderVisualizer: (canvas, records, t) => {
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
          label: t(SECTOR_KEYS[i]),
          total: b.total,
          accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
          avgError: b.total > 0 ? Math.round((b.sumDist / b.total) * 10) / 10 : 0,
        }));

        renderCompassCanvas(canvas, sectorStats);
      },
      renderDiagnostics: (records, t) => {
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
~~~~~
~~~~~typescript.new
      renderVisualizer: (canvas, rawRecords, t) => {
        const records = rawRecords as StarDoubleRTrialRecord[];
        const sectorBuckets = Array.from({ length: 8 }, () => ({
          total: 0,
          hits: 0,
          sumDist: 0,
        }));
        for (const r of records) {
          const angle = r.angleDegree;
          const normAngle = ((angle % 360) + 360) % 360;
          const sectorIdx = Math.floor(((normAngle + 22.5) % 360) / 45);
          sectorBuckets[sectorIdx].total += 1;
          if (r.isHit) sectorBuckets[sectorIdx].hits += 1;
          sectorBuckets[sectorIdx].sumDist += r.errorPixelDistance;
        }

        const sectorStats: SectorStat[] = sectorBuckets.map((b, i) => ({
          sectorIdx: i,
          label: t(SECTOR_KEYS[i]),
          total: b.total,
          accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
          avgError: b.total > 0 ? Math.round((b.sumDist / b.total) * 10) / 10 : 0,
        }));

        renderCompassCanvas(canvas, sectorStats);
      },
      renderDiagnostics: (rawRecords, t) => {
        const records = rawRecords as StarDoubleRTrialRecord[];
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const sectorBuckets = Array.from({ length: 8 }, () => ({ total: 0, hits: 0 }));
        for (const r of records) {
          const angle = r.angleDegree;
          const normAngle = ((angle % 360) + 360) % 360;
          const sectorIdx = Math.floor(((normAngle + 22.5) % 360) / 45);
          sectorBuckets[sectorIdx].total += 1;
          if (r.isHit) sectorBuckets[sectorIdx].hits += 1;
        }
~~~~~

#### Acts 5: 重构 `neg_ratio_estimation` 的私有类型收窄

声明 `NegRatioTrialRecord`，消除 `Number(r.targetNegativeRatio ?? 50)` 等防御。

~~~~~act
patch_file
src/cards/neg_ratio_estimation/analytics.tsx
~~~~~
~~~~~typescript.old
import { Crosshair } from 'lucide-preact';
import { Callout } from '../../components/ui/callout';
import type { CardAnalyticsView } from '../../core/cardContract';
import { calculateBasicOverallStats } from '../../core/contracts';
import { CANVAS_THEME, hexToRgba } from '../../utils/theme';

export function createNegRatioAnalytics(): CardAnalyticsView[] {
  return [
    {
      id: 'ratio_scatter',
      tabLabel: 'analytics.ratioScatter.tabLabel',
      title: 'analytics.ratioScatter.title',
      subTitle: 'analytics.ratioScatter.subTitle',
      icon: Crosshair,
      renderVisualizer: (canvas, records) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;
        ctx.fillStyle = CANVAS_THEME.shape.stroke;
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = CANVAS_THEME.text.secondary;
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
          ctx.fillStyle = r.isHit
            ? hexToRgba(CANVAS_THEME.status.hit, 0.7)
            : hexToRgba(CANVAS_THEME.status.miss, 0.7);
          ctx.fill();
        }
      },
      renderDiagnostics: (records, t) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const avgRatioErr =
          totalCount > 0
            ? Math.round(
                (records.reduce((acc, c) => acc + Number(c.errorValue || 0), 0) / totalCount) * 10,
              ) / 10
            : 0;
~~~~~
~~~~~typescript.new
import { Crosshair } from 'lucide-preact';
import { Callout } from '../../components/ui/callout';
import type { CardAnalyticsView } from '../../core/cardContract';
import { calculateBasicOverallStats } from '../../core/contracts';
import type { UnifiedTrialRecord } from '../../storage/db/schema';
import { CANVAS_THEME, hexToRgba } from '../../utils/theme';

interface NegRatioTrialRecord extends UnifiedTrialRecord {
  targetNegativeRatio: number;
  userRatio: number;
  errorValue: number;
  positiveArea: number;
  negativeArea: number;
}

export function createNegRatioAnalytics(): CardAnalyticsView[] {
  return [
    {
      id: 'ratio_scatter',
      tabLabel: 'analytics.ratioScatter.tabLabel',
      title: 'analytics.ratioScatter.title',
      subTitle: 'analytics.ratioScatter.subTitle',
      icon: Crosshair,
      renderVisualizer: (canvas, rawRecords) => {
        const records = rawRecords as NegRatioTrialRecord[];
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;
        ctx.fillStyle = CANVAS_THEME.shape.stroke;
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = CANVAS_THEME.text.secondary;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, h - 30);
        ctx.lineTo(w - 20, 20);
        ctx.stroke();

        for (const r of records) {
          const px = 30 + (r.targetNegativeRatio / 100) * (w - 50);
          const py = h - 30 - (r.userRatio / 100) * (h - 50);

          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = r.isHit
            ? hexToRgba(CANVAS_THEME.status.hit, 0.7)
            : hexToRgba(CANVAS_THEME.status.miss, 0.7);
          ctx.fill();
        }
      },
      renderDiagnostics: (rawRecords, t) => {
        const records = rawRecords as NegRatioTrialRecord[];
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const avgRatioErr =
          totalCount > 0
            ? Math.round(
                (records.reduce((acc, c) => acc + c.errorValue, 0) / totalCount) * 10,
              ) / 10
            : 0;
~~~~~

#### Acts 6: 重构 `fractal_edge_roughness` 的私有类型收窄

在 `types.ts` 中定义 `FractalEdgeRoughnessTrialRecord`，并改造 `charts.ts` 与 `analytics.tsx`，彻底信赖数据。

~~~~~act
patch_file
src/cards/fractal_edge_roughness/types.ts
~~~~~
~~~~~typescript.old
export interface HitResult {
  isHit: boolean;
  userH: number;
  targetH: number;
  errorValue: number; // 绝对误差 |userH - targetH|
  signedBias: number; // 符号偏置 userH - targetH (正为偏平滑/低估粗糙度，负为过度敏感)
  tolerance: number;
}
~~~~~
~~~~~typescript.new
import type { UnifiedTrialRecord } from '../../storage/db/schema';

export interface HitResult {
  isHit: boolean;
  userH: number;
  targetH: number;
  errorValue: number; // 绝对误差 |userH - targetH|
  signedBias: number; // 符号偏置 userH - targetH (正为偏平滑/低估粗糙度，负为过度敏感)
  tolerance: number;
}

export interface FractalEdgeRoughnessTrialRecord extends UnifiedTrialRecord {
  targetH: number;
  userH: number;
  errorValue: number;
  signedBias: number;
}
~~~~~

~~~~~act
patch_file
src/cards/fractal_edge_roughness/utils/charts.ts
~~~~~
~~~~~typescript.old
import { setupHiDpiCanvas } from '../../../core/canvas/hidpi';
import type { ScopedTranslator } from '../../../core/i18n';
import type { UnifiedTrialRecord } from '../../../storage/db/schema';
import { CANVAS_THEME, getAccuracyColor, hexToRgba } from '../../../utils/theme';
import { getRoughnessSectorIdx } from './generator';

const SECTOR_KEYS = ['sectors.highFrequency', 'sectors.mediumFrequency', 'sectors.lowFrequency'];

/**
 * 绘制粗糙度偏置散点与趋势图 (Roughness Bias Chart)
 * 横轴: 目标 Hurst 指数 [0.1, 1.0]
 * 纵轴: 感知偏差 ΔH (正为偏平滑/低估，负为过度敏感)
 */
export function renderRoughnessBiasChart(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
  t: ScopedTranslator,
): void {
~~~~~
~~~~~typescript.new
import { setupHiDpiCanvas } from '../../../core/canvas/hidpi';
import type { ScopedTranslator } from '../../../core/i18n';
import type { UnifiedTrialRecord } from '../../../storage/db/schema';
import { CANVAS_THEME, getAccuracyColor, hexToRgba } from '../../../utils/theme';
import type { FractalEdgeRoughnessTrialRecord } from '../types';
import { getRoughnessSectorIdx } from './generator';

const SECTOR_KEYS = ['sectors.highFrequency', 'sectors.mediumFrequency', 'sectors.lowFrequency'];

/**
 * 绘制粗糙度偏置散点与趋势图 (Roughness Bias Chart)
 * 横轴: 目标 Hurst 指数 [0.1, 1.0]
 * 纵轴: 感知偏差 ΔH (正为偏平滑/低估，负为过度敏感)
 */
export function renderRoughnessBiasChart(
  canvas: HTMLCanvasElement,
  rawRecords: UnifiedTrialRecord[],
  t: ScopedTranslator,
): void {
  const records = rawRecords as FractalEdgeRoughnessTrialRecord[];
~~~~~

~~~~~act
patch_file
src/cards/fractal_edge_roughness/utils/charts.ts
~~~~~
~~~~~typescript.old
  // 2. 绘制散点
  for (const r of records) {
    const targetH = Number(r.targetH ?? 0.5);
    const signedBias = Number(r.signedBias ?? 0);
    const isHit = Boolean(r.isHit);

    const cx = getX(targetH);
    const cy = getY(signedBias);
~~~~~
~~~~~typescript.new
  // 2. 绘制散点
  for (const r of records) {
    const cx = getX(r.targetH);
    const cy = getY(r.signedBias);
    const isHit = r.isHit;
~~~~~

~~~~~act
patch_file
src/cards/fractal_edge_roughness/utils/charts.ts
~~~~~
~~~~~typescript.old
  for (const r of records) {
    const targetH = Number(r.targetH ?? 0.5);
    const signedBias = Number(r.signedBias ?? 0);
    for (const b of buckets) {
      if (targetH >= b.min && targetH < b.max) {
        b.sum += signedBias;
        b.count++;
        break;
      }
    }
  }
~~~~~
~~~~~typescript.new
  for (const r of records) {
    for (const b of buckets) {
      if (r.targetH >= b.min && r.targetH < b.max) {
        b.sum += r.signedBias;
        b.count++;
        break;
      }
    }
  }
~~~~~

~~~~~act
patch_file
src/cards/fractal_edge_roughness/utils/charts.ts
~~~~~
~~~~~typescript.old
export function renderRoughnessBandChart(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
  t: ScopedTranslator,
): void {
  const parentWidth = canvas.parentElement ? canvas.parentElement.clientWidth - 48 : 500;
  const width = Math.min(540, Math.max(300, parentWidth));
  const height = 230;

  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.fillStyle = CANVAS_THEME.bg.primary;
  ctx.fillRect(0, 0, width, height);

  const sectorBuckets = Array.from({ length: 3 }, () => ({
    total: 0,
    hits: 0,
    sumError: 0,
  }));

  for (const r of records) {
    const targetH = Number(r.targetH ?? 0.5);
    const sIdx = getRoughnessSectorIdx(targetH);
    sectorBuckets[sIdx].total += 1;
    if (r.isHit) sectorBuckets[sIdx].hits += 1;
    sectorBuckets[sIdx].sumError += Number(r.errorValue ?? 0);
  }
~~~~~
~~~~~typescript.new
export function renderRoughnessBandChart(
  canvas: HTMLCanvasElement,
  rawRecords: UnifiedTrialRecord[],
  t: ScopedTranslator,
): void {
  const records = rawRecords as FractalEdgeRoughnessTrialRecord[];
  const parentWidth = canvas.parentElement ? canvas.parentElement.clientWidth - 48 : 500;
  const width = Math.min(540, Math.max(300, parentWidth));
  const height = 230;

  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.fillStyle = CANVAS_THEME.bg.primary;
  ctx.fillRect(0, 0, width, height);

  const sectorBuckets = Array.from({ length: 3 }, () => ({
    total: 0,
    hits: 0,
    sumError: 0,
  }));

  for (const r of records) {
    const sIdx = getRoughnessSectorIdx(r.targetH);
    sectorBuckets[sIdx].total += 1;
    if (r.isHit) sectorBuckets[sIdx].hits += 1;
    sectorBuckets[sIdx].sumError += r.errorValue;
  }
~~~~~

~~~~~act
patch_file
src/cards/fractal_edge_roughness/analytics.tsx
~~~~~
~~~~~typescript.old
import { AlertCircle, BarChart2, Sparkles } from 'lucide-preact';
import { Callout } from '../../components/ui/callout';
import type { CardAnalyticsView } from '../../core/cardContract';
import { calculateBasicOverallStats } from '../../core/contracts';
import { renderRoughnessBandChart, renderRoughnessBiasChart } from './utils/charts';
import { getRoughnessSectorIdx } from './utils/generator';

const SECTOR_KEYS = ['sectors.highFrequency', 'sectors.mediumFrequency', 'sectors.lowFrequency'];

export function createFractalEdgeRoughnessAnalytics(): CardAnalyticsView[] {
  return [
    {
      id: 'roughness_bias',
      tabLabel: 'analytics.roughnessBias.tabLabel',
      title: 'analytics.roughnessBias.title',
      subTitle: 'analytics.roughnessBias.subTitle',
      icon: Sparkles,
      renderVisualizer: (canvas, records, t) => {
        renderRoughnessBiasChart(canvas, records, t);
      },
      renderDiagnostics: (records, t) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        let sumSignedBias = 0;
        let sumAbsError = 0;

        for (const r of records) {
          const bias = Number(r.signedBias ?? 0);
          const err = Number(r.errorValue ?? 0);
          sumSignedBias += bias;
          sumAbsError += err;
        }

        const avgSignedBias = Math.round((sumSignedBias / totalCount) * 1000) / 1000;
~~~~~
~~~~~typescript.new
import { AlertCircle, BarChart2, Sparkles } from 'lucide-preact';
import { Callout } from '../../components/ui/callout';
import type { CardAnalyticsView } from '../../core/cardContract';
import { calculateBasicOverallStats } from '../../core/contracts';
import type { FractalEdgeRoughnessTrialRecord } from './types';
import { renderRoughnessBandChart, renderRoughnessBiasChart } from './utils/charts';
import { getRoughnessSectorIdx } from './utils/generator';

const SECTOR_KEYS = ['sectors.highFrequency', 'sectors.mediumFrequency', 'sectors.lowFrequency'];

export function createFractalEdgeRoughnessAnalytics(): CardAnalyticsView[] {
  return [
    {
      id: 'roughness_bias',
      tabLabel: 'analytics.roughnessBias.tabLabel',
      title: 'analytics.roughnessBias.title',
      subTitle: 'analytics.roughnessBias.subTitle',
      icon: Sparkles,
      renderVisualizer: (canvas, records, t) => {
        renderRoughnessBiasChart(canvas, records, t);
      },
      renderDiagnostics: (rawRecords, t) => {
        const records = rawRecords as FractalEdgeRoughnessTrialRecord[];
        const totalCount = records.length;
        if (totalCount === 0) return null;

        let sumSignedBias = 0;
        let sumAbsError = 0;

        for (const r of records) {
          sumSignedBias += r.signedBias;
          sumAbsError += r.errorValue;
        }

        const avgSignedBias = Math.round((sumSignedBias / totalCount) * 1000) / 1000;
~~~~~

~~~~~act
patch_file
src/cards/fractal_edge_roughness/analytics.tsx
~~~~~
~~~~~typescript.old
      renderDiagnostics: (records, t) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const sectorBuckets = Array.from({ length: 3 }, () => ({ total: 0, hits: 0 }));
        for (const r of records) {
          const targetH = Number(r.targetH ?? 0.5);
          const sIdx = getRoughnessSectorIdx(targetH);
          sectorBuckets[sIdx].total += 1;
          if (r.isHit) sectorBuckets[sIdx].hits += 1;
        }
~~~~~
~~~~~typescript.new
      renderDiagnostics: (rawRecords, t) => {
        const records = rawRecords as FractalEdgeRoughnessTrialRecord[];
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const sectorBuckets = Array.from({ length: 3 }, () => ({ total: 0, hits: 0 }));
        for (const r of records) {
          const sIdx = getRoughnessSectorIdx(r.targetH);
          sectorBuckets[sIdx].total += 1;
          if (r.isHit) sectorBuckets[sIdx].hits += 1;
        }
~~~~~

### 下一步建议
1. **测试运行与类型校验**：运行项目类型检查命令（例如 `pnpm typecheck` 或 `npm run build`）以验证上述所有修改不存在任何 TS 编译与类型推导错误。
2. **提交方案 B 成果**：如果类型检查通过，可以创建独立的 `[COMMIT]` 计划将此次方案 B 补全进行版本控制存盘。
