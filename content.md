根据扫描脚本生成的诊断报告，这 5 个文件（`CardAnalyticsView.tsx`、`SettingsModal.tsx`、`StatsMetricCards.tsx`、`PlanLibraryDrawer.tsx`、`Home.tsx`）贡献了近 30% 的收敛需求。我们立即针对这批 Top 5 文件执行第一批深度重构。

## [WIP] refactor(ui): 针对扫描报告 Top 5 文件执行深度设计系统语义化收敛

### 用户需求
基于 `scan_unification_targets.py` 诊断报告，对问题最集中的 5 个核心文件（`CardAnalyticsView.tsx`、`SettingsModal.tsx`、`StatsMetricCards.tsx`、`PlanLibraryDrawer.tsx`、`Home.tsx`）进行深度清理：
1. 替换所有原生 `<button>` 为 `<Button>` 原语。
2. 替换所有内联胶囊为 `<Badge>` 原语。
3. 清除所有残留的 `text-slate-*`、`border-slate-*`、`border-indigo-100` 等硬编码类名，全面收敛为 `bg-card`、`bg-muted`、`bg-accent`、`border-border`、`text-foreground`、`text-muted-foreground` 与 `text-primary`。

### 评论
这 5 个文件涵盖了分析图表主视图、模块专属设置弹窗、全局统计核心卡片、计划库抽屉和工作台首页。清洗这批核心文件将直接消除 100+ 项不一致项，使应用主干体验彻底统一。

### 目标
1. **`src/views/CardAnalyticsView.tsx`**：重构操作栏、Tab 栏、指标卡片与提示语，接入 `<Button>` 和 `<Badge>`，清理 36 处硬编码。
2. **`src/components/SettingsModal.tsx`**：重构算子模式选择、步幅选择、轮次选择与底部确定按钮为 `<Button>`，清理 30 处硬编码。
3. **`src/components/stats/StatsMetricCards.tsx`**：清理 18 处边框与文本硬编码。
4. **`src/components/plan/editor/PlanLibraryDrawer.tsx`**：重构计划切换项与操作按钮为 `<Button>` / `<Badge>`，清理 18 处硬编码。
5. **`src/views/Home.tsx`**：收敛文本颜色与图标背景类名，清理 18 处硬编码。

### 基本原理
通过精确的 AST 级语义化映射：
- 将多维统计卡片的静态高亮边框统一为 `border-border`，依靠内容图标色彩传达分类。
- 将分段选择按钮统一为 `<Button variant={active ? 'default' : 'outline'}>`。
- 将文本统一映射为 `text-foreground`（主标题/数据数值）与 `text-muted-foreground`（次级说明/单位）。

### 标签
#intent/refine #flow/ready #priority/high #comp/ui #concept/ui #scope/dx #scope/ux #ai/instruct #task/domain/ui #task/object/top5-files-unification #task/action/refactor #task/state/continue #task/status/active

---

### Script

#### Acts 1: 重构 `src/views/CardAnalyticsView.tsx`

接入 `Button` 和 `Badge`，收敛操作栏、Tab 切换与指标大盘。

~~~~~act
patch_file
src/views/CardAnalyticsView.tsx
~~~~~
~~~~~typescript.old
import {
  Activity,
  ArrowLeft,
  CheckCircle,
  Clock,
  FlaskConical,
  Gauge,
  Info,
  LayoutDashboard,
  Play,
  Sliders,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { getCognitiveOverviewInsights } from '../core/analytics/universalViews';
import type { CardAnalyticsView as CardAnalyticsViewContract } from '../core/contracts';
import { getCardDesc, getCardTitle, getPackTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { UnifiedTrialRecord } from '../utils/db/index';

interface CardAnalyticsViewProps {
~~~~~
~~~~~typescript.new
import {
  Activity,
  ArrowLeft,
  CheckCircle,
  Clock,
  FlaskConical,
  Gauge,
  Info,
  LayoutDashboard,
  Play,
  Sliders,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { getCognitiveOverviewInsights } from '../core/analytics/universalViews';
import type { CardAnalyticsView as CardAnalyticsViewContract } from '../core/contracts';
import { getCardDesc, getCardTitle, getPackTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { UnifiedTrialRecord } from '../utils/db/index';

interface CardAnalyticsViewProps {
~~~~~

~~~~~act
patch_file
src/views/CardAnalyticsView.tsx
~~~~~
~~~~~typescript.old
  if (!card || !plugin) {
    return (
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center justify-center h-96 gap-4 bg-card rounded-3xl border border-border p-8 shadow-sm">
        <Info className="w-10 h-10 text-slate-400" />
        <div className="text-sm font-bold text-foreground">{t('home.noMatchTitle')}</div>
        <button
          type="button"
          onClick={onExit}
          className="px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all"
        >
          {t('common.completeAndReturnHome')}
        </button>
      </div>
    );
  }

  const resolveText = (text?: string): string => {
    if (!text) return '';
    const translated = t(text);
    return translated !== text ? translated : text;
  };

  const CardIcon = card.icon;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 顶部主操作栏 */}
      <header className="w-full bg-card border border-border rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={onExit}
            className="px-3.5 py-2 text-xs font-bold text-foreground bg-muted hover:bg-muted/80 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.exit')}
          </button>
          <div className="h-5 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl shadow-xs flex-shrink-0">
              <CardIcon className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-foreground truncate tracking-tight">
                  {cardTitle}
                </h1>
                {packTitle && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-muted text-muted-foreground rounded-md border border-border/60">
                    {packTitle}
                  </span>
                )}
                {card.tags.status === 'experimental' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 px-2 py-0.5 rounded-md">
                    <FlaskConical className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    {t('card.experimentalBadge')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                {cardDesc || t('analyticsModal.cardStatsTitle', { title: cardTitle })}
              </p>
            </div>
          </div>
        </div>

        {/* 右侧操作按钮组 */}
        <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
          <button
            type="button"
            onClick={() => onOpenSettings(card.id)}
            className="p-2.5 text-muted-foreground hover:text-primary bg-muted hover:bg-accent border border-border rounded-xl transition-all cursor-pointer shadow-xs"
            title={t('card.settingsTooltip', { title: cardTitle })}
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onStartBenchmark(card.id)}
            className="py-2.5 px-3.5 bg-muted hover:bg-muted/80 text-foreground rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
            title={t('card.startBenchmark')}
          >
            <Target className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('card.startBenchmark')}</span>
          </button>

          <button
            type="button"
            onClick={() => onStartTraining(card.id)}
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t('card.startAdaptive')}</span>
          </button>
        </div>
      </header>

      {/* 多页 Tab 切换栏 */}
      <div className="w-full bg-card border border-border rounded-2xl p-2 shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTabId('overview')}
          className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTabId === 'overview'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          {t('analyticsModal.overviewTabLabel')}
        </button>

        {views.map((v: CardAnalyticsViewContract) => {
          const Icon = v.icon;
          const isActive = v.id === activeTabId;
          return (
            <button
              type="button"
              key={v.id}
              onClick={() => setActiveTabId(v.id)}
              className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {resolveText(v.tabLabel)}
            </button>
          );
        })}
      </div>
~~~~~
~~~~~typescript.new
  if (!card || !plugin) {
    return (
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center justify-center h-96 gap-4 bg-card rounded-3xl border border-border p-8 shadow-sm">
        <Info className="w-10 h-10 text-muted-foreground" />
        <div className="text-sm font-bold text-foreground">{t('home.noMatchTitle')}</div>
        <Button variant="secondary" onClick={onExit}>
          {t('common.completeAndReturnHome')}
        </Button>
      </div>
    );
  }

  const resolveText = (text?: string): string => {
    if (!text) return '';
    const translated = t(text);
    return translated !== text ? translated : text;
  };

  const CardIcon = card.icon;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 顶部主操作栏 */}
      <header className="w-full bg-card border border-border rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={onExit}
            className="gap-1.5 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.exit')}
          </Button>
          <div className="h-5 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-accent text-primary rounded-2xl shadow-xs flex-shrink-0">
              <CardIcon className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-foreground truncate tracking-tight">
                  {cardTitle}
                </h1>
                {packTitle && (
                  <Badge variant="secondary" size="sm">
                    {packTitle}
                  </Badge>
                )}
                {card.tags.status === 'experimental' && (
                  <Badge variant="warning" size="sm">
                    <FlaskConical className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    {t('card.experimentalBadge')}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-medium truncate mt-0.5">
                {cardDesc || t('analyticsModal.cardStatsTitle', { title: cardTitle })}
              </p>
            </div>
          </div>
        </div>

        {/* 右侧操作按钮组 */}
        <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => onOpenSettings(card.id)}
            className="border border-border"
            title={t('card.settingsTooltip', { title: cardTitle })}
          >
            <Sliders className="w-4 h-4" />
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onStartBenchmark(card.id)}
            className="gap-1.5"
            title={t('card.startBenchmark')}
          >
            <Target className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{t('card.startBenchmark')}</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => onStartTraining(card.id)}
            className="gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t('card.startAdaptive')}</span>
          </Button>
        </div>
      </header>

      {/* 多页 Tab 切换栏 */}
      <div className="w-full bg-card border border-border rounded-2xl p-1.5 shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <Button
          variant={activeTabId === 'overview' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTabId('overview')}
          className="gap-1.5 whitespace-nowrap"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          {t('analyticsModal.overviewTabLabel')}
        </Button>

        {views.map((v: CardAnalyticsViewContract) => {
          const Icon = v.icon;
          const isActive = v.id === activeTabId;
          return (
            <Button
              key={v.id}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTabId(v.id)}
              className="gap-1.5 whitespace-nowrap"
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {resolveText(v.tabLabel)}
            </Button>
          );
        })}
      </div>
~~~~~

~~~~~act
patch_file
src/views/CardAnalyticsView.tsx
~~~~~
~~~~~typescript.old
      {/* 主体展示区 */}
      {loading ? (
        <div className="h-96 bg-card rounded-3xl border border-border p-6 flex items-center justify-center text-slate-400 text-xs shadow-sm">
          {t('analyticsModal.analyzing')}
        </div>
      ) : records.length === 0 ? (
        <div className="h-96 bg-card rounded-3xl border border-border p-8 flex flex-col items-center justify-center gap-3 text-center shadow-sm">
          <div className="p-4 bg-muted text-muted-foreground rounded-3xl">
            <Info className="w-8 h-8" />
          </div>
          <div className="text-base font-bold text-foreground">
            {t('analyticsModal.noRecords', { title: cardTitle })}
          </div>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            {t('analyticsModal.needMoreSamples')}
          </p>
          <button
            type="button"
            onClick={() => onStartTraining(card.id)}
            className="mt-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {t('card.startAdaptive')}
          </button>
        </div>
      ) : activeTabId === 'overview' ? (
        /* 数据总览专属视图 */
        <div className="flex flex-col gap-6 animate-in fade-in duration-150">
          {/* 4 维核心大指标卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card p-5 rounded-3xl border border-indigo-100 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                <Target className="w-4 h-4 text-indigo-500" />
                {t('common.accuracy')}
              </div>
              <div className="text-3xl font-black text-foreground">{summaryStats.accuracy}%</div>
            </div>

            <div className="bg-card p-5 rounded-3xl border border-emerald-100 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                {t('common.totalHits')}
              </div>
              <div className="text-3xl font-black text-foreground">
                {summaryStats.hits}{' '}
                <span className="text-xs font-normal text-slate-400">/ {summaryStats.total}</span>
              </div>
            </div>

            <div className="bg-card p-5 rounded-3xl border border-border shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                <Clock className="w-4 h-4 text-indigo-500" />
                {t('summary.duration')}
              </div>
              <div className="text-3xl font-black text-foreground font-mono">
                {summaryStats.avgResponseTimeSec}
                <span className="text-xs font-normal text-slate-400"> s</span>
              </div>
            </div>

            <div className="bg-card p-5 rounded-3xl border border-amber-100 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                {t('stats.dailyMaxLevel')}
              </div>
              <div className="text-3xl font-black text-foreground font-mono">
                Lvl {summaryStats.maxLevel}
              </div>
            </div>
          </div>

          {/* 总体评价与认知建议 */}
          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                {t('analyticsModal.overallEvaluation')}
              </div>
              <span className="text-xs font-mono text-slate-400">
                {t('analyticsModal.sampleSize', { count: summaryStats.total })}
              </span>
            </div>
~~~~~
~~~~~typescript.new
      {/* 主体展示区 */}
      {loading ? (
        <div className="h-96 bg-card rounded-3xl border border-border p-6 flex items-center justify-center text-muted-foreground text-xs shadow-sm">
          {t('analyticsModal.analyzing')}
        </div>
      ) : records.length === 0 ? (
        <div className="h-96 bg-card rounded-3xl border border-border p-8 flex flex-col items-center justify-center gap-3 text-center shadow-sm">
          <div className="p-4 bg-muted text-muted-foreground rounded-3xl">
            <Info className="w-8 h-8" />
          </div>
          <div className="text-base font-bold text-foreground">
            {t('analyticsModal.noRecords', { title: cardTitle })}
          </div>
          <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
            {t('analyticsModal.needMoreSamples')}
          </p>
          <Button
            variant="default"
            onClick={() => onStartTraining(card.id)}
            className="mt-2 gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {t('card.startAdaptive')}
          </Button>
        </div>
      ) : activeTabId === 'overview' ? (
        /* 数据总览专属视图 */
        <div className="flex flex-col gap-6 animate-in fade-in duration-150">
          {/* 4 维核心大指标卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card p-5 rounded-3xl border border-border shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                <Target className="w-4 h-4 text-primary" />
                {t('common.accuracy')}
              </div>
              <div className="text-3xl font-black text-foreground">{summaryStats.accuracy}%</div>
            </div>

            <div className="bg-card p-5 rounded-3xl border border-border shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                {t('common.totalHits')}
              </div>
              <div className="text-3xl font-black text-foreground">
                {summaryStats.hits}{' '}
                <span className="text-xs font-normal text-muted-foreground">/ {summaryStats.total}</span>
              </div>
            </div>

            <div className="bg-card p-5 rounded-3xl border border-border shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                <Clock className="w-4 h-4 text-primary" />
                {t('summary.duration')}
              </div>
              <div className="text-3xl font-black text-foreground font-mono">
                {summaryStats.avgResponseTimeSec}
                <span className="text-xs font-normal text-muted-foreground"> s</span>
              </div>
            </div>

            <div className="bg-card p-5 rounded-3xl border border-border shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                {t('stats.dailyMaxLevel')}
              </div>
              <div className="text-3xl font-black text-foreground font-mono">
                Lvl {summaryStats.maxLevel}
              </div>
            </div>
          </div>

          {/* 总体评价与认知建议 */}
          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                {t('analyticsModal.overallEvaluation')}
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {t('analyticsModal.sampleSize', { count: summaryStats.total })}
              </span>
            </div>
~~~~~

~~~~~act
patch_file
src/views/CardAnalyticsView.tsx
~~~~~
~~~~~typescript.old
      ) : currentView ? (
        /* 专项分析视图 */
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in fade-in duration-150">
          {/* 左侧 Canvas 可视化区 */}
          <div className="lg:col-span-7 flex justify-center bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-border shadow-inner relative">
            <canvas
              key={`${card.id}-${currentView.id}`}
              ref={canvasRef}
              width={320}
              height={320}
              className="w-full max-w-[340px] aspect-square rounded-2xl border border-border/60 shadow-xs"
            />
          </div>

          {/* 右侧数据统计与认知诊断面板 */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-muted/60 p-4 rounded-2xl border border-border/60 space-y-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {resolveText(currentView.title)}
              </div>
              <div className="text-sm font-black text-foreground">
                {resolveText(currentView.subTitle)}
              </div>
            </div>
~~~~~
~~~~~typescript.new
      ) : currentView ? (
        /* 专项分析视图 */
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in fade-in duration-150">
          {/* 左侧 Canvas 可视化区 */}
          <div className="lg:col-span-7 flex justify-center bg-muted/40 p-6 rounded-3xl border border-border shadow-inner relative">
            <canvas
              key={`${card.id}-${currentView.id}`}
              ref={canvasRef}
              width={320}
              height={320}
              className="w-full max-w-[340px] aspect-square rounded-2xl border border-border/60 shadow-xs"
            />
          </div>

          {/* 右侧数据统计与认知诊断面板 */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-muted/60 p-4 rounded-2xl border border-border/60 space-y-1">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {resolveText(currentView.title)}
              </div>
              <div className="text-sm font-black text-foreground">
                {resolveText(currentView.subTitle)}
              </div>
            </div>
~~~~~

#### Acts 2: 重构 `src/components/SettingsModal.tsx`

替换所有原生选项按钮为 `Button`，清除 `bg-slate-800` 和 `text-indigo-600` 硬编码。

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
import { Flame, Sliders, Target, ToggleLeft, ToggleRight } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { getCardTitle, useTranslation } from '../core/i18n';
import type { CardDefinition } from '../types/card';
import {
  type BaseModuleSettings,
  type UserSettings,
  getCardSettings,
  saveSettings,
} from '../utils/settings';
import { ModalShell } from './common/ModalShell';
import { DynamicDomainSettings } from './settings/DynamicDomainSettings';

interface SettingsModalProps {
~~~~~
~~~~~typescript.new
import { Flame, Sliders, Target, ToggleLeft, ToggleRight } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { getCardTitle, useTranslation } from '../core/i18n';
import type { CardDefinition } from '../types/card';
import {
  type BaseModuleSettings,
  type UserSettings,
  getCardSettings,
  saveSettings,
} from '../utils/settings';
import { ModalShell } from './common/ModalShell';
import { DynamicDomainSettings } from './settings/DynamicDomainSettings';
import { Button } from './ui/button';

interface SettingsModalProps {
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
        {/* 通用配置：自动翻页开关 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground">
              {t('settingsModal.autoNext')}
            </div>
            <div className="text-xs text-slate-400">{t('settingsModal.autoNextDesc')}</div>
          </div>
          <button
            type="button"
            onClick={() => updateCardConfig({ autoNext: !cardConfig.autoNext })}
            className="text-primary hover:opacity-80 transition-opacity cursor-pointer"
          >
            {cardConfig.autoNext ? (
              <ToggleRight className="w-8 h-8 fill-indigo-600 text-indigo-600 dark:fill-indigo-500 dark:text-indigo-500" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            )}
          </button>
        </div>

        {/* 通用配置：自动翻页延迟 */}
        {cardConfig.autoNext && (
          <div className="space-y-2 bg-muted/60 p-3.5 rounded-2xl border border-border/60">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
              <span>{t('settingsModal.delay')}</span>
              <span className="font-mono text-indigo-600 font-bold">
                {cardConfig.autoNextDelay} ms
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={cardConfig.autoNextDelay}
              onInput={(e) => {
                const val = Number.parseInt((e.target as HTMLInputElement).value, 10);
                updateCardConfig({ autoNextDelay: val });
              }}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>
        )}

        {/* 通用配置：自适应算子模式 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">
            {t('settingsModal.adaptiveMode')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateCardConfig({ adaptiveMode: 'block' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                cardConfig.adaptiveMode === 'block'
                  ? 'bg-accent text-primary border-indigo-200 dark:border-indigo-900 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-muted-foreground border-border hover:bg-accent'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              {t('settingsModal.modeBlock')}
            </button>
            <button
              type="button"
              onClick={() => updateCardConfig({ adaptiveMode: 'staircase' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                cardConfig.adaptiveMode === 'staircase'
                  ? 'bg-accent text-primary border-indigo-200 dark:border-indigo-900 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-muted-foreground border-border hover:bg-accent'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              {t('settingsModal.modeStaircase')}
            </button>
          </div>
        </div>

        {/* 轮次评估配置 */}
        {cardConfig.adaptiveMode === 'block' && (
          <div className="space-y-3 bg-indigo-50/50 dark:bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/60">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                <span>{t('settingsModal.targetAcc')}</span>
                <span className="font-bold text-indigo-600 font-mono">
                  {Math.round(cardConfig.targetAccuracy * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0.7, 0.8, 0.85, 0.9].map((acc) => (
                  <button
                    type="button"
                    key={acc}
                    onClick={() => updateCardConfig({ targetAccuracy: acc })}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      cardConfig.targetAccuracy === acc
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-muted-foreground border-border hover:bg-accent'
                    }`}
                  >
                    {Math.round(acc * 100)}%
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                <span>{t('settingsModal.blockSize')}</span>
                <span className="font-bold text-indigo-600 font-mono">
                  {t('settingsModal.trialsPerBlock', { size: cardConfig.blockSize })}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[10, 15, 20].map((size) => (
                  <button
                    type="button"
                    key={size}
                    onClick={() => updateCardConfig({ blockSize: size })}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      cardConfig.blockSize === size
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-muted-foreground border-border hover:bg-accent'
                    }`}
                  >
                    {t('settingsModal.trialsUnit', { size })}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 难度阶梯精细度 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">
            {t('settingsModal.stepGranularity')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateCardConfig({ stepGranularity: 'standard' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                cardConfig.stepGranularity === 'standard'
                  ? 'bg-accent text-primary border-indigo-200 dark:border-indigo-900 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-muted-foreground border-border hover:bg-accent'
              }`}
            >
              {t('settingsModal.stepStandard')}
            </button>
            <button
              type="button"
              onClick={() => updateCardConfig({ stepGranularity: 'fine' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                cardConfig.stepGranularity === 'fine'
                  ? 'bg-accent text-primary border-indigo-200 dark:border-indigo-900 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-muted-foreground border-border hover:bg-accent'
              }`}
            >
              {t('settingsModal.stepFine')}
            </button>
          </div>
        </div>

        {/* 渲染卡片专属设置 Schemas */}
        {card.settingSchemas && card.settingSchemas.length > 0 && (
          <DynamicDomainSettings
            schemas={card.settingSchemas}
            values={cardConfig}
            onChange={(patch) => updateCardConfig(patch)}
          />
        )}
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98]"
        >
          {t('common.complete')}
        </button>
      </div>
    </ModalShell>
  );
}
~~~~~
~~~~~typescript.new
        {/* 通用配置：自动翻页开关 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground">
              {t('settingsModal.autoNext')}
            </div>
            <div className="text-xs text-muted-foreground">{t('settingsModal.autoNextDesc')}</div>
          </div>
          <button
            type="button"
            onClick={() => updateCardConfig({ autoNext: !cardConfig.autoNext })}
            className="text-primary hover:opacity-80 transition-opacity cursor-pointer"
          >
            {cardConfig.autoNext ? (
              <ToggleRight className="w-8 h-8 fill-primary text-primary" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-muted-foreground/60" />
            )}
          </button>
        </div>

        {/* 通用配置：自动翻页延迟 */}
        {cardConfig.autoNext && (
          <div className="space-y-2 bg-muted/60 p-3.5 rounded-2xl border border-border/60">
            <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
              <span>{t('settingsModal.delay')}</span>
              <span className="font-mono text-primary font-bold">
                {cardConfig.autoNextDelay} ms
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={cardConfig.autoNextDelay}
              onInput={(e) => {
                const val = Number.parseInt((e.target as HTMLInputElement).value, 10);
                updateCardConfig({ autoNextDelay: val });
              }}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>
        )}

        {/* 通用配置：自适应算子模式 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">
            {t('settingsModal.adaptiveMode')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={cardConfig.adaptiveMode === 'block' ? 'default' : 'outline'}
              onClick={() => updateCardConfig({ adaptiveMode: 'block' })}
              className="gap-1.5 h-auto py-2.5"
            >
              <Target className="w-3.5 h-3.5 text-inherit" />
              {t('settingsModal.modeBlock')}
            </Button>
            <Button
              variant={cardConfig.adaptiveMode === 'staircase' ? 'default' : 'outline'}
              onClick={() => updateCardConfig({ adaptiveMode: 'staircase' })}
              className="gap-1.5 h-auto py-2.5"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              {t('settingsModal.modeStaircase')}
            </Button>
          </div>
        </div>

        {/* 轮次评估配置 */}
        {cardConfig.adaptiveMode === 'block' && (
          <div className="space-y-3 bg-accent p-3.5 rounded-2xl border border-border/60">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                <span>{t('settingsModal.targetAcc')}</span>
                <span className="font-bold text-primary font-mono">
                  {Math.round(cardConfig.targetAccuracy * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0.7, 0.8, 0.85, 0.9].map((acc) => (
                  <Button
                    key={acc}
                    variant={cardConfig.targetAccuracy === acc ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateCardConfig({ targetAccuracy: acc })}
                    className="h-auto py-1.5"
                  >
                    {Math.round(acc * 100)}%
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                <span>{t('settingsModal.blockSize')}</span>
                <span className="font-bold text-primary font-mono">
                  {t('settingsModal.trialsPerBlock', { size: cardConfig.blockSize })}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[10, 15, 20].map((size) => (
                  <Button
                    key={size}
                    variant={cardConfig.blockSize === size ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateCardConfig({ blockSize: size })}
                    className="h-auto py-1.5"
                  >
                    {t('settingsModal.trialsUnit', { size })}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 难度阶梯精细度 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">
            {t('settingsModal.stepGranularity')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={cardConfig.stepGranularity === 'standard' ? 'default' : 'outline'}
              onClick={() => updateCardConfig({ stepGranularity: 'standard' })}
              className="h-auto py-2.5"
            >
              {t('settingsModal.stepStandard')}
            </Button>
            <Button
              variant={cardConfig.stepGranularity === 'fine' ? 'default' : 'outline'}
              onClick={() => updateCardConfig({ stepGranularity: 'fine' })}
              className="h-auto py-2.5"
            >
              {t('settingsModal.stepFine')}
            </Button>
          </div>
        </div>

        {/* 渲染卡片专属设置 Schemas */}
        {card.settingSchemas && card.settingSchemas.length > 0 && (
          <DynamicDomainSettings
            schemas={card.settingSchemas}
            values={cardConfig}
            onChange={(patch) => updateCardConfig(patch)}
          />
        )}
      </div>

      <div className="pt-2">
        <Button variant="default" onClick={onClose} className="w-full py-2.5 h-auto">
          {t('common.complete')}
        </Button>
      </div>
    </ModalShell>
  );
}
~~~~~

#### Acts 3: 重构 `src/components/stats/StatsMetricCards.tsx`

清理硬编码的双模边框与 slate 文本。

~~~~~act
patch_file
src/components/stats/StatsMetricCards.tsx
~~~~~
~~~~~typescript.old
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-card p-5 rounded-3xl border border-indigo-100 dark:border-slate-800 shadow-sm space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
          <Calendar className="w-4 h-4 text-indigo-500" />
          {t('stats.todayTrials')}
        </div>
        <div className="text-3xl font-black text-foreground">
          {stats.today.total}{' '}
          <span className="text-xs font-semibold text-slate-400 font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-indigo-600 font-semibold mt-1">
          {t('common.accuracy')} {calcAcc(stats.today.hits, stats.today.total)}%
        </div>
      </div>

      <div className="bg-card p-5 rounded-3xl border border-emerald-100 dark:border-slate-800 shadow-sm space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
          <Target className="w-4 h-4 text-emerald-500" />
          {t('stats.weekTrials')}
        </div>
        <div className="text-3xl font-black text-foreground">
          {stats.week.total}{' '}
          <span className="text-xs font-semibold text-slate-400 font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-emerald-600 font-semibold mt-1">
          {t('common.accuracy')} {calcAcc(stats.week.hits, stats.week.total)}%
        </div>
      </div>

      <div className="bg-card p-5 rounded-3xl border border-amber-100 dark:border-slate-800 shadow-sm space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
          <Activity className="w-4 h-4 text-amber-500" />
          {t('stats.yearTrials')}
        </div>
        <div className="text-3xl font-black text-foreground">
          {stats.year.total}{' '}
          <span className="text-xs font-semibold text-slate-400 font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-amber-600 font-semibold mt-1">
          {t('common.accuracy')} {calcAcc(stats.year.hits, stats.year.total)}%
        </div>
      </div>

      <div className="bg-card p-5 rounded-3xl border border-border shadow-sm space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
          <TrendingUp className="w-4 h-4 text-slate-500" />
          {t('stats.allTimeTrials')}
        </div>
        <div className="text-3xl font-black text-foreground">
          {stats.allTime.total}{' '}
          <span className="text-xs font-semibold text-slate-400 font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-slate-500 font-semibold mt-1">
          {t('stats.streakDays', { days: streakDays })}
        </div>
      </div>
    </div>
  );
~~~~~
~~~~~typescript.new
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-card p-5 rounded-3xl border border-border shadow-sm space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
          <Calendar className="w-4 h-4 text-primary" />
          {t('stats.todayTrials')}
        </div>
        <div className="text-3xl font-black text-foreground">
          {stats.today.total}{' '}
          <span className="text-xs font-semibold text-muted-foreground font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-primary font-semibold mt-1">
          {t('common.accuracy')} {calcAcc(stats.today.hits, stats.today.total)}%
        </div>
      </div>

      <div className="bg-card p-5 rounded-3xl border border-border shadow-sm space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
          <Target className="w-4 h-4 text-emerald-500" />
          {t('stats.weekTrials')}
        </div>
        <div className="text-3xl font-black text-foreground">
          {stats.week.total}{' '}
          <span className="text-xs font-semibold text-muted-foreground font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
          {t('common.accuracy')} {calcAcc(stats.week.hits, stats.week.total)}%
        </div>
      </div>

      <div className="bg-card p-5 rounded-3xl border border-border shadow-sm space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
          <Activity className="w-4 h-4 text-amber-500" />
          {t('stats.yearTrials')}
        </div>
        <div className="text-3xl font-black text-foreground">
          {stats.year.total}{' '}
          <span className="text-xs font-semibold text-muted-foreground font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1">
          {t('common.accuracy')} {calcAcc(stats.year.hits, stats.year.total)}%
        </div>
      </div>

      <div className="bg-card p-5 rounded-3xl border border-border shadow-sm space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          {t('stats.allTimeTrials')}
        </div>
        <div className="text-3xl font-black text-foreground">
          {stats.allTime.total}{' '}
          <span className="text-xs font-semibold text-muted-foreground font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-muted-foreground font-semibold mt-1">
          {t('stats.streakDays', { days: streakDays })}
        </div>
      </div>
    </div>
  );
~~~~~

#### Acts 4: 重构 `src/components/plan/editor/PlanLibraryDrawer.tsx`

接入 `Button` 和 `Badge`，清理双模与灰阶类名。

~~~~~act
patch_file
src/components/plan/editor/PlanLibraryDrawer.tsx
~~~~~
~~~~~typescript.old
import { Check, Plus, Star, Trash2 } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import type { PlanStorageState, TrainingPlan } from '../../../types/plan';

interface PlanLibraryDrawerProps {
~~~~~
~~~~~typescript.new
import { Check, Plus, Star, Trash2 } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import type { PlanStorageState, TrainingPlan } from '../../../types/plan';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

interface PlanLibraryDrawerProps {
~~~~~

~~~~~act
patch_file
src/components/plan/editor/PlanLibraryDrawer.tsx
~~~~~
~~~~~typescript.old
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border border-border rounded-2xl space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold text-foreground tracking-tight">
          {t('plan.switchEditingPlan')}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCreateNewBlankPlan}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('plan.createNewBlankPlan')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600"
          >
            {t('plan.collapse')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
        {storageState.plans.map((p) => {
          const isActive = currentPlan.id === p.id;
          const isFav = p.isFavorite ?? true;
          const stageCount = (p.items || []).length;
          const totalTrials = (p.items || []).reduce((acc, c) => acc + c.targetTrials, 0);
          const isPendingDelete = confirmDeleteId === p.id;

          return (
            <div
              key={p.id}
              className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-2 ${
                isActive
                  ? 'bg-white dark:bg-slate-800 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20'
                  : 'bg-card/80 border-border hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectPlan(p)}
                className="min-w-0 flex-1 text-left cursor-pointer focus:outline-none"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-foreground truncate">{p.name}</span>
                  {p.isBuiltin && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-accent text-primary rounded-md border border-indigo-100 dark:border-indigo-900">
                      {t('plan.officialTag')}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {t('plan.stageAndTrialsSummary', { stages: stageCount, trials: totalTrials })}
                </div>
              </button>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => onToggleFavorite(p.id, e)}
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                    isFav
                      ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                      : 'text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400'
                  }`}
                  title={isFav ? t('common.favoritedTooltip') : t('common.unfavoritedTooltip')}
                >
                  <Star className={`w-4 h-4 ${isFav ? 'fill-amber-500' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDeleteClick(p.id, e)}
                  className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                    isPendingDelete
                      ? 'bg-rose-600 text-white shadow-sm animate-pulse'
                      : 'text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                  }`}
                  title={isPendingDelete ? t('common.confirm') : t('common.deletePlan')}
                >
                  {isPendingDelete ? <Check className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
~~~~~
~~~~~typescript.new
  return (
    <div className="p-4 bg-muted/60 border border-border rounded-2xl space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold text-foreground tracking-tight">
          {t('plan.switchEditingPlan')}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateNewBlankPlan}
            className="text-primary hover:text-primary gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('plan.createNewBlankPlan')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            {t('plan.collapse')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
        {storageState.plans.map((p) => {
          const isActive = currentPlan.id === p.id;
          const isFav = p.isFavorite ?? true;
          const stageCount = (p.items || []).length;
          const totalTrials = (p.items || []).reduce((acc, c) => acc + c.targetTrials, 0);
          const isPendingDelete = confirmDeleteId === p.id;

          return (
            <div
              key={p.id}
              className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-2 ${
                isActive
                  ? 'bg-card border-indigo-600 shadow-sm ring-2 ring-indigo-500/20'
                  : 'bg-card/80 border-border hover:bg-card hover:border-primary/60 shadow-xs'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectPlan(p)}
                className="min-w-0 flex-1 text-left cursor-pointer focus:outline-none"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-foreground truncate">{p.name}</span>
                  {p.isBuiltin && (
                    <Badge variant="accent" size="sm">
                      {t('plan.officialTag')}
                    </Badge>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {t('plan.stageAndTrialsSummary', { stages: stageCount, trials: totalTrials })}
                </div>
              </button>

              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={(e) => onToggleFavorite(p.id, e as unknown as MouseEvent)}
                  className={`rounded-xl ${
                    isFav ? 'text-amber-500' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title={isFav ? t('common.favoritedTooltip') : t('common.unfavoritedTooltip')}
                >
                  <Star className={`w-4 h-4 ${isFav ? 'fill-amber-500' : ''}`} />
                </Button>

                <Button
                  variant={isPendingDelete ? 'danger' : 'ghost'}
                  size="iconSm"
                  onClick={(e) => handleDeleteClick(p.id, e as unknown as MouseEvent)}
                  className={`rounded-xl ${
                    isPendingDelete
                      ? 'animate-pulse'
                      : 'text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                  }`}
                  title={isPendingDelete ? t('common.confirm') : t('common.deletePlan')}
                >
                  {isPendingDelete ? <Check className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
~~~~~

#### Acts 5: 重构 `src/views/Home.tsx`

清理文本灰度颜色与图标高亮。

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript.old
      {/* 顶部状态与问候信息 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            {t('nav.dashboard')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
            {t('common.appSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-xl text-foreground text-xs font-semibold shadow-xs">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>{formatTotalTime(totalTimeMs)}</span>
          </div>
        </div>
      </div>

      {/* 核心主角：今日训练流 Hero 卡片 */}
      <PlanHeroCard
        plan={trainingPlan}
        allPlans={allPlans}
        onStartPlan={onStartPlan}
        onOpenEditor={onOpenPlanEditor}
        onSelectPlan={onSelectPlan}
      />

      {/* 当前计划阶段明细清单 (直观展示今日步骤，无需跳入计划编辑器) */}
      {validPlanItems.length > 0 && (
        <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>{t('plan.stageBreakdown')}</span>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {t('plan.stageCount', { count: validPlanItems.length })}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {validPlanItems.map((item, idx) => {
              const card = registry.getCardById(item.cardId);
              if (!card) return null;
              const Icon = card.icon;
              const cardTitle = getCardTitle(card, t);
              const cardProfile = profiles[card.id];
              const currentLvl = cardProfile?.currentLevel || 5;

              return (
                <div
                  key={item.id}
                  className="p-3 bg-muted/60 border border-border rounded-2xl flex items-center justify-between gap-2.5 shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-slate-800 dark:bg-slate-700 text-white font-mono text-[11px] font-black flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="p-1.5 rounded-xl bg-card text-primary border border-border/60 shadow-xs flex-shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-foreground truncate">{cardTitle}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Lvl {currentLvl}</div>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-bold text-primary bg-card border border-border px-2 py-0.5 rounded-lg shadow-xs flex-shrink-0">
                    {item.targetTrials} {t('common.trialsUnit')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 底部概览指标与快捷探索导航 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 指标卡 1: 今日刷题 */}
        <div
          role="presentation"
          onClick={onNavigateToStats}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigateToStats();
            }
          }}
          className="bg-card p-5 rounded-3xl border border-border shadow-sm hover:border-primary/60 transition-all cursor-pointer space-y-1 group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              {t('common.todayTrials')}
            </span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            {todayTotalCount}{' '}
            <span className="text-xs font-normal text-slate-400">{t('common.trialsUnit')}</span>
          </div>
          <div className="text-[11px] text-slate-400 pt-0.5">
            {t('common.accuracy')}:{' '}
            <span className="font-bold text-foreground font-mono">{overallAccuracy}%</span>
          </div>
        </div>

        {/* 快捷跳转 2: 探索大盘入口 */}
        <div
          role="presentation"
          onClick={onNavigateToDiscovery}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigateToDiscovery();
            }
          }}
          className="bg-card p-5 rounded-3xl border border-border shadow-sm hover:border-primary/60 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5 text-indigo-600">
              <Compass className="w-3.5 h-3.5" />
              {t('nav.discovery')}
            </span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-600" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-black text-foreground">{t('home.allPacks')}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t('home.matchedModules', { count: registry.getAllCards().length })}
            </p>
          </div>
        </div>

        {/* 快捷跳转 3: 计划管理入口 */}
        <div
          role="presentation"
          onClick={onOpenPlanEditor}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenPlanEditor();
            }
          }}
          className="bg-card p-5 rounded-3xl border border-border shadow-sm hover:border-primary/60 transition-all cursor-pointer flex flex-col justify-between group sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5 text-indigo-600">
              <Layers className="w-3.5 h-3.5" />
              {t('nav.plans')}
            </span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-600" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-black text-foreground">{trainingPlan.name}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t('plan.stageAndTrialsSummary', {
                stages: validPlanItems.length,
                trials: validPlanItems.reduce((acc, c) => acc + c.targetTrials, 0),
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
~~~~~
~~~~~typescript.new
      {/* 顶部状态与问候信息 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            {t('nav.dashboard')}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
            {t('common.appSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-xl text-foreground text-xs font-semibold shadow-xs">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>{formatTotalTime(totalTimeMs)}</span>
          </div>
        </div>
      </div>

      {/* 核心主角：今日训练流 Hero 卡片 */}
      <PlanHeroCard
        plan={trainingPlan}
        allPlans={allPlans}
        onStartPlan={onStartPlan}
        onOpenEditor={onOpenPlanEditor}
        onSelectPlan={onSelectPlan}
      />

      {/* 当前计划阶段明细清单 (直观展示今日步骤，无需跳入计划编辑器) */}
      {validPlanItems.length > 0 && (
        <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span>{t('plan.stageBreakdown')}</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {t('plan.stageCount', { count: validPlanItems.length })}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {validPlanItems.map((item, idx) => {
              const card = registry.getCardById(item.cardId);
              if (!card) return null;
              const Icon = card.icon;
              const cardTitle = getCardTitle(card, t);
              const cardProfile = profiles[card.id];
              const currentLvl = cardProfile?.currentLevel || 5;

              return (
                <div
                  key={item.id}
                  className="p-3 bg-muted/60 border border-border rounded-2xl flex items-center justify-between gap-2.5 shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-foreground text-background font-mono text-[11px] font-black flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="p-1.5 rounded-xl bg-card text-primary border border-border/60 shadow-xs flex-shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-foreground truncate">{cardTitle}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">Lvl {currentLvl}</div>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-bold text-primary bg-card border border-border px-2 py-0.5 rounded-lg shadow-xs flex-shrink-0">
                    {item.targetTrials} {t('common.trialsUnit')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 底部概览指标与快捷探索导航 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 指标卡 1: 今日刷题 */}
        <div
          role="presentation"
          onClick={onNavigateToStats}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigateToStats();
            }
          }}
          className="bg-card p-5 rounded-3xl border border-border shadow-sm hover:border-primary/60 transition-all cursor-pointer space-y-1 group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-primary" />
              {t('common.todayTrials')}
            </span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            {todayTotalCount}{' '}
            <span className="text-xs font-normal text-muted-foreground">{t('common.trialsUnit')}</span>
          </div>
          <div className="text-[11px] text-muted-foreground pt-0.5">
            {t('common.accuracy')}:{' '}
            <span className="font-bold text-foreground font-mono">{overallAccuracy}%</span>
          </div>
        </div>

        {/* 快捷跳转 2: 探索大盘入口 */}
        <div
          role="presentation"
          onClick={onNavigateToDiscovery}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigateToDiscovery();
            }
          }}
          className="bg-card p-5 rounded-3xl border border-border shadow-sm hover:border-primary/60 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span className="flex items-center gap-1.5 text-primary">
              <Compass className="w-3.5 h-3.5" />
              {t('nav.discovery')}
            </span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-primary" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-black text-foreground">{t('home.allPacks')}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t('home.matchedModules', { count: registry.getAllCards().length })}
            </p>
          </div>
        </div>

        {/* 快捷跳转 3: 计划管理入口 */}
        <div
          role="presentation"
          onClick={onOpenPlanEditor}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenPlanEditor();
            }
          }}
          className="bg-card p-5 rounded-3xl border border-border shadow-sm hover:border-primary/60 transition-all cursor-pointer flex flex-col justify-between group sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span className="flex items-center gap-1.5 text-primary">
              <Layers className="w-3.5 h-3.5" />
              {t('nav.plans')}
            </span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-primary" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-black text-foreground">{trainingPlan.name}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t('plan.stageAndTrialsSummary', {
                stages: validPlanItems.length,
                trials: validPlanItems.reduce((acc, c) => acc + c.targetTrials, 0),
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
~~~~~

### 下一步建议
1. **重新运行扫描脚本**：执行 `python3 scripts/scan_unification_targets.py -s`，观察未统一指标项的大幅下降。
2. **清理下一批文件**：针对 `PlanStageList.tsx`、`SessionSummaryModal.tsx`、`PlanSummaryModal.tsx` 与 `ModeCard.tsx` 继续推进 `<Button>` / `<Badge>` 替换。
3. **功能与编译验证**：执行 `npm run build`，确保重构后应用构建通过且无语法错误。
