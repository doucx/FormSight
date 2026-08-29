我们将按照 Quipu 协议规划并执行本次 UI 布局解耦重构。本次重构聚焦于页面结构分离，不引入额外的业务特性，将原先堆叠在首页的“卡片探索大盘”与“训练计划”拆分为职责明确的独立视图，并通过统一的全局导航栏进行串联。

## [WIP] refactor(ui): 分离今日工作台与探索大盘页面布局

### 用户需求
将原 `Home.tsx` 中平铺混杂的“训练计划”与“卡片大盘”进行空间解耦：
1. **今日工作台 (Dashboard / Home)**：作为打开系统的默认第一视图，以日常训练计划（Plan）为核心主角展开，清晰呈现阶段流程与开始训练主 CTA。
2. **探索大盘 (Discovery)**：独立为单独的页面路由，容纳五维筛选引擎（FilterEngine）与全部训练卡片网格，提供专注的模块探索空间。
3. **全局导航栏 (AppNavigation)**：统一串联今日工作台 (Dashboard)、探索大盘 (Discovery)、计划中心 (Plans)、认知档案 (Stats) 与全局设置。

### 评论
本次重构将系统的视觉信息层级从“原型期的库优先 (Library-First)”转变为“成熟期的任务与日常流优先 (Routine-First)”。这不仅大幅降低了新用户的认知负荷，也使中高级用户的日常练习路径更短、更聚焦，是前端架构与用户体验的关键演进。

### 目标
1. 扩展 `src/hooks/useHashRoute.ts`，增加 `discovery` 路由及路由持久化解析逻辑。
2. 创建全局导航组件 `src/components/navigation/AppNavigation.tsx`，支持桌面端与移动端响应式 Tab 切换。
3. 新建独立的大盘发现视图 `src/views/DiscoveryView.tsx`，将五维筛选引擎与全部卡片网格迁移至此。
4. 重构 `src/views/Home.tsx` 为纯粹的今日工作台，放大突出日常计划，展开阶段明细并附带核心概览指标。
5. 更新 `src/components/routing/AppRouter.tsx` 与 `src/hooks/useAppBootstrap.ts`，集成新的视图流转与页面标题。
6. 在中英文语言包中增加导航相关词条。

### 基本原理
通过在 Hash 路由层新增 `#/discovery` 路径，并在外层 AppShell 挂载轻量级的响应式全局导航栏，使得页面在主导航切换时保持流畅的单页体验。在进入专注训练（`train`、`plan-train`）时自动收起全局导航，确保训练时的零干扰沉浸感。

### 标签
#intent/refine #flow/ready #priority/high #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/dashboard-discovery-separation #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 扩展路由定义与多语言词条

我们首先在 `useHashRoute.ts` 中增加 `discovery` 独立路由支持，并在中英文语言包中补充导航词条。

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript
export type RouteLocation =
  | { type: 'home'; query?: CardQueryOptions }
  | { type: 'train'; cardId: string; sessionType: 'training' | 'benchmark' }
  | { type: 'plan-train' }
  | { type: 'plan-editor' }
  | { type: 'stats' }
  | { type: 'analytics'; cardId: string; tab?: string };
~~~~~
~~~~~typescript
export type RouteLocation =
  | { type: 'home' }
  | { type: 'discovery'; query?: CardQueryOptions }
  | { type: 'train'; cardId: string; sessionType: 'training' | 'benchmark' }
  | { type: 'plan-train' }
  | { type: 'plan-editor' }
  | { type: 'stats' }
  | { type: 'analytics'; cardId: string; tab?: string };
~~~~~

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript
  if (segments[0] === 'plan-train') {
    return { type: 'plan-train' };
  }

  if (segments[0] === 'plan-editor') {
    return { type: 'plan-editor' };
  }

  if (segments[0] === 'stats') {
    return { type: 'stats' };
  }
~~~~~
~~~~~typescript
  if (segments[0] === 'plan-train') {
    return { type: 'plan-train' };
  }

  if (segments[0] === 'plan-editor' || segments[0] === 'plans') {
    return { type: 'plan-editor' };
  }

  if (segments[0] === 'stats') {
    return { type: 'stats' };
  }

  if (segments[0] === 'discovery') {
    const discoveryQuery = parseHomeQuery(queryParams);
    return { type: 'discovery', query: discoveryQuery };
  }
~~~~~

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript
function stringifyRoute(route: RouteLocation): string {
  if (route.type === 'home') {
    if (!route.query) return '#/';
    const params = new URLSearchParams();
    if (route.query.packId && route.query.packId !== 'all') {
      params.set('pack', route.query.packId);
    }
    if (route.query.domains && route.query.domains.length > 0) {
      params.set('domains', route.query.domains.join(','));
    }
    if (route.query.paths && route.query.paths.length > 0) {
      params.set('paths', route.query.paths.join(','));
    }
    if (route.query.challenges && route.query.challenges.length > 0) {
      params.set('challenges', route.query.challenges.join(','));
    }
    if (route.query.interactions && route.query.interactions.length > 0) {
      params.set('interactions', route.query.interactions.join(','));
    }
    if (route.query.statuses && route.query.statuses.length > 0) {
      params.set('statuses', route.query.statuses.join(','));
    }
    if (route.query.searchKeyword?.trim()) {
      params.set('q', route.query.searchKeyword.trim());
    }
    if (route.query.showAdvanced === true) {
      params.set('adv', '1');
    } else if (route.query.showAdvanced === false) {
      params.set('adv', '0');
    }
    const qs = params.toString();
    return qs ? `#/?${qs}` : '#/';
  }
  if (route.type === 'plan-train') return '#/plan-train';
  if (route.type === 'plan-editor') return '#/plan-editor';
  if (route.type === 'stats') return '#/stats';
  if (route.type === 'analytics') {
    const qs = route.tab ? `?tab=${encodeURIComponent(route.tab)}` : '';
    return `#/analytics/${route.cardId}${qs}`;
  }
  if (route.type === 'train') return `#/train/${route.cardId}?type=${route.sessionType}`;
  return '#/';
}
~~~~~
~~~~~typescript
function stringifyRoute(route: RouteLocation): string {
  if (route.type === 'home') {
    return '#/';
  }
  if (route.type === 'discovery') {
    if (!route.query) return '#/discovery';
    const params = new URLSearchParams();
    if (route.query.packId && route.query.packId !== 'all') {
      params.set('pack', route.query.packId);
    }
    if (route.query.domains && route.query.domains.length > 0) {
      params.set('domains', route.query.domains.join(','));
    }
    if (route.query.paths && route.query.paths.length > 0) {
      params.set('paths', route.query.paths.join(','));
    }
    if (route.query.challenges && route.query.challenges.length > 0) {
      params.set('challenges', route.query.challenges.join(','));
    }
    if (route.query.interactions && route.query.interactions.length > 0) {
      params.set('interactions', route.query.interactions.join(','));
    }
    if (route.query.statuses && route.query.statuses.length > 0) {
      params.set('statuses', route.query.statuses.join(','));
    }
    if (route.query.searchKeyword?.trim()) {
      params.set('q', route.query.searchKeyword.trim());
    }
    if (route.query.showAdvanced === true) {
      params.set('adv', '1');
    } else if (route.query.showAdvanced === false) {
      params.set('adv', '0');
    }
    const qs = params.toString();
    return qs ? `#/discovery?${qs}` : '#/discovery';
  }
  if (route.type === 'plan-train') return '#/plan-train';
  if (route.type === 'plan-editor') return '#/plan-editor';
  if (route.type === 'stats') return '#/stats';
  if (route.type === 'analytics') {
    const qs = route.tab ? `?tab=${encodeURIComponent(route.tab)}` : '';
    return `#/analytics/${route.cardId}${qs}`;
  }
  if (route.type === 'train') return `#/train/${route.cardId}?type=${route.sessionType}`;
  return '#/';
}
~~~~~

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json
  "common": {
    "appName": "FormSight",
    "appSubtitle": "视觉造型构图与色彩感知自适应强化训练系统",
~~~~~
~~~~~json
  "nav": {
    "dashboard": "今日工作台",
    "discovery": "探索大盘",
    "plans": "计划中心",
    "stats": "认知档案"
  },
  "common": {
    "appName": "FormSight",
    "appSubtitle": "视觉造型构图与色彩感知自适应强化训练系统",
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json
  "common": {
    "appName": "FormSight",
    "appSubtitle": "Visual Form & Color Perception Adaptive Training System",
~~~~~
~~~~~json
  "nav": {
    "dashboard": "Dashboard",
    "discovery": "Discovery Hub",
    "plans": "Routine Plans",
    "stats": "Cognitive Stats"
  },
  "common": {
    "appName": "FormSight",
    "appSubtitle": "Visual Form & Color Perception Adaptive Training System",
~~~~~

#### Acts 2: 创建全局导航栏与探索大盘视图

我们新建 `AppNavigation.tsx` 作为全站统一的导航栏，并新建 `DiscoveryView.tsx` 承载原有的搜索、五维标签矩阵与卡片大盘列表。

~~~~~act
write_file
src/components/navigation/AppNavigation.tsx
~~~~~
~~~~~typescript
import { BarChart2, Compass, Layers, Settings, Sparkles, Target } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';
import type { RouteLocation } from '../../hooks/useHashRoute';

interface AppNavigationProps {
  currentRoute: RouteLocation;
  onNavigate: (route: RouteLocation) => void;
  onOpenSettings: () => void;
}

export function AppNavigation({
  currentRoute,
  onNavigate,
  onOpenSettings,
}: AppNavigationProps) {
  const { t } = useTranslation();

  const isTabActive = (tab: 'home' | 'discovery' | 'plan-editor' | 'stats'): boolean => {
    return currentRoute.type === tab;
  };

  const navItems = [
    {
      id: 'home' as const,
      label: t('nav.dashboard'),
      icon: Target,
      target: { type: 'home' as const },
    },
    {
      id: 'discovery' as const,
      label: t('nav.discovery'),
      icon: Compass,
      target: { type: 'discovery' as const },
    },
    {
      id: 'plan-editor' as const,
      label: t('nav.plans'),
      icon: Layers,
      target: { type: 'plan-editor' as const },
    },
    {
      id: 'stats' as const,
      label: t('nav.stats'),
      icon: BarChart2,
      target: { type: 'stats' as const },
    },
  ];

  return (
    <nav className="w-full bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl px-3 sm:px-5 py-2 sm:py-2.5 shadow-sm flex items-center justify-between gap-2 flex-shrink-0">
      {/* 品牌标识 */}
      <button
        type="button"
        onClick={() => onNavigate({ type: 'home' })}
        className="flex items-center gap-2.5 text-left cursor-pointer focus:outline-none flex-shrink-0 group"
      >
        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform flex-shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="hidden md:block">
          <div className="font-black text-sm text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
            {t('common.appName')}
            <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100">
              v{__APP_VERSION__}
            </span>
          </div>
        </div>
      </button>

      {/* 核心导航项 */}
      <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-100/80 p-1 rounded-2xl flex-1 max-w-xl justify-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isTabActive(item.id);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.target)}
              className={`flex-1 sm:flex-initial py-1.5 sm:py-2 px-2.5 sm:px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                active
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* 右侧全局设置按钮 */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2 sm:px-3 sm:py-2 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          title={t('common.globalSettings')}
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('common.settings')}</span>
        </button>
      </div>
    </nav>
  );
}
~~~~~

~~~~~act
write_file
src/views/DiscoveryView.tsx
~~~~~
~~~~~typescript
import { Inbox, RotateCcw } from 'lucide-preact';
import { useMemo, useState } from 'preact/hooks';
import { ModeCard } from '../components/common/ModeCard';
import { FilterEngine } from '../components/discovery/FilterEngine';
import { getCardDesc, getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { CardQueryOptions } from '../types/card';
import type { UnifiedProfileData } from '../utils/db/index';

interface DiscoveryViewProps {
  todayStats: Record<string, { count: number; timeMs: number }>;
  profiles: Record<string, UnifiedProfileData>;
  query?: CardQueryOptions;
  onQueryChange?: (query: CardQueryOptions) => void;
  onStartCard: (cardId: string, type: 'training' | 'benchmark') => void;
  onOpenCardSettings: (cardId: string) => void;
  onOpenCardAnalytics: (cardId: string) => void;
}

export function DiscoveryView({
  todayStats,
  profiles,
  query: externalQuery,
  onQueryChange,
  onStartCard,
  onOpenCardSettings,
  onOpenCardAnalytics,
}: DiscoveryViewProps) {
  const { t } = useTranslation();
  const [localQuery, setLocalQuery] = useState<CardQueryOptions>(externalQuery || {});

  const activeQuery = externalQuery !== undefined ? externalQuery : localQuery;

  const handleQueryChange = (newQuery: CardQueryOptions) => {
    setLocalQuery(newQuery);
    onQueryChange?.(newQuery);
  };

  const filteredCards = useMemo(() => {
    return registry.queryCards(activeQuery);
  }, [activeQuery]);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-150">
      {/* 顶部标题与说明栏 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {t('nav.discovery')}
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {t('home.matchedModules', { count: filteredCards.length })}
          </p>
        </div>
      </div>

      {/* 五维标签与搜索筛选引擎 */}
      <FilterEngine
        query={activeQuery}
        totalMatches={filteredCards.length}
        onChange={handleQueryChange}
      />

      {/* 模块大盘卡片列表 */}
      {filteredCards.length === 0 ? (
        <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-12 flex flex-col items-center justify-center gap-3 text-center shadow-sm">
          <div className="p-4 bg-slate-50 text-slate-400 rounded-3xl">
            <Inbox className="w-8 h-8" />
          </div>
          <div className="text-base font-bold text-slate-800">{t('home.noMatchTitle')}</div>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">{t('home.noMatchDesc')}</p>
          <button
            type="button"
            onClick={() => handleQueryChange({})}
            className="mt-2 px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('home.resetFilter')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCards.map((card) => {
            const profile = profiles[card.id];
            const totalTrials = profile?.totalTrials || 0;
            const accuracy =
              totalTrials > 0 && profile ? Math.round((profile.totalHits / totalTrials) * 100) : 0;
            const currentLevel = profile?.currentLevel || 5;
            const stat = todayStats[card.id] || { count: 0, timeMs: 0 };
            const cardTitle = getCardTitle(card, t);
            const cardDesc = getCardDesc(card, t);

            return (
              <ModeCard
                key={card.id}
                title={cardTitle}
                desc={cardDesc}
                icon={card.icon}
                todayCount={stat.count}
                todayTimeMs={stat.timeMs}
                currentLevel={currentLevel}
                accuracy={accuracy}
                totalTrials={totalTrials}
                hasAnalytics={Boolean(card.hasWeaknessAnalytics)}
                isExperimental={card.tags.status === 'experimental'}
                onStartTraining={() => onStartCard(card.id, 'training')}
                onStartBenchmark={() => onStartCard(card.id, 'benchmark')}
                onOpenSettings={() => onOpenCardSettings(card.id)}
                onOpenAnalytics={() => onOpenCardAnalytics(card.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
~~~~~

#### Acts 3: 重构今日工作台视图 (`Home.tsx`)

我们将 `Home.tsx` 改造成纯粹的“今日工作台”视图，移除庞大的筛选器和大盘列表，突出展示日常训练计划及各阶段时间线，并补充关键概览指标。

~~~~~act
write_file
src/views/Home.tsx
~~~~~
~~~~~typescript
import { ArrowRight, Clock, Compass, Layers, Play, Target } from 'lucide-preact';
import { PlanHeroCard } from '../components/plan/PlanHeroCard';
import { getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { TrainingPlan } from '../types/plan';
import { type UnifiedProfileData, formatTotalTime } from '../utils/db/index';

interface HomeProps {
  totalTimeMs: number;
  todayStats: Record<string, { count: number; timeMs: number }>;
  profiles: Record<string, UnifiedProfileData>;
  trainingPlan: TrainingPlan;
  allPlans?: TrainingPlan[];
  onStartPlan: () => void;
  onOpenPlanEditor: () => void;
  onSelectPlan?: (planId: string) => void;
  onNavigateToDiscovery: () => void;
  onNavigateToStats: () => void;
}

export function Home({
  totalTimeMs,
  todayStats,
  profiles,
  trainingPlan,
  allPlans = [],
  onStartPlan,
  onOpenPlanEditor,
  onSelectPlan,
  onNavigateToDiscovery,
  onNavigateToStats,
}: HomeProps) {
  const { t } = useTranslation();

  // 统计今日已练习题数与总题量
  const todayTotalCount = Object.values(todayStats).reduce((acc, c) => acc + c.count, 0);

  // 统计所有模块的平均正确率
  const allProfilesList = Object.values(profiles);
  const allTotalTrials = allProfilesList.reduce((acc, p) => acc + p.totalTrials, 0);
  const allTotalHits = allProfilesList.reduce((acc, p) => acc + p.totalHits, 0);
  const overallAccuracy =
    allTotalTrials > 0 ? Math.round((allTotalHits / allTotalTrials) * 100) : 0;

  // 获取当前计划的所有有效阶段卡片
  const validPlanItems = (trainingPlan.items || []).filter((item) =>
    Boolean(registry.getCardById(item.cardId)),
  );

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 animate-in fade-in duration-150">
      {/* 顶部状态与问候信息 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {t('nav.dashboard')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
            {t('common.appSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200/80 rounded-xl text-slate-700 text-xs font-semibold shadow-xs">
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
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
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
                  className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-2.5 shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-slate-800 text-white font-mono text-[11px] font-black flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="p-1.5 rounded-xl bg-white text-indigo-600 border border-slate-200/60 shadow-xs flex-shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800 truncate">{cardTitle}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Lvl {currentLvl}</div>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-bold text-indigo-600 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-xs flex-shrink-0">
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
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:border-indigo-300 transition-all cursor-pointer space-y-1 group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              {t('common.todayTrials')}
            </span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-800 font-mono">
            {todayTotalCount}{' '}
            <span className="text-xs font-normal text-slate-400">{t('common.trialsUnit')}</span>
          </div>
          <div className="text-[11px] text-slate-400 pt-0.5">
            {t('common.accuracy')}: <span className="font-bold text-slate-700 font-mono">{overallAccuracy}%</span>
          </div>
        </div>

        {/* 快捷跳转 2: 探索大盘入口 */}
        <div
          role="presentation"
          onClick={onNavigateToDiscovery}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5 text-indigo-600">
              <Compass className="w-3.5 h-3.5" />
              {t('nav.discovery')}
            </span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-600" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-black text-slate-800">{t('home.allPacks')}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t('home.matchedModules', { count: registry.getAllCards().length })}
            </p>
          </div>
        </div>

        {/* 快捷跳转 3: 计划管理入口 */}
        <div
          role="presentation"
          onClick={onOpenPlanEditor}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between group sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5 text-indigo-600">
              <Layers className="w-3.5 h-3.5" />
              {t('nav.plans')}
            </span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-600" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-black text-slate-800">{trainingPlan.name}</div>
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
}
~~~~~

#### Acts 4: 整合路由分发器与标题引导 (`AppRouter.tsx` & `useAppBootstrap.ts`)

在 `AppRouter.tsx` 中将全局导航栏置于主干页面上方，根据当前路由分发至 `Home`、`DiscoveryView`、`PlanEditorView` 或 `GlobalStatsView`。

~~~~~act
patch_file
src/hooks/useAppBootstrap.ts
~~~~~
~~~~~typescript
  // 动态更新页面标题
  useEffect(() => {
    if (route.type === 'home') {
      lastHomeRouteRef.current = route;
      document.title = `${t('common.appName')} - ${t('common.appSubtitle')}`;
    } else if (route.type === 'plan-editor') {
      document.title = `${t('plan.editPlan')} - ${t('common.appName')}`;
    } else if (route.type === 'plan-train') {
      document.title = `${trainingPlan.name || t('plan.todayPlan')} - ${t('common.appName')}`;
    } else if (route.type === 'stats') {
      document.title = `${t('stats.title')} - ${t('common.appName')}`;
    } else if (route.type === 'analytics') {
      const card = registry.getCardById(route.cardId);
      const cardTitle = card ? getCardTitle(card, t) : t('common.stats');
      document.title = `${cardTitle} - ${t('common.stats')} - ${t('common.appName')}`;
    } else if (route.type === 'train') {
      const card = registry.getCardById(route.cardId);
      const cardTitle = card ? getCardTitle(card, t) : t('shell.training');
      document.title = `${cardTitle} - ${t('common.appName')}`;
    }
  }, [route, trainingPlan.name, t]);
~~~~~
~~~~~typescript
  // 动态更新页面标题
  useEffect(() => {
    if (route.type === 'home') {
      lastHomeRouteRef.current = route;
      document.title = `${t('nav.dashboard')} - ${t('common.appName')}`;
    } else if (route.type === 'discovery') {
      lastHomeRouteRef.current = route;
      document.title = `${t('nav.discovery')} - ${t('common.appName')}`;
    } else if (route.type === 'plan-editor') {
      document.title = `${t('plan.editPlan')} - ${t('common.appName')}`;
    } else if (route.type === 'plan-train') {
      document.title = `${trainingPlan.name || t('plan.todayPlan')} - ${t('common.appName')}`;
    } else if (route.type === 'stats') {
      document.title = `${t('stats.title')} - ${t('common.appName')}`;
    } else if (route.type === 'analytics') {
      const card = registry.getCardById(route.cardId);
      const cardTitle = card ? getCardTitle(card, t) : t('common.stats');
      document.title = `${cardTitle} - ${t('common.stats')} - ${t('common.appName')}`;
    } else if (route.type === 'train') {
      const card = registry.getCardById(route.cardId);
      const cardTitle = card ? getCardTitle(card, t) : t('shell.training');
      document.title = `${cardTitle} - ${t('common.appName')}`;
    }
  }, [route, trainingPlan.name, t]);
~~~~~

~~~~~act
patch_file
src/components/routing/AppRouter.tsx
~~~~~
~~~~~typescript
import { useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import type { RouteLocation } from '../../hooks/useHashRoute';
import type { TrainingPlan } from '../../types/plan';
import type { UnifiedProfileData } from '../../utils/db/schema';
import { saveTrainingPlan } from '../../utils/planStorage';
import { type UserSettings, getCardSettings } from '../../utils/settings';
import { CardAnalyticsView } from '../../views/CardAnalyticsView';
import { GenericTrainingView } from '../../views/GenericTrainingView';
import { GlobalStatsView } from '../../views/GlobalStatsView';
import { Home } from '../../views/Home';
import { PlanEditorView } from '../../views/PlanEditorView';
import { PlanTrainingView } from '../../views/PlanTrainingView';
import type { ToastType } from '../common/Toast';
~~~~~
~~~~~typescript
import { useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import type { RouteLocation } from '../../hooks/useHashRoute';
import type { TrainingPlan } from '../../types/plan';
import type { UnifiedProfileData } from '../../utils/db/schema';
import { saveTrainingPlan } from '../../utils/planStorage';
import { type UserSettings, getCardSettings } from '../../utils/settings';
import { CardAnalyticsView } from '../../views/CardAnalyticsView';
import { DiscoveryView } from '../../views/DiscoveryView';
import { GenericTrainingView } from '../../views/GenericTrainingView';
import { GlobalStatsView } from '../../views/GlobalStatsView';
import { Home } from '../../views/Home';
import { PlanEditorView } from '../../views/PlanEditorView';
import { PlanTrainingView } from '../../views/PlanTrainingView';
import type { ToastType } from '../common/Toast';
import { AppNavigation } from '../navigation/AppNavigation';
~~~~~

~~~~~act
patch_file
src/components/routing/AppRouter.tsx
~~~~~
~~~~~typescript
export function AppRouter({
  route,
  navigate,
  lastHomeRoute,
  totalTimeMs,
  todayStats,
  profiles,
  trainingPlan,
  allPlans,
  settings,
  profilesLoaded,
  onRefreshProfiles,
  onSetTrainingPlan,
  onSelectPlanOnHome,
  onOpenCardSettings,
  onOpenGlobalSettings,
  showToast,
}: AppRouterProps) {
  const { t } = useTranslation();

  if (route.type === 'home') {
    return (
      <Home
        totalTimeMs={totalTimeMs}
        todayStats={todayStats}
        profiles={profiles}
        trainingPlan={trainingPlan}
        allPlans={allPlans}
        query={route.query}
        onQueryChange={(newQuery) => navigate({ type: 'home', query: newQuery }, { replace: true })}
        onStartCard={(cardId, sessionType) => navigate({ type: 'train', cardId, sessionType })}
        onOpenCardSettings={onOpenCardSettings}
        onOpenCardAnalytics={(cardId) => navigate({ type: 'analytics', cardId })}
        onStartPlan={() => navigate({ type: 'plan-train' })}
        onOpenPlanEditor={() => navigate({ type: 'plan-editor' })}
        onSelectPlan={onSelectPlanOnHome}
        onOpenGlobalSettings={onOpenGlobalSettings}
        onOpenGlobalStats={() => navigate({ type: 'stats' })}
      />
    );
  }

  if (route.type === 'stats') {
    return <GlobalStatsView onExit={() => navigate(lastHomeRoute)} />;
  }
~~~~~
~~~~~typescript
export function AppRouter({
  route,
  navigate,
  lastHomeRoute,
  totalTimeMs,
  todayStats,
  profiles,
  trainingPlan,
  allPlans,
  settings,
  profilesLoaded,
  onRefreshProfiles,
  onSetTrainingPlan,
  onSelectPlanOnHome,
  onOpenCardSettings,
  onOpenGlobalSettings,
  showToast,
}: AppRouterProps) {
  const { t } = useTranslation();

  // 判断是否为需要呈现全局导航栏的主干页面
  const isMainShellPage =
    route.type === 'home' ||
    route.type === 'discovery' ||
    route.type === 'plan-editor' ||
    route.type === 'stats';

  const renderMainContent = () => {
    if (route.type === 'home') {
      return (
        <Home
          totalTimeMs={totalTimeMs}
          todayStats={todayStats}
          profiles={profiles}
          trainingPlan={trainingPlan}
          allPlans={allPlans}
          onStartPlan={() => navigate({ type: 'plan-train' })}
          onOpenPlanEditor={() => navigate({ type: 'plan-editor' })}
          onSelectPlan={onSelectPlanOnHome}
          onNavigateToDiscovery={() => navigate({ type: 'discovery' })}
          onNavigateToStats={() => navigate({ type: 'stats' })}
        />
      );
    }

    if (route.type === 'discovery') {
      return (
        <DiscoveryView
          todayStats={todayStats}
          profiles={profiles}
          query={route.query}
          onQueryChange={(newQuery) =>
            navigate({ type: 'discovery', query: newQuery }, { replace: true })
          }
          onStartCard={(cardId, sessionType) => navigate({ type: 'train', cardId, sessionType })}
          onOpenCardSettings={onOpenCardSettings}
          onOpenCardAnalytics={(cardId) => navigate({ type: 'analytics', cardId })}
        />
      );
    }

    if (route.type === 'stats') {
      return <GlobalStatsView onExit={() => navigate(lastHomeRoute)} />;
    }

    if (route.type === 'plan-editor') {
      return (
        <PlanEditorView
          initialPlan={trainingPlan}
          onExit={() => navigate(lastHomeRoute)}
          onPlanListChanged={onRefreshProfiles}
          onSaveAndExit={(newPlan) => {
            saveTrainingPlan(newPlan);
            onSetTrainingPlan(newPlan);
            onRefreshProfiles();
            showToast(t('common.planUpdatedToast'), 'success');
            navigate(lastHomeRoute);
          }}
          onStartPlanDirectly={(newPlan) => {
            saveTrainingPlan(newPlan);
            onSetTrainingPlan(newPlan);
            onRefreshProfiles();
            navigate({ type: 'plan-train' });
          }}
        />
      );
    }

    return null;
  };

  if (isMainShellPage) {
    return (
      <div className="w-full flex flex-col gap-6">
        <AppNavigation
          currentRoute={route}
          onNavigate={(target) => navigate(target)}
          onOpenSettings={onOpenGlobalSettings}
        />
        {renderMainContent()}
      </div>
    );
  }
~~~~~

### 下一步建议
1. **构建与类型验证**：运行 `npm run check` 与 `npm run build` 确保 TypeScript 类型推导与 Biome 代码格式无误。
2. **体验验证**：在本地浏览器测试点击顶部导航栏在 `今日工作台 (Dashboard)`、`探索大盘 (Discovery)`、`计划中心 (Plans)`、`认知档案 (Stats)` 之间的快速无缝切换，并验证从大盘或工作台启动单卡及计划训练时的沉浸流程。
