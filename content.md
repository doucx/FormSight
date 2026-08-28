我将为你实施“单卡片通用认知统计与弱点分析引擎”，实现所有训练卡片自动获得反应速度-正确率 (SAT) 权衡分析、难度层阶抗压瓶颈诊断，并强化卡片级统计指标看板。

## [WIP] feat: 实现全卡片通用的认知统计与反应时-正确率分析系统

### 用户需求
1. 为所有训练卡片自动赋予通用的认知分析与统计能力，即使卡片未定义专属分析插件，也能自动获得跨维度的统计视图。
2. 将原“弱点分析”交互全面升级为“统计 (Stats)”，并在弹窗中常驻提供总题数、命中率、平均反应时、最高层阶等核心统计看板。
3. 实现反应时-正确率 (SAT) 权衡分箱与难度阶梯 (Plateau) 抗压瓶颈两大通用视知觉认知分析视图。

### 评论
将卡片维度的分析从“领域专属插件特例”升级为“领域专属 + 全局通用复合管道”，极大地提升了系统的泛化能力与数据洞察价值。用户在任何题型下都能清晰了解自己的生理反应甜点区与认知疲劳瓶颈。

### 目标
1. 新建 `src/core/analytics/universalViews.tsx`，实现反应速度-正确率 (SAT) 柱状分布与难度层阶抗压曲线两大可视化视图和诊断组件。
2. 在 `src/core/registry.ts` 中通过复合管道聚合卡片专属视图与通用分析视图，使所有卡片均具备统计分析能力。
3. 升级 `src/components/WeaknessAnalyticsModal.tsx`，常驻呈现题量、准确率、均时、最高 Level 等核心统计面板。
4. 更新 `ModeCard.tsx` 与多语言本地化字典 (`zh-CN.json`, `en-US.json`)，完成“统计”术语与提示语的统一。

### 基本原理
1. **统一聚合工厂**：在 `registry.getAnalyticsPluginByCardId` 中，将特定模块注册的视图与 `UNIVERSAL_ANALYTICS_VIEWS` 自动合并；若未注册特定分析，自动使用默认从 IndexedDB 检索记录的数据抓取器与通用分析视图。
2. **反应时-正确率分箱 (SAT Binning)**：对全量做答按反应耗时区间（`<1.0s`、`1.0~1.8s`、`1.8~2.8s`、`2.8~4.5s`、`>4.5s`）分箱，计算各区间正确率与作答占比，诊断用户是“直觉敏锐”还是“犹豫衰退”。
3. **难度阶梯抗压曲线 (Plateau Curve)**：按难度等级聚合样本量与通关胜率，标识出舒适区（$\ge 80\%$）、突破区（$60\%\sim 80\%$）与断崖瓶颈区（$<50\%$）。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #comp/cli #concept/ui #scope/ux #scope/core #ai/instruct #task/domain/analytics #task/object/universal-card-stats #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 创建通用统计与认知分析视图组件

我们将创建 `src/core/analytics/universalViews.tsx`，提供 SAT 反应时分析与难度层阶抗压分析两组可视化渲染器和诊断组件。

~~~~~act
write_file
src/core/analytics/universalViews.tsx
~~~~~
~~~~~tsx
import { Activity, Gauge, TrendingUp, Zap } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import type { UnifiedTrialRecord } from '../../utils/db/schema';
import { setupHiDpiCanvas } from '../canvas/hidpi';
import type { CardAnalyticsView } from '../contracts';
import { i18n } from '../i18n';

interface SatBinStat {
  rangeLabel: string;
  minMs: number;
  maxMs: number;
  total: number;
  hits: number;
  accuracy: number;
}

function calculateSpeedBins(records: UnifiedTrialRecord[]): SatBinStat[] {
  const bins: Omit<SatBinStat, 'total' | 'hits' | 'accuracy'>[] = [
    { rangeLabel: '< 1.0s', minMs: 0, maxMs: 1000 },
    { rangeLabel: '1.0~1.8s', minMs: 1000, maxMs: 1800 },
    { rangeLabel: '1.8~2.8s', minMs: 1800, maxMs: 2800 },
    { rangeLabel: '2.8~4.5s', minMs: 2800, maxMs: 4500 },
    { rangeLabel: '> 4.5s', minMs: 4500, maxMs: Number.MAX_SAFE_INTEGER },
  ];

  return bins.map((bin) => {
    const matched = records.filter(
      (r) => r.responseTimeMs >= bin.minMs && r.responseTimeMs < bin.maxMs,
    );
    const total = matched.length;
    const hits = matched.filter((r) => r.isHit).length;
    const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
    return { ...bin, total, hits, accuracy };
  });
}

export function renderSpeedAccuracyVisualizer(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
) {
  const width = 320;
  const height = 320;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const bins = calculateSpeedBins(records);
  const padding = { top: 35, right: 20, bottom: 45, left: 30 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  // 参考线
  const yTicks = [100, 75, 50, 25, 0];
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = '10px monospace';

  for (const tick of yTicks) {
    const y = padding.top + (1 - tick / 100) * chartH;
    ctx.strokeStyle = tick === 0 ? '#CBD5E1' : '#E2E8F0';
    ctx.setLineDash(tick === 0 ? [] : [2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.fillText(`${tick}%`, padding.left - 4, y);
  }
  ctx.setLineDash([]);

  const barWidth = chartW / bins.length;

  bins.forEach((bin, idx) => {
    const x = padding.left + idx * barWidth;
    const barH = (bin.accuracy / 100) * chartH;
    const y = padding.top + chartH - barH;

    // 柱状图本体
    if (bin.total > 0) {
      ctx.fillStyle =
        bin.accuracy >= 80
          ? 'rgba(16, 185, 129, 0.85)'
          : bin.accuracy >= 60
            ? 'rgba(245, 158, 11, 0.85)'
            : 'rgba(244, 63, 94, 0.85)';

      ctx.beginPath();
      ctx.roundRect(x + 6, y, barWidth - 12, Math.max(3, barH), 6);
      ctx.fill();

      // 准确率标签
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${bin.accuracy}%`, x + barWidth / 2, y - 4);
    } else {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.6)';
      ctx.beginPath();
      ctx.roundRect(x + 6, padding.top + chartH - 4, barWidth - 12, 4, 2);
      ctx.fill();
    }

    // X 轴时间与题数标签
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(bin.rangeLabel, x + barWidth / 2, height - padding.bottom + 6);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '8px sans-serif';
    ctx.fillText(`${bin.total}${i18n.t('common.trialsUnit')}`, x + barWidth / 2, height - padding.bottom + 18);
  });
}

export function diagnoseSpeedAccuracy(records: UnifiedTrialRecord[]): ComponentChildren {
  const bins = calculateSpeedBins(records);
  const validBins = bins.filter((b) => b.total >= 3);
  if (validBins.length === 0) {
    return (
      <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-500">
        {i18n.t('analyticsModal.needMoreSamples')}
      </div>
    );
  }

  // 寻找最佳反应时间区间
  const bestBin = [...validBins].sort((a, b) => b.accuracy - a.accuracy || b.total - a.total)[0];
  const fastBin = bins[0];
  const slowBin = bins[bins.length - 1];

  const hasRushImpatience = fastBin.total >= 5 && fastBin.accuracy < 60;
  const hasHesitationDrop = slowBin.total >= 5 && slowBin.accuracy < 60;

  return (
    <div className="space-y-2.5">
      <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-start gap-2.5">
        <Zap className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 leading-relaxed">
          <span className="font-bold">{i18n.t('analyticsModal.sweetSpotTitle')}: </span>
          {i18n.t('analyticsModal.sweetSpotDesc', {
            range: bestBin.rangeLabel,
            acc: bestBin.accuracy,
          })}
        </div>
      </div>

      {hasRushImpatience && (
        <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-800 leading-relaxed">
          <span className="font-bold">{i18n.t('analyticsModal.impatienceWarningTitle')}: </span>
          {i18n.t('analyticsModal.impatienceWarningDesc')}
        </div>
      )}

      {hasHesitationDrop && (
        <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl text-xs text-amber-800 leading-relaxed">
          <span className="font-bold">{i18n.t('analyticsModal.hesitationWarningTitle')}: </span>
          {i18n.t('analyticsModal.hesitationWarningDesc')}
        </div>
      )}
    </div>
  );
}

interface LevelBinStat {
  level: number;
  total: number;
  hits: number;
  accuracy: number;
}

function calculateLevelStats(records: UnifiedTrialRecord[]): LevelBinStat[] {
  const levelMap = new Map<number, { total: number; hits: number }>();
  for (const r of records) {
    const lvl = Number(r.difficultyLevel) || 1;
    const curr = levelMap.get(lvl) || { total: 0, hits: 0 };
    curr.total += 1;
    if (r.isHit) curr.hits += 1;
    levelMap.set(lvl, curr);
  }

  const result: LevelBinStat[] = [];
  for (let l = 1; l <= 35; l++) {
    const data = levelMap.get(l);
    if (data) {
      result.push({
        level: l,
        total: data.total,
        hits: data.hits,
        accuracy: Math.round((data.hits / data.total) * 100),
      });
    }
  }
  return result;
}

export function renderDifficultyPlateauVisualizer(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
) {
  const width = 320;
  const height = 320;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const padding = { top: 35, right: 20, bottom: 40, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  const levelStats = calculateLevelStats(records);

  // Y 轴参考线
  const yTicks = [100, 80, 50, 0];
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = '10px monospace';

  for (const tick of yTicks) {
    const y = padding.top + (1 - tick / 100) * chartH;
    ctx.strokeStyle = tick === 80 ? '#A7F3D0' : tick === 50 ? '#FECDD3' : '#E2E8F0';
    ctx.setLineDash(tick === 0 ? [] : [2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = tick === 80 ? '#059669' : tick === 50 ? '#E11D48' : '#94A3B8';
    ctx.fillText(`${tick}%`, padding.left - 5, y);
  }
  ctx.setLineDash([]);

  // X 轴刻度
  const minLvl = 1;
  const maxLvl = 35;
  const getX = (lvl: number) => padding.left + ((lvl - minLvl) / (maxLvl - minLvl)) * chartW;
  const getY = (acc: number) => padding.top + (1 - acc / 100) * chartH;

  // 绘制散点与面积
  for (const stat of levelStats) {
    const x = getX(stat.level);
    const y = getY(stat.accuracy);
    const radius = Math.min(8, Math.max(3, Math.sqrt(stat.total) * 1.5));

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle =
      stat.accuracy >= 80
        ? 'rgba(16, 185, 129, 0.75)'
        : stat.accuracy >= 60
          ? 'rgba(245, 158, 11, 0.75)'
          : 'rgba(244, 63, 94, 0.75)';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // 绘制趋势连接线
  if (levelStats.length >= 2) {
    ctx.beginPath();
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 2;
    ctx.moveTo(getX(levelStats[0].level), getY(levelStats[0].accuracy));
    for (let i = 1; i < levelStats.length; i++) {
      ctx.lineTo(getX(levelStats[i].level), getY(levelStats[i].accuracy));
    }
    ctx.stroke();
  }

  // X 轴标签
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Lvl 1', getX(1), height - padding.bottom + 6);
  ctx.fillText('Lvl 18', getX(18), height - padding.bottom + 6);
  ctx.fillText('Lvl 35', getX(35), height - padding.bottom + 6);
}

export function diagnoseDifficultyPlateau(records: UnifiedTrialRecord[]): ComponentChildren {
  const levelStats = calculateLevelStats(records);
  const comfortLevels = levelStats.filter((s) => s.accuracy >= 80 && s.total >= 3);
  const growthLevels = levelStats.filter((s) => s.accuracy >= 60 && s.accuracy < 80 && s.total >= 3);
  const bottleneckLevels = levelStats.filter((s) => s.accuracy < 50 && s.total >= 3);

  const maxComfort = comfortLevels.length > 0 ? Math.max(...comfortLevels.map((s) => s.level)) : 1;
  const currentGrowth =
    growthLevels.length > 0 ? growthLevels.map((s) => `Lvl ${s.level}`).join(', ') : '暂未显现';
  const breakdownMin =
    bottleneckLevels.length > 0 ? Math.min(...bottleneckLevels.map((s) => s.level)) : null;

  return (
    <div className="space-y-2.5">
      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-2.5">
        <TrendingUp className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 leading-relaxed">
          <span className="font-bold">{i18n.t('analyticsModal.comfortZoneTitle')}: </span>
          {i18n.t('analyticsModal.comfortZoneDesc', { maxLevel: maxComfort })}
        </div>
      </div>

      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-2.5">
        <Activity className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 leading-relaxed">
          <span className="font-bold">{i18n.t('analyticsModal.growthZoneTitle')}: </span>
          {currentGrowth}
        </div>
      </div>

      {breakdownMin !== null && (
        <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2.5">
          <Gauge className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 leading-relaxed">
            <span className="font-bold">{i18n.t('analyticsModal.ceilingTitle')}: </span>
            {i18n.t('analyticsModal.ceilingDesc', { level: breakdownMin })}
          </div>
        </div>
      )}
    </div>
  );
}

export const UNIVERSAL_ANALYTICS_VIEWS: CardAnalyticsView[] = [
  {
    id: 'universal_sat',
    tabLabel: 'analyticsModal.satTabLabel',
    title: 'analyticsModal.satTitle',
    subTitle: 'analyticsModal.satSubtitle',
    icon: Zap,
    renderVisualizer: renderSpeedAccuracyVisualizer,
    renderDiagnostics: diagnoseSpeedAccuracy,
  },
  {
    id: 'universal_plateau',
    tabLabel: 'analyticsModal.plateauTabLabel',
    title: 'analyticsModal.plateauTitle',
    subTitle: 'analyticsModal.plateauSubtitle',
    icon: Gauge,
    renderVisualizer: renderDifficultyPlateauVisualizer,
    renderDiagnostics: diagnoseDifficultyPlateau,
  },
];
~~~~~

#### Acts 2: 导出 analytics 模块并在 registry 中融合通用分析

在 `src/core/index.ts` 导出分析组件，并调整 `src/core/registry.ts`，让所有训练卡片均自动获得通用认知统计能力。

~~~~~act
patch_file
src/core/index.ts
~~~~~
~~~~~old
// 导出契约、注册器与国际化引擎
export * from './contracts';
export * from './registry';
export * from './i18n';
~~~~~
~~~~~new
// 导出契约、注册器与国际化引擎
export * from './contracts';
export * from './registry';
export * from './i18n';
export * from './analytics/universalViews';
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~old
import type { CardAnalyticsPlugin, PackManifest } from './contracts';
import { i18n } from './i18n';
~~~~~
~~~~~new
import { getTrialRecordsByCard } from '../utils/db/queries';
import { UNIVERSAL_ANALYTICS_VIEWS } from './analytics/universalViews';
import type { CardAnalyticsPlugin, PackManifest } from './contracts';
import { i18n } from './i18n';
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~old
  public getAnalyticsPluginByCardId(cardId: string): CardAnalyticsPlugin | undefined {
    return this.cardAnalyticsMap.get(cardId);
  }
}
~~~~~
~~~~~new
  public getAnalyticsPluginByCardId(cardId: string): CardAnalyticsPlugin | undefined {
    const card = this.cardMap.get(cardId);
    if (!card) return undefined;

    const domainPlugin = this.cardAnalyticsMap.get(cardId);
    const domainViews = domainPlugin?.views ?? [];

    return {
      cardId,
      fetchRecords: domainPlugin?.fetchRecords ?? ((id) => getTrialRecordsByCard(id)),
      views: [...domainViews, ...UNIVERSAL_ANALYTICS_VIEWS],
    };
  }
}
~~~~~

#### Acts 3: 升级 WeaknessAnalyticsModal 为全能卡片统计面板

我们将重构 `src/components/WeaknessAnalyticsModal.tsx`，在弹窗顶部常驻展示综合正确率、总答题数、平均反应时、最高等级等统计卡片，并无缝承接领域专属与通用多 Tab 切换。

~~~~~act
write_file
src/components/WeaknessAnalyticsModal.tsx
~~~~~
~~~~~tsx
import { BarChart2, CheckCircle, Clock, Info, Target, TrendingUp, X } from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { CardAnalyticsView } from '../core/contracts';
import { getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { CardDefinition } from '../types/card';
import type { UnifiedTrialRecord } from '../utils/db/index';

interface WeaknessAnalyticsModalProps {
  card: CardDefinition;
  onClose: () => void;
}

export function WeaknessAnalyticsModal({ card, onClose }: WeaknessAnalyticsModalProps) {
  const { t } = useTranslation();
  const plugin = registry.getAnalyticsPluginByCardId(card.id);
  const [records, setRecords] = useState<UnifiedTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeViewIndex, setActiveViewIndex] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cardTitle = getCardTitle(card, t);

  const views = plugin?.views ?? [];
  const currentView = views[activeViewIndex] || views[0];

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (plugin) {
      plugin.fetchRecords(card.id).then((data: UnifiedTrialRecord[]) => {
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

  // 计算全局统计指标
  const summaryStats = useMemo(() => {
    const total = records.length;
    const hits = records.filter((r) => r.isHit).length;
    const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
    const avgResponseTimeSec =
      total > 0
        ? (records.reduce((acc, r) => acc + (Number(r.responseTimeMs) || 0), 0) / total / 1000).toFixed(1)
        : '0.0';
    const maxLevel = records.length > 0 ? Math.max(...records.map((r) => Number(r.difficultyLevel) || 1)) : 1;

    return { total, hits, accuracy, avgResponseTimeSec, maxLevel };
  }, [records]);

  if (!plugin || views.length === 0) return null;

  const resolveText = (text?: string): string => {
    if (!text) return '';
    const translated = t(text);
    return translated !== text ? translated : text;
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
              <h2 className="text-lg font-black text-slate-800 tracking-tight">
                {t('analyticsModal.cardStatsTitle', { title: cardTitle })}
              </h2>
              <p className="text-xs text-slate-400">{resolveText(currentView?.subTitle)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 核心指标统计卡片概览 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-indigo-50/60 p-3 rounded-2xl border border-indigo-100 space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Target className="w-3 h-3 text-indigo-500" />
              {t('common.accuracy')}
            </div>
            <div className="text-xl font-black text-slate-800">{summaryStats.accuracy}%</div>
          </div>

          <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100 space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              {t('common.totalHits')}
            </div>
            <div className="text-xl font-black text-slate-800">
              {summaryStats.hits}{' '}
              <span className="text-xs font-normal text-slate-400">/ {summaryStats.total}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Clock className="w-3 h-3 text-indigo-500" />
              {t('summary.duration')}
            </div>
            <div className="text-xl font-black text-slate-800 font-mono">
              {summaryStats.avgResponseTimeSec}
              <span className="text-xs font-normal text-slate-400"> s</span>
            </div>
          </div>

          <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-100 space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <TrendingUp className="w-3 h-3 text-amber-500" />
              {t('stats.dailyMaxLevel')}
            </div>
            <div className="text-xl font-black text-slate-800 font-mono">
              Lvl {summaryStats.maxLevel}
            </div>
          </div>
        </div>

        {/* 多页 Tab 切换栏 */}
        {views.length > 1 && (
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl overflow-x-auto scrollbar-none">
            {views.map((v: CardAnalyticsView, idx: number) => {
              const Icon = v.icon;
              const isActive = idx === activeViewIndex;
              return (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => setActiveViewIndex(idx)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {resolveText(v.tabLabel)}
                </button>
              );
            })}
          </div>
        )}

        {/* 内容展示区 */}
        {loading ? (
          <div className="h-72 flex items-center justify-center text-slate-400 text-xs">
            {t('analyticsModal.analyzing')}
          </div>
        ) : records.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Info className="w-8 h-8 text-slate-300" />
            {t('analyticsModal.noRecords', { title: cardTitle })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* 左侧 Canvas 可视化区 */}
            <div className="md:col-span-7 flex justify-center bg-slate-50 p-4 rounded-2xl border border-slate-200/80 shadow-inner relative">
              <canvas
                key={`${card.id}-${currentView.id}`}
                ref={canvasRef}
                width={320}
                height={320}
                className="w-full max-w-[300px] aspect-square rounded-xl border border-slate-100"
              />
            </div>

            {/* 右侧数据统计面板 */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                <div className="text-xs font-bold text-slate-500 uppercase">
                  {t('analyticsModal.overallEvaluation')}
                </div>
                <div className="text-sm font-extrabold text-slate-800">
                  {resolveText(currentView.title)}
                </div>
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

#### Acts 4: 更新 ModeCard 卡片入口并赋能统计交互

更新 `src/components/common/ModeCard.tsx`，使每张卡片均常驻展示“统计”分析按钮，并更新 tooltip 翻译键。

~~~~~act
patch_file
src/components/common/ModeCard.tsx
~~~~~
~~~~~old
            <div
              className="flex items-center opacity-70 group-hover:opacity-100 transition-opacity ml-1"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="presentation"
            >
              {hasAnalytics && onOpenAnalytics && (
                <button
                  type="button"
                  onClick={onOpenAnalytics}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                  title={t('card.analyticsTooltip', { title })}
                >
                  <BarChart2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                title={t('card.settingsTooltip', { title })}
              >
                <Sliders className="w-4 h-4" />
              </button>
            </div>
~~~~~
~~~~~new
            <div
              className="flex items-center opacity-70 group-hover:opacity-100 transition-opacity ml-1"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="presentation"
            >
              {onOpenAnalytics && (
                <button
                  type="button"
                  onClick={onOpenAnalytics}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                  title={t('card.statsTooltip', { title })}
                >
                  <BarChart2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                title={t('card.settingsTooltip', { title })}
              >
                <Sliders className="w-4 h-4" />
              </button>
            </div>
~~~~~

#### Acts 5: 更新中英文本地化多语言字典

在 `src/locales/zh-CN.json` 和 `src/locales/en-US.json` 中补充卡片统计、SAT 反应时及阶梯抗压诊断的完整翻译。

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~old
  "card": {
    "todayTrials": "今日刷题",
    "analyticsTooltip": "{{title}} 弱点分析",
    "settingsTooltip": "{{title}} 偏好设置",
    "experimentalBadge": "实验性",
    "skillLevel": "能力层阶",
    "levelBadge": "Level {{level}}",
    "accuracy": "正确率",
    "startAdaptive": "开始自适应训练",
    "startBenchmark": "20 题基准测试"
  },
~~~~~
~~~~~new
  "card": {
    "todayTrials": "今日刷题",
    "analyticsTooltip": "{{title}} 统计",
    "statsTooltip": "{{title}} 统计与认知分析",
    "settingsTooltip": "{{title}} 偏好设置",
    "experimentalBadge": "实验性",
    "skillLevel": "能力层阶",
    "levelBadge": "Level {{level}}",
    "accuracy": "正确率",
    "startAdaptive": "开始自适应训练",
    "startBenchmark": "20 题基准测试"
  },
~~~~~

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~old
  "analyticsModal": {
    "analyzing": "正在分析历史答题数据...",
    "noRecords": "暂无【{{title}}】的练习记录，先去完成几轮练习吧！",
    "overallEvaluation": "总体评估",
    "sampleSize": "样本量: {{count}} 题"
  },
~~~~~
~~~~~new
  "analyticsModal": {
    "cardStatsTitle": "【{{title}}】答题统计与认知分析",
    "analyzing": "正在分析历史答题数据...",
    "noRecords": "暂无【{{title}}】的练习记录，先去完成几轮练习吧！",
    "overallEvaluation": "总体评估",
    "sampleSize": "样本量: {{count}} 题",
    "needMoreSamples": "当前样本量较少，多完成几轮训练后将自动生成认知诊断。",
    "satTabLabel": "反应速度-正确率 (SAT)",
    "satTitle": "反应速度与准确率权衡 (SAT 分析)",
    "satSubtitle": "分析作答节奏：是否存在急躁盲击或过度犹豫导致的感知衰退",
    "sweetSpotTitle": "直觉黄金甜点区",
    "sweetSpotDesc": "在 {{range}} 区间内表现最稳健，胜率高达 {{acc}}%",
    "impatienceWarningTitle": "存在急躁盲击倾向",
    "impatienceWarningDesc": "在极速盲击 (<1.0s) 时胜率较低，建议略微放缓节奏，观察确认后再提交。",
    "hesitationWarningTitle": "存在犹豫衰退倾向",
    "hesitationWarningDesc": "思考时间超过 4.5s 时正确率显著下滑，视觉暂留可能被干扰，建议相信第一直觉。",
    "plateauTabLabel": "难度抗压分析",
    "plateauTitle": "难度层阶 (Level) 衰减与瓶颈分析",
    "plateauSubtitle": "识别认知舒适区、有效增长区与临界崩溃瓶颈",
    "comfortZoneTitle": "绝对舒适区",
    "comfortZoneDesc": "在 Level 1 ~ {{maxLevel}} 保持 80% 以上高胜率，掌握扎实。",
    "growthZoneTitle": "当前突破区",
    "ceilingTitle": "临界崩溃瓶颈",
    "ceilingDesc": "在 Level {{level}} 胜率跌破 50%，建议在该阶梯附近重点巩固。"
  },
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~old
  "card": {
    "todayTrials": "Today",
    "analyticsTooltip": "{{title}} Weakness Analytics",
    "settingsTooltip": "{{title}} Preferences",
    "experimentalBadge": "Experimental",
    "skillLevel": "Skill Level",
    "levelBadge": "Level {{level}}",
    "accuracy": "Accuracy",
    "startAdaptive": "Adaptive Training",
    "startBenchmark": "20-Trial Benchmark"
  },
~~~~~
~~~~~new
  "card": {
    "todayTrials": "Today",
    "analyticsTooltip": "{{title}} Stats",
    "statsTooltip": "{{title}} Stats & Analytics",
    "settingsTooltip": "{{title}} Preferences",
    "experimentalBadge": "Experimental",
    "skillLevel": "Skill Level",
    "levelBadge": "Level {{level}}",
    "accuracy": "Accuracy",
    "startAdaptive": "Adaptive Training",
    "startBenchmark": "20-Trial Benchmark"
  },
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~old
  "analyticsModal": {
    "analyzing": "Analyzing historical trial data...",
    "noRecords": "No practice records for [{{title}}]. Complete some trials first!",
    "overallEvaluation": "Overall Evaluation",
    "sampleSize": "Sample size: {{count}} trials"
  },
~~~~~
~~~~~new
  "analyticsModal": {
    "cardStatsTitle": "[{{title}}] Performance & Stats",
    "analyzing": "Analyzing historical trial data...",
    "noRecords": "No practice records for [{{title}}]. Complete some trials first!",
    "overallEvaluation": "Overall Evaluation",
    "sampleSize": "Sample size: {{count}} trials",
    "needMoreSamples": "Sample size is small. Cognitive diagnosis will be generated as you complete more trials.",
    "satTabLabel": "Speed-Accuracy (SAT)",
    "satTitle": "Speed-Accuracy Trade-off (SAT Analysis)",
    "satSubtitle": "Analyzes pace: reveals whether rushing or over-hesitation causes perception drop",
    "sweetSpotTitle": "Intuition Sweet Spot",
    "sweetSpotDesc": "Most accurate within {{range}}, reaching {{acc}}% accuracy",
    "impatienceWarningTitle": "Rushing Tendency Detected",
    "impatienceWarningDesc": "Lower accuracy under 1.0s. Consider slowing down slightly before committing.",
    "hesitationWarningTitle": "Over-Hesitation Drop-off",
    "hesitationWarningDesc": "Accuracy drops after 4.5s due to fading visual persistence. Trust your first instinct.",
    "plateauTabLabel": "Difficulty Fragility",
    "plateauTitle": "Skill Level Decay & Plateau Analysis",
    "plateauSubtitle": "Identifies comfort zones, growth zones, and cognitive breakdown ceilings",
    "comfortZoneTitle": "Comfort Zone",
    "comfortZoneDesc": "Maintains 80%+ accuracy across Level 1 ~ {{maxLevel}}.",
    "growthZoneTitle": "Current Growth Zone",
    "ceilingTitle": "Breakdown Ceiling",
    "ceilingDesc": "Accuracy drops below 50% around Level {{level}}. Focus on deliberate practice near this tier."
  },
~~~~~

### 下一步建议
1. 执行 `npm run check` 验证 TypeScript 类型与代码规范。
2. 试运行并在主页点击任意卡片右上角的柱状图图标，确认通用统计指标看板（正确率、用时、题量、最高 Level）以及 SAT/难度阶梯图表渲染流畅正常。
