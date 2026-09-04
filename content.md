我将生成完整的 Quipu 重构计划，为 `i18n` 增加纯函数作用域翻译器生成能力，并将 `ScopedTranslator` 上下文注入到 `CardAnalyticsView` 契约中，从而彻底清除卡片分析与图表工具函数中的硬编码绝对路径。

## [WIP] refactor(i18n): 根治卡片分析与图表工具中的多语言绝对长路径硬编码

### 用户需求
清除 FormSight 各卡片模块（尤其是 `analytics.tsx`、图表工具等非组件文件）中大量形如 `i18n.t('cards.star_single.analytics.spatialBias.right')` 的绝对长路径硬编码，建立作用域隔离的翻译调用机制。

### 评论
当前卡片分析与图表渲染属于纯函数逻辑，脱离了 React Hook 上下文（无法使用 `useCardTranslation`），导致卡片实现被强行绑定到全局绝对键名。这破坏了卡片模块的封装性与可移植性（复制代码需要逐一替换前缀），并在核心图表库中引入了反向业务依赖。通过在契约层注入 `ScopedTranslator` 并解耦底层图表绘制入参，能从架构层面彻底杜绝路径泄露。

### 目标
1. 在 `src/core/i18n.ts` 中新增非 Hook 的纯函数作用域翻译器 `createScopedTranslator(cardId)` 与 `ScopedTranslator` 类型定义。
2. 升级 `src/core/contracts.ts` 与 `src/core/cardContract.ts` 中的 `CardAnalyticsView` 接口，向 `renderVisualizer`、`renderDiagnostics`、`getOverallStats` 注入局部 `t: ScopedTranslator`。
3. 在 `src/views/CardAnalyticsView.tsx` 中调用分析视图生命周期时，将当前卡片的 `t` 函数透传给分析插件。
4. 解耦 `src/core/canvas/charts/drawColorRing.ts`，移除写死的 `cards.color_hue.title`，改为形参传入。
5. 重构 `color_hue`, `fractal_edge_roughness`, `star_single`, `star_double_h`, `star_double_r`, `neg_ratio_estimation` 的 `analytics.tsx` 及关联 `charts.ts`，全面切换至局部短路径 `t('analytics...')`。

### 基本原理
基于控制反转（IoC）原则，纯函数和插件逻辑不应自行向上查找并拼装全局长路径命名空间，而应由执行宿主（`CardAnalyticsView.tsx` 视图组件）在其生命周期中将已绑定卡片作用域的 `t` 闭包函数作为形参注入给各生命周期回调。同时，通过在底层工具库中采用参数化传值替代内部 `i18n.t` 调用，切断核心层对业务层的反向依赖。

### 标签
#intent/refine #flow/ready #priority/high #comp/interfaces #comp/runtime #concept/state #scope/core #scope/dx #ai/delegate #task/domain/i18n #task/object/scoped-translator #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 扩展 i18n 核心模块与更新 CardAnalyticsView 契约定义

在 `src/core/i18n.ts` 中导出 `ScopedTranslator` 与 `createScopedTranslator`，并在契约中将 `t` 注入分析视图回调。

~~~~~act
patch_file
src/core/i18n.ts
~~~~~
~~~~~typescript.old
export function useCardTranslation(cardId: string) {
  const { t: baseT, locale, setLocale } = useTranslation();

  const cardT = <T = string>(key: string, params?: Record<string, string | number>): T => {
    const isExplicitGlobal =
      key.startsWith('cards.') ||
      key.startsWith('common.') ||
      key.startsWith('global.') ||
      key.startsWith('tags.') ||
      key.startsWith('nav.') ||
      key.startsWith('stats.') ||
      key.startsWith('plan.') ||
      key.startsWith('home.');

    if (isExplicitGlobal) {
      return baseT<T>(key, params);
    }

    const cardKey = `cards.${cardId}.${key.replace(/^\./, '')}`;
    const result = baseT<T>(cardKey, params);

    // 若未在卡片局部命名空间查找到（返回了原始拼装 key），回退尝试直接查全局
    if (typeof result === 'string' && result === cardKey) {
      return baseT<T>(key, params);
    }

    return result;
  };

  return { t: cardT, locale, setLocale };
}
~~~~~
~~~~~typescript.new
export type ScopedTranslator = <T = string>(
  key: string,
  params?: Record<string, string | number>,
) => T;

/**
 * 为非 React 组件（纯函数、Canvas 渲染、计算模块）提供带卡片作用域的翻译器
 */
export function createScopedTranslator(cardId: string): ScopedTranslator {
  return <T = string>(key: string, params?: Record<string, string | number>): T => {
    const isExplicitGlobal =
      key.startsWith('cards.') ||
      key.startsWith('common.') ||
      key.startsWith('global.') ||
      key.startsWith('tags.') ||
      key.startsWith('nav.') ||
      key.startsWith('stats.') ||
      key.startsWith('plan.') ||
      key.startsWith('home.');

    if (isExplicitGlobal) {
      return i18n.t<T>(key, params);
    }

    const cardKey = `cards.${cardId}.${key.replace(/^\./, '')}`;
    const result = i18n.t<T>(cardKey, params);

    if (typeof result === 'string' && result === cardKey) {
      return i18n.t<T>(key, params);
    }

    return result;
  };
}

export function useCardTranslation(cardId: string) {
  const { locale, setLocale } = useTranslation();
  const cardT = createScopedTranslator(cardId);
  return { t: cardT, locale, setLocale };
}
~~~~~

~~~~~act
patch_file
src/core/contracts.ts
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
import type { ScopedTranslator } from './i18n';

export interface CardAnalyticsView<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  id: string;
  tabLabel: string;
  title: string;
  subTitle: string;
  icon?: (props: { className?: string }) => ComponentChildren;
  renderVisualizer: (canvas: HTMLCanvasElement, records: TRecord[], t: ScopedTranslator) => void;
  renderDiagnostics: (records: TRecord[], t: ScopedTranslator) => ComponentChildren;
  getOverallStats?: (records: TRecord[], t: ScopedTranslator) => {
    accuracy: number;
    total: number;
    customSummary?: ComponentChildren;
  };
}
~~~~~

~~~~~act
patch_file
src/core/cardContract.ts
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
import type { ScopedTranslator } from './i18n';

export interface CardAnalyticsView<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  id: string;
  tabLabel: string;
  title: string;
  subTitle: string;
  icon?: (props: { className?: string }) => ComponentChildren;
  renderVisualizer: (canvas: HTMLCanvasElement, records: TRecord[], t: ScopedTranslator) => void;
  renderDiagnostics: (records: TRecord[], t: ScopedTranslator) => ComponentChildren;
  getOverallStats?: (records: TRecord[], t: ScopedTranslator) => {
    accuracy: number;
    total: number;
    customSummary?: ComponentChildren;
  };
}
~~~~~

#### Acts 2: 宿主视图 CardAnalyticsView.tsx 注入局部 t 与 解耦通用分析视图

在 `CardAnalyticsView.tsx` 中将局部 `t` 传递给插件，并在 `universalViews.tsx` 中兼容注入参数。

~~~~~act
patch_file
src/views/CardAnalyticsView.tsx
~~~~~
~~~~~typescript.old
import { getCardDesc, getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { UnifiedTrialRecord } from '../storage/index';

interface CardAnalyticsViewProps {
  cardId: string;
  initialTab?: string;
  onExit: () => void;
  onStartTraining: (cardId: string) => void;
  onStartBenchmark: (cardId: string) => void;
  onOpenSettings: (cardId: string) => void;
}

export function CardAnalyticsView({
  cardId,
  initialTab,
  onExit,
  onStartTraining,
  onStartBenchmark,
  onOpenSettings,
}: CardAnalyticsViewProps) {
  const { t } = useTranslation();
  const card = registry.getCardById(cardId);
  const plugin = useMemo(
    () => (card ? registry.getAnalyticsPluginByCardId(card.id) : null),
    [card],
  );
  const [records, setRecords] = useState<UnifiedTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTabId, setActiveTabId] = useState<string>(initialTab || 'overview');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
~~~~~
~~~~~typescript.new
import { getCardDesc, getCardTitle, useCardTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { UnifiedTrialRecord } from '../storage/index';

interface CardAnalyticsViewProps {
  cardId: string;
  initialTab?: string;
  onExit: () => void;
  onStartTraining: (cardId: string) => void;
  onStartBenchmark: (cardId: string) => void;
  onOpenSettings: (cardId: string) => void;
}

export function CardAnalyticsView({
  cardId,
  initialTab,
  onExit,
  onStartTraining,
  onStartBenchmark,
  onOpenSettings,
}: CardAnalyticsViewProps) {
  const { t } = useCardTranslation(cardId);
  const card = registry.getCardById(cardId);
  const plugin = useMemo(
    () => (card ? registry.getAnalyticsPluginByCardId(card.id) : null),
    [card],
  );
  const [records, setRecords] = useState<UnifiedTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTabId, setActiveTabId] = useState<string>(initialTab || 'overview');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
~~~~~

~~~~~act
patch_file
src/views/CardAnalyticsView.tsx
~~~~~
~~~~~typescript.old
  useEffect(() => {
    if (loading || !currentView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    currentView.renderVisualizer(canvas, records);
  }, [currentView, loading, records]);
~~~~~
~~~~~typescript.new
  useEffect(() => {
    if (loading || !currentView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    currentView.renderVisualizer(canvas, records, t);
  }, [currentView, loading, records, t]);
~~~~~

~~~~~act
patch_file
src/views/CardAnalyticsView.tsx
~~~~~
~~~~~typescript.old
            {/* 插件个性化诊断 */}
            <div className="space-y-3">{currentView.renderDiagnostics(records)}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
~~~~~
~~~~~typescript.new
            {/* 插件个性化诊断 */}
            <div className="space-y-3">{currentView.renderDiagnostics(records, t)}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/core/analytics/difficultyPlateauView.tsx
~~~~~
~~~~~typescript.old
export function renderDifficultyPlateauVisualizer(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
) {
~~~~~
~~~~~typescript.new
export function renderDifficultyPlateauVisualizer(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
  _t?: unknown,
) {
~~~~~

~~~~~act
patch_file
src/core/analytics/difficultyPlateauView.tsx
~~~~~
~~~~~typescript.old
export function diagnoseDifficultyPlateau(records: UnifiedTrialRecord[]): ComponentChildren {
~~~~~
~~~~~typescript.new
export function diagnoseDifficultyPlateau(
  records: UnifiedTrialRecord[],
  _t?: unknown,
): ComponentChildren {
~~~~~

~~~~~act
patch_file
src/core/analytics/speedAccuracyView.tsx
~~~~~
~~~~~typescript.old
export function renderSpeedAccuracyVisualizer(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
) {
~~~~~
~~~~~typescript.new
export function renderSpeedAccuracyVisualizer(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
  _t?: unknown,
) {
~~~~~

~~~~~act
patch_file
src/core/analytics/speedAccuracyView.tsx
~~~~~
~~~~~typescript.old
export function diagnoseSpeedAccuracy(records: UnifiedTrialRecord[]): ComponentChildren {
~~~~~
~~~~~typescript.new
export function diagnoseSpeedAccuracy(
  records: UnifiedTrialRecord[],
  _t?: unknown,
): ComponentChildren {
~~~~~

#### Acts 3: 解耦 drawColorRing.ts 底层图表工具函数

移除 `drawColorRing.ts` 中写死的 `cards.color_hue.title` 依赖，改为由外部传入标题与文本。

~~~~~act
patch_file
src/core/canvas/charts/drawColorRing.ts
~~~~~
~~~~~typescript.old
import { CANVAS_THEME, getAccuracyFillColor, hexToRgba } from '../../../utils/theme';
import { hsvToHex } from '../../color/colorUtils';
import { i18n } from '../../i18n';
import { initSquareHiDpiCanvas } from '../hidpi';
import type { SectorStat } from './drawCompass';

export function renderHueRingCanvas(canvas: HTMLCanvasElement, sectorStats: SectorStat[]) {
~~~~~
~~~~~typescript.new
import { CANVAS_THEME, getAccuracyFillColor, hexToRgba } from '../../../utils/theme';
import { hsvToHex } from '../../color/colorUtils';
import { initSquareHiDpiCanvas } from '../hidpi';
import type { SectorStat } from './drawCompass';

export function renderHueRingCanvas(
  canvas: HTMLCanvasElement,
  sectorStats: SectorStat[],
  titleText = 'Hue',
  accuracyText = 'Accuracy',
) {
~~~~~

~~~~~act
patch_file
src/core/canvas/charts/drawColorRing.ts
~~~~~
~~~~~typescript.old
  ctx.fillStyle = CANVAS_THEME.text.primary;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(i18n.t('cards.color_hue.title'), cx, cy - 5);
  ctx.fillStyle = CANVAS_THEME.text.secondary;
  ctx.font = '9px sans-serif';
  ctx.fillText(i18n.t('common.accuracy'), cx, cy + 8);
}
~~~~~
~~~~~typescript.new
  ctx.fillStyle = CANVAS_THEME.text.primary;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(titleText, cx, cy - 5);
  ctx.fillStyle = CANVAS_THEME.text.secondary;
  ctx.font = '9px sans-serif';
  ctx.fillText(accuracyText, cx, cy + 8);
}
~~~~~

#### Acts 4: 重构色相卡片 color_hue/analytics.tsx

彻底移除 `i18n.t('cards.color_hue...')` 长路径，完全使用注入的 `t` 函数。

~~~~~act
write_file
src/cards/color_hue/analytics.tsx
~~~~~
~~~~~typescript
import { AlertCircle, PieChart, Sparkles } from 'lucide-preact';
import { Callout } from '../../components/ui/callout';
import { renderHueRingCanvas } from '../../core/canvas/charts/drawColorRing';
import type { SectorStat } from '../../core/canvas/charts/drawCompass';
import {
  calcSignedHueBias,
  renderHueBiasChartCanvas,
} from '../../core/canvas/charts/drawHueBiasChart';
import type { CardAnalyticsView } from '../../core/cardContract';
import { hsvToHex } from '../../core/color/colorUtils';
import { calculateBasicOverallStats } from '../../core/contracts';
import type { ScopedTranslator } from '../../core/i18n';
import type { UnifiedTrialRecord } from '../../storage/db/schema';

const COLOR_SECTOR_KEYS = [
  'sectors.red',
  'sectors.orange',
  'sectors.yellow',
  'sectors.yellowGreen',
  'sectors.green',
  'sectors.cyanGreen',
  'sectors.cyan',
  'sectors.blue',
  'sectors.blueViolet',
  'sectors.violet',
  'sectors.magenta',
  'sectors.rose',
];

interface ColorHueTrialRecord extends UnifiedTrialRecord {
  targetHSV?: [number, number, number];
  userHSV?: [number, number, number];
}

/**
 * 聚合 12 个色相扇区的样本量、命中数与平均误差统计
 */
function calculateHueSectorStats(
  records: UnifiedTrialRecord[],
  t: ScopedTranslator,
): SectorStat[] {
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

export function createColorHueAnalytics(): CardAnalyticsView[] {
  return [
    {
      id: 'hue_bias_chart',
      tabLabel: 'analytics.hueBias.tabLabel',
      title: 'analytics.hueBias.title',
      subTitle: 'analytics.hueBias.subTitle',
      icon: Sparkles,
      renderVisualizer: (canvas, records) => {
        renderHueBiasChartCanvas(canvas, records);
      },
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

        const avgSignedBias = Math.round((sumSignedBias / totalCount) * 10) / 10;
        const validSectors = sectorBuckets
          .map((b, i) => ({
            sectorIdx: i,
            label: t(COLOR_SECTOR_KEYS[i]),
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

        const signedBiasText =
          avgSignedBias > 0
            ? t('analytics.hueBias.clockwise', { val: avgSignedBias })
            : avgSignedBias < 0
              ? t('analytics.hueBias.counterClockwise', { val: avgSignedBias })
              : '0°';

        return (
          <Callout
            variant="warning"
            icon={AlertCircle}
            title={t('analytics.hueBias.cardTitle')}
          >
            <div className="space-y-2 text-xs text-foreground pt-1">
              <div className="flex justify-between bg-card p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/60 shadow-xs font-mono">
                <span className="text-muted-foreground">
                  {t('analytics.hueBias.avgSignedBias')}
                </span>
                <span
                  className={`font-bold ${
                    avgSignedBias > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : avgSignedBias < 0
                        ? 'text-primary'
                        : 'text-foreground'
                  }`}
                >
                  {signedBiasText}
                </span>
              </div>

              {maxBiasSector ? (
                <div className="space-y-1.5">
                  <p className="text-muted-foreground">
                    {t('analytics.hueBias.maxBiasSector')}
                    <span className="font-bold text-amber-700 dark:text-amber-300 ml-1">
                      {maxBiasSector.label}
                    </span>
                  </p>
                  <div className="flex justify-between items-center bg-card p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/60 shadow-xs">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-full border border-border"
                        style={{
                          backgroundColor: hsvToHex(maxBiasSector.sectorIdx * 30 + 15, 100, 100),
                        }}
                      />
                      <span className="font-bold text-foreground">
                        {maxBiasSector.label.split(' ')[0]}
                      </span>
                    </div>
                    <span className="font-black text-amber-700 dark:text-amber-300 font-mono text-xs">
                      {t('analytics.hueBias.avgBias')}{' '}
                      {maxBiasSector.avgBias > 0
                        ? `+${maxBiasSector.avgBias}°`
                        : `${maxBiasSector.avgBias}°`}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  {t('analytics.hueBias.needMoreTrials')}
                </p>
              )}
            </div>
          </Callout>
        );
      },
      getOverallStats: (records, t) => {
        const baseStats = calculateBasicOverallStats(records);
        const sumError = records.reduce((acc, curr) => acc + Number(curr.errorValue || 0), 0);
        const avgError =
          baseStats.total > 0 ? Math.round((sumError / baseStats.total) * 10) / 10 : 0;

        return {
          ...baseStats,
          customSummary: (
            <div className="flex justify-between text-indigo-700 font-bold border-t border-border/60 pt-1 text-xs">
              <span>{t('analytics.hueBias.avgAbsError')}</span>
              <span>{avgError}°</span>
            </div>
          ),
        };
      },
    },
    {
      id: 'hue_ring',
      tabLabel: 'analytics.hueRing.tabLabel',
      title: 'analytics.hueRing.title',
      subTitle: 'analytics.hueRing.subTitle',
      icon: PieChart,
      renderVisualizer: (canvas, records, t) => {
        const sectorStats = calculateHueSectorStats(records, t);
        renderHueRingCanvas(canvas, sectorStats, t('title'), t('common.accuracy'));
      },
      renderDiagnostics: (records, t) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const sectorStats = calculateHueSectorStats(records, t);
        const validSectors = sectorStats.filter((s) => s.total >= 3);
        const weakestSector =
          validSectors.length > 0
            ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
            : null;

        return (
          <Callout
            variant="warning"
            icon={AlertCircle}
            title={t('analytics.hueRing.cardTitle')}
          >
            {weakestSector ? (
              <div className="space-y-2 pt-1">
                <p className="text-foreground text-xs">
                  {t('analytics.hueRing.weakestHint', {
                    sector: weakestSector.label,
                  })}
                </p>
                <div className="flex justify-between items-center bg-card p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/60 shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full border border-border"
                      style={{
                        backgroundColor: hsvToHex(weakestSector.sectorIdx * 30 + 15, 100, 100),
                      }}
                    />
                    <span className="font-bold text-foreground">
                      {weakestSector.label.split(' ')[0]}
                    </span>
                  </div>
                  <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                    {t('analytics.hueRing.accuracyRate', {
                      accuracy: weakestSector.accuracy,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                {t('analytics.hueRing.needMoreTrials')}
              </p>
            )}
          </Callout>
        );
      },
      getOverallStats: (records, t) => {
        const baseStats = calculateBasicOverallStats(records);
        const sumError = records.reduce((acc, curr) => acc + Number(curr.errorValue || 0), 0);
        const avgError =
          baseStats.total > 0 ? Math.round((sumError / baseStats.total) * 10) / 10 : 0;

        return {
          ...baseStats,
          customSummary: (
            <div className="flex justify-between text-indigo-700 font-bold border-t border-border/60 pt-1 text-xs">
              <span>{t('analytics.hueBias.avgAbsError')}</span>
              <span>{avgError}°</span>
            </div>
          ),
        };
      },
    },
  ];
}
~~~~~

#### Acts 5: 重构粗糙度卡片 fractal_edge_roughness 相关文件

解耦 `charts.ts` 与 `analytics.tsx`，移除 `cards.fractal_edge_roughness.` 前缀。

~~~~~act
write_file
src/cards/fractal_edge_roughness/utils/charts.ts
~~~~~
~~~~~typescript
import { setupHiDpiCanvas } from '../../../core/canvas/hidpi';
import type { ScopedTranslator } from '../../../core/i18n';
import type { UnifiedTrialRecord } from '../../../storage/db/schema';
import { CANVAS_THEME, getAccuracyColor, hexToRgba } from '../../../utils/theme';
import { getRoughnessSectorIdx } from './generator';

const SECTOR_KEYS = [
  'sectors.highFrequency',
  'sectors.mediumFrequency',
  'sectors.lowFrequency',
];

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
  const parentWidth = canvas.parentElement ? canvas.parentElement.clientWidth - 48 : 500;
  const width = Math.min(540, Math.max(300, parentWidth));
  const height = 260;

  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  // 背景填充
  ctx.fillStyle = CANVAS_THEME.bg.primary;
  ctx.fillRect(0, 0, width, height);

  const padding = { top: 32, right: 30, bottom: 42, left: 54 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const minH = 0.1;
  const maxH = 1.0;
  const maxBiasRange = 0.25; // 纵轴范围 [-0.25, +0.25]

  const getX = (h: number) => padding.left + ((h - minH) / (maxH - minH)) * plotWidth;
  const getY = (bias: number) => {
    const clampedBias = Math.max(-maxBiasRange, Math.min(maxBiasRange, bias));
    return padding.top + plotHeight / 2 - (clampedBias / maxBiasRange) * (plotHeight / 2);
  };

  // 1. 绘制网格与刻度
  ctx.strokeStyle = CANVAS_THEME.axis.line;
  ctx.lineWidth = 1;

  // 纵向网格线 (Hurst: 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0)
  ctx.fillStyle = CANVAS_THEME.text.muted;
  ctx.font = '10px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (let h = 0.1; h <= 1.01; h += 0.15) {
    const x = getX(h);
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotHeight);
    ctx.stroke();
    ctx.fillText(`H ${h.toFixed(2)}`, x, padding.top + plotHeight + 6);
  }

  // 横向中轴基准线 (Bias = 0)
  const zeroY = getY(0);
  ctx.strokeStyle = CANVAS_THEME.axis.highlight;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(padding.left, zeroY);
  ctx.lineTo(padding.left + plotWidth, zeroY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 纵向刻度标签
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CANVAS_THEME.text.muted;
  ctx.fillText('+0.20', padding.left - 6, getY(0.2));
  ctx.fillText('0.00', padding.left - 6, zeroY);
  ctx.fillText('-0.20', padding.left - 6, getY(-0.2));

  // 极性说明文字
  ctx.font = '10px sans-serif';
  ctx.fillStyle = CANVAS_THEME.status.warning;
  ctx.textAlign = 'left';
  ctx.fillText(t('chartBiasUnder'), padding.left, 14);

  ctx.fillStyle = CANVAS_THEME.status.accent;
  ctx.textAlign = 'right';
  ctx.fillText(t('chartBiasOver'), width - padding.right, 14);

  if (records.length === 0) return;

  // 2. 绘制散点
  for (const r of records) {
    const targetH = Number(r.targetH ?? 0.5);
    const signedBias = Number(r.signedBias ?? 0);
    const isHit = Boolean(r.isHit);

    const cx = getX(targetH);
    const cy = getY(signedBias);

    ctx.beginPath();
    ctx.arc(cx, cy, isHit ? 3.5 : 4, 0, Math.PI * 2);
    ctx.fillStyle = isHit
      ? hexToRgba(CANVAS_THEME.status.hit, 0.65)
      : hexToRgba(CANVAS_THEME.status.miss, 0.7);
    ctx.fill();
    ctx.strokeStyle = isHit ? CANVAS_THEME.status.hit : CANVAS_THEME.status.miss;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 3. 计算并绘制分桶平滑平均趋势线
  const buckets = [
    { min: 0.1, max: 0.35, sum: 0, count: 0, mid: 0.225 },
    { min: 0.35, max: 0.6, sum: 0, count: 0, mid: 0.475 },
    { min: 0.6, max: 0.85, sum: 0, count: 0, mid: 0.725 },
    { min: 0.85, max: 1.01, sum: 0, count: 0, mid: 0.925 },
  ];

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

  const validPoints = buckets
    .filter((b) => b.count > 0)
    .map((b) => ({
      x: getX(b.mid),
      y: getY(b.sum / b.count),
    }));

  if (validPoints.length >= 2) {
    ctx.strokeStyle = CANVAS_THEME.status.accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(validPoints[0].x, validPoints[0].y);
    for (let i = 1; i < validPoints.length; i++) {
      ctx.lineTo(validPoints[i].x, validPoints[i].y);
    }
    ctx.stroke();

    for (const pt of validPoints) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = CANVAS_THEME.bg.primary;
      ctx.fill();
      ctx.strokeStyle = CANVAS_THEME.status.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

/**
 * 绘制频段敏感度柱状指示图 (Roughness Band Sensitivity Chart)
 */
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

  const startY = 32;
  const rowHeight = 58;
  const barLeft = 180;
  const barRight = width - 80;
  const barWidth = Math.max(80, barRight - barLeft);
  const barThickness = 14;

  for (let i = 0; i < 3; i++) {
    const b = sectorBuckets[i];
    const acc = b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0;
    const avgErr = b.total > 0 ? Math.round((b.sumError / b.total) * 1000) / 1000 : 0;
    const y = startY + i * rowHeight;

    // 频段标签
    ctx.fillStyle = CANVAS_THEME.text.primary;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(t(SECTOR_KEYS[i]), 16, y);

    // 题目样本与误差信息
    ctx.fillStyle = CANVAS_THEME.text.muted;
    ctx.font = '11px ui-monospace, monospace';
    const trialsUnit = t('common.trialsUnit');
    const errInfo =
      b.total > 0
        ? ` · ${t('chartAvgDelta', { val: avgErr })}`
        : '';
    ctx.fillText(`${b.total} ${trialsUnit}${errInfo}`, 16, y + 18);

    // 背景槽
    const barY = y + 4;
    ctx.fillStyle = CANVAS_THEME.bg.subtle;
    ctx.beginPath();
    ctx.roundRect(barLeft, barY, barWidth, barThickness, 7);
    ctx.fill();

    // 填充条
    if (b.total > 0 && acc > 0) {
      const fillW = Math.max(barThickness, (acc / 100) * barWidth);
      ctx.fillStyle = getAccuracyColor(acc);
      ctx.beginPath();
      ctx.roundRect(barLeft, barY, fillW, barThickness, 7);
      ctx.fill();
    }

    // 正确率百分比数值
    ctx.fillStyle = b.total > 0 ? getAccuracyColor(acc) : CANVAS_THEME.text.muted;
    ctx.font = 'bold 12px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.total > 0 ? `${acc}%` : '--', width - 20, barY + barThickness / 2);
  }
}
~~~~~

~~~~~act
write_file
src/cards/fractal_edge_roughness/analytics.tsx
~~~~~
~~~~~typescript
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

        const signedBiasText =
          avgSignedBias > 0
            ? t('analytics.roughnessBias.underestimateRoughness', { val: avgSignedBias })
            : avgSignedBias < 0
              ? t('analytics.roughnessBias.overestimateRoughness', {
                  val: Math.abs(avgSignedBias),
                })
              : t('analytics.roughnessBias.neutral');

        return (
          <Callout
            variant="info"
            icon={AlertCircle}
            title={t('analytics.roughnessBias.cardTitle')}
          >
            <div className="space-y-2 text-xs text-foreground pt-1">
              <p className="text-muted-foreground leading-relaxed">
                {t('analytics.roughnessBias.desc')}
              </p>

              <div className="flex justify-between bg-card p-2 rounded-xl border border-border/60 font-mono shadow-xs">
                <span className="text-muted-foreground">
                  {t('analytics.roughnessBias.avgSignedBias')}
                </span>
                <span
                  className={`font-bold ${
                    avgSignedBias > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : avgSignedBias < 0
                        ? 'text-primary'
                        : 'text-foreground'
                  }`}
                >
                  {signedBiasText}
                </span>
              </div>
            </div>
          </Callout>
        );
      },
      getOverallStats: (records, t) => {
        const baseStats = calculateBasicOverallStats(records);
        const sumAbsError = records.reduce((acc, curr) => acc + Number(curr.errorValue || 0), 0);
        const avgAbsError =
          baseStats.total > 0 ? Math.round((sumAbsError / baseStats.total) * 1000) / 1000 : 0;

        return {
          ...baseStats,
          customSummary: (
            <div className="flex justify-between text-indigo-700 font-bold border-t border-border/60 pt-1 text-xs font-mono">
              <span>{t('analytics.roughnessBias.avgAbsError')}</span>
              <span>{avgAbsError}</span>
            </div>
          ),
        };
      },
    },
    {
      id: 'band_sensitivity',
      tabLabel: 'analytics.bandSensitivity.tabLabel',
      title: 'analytics.bandSensitivity.title',
      subTitle: 'analytics.bandSensitivity.subTitle',
      icon: BarChart2,
      renderVisualizer: (canvas, records, t) => {
        renderRoughnessBandChart(canvas, records, t);
      },
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

        const validSectors = sectorBuckets
          .map((b, i) => ({
            label: t(SECTOR_KEYS[i]),
            total: b.total,
            accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
          }))
          .filter((s) => s.total >= 3);

        const weakest =
          validSectors.length > 0
            ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
            : null;

        return (
          <Callout
            variant="warning"
            icon={AlertCircle}
            title={t('analytics.bandSensitivity.cardTitle')}
          >
            {weakest ? (
              <div className="space-y-1.5 text-xs text-foreground pt-1">
                <p>
                  {t('analytics.bandSensitivity.weakestHint', {
                    sector: weakest.label,
                  })}
                </p>
                <div className="flex justify-between items-center bg-card p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/60 font-mono shadow-xs">
                  <span>{weakest.label}</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {t('analytics.bandSensitivity.accuracyRate', {
                      accuracy: weakest.accuracy,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                {t('analytics.bandSensitivity.needMoreTrials')}
              </p>
            )}
          </Callout>
        );
      },
      getOverallStats: (records) => calculateBasicOverallStats(records),
    },
  ];
}
~~~~~

#### Acts 6: 重构单锚点与双锚点卡片 analytics.tsx

消除 `star_single`、`star_double_h`、`star_double_r` 中的所有绝对路径。

~~~~~act
write_file
src/cards/star_single/analytics.tsx
~~~~~
~~~~~typescript
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

        const dxText =
          avgDx > 0
            ? t('analytics.spatialBias.right', { val: avgDx })
            : avgDx < 0
              ? t('analytics.spatialBias.left', { val: avgDx })
              : '0';

        const dyText =
          avgDy > 0
            ? t('analytics.spatialBias.down', { val: avgDy })
            : avgDy < 0
              ? t('analytics.spatialBias.up', { val: avgDy })
              : '0';

        return (
          <Callout
            variant="info"
            icon={Target}
            title={t('analytics.spatialBias.cardTitle')}
          >
            <p className="text-muted-foreground leading-relaxed text-xs">
              {t('analytics.spatialBias.desc')}
            </p>
            <div className="pt-1.5 space-y-1 font-mono text-foreground">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('analytics.spatialBias.avgDx')}
                </span>
                <span className="font-bold">{dxText}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('analytics.spatialBias.avgDy')}
                </span>
                <span className="font-bold">{dyText}</span>
              </div>
              <div className="flex justify-between text-primary font-bold border-t border-border/60 pt-1">
                <span>{t('analytics.spatialBias.avgDist')}</span>
                <span>{avgDist}px</span>
              </div>
            </div>
          </Callout>
        );
      },
      getOverallStats: (records) => calculateBasicOverallStats(records),
    },
    {
      id: 'directional_compass',
      tabLabel: 'analytics.directionalCompass.tabLabel',
      title: 'analytics.directionalCompass.title',
      subTitle: 'analytics.directionalCompass.subTitle',
      icon: Compass,
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

        const validSectors = sectorBuckets
          .map((b, i) => ({
            label: t(SECTOR_KEYS[i]),
            total: b.total,
            accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
          }))
          .filter((s) => s.total >= 3);

        const weakest =
          validSectors.length > 0
            ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
            : null;

        return (
          <Callout
            variant="info"
            icon={Compass}
            title={t('analytics.directionalCompass.cardTitle')}
          >
            {weakest ? (
              <div className="space-y-1.5 text-xs text-foreground pt-1">
                <p>
                  {t('analytics.directionalCompass.weakestHint', {
                    sector: weakest.label,
                  })}
                </p>
                <div className="flex justify-between items-center bg-card p-2 rounded-xl border border-border/60 font-mono shadow-xs">
                  <span>{weakest.label}</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {t('analytics.directionalCompass.accuracyRate', {
                      accuracy: weakest.accuracy,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                {t('analytics.directionalCompass.needMoreTrials')}
              </p>
            )}
          </Callout>
        );
      },
      getOverallStats: (records) => calculateBasicOverallStats(records),
    },
  ];
}
~~~~~

~~~~~act
write_file
src/cards/star_double_h/analytics.tsx
~~~~~
~~~~~typescript
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

        const dxText =
          avgDx > 0
            ? t('analytics.spatialBias.right', { val: avgDx })
            : avgDx < 0
              ? t('analytics.spatialBias.left', { val: avgDx })
              : '0';

        const dyText =
          avgDy > 0
            ? t('analytics.spatialBias.down', { val: avgDy })
            : avgDy < 0
              ? t('analytics.spatialBias.up', { val: avgDy })
              : '0';

        return (
          <Callout
            variant="info"
            icon={Target}
            title={t('analytics.spatialBias.cardTitle')}
          >
            <p className="text-muted-foreground leading-relaxed text-xs">
              {t('analytics.spatialBias.desc')}
            </p>
            <div className="pt-1.5 space-y-1 font-mono text-foreground">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('analytics.spatialBias.avgDx')}
                </span>
                <span className="font-bold">{dxText}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('analytics.spatialBias.avgDy')}
                </span>
                <span className="font-bold">{dyText}</span>
              </div>
              <div className="flex justify-between text-primary font-bold border-t border-border/60 pt-1">
                <span>{t('analytics.spatialBias.avgDist')}</span>
                <span>{avgDist}px</span>
              </div>
            </div>
          </Callout>
        );
      },
      getOverallStats: (records) => calculateBasicOverallStats(records),
    },
    {
      id: 'directional_compass',
      tabLabel: 'analytics.directionalCompass.tabLabel',
      title: 'analytics.directionalCompass.title',
      subTitle: 'analytics.directionalCompass.subTitle',
      icon: Compass,
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

        const validSectors = sectorBuckets
          .map((b, i) => ({
            label: t(SECTOR_KEYS[i]),
            total: b.total,
            accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
          }))
          .filter((s) => s.total >= 3);

        const weakest =
          validSectors.length > 0
            ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
            : null;

        return (
          <Callout
            variant="info"
            icon={Compass}
            title={t('analytics.directionalCompass.cardTitle')}
          >
            {weakest ? (
              <div className="space-y-1.5 text-xs text-foreground pt-1">
                <p>
                  {t('analytics.directionalCompass.weakestHint', {
                    sector: weakest.label,
                  })}
                </p>
                <div className="flex justify-between items-center bg-card p-2 rounded-xl border border-border/60 font-mono shadow-xs">
                  <span>{weakest.label}</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {t('analytics.directionalCompass.accuracyRate', {
                      accuracy: weakest.accuracy,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                {t('analytics.directionalCompass.needMoreTrials')}
              </p>
            )}
          </Callout>
        );
      },
      getOverallStats: (records) => calculateBasicOverallStats(records),
    },
  ];
}
~~~~~

~~~~~act
write_file
src/cards/star_double_r/analytics.tsx
~~~~~
~~~~~typescript
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

        const dxText =
          avgDx > 0
            ? t('analytics.spatialBias.right', { val: avgDx })
            : avgDx < 0
              ? t('analytics.spatialBias.left', { val: avgDx })
              : '0';

        const dyText =
          avgDy > 0
            ? t('analytics.spatialBias.down', { val: avgDy })
            : avgDy < 0
              ? t('analytics.spatialBias.up', { val: avgDy })
              : '0';

        return (
          <Callout
            variant="info"
            icon={Target}
            title={t('analytics.spatialBias.cardTitle')}
          >
            <p className="text-muted-foreground leading-relaxed text-xs">
              {t('analytics.spatialBias.desc')}
            </p>
            <div className="pt-1.5 space-y-1 font-mono text-foreground">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('analytics.spatialBias.avgDx')}
                </span>
                <span className="font-bold">{dxText}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('analytics.spatialBias.avgDy')}
                </span>
                <span className="font-bold">{dyText}</span>
              </div>
              <div className="flex justify-between text-primary font-bold border-t border-border/60 pt-1">
                <span>{t('analytics.spatialBias.avgDist')}</span>
                <span>{avgDist}px</span>
              </div>
            </div>
          </Callout>
        );
      },
      getOverallStats: (records) => calculateBasicOverallStats(records),
    },
    {
      id: 'directional_compass',
      tabLabel: 'analytics.directionalCompass.tabLabel',
      title: 'analytics.directionalCompass.title',
      subTitle: 'analytics.directionalCompass.subTitle',
      icon: Compass,
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

        const validSectors = sectorBuckets
          .map((b, i) => ({
            label: t(SECTOR_KEYS[i]),
            total: b.total,
            accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
          }))
          .filter((s) => s.total >= 3);

        const weakest =
          validSectors.length > 0
            ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
            : null;

        return (
          <Callout
            variant="info"
            icon={Compass}
            title={t('analytics.directionalCompass.cardTitle')}
          >
            {weakest ? (
              <div className="space-y-1.5 text-xs text-foreground pt-1">
                <p>
                  {t('analytics.directionalCompass.weakestHint', {
                    sector: weakest.label,
                  })}
                </p>
                <div className="flex justify-between items-center bg-card p-2 rounded-xl border border-border/60 font-mono shadow-xs">
                  <span>{weakest.label}</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {t('analytics.directionalCompass.accuracyRate', {
                      accuracy: weakest.accuracy,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                {t('analytics.directionalCompass.needMoreTrials')}
              </p>
            )}
          </Callout>
        );
      },
      getOverallStats: (records) => calculateBasicOverallStats(records),
    },
  ];
}
~~~~~

#### Acts 7: 重构负形占比估计卡片 neg_ratio_estimation/analytics.tsx

消除 `cards.neg_ratio_estimation.` 绝对路径。

~~~~~act
write_file
src/cards/neg_ratio_estimation/analytics.tsx
~~~~~
~~~~~typescript
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

        return (
          <Callout
            variant="success"
            icon={Crosshair}
            title={t('analytics.ratioScatter.cardTitle')}
          >
            <div className="space-y-1.5 text-xs text-foreground pt-1">
              <div className="flex justify-between font-mono bg-card p-2 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs">
                <span className="text-muted-foreground">
                  {t('analytics.ratioScatter.avgError')}
                </span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  ±{avgRatioErr}%
                </span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {t('analytics.ratioScatter.desc')}
              </p>
            </div>
          </Callout>
        );
      },
      getOverallStats: (records) => calculateBasicOverallStats(records),
    },
  ];
}
~~~~~

### 下一步建议

1. **运行项目验证**: 启动构建与测试命令（如 `npm run build` 或 `npm test`），验证重构后的卡片分析视图能否正常加载与渲染。
2. **提交代码变更**: 确认功能与类型无误后，我将为你生成对应的 Git 提交计划。
