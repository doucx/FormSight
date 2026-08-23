我已经为你规划好了将主页卡片筛选条件持久化至 URL Query 参数的完整实施方案。

通过这种方式，你的扩展包、认知技能 Tag、感官维度和搜索词都将以 URL 查询参数的形式（例如 `#/?pack=geometry&skills=proportion&q=圆`）实时映射并同步到地址栏。用户无论是进行训练后退出、使用浏览器前进/后退、还是直接刷新页面，已选择的筛选上下文都将得到精准保留。

## [WIP] feat(route): 将主页筛选条件持久化至 URL 查询参数中

### 用户需求
在主页搜索/筛选窗口中选择扩展包、Tag 标签或输入搜索关键字后，进入某张卡片训练一段时间再退出回到主页，之前选择的筛选条件会丢失。需要通过 URL 查询参数（URL Query Params）持久化筛选状态，使得进出卡片、刷新页面及使用浏览器前进/后退时均能无缝还原筛选上下文。

### 评论
采用 URL Query 管理筛选状态是现代 Web 应用最稳健的设计范式。它不仅彻底避免了 LocalStorage 导致的跨会话状态粘滞问题（如数天后打开由于旧筛选词导致大盘空置），还能天然支持浏览器历史栈导航（Back/Forward）与多条件书签化/分享。

### 目标
1. 扩展 `src/hooks/useHashRoute.ts` 中的 `RouteLocation`，使其支持解析与序列化主页查询参数（`CardQueryOptions`）。
2. 在 `useHashRoute` 中增加 `replace` 导航支持，使得在主页调整筛选时能够平滑替换当前 URL 避免过度堆叠历史记录。
3. 改造 `src/views/Home.tsx` 为受控/半受控筛选组件，支持接收路由传递的 `query` 并通过 `onQueryChange` 回调实时同步。
4. 改造 `src/app.tsx`，在进入与退出训练时记录并回退到带参数的 `lastHomeRoute`。

### 基本原理
1. 在 `useHashRoute` 中对 Hash 的 query 字符串进行双向编解码：将 `packId`、`skills`、`targets`、`interactions`、`searchKeyword` 编码为 `URLSearchParams`。
2. 筛选变动时采用 `replace: true` 模式更新 Hash，既能实时反映在 URL 地址栏上，又不会在用户连续点击 Tag 时污染历史栈。
3. `App` 顶层维护最后一次访问的主页路由快照（`lastHomeRouteRef`），当在训练页面点击“退出训练”或完成训练时，精确重定向回该快照。

### 标签
#intent/build #flow/ready #priority/high #comp/interfaces #concept/navigation #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/url-query-routing #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 升级 `useHashRoute.ts` 支持 Query 参数编解码与 Replace 模式

在 `useHashRoute.ts` 中引入卡片标签类型，实现 `parseHomeQuery` 与 `stringifyRoute` 对筛选条件的双向解析，并扩展 `navigate` 支持 `replace` 选项。

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

export type RouteLocation =
  | { type: 'home' }
  | { type: 'train'; cardId: string; sessionType: 'training' | 'benchmark' }
  | { type: 'plan-train' };

function parseHash(hash: string): RouteLocation {
  const cleanHash = hash.replace(/^#\/?/, '').trim();
  if (!cleanHash) return { type: 'home' };

  const [pathPart, queryPart] = cleanHash.split('?');
  const segments = pathPart.split('/').filter(Boolean);

  if (segments[0] === 'plan-train') {
    return { type: 'plan-train' };
  }

  if (segments[0] === 'train' && segments[1]) {
    const cardId = segments[1];
    const params = new URLSearchParams(queryPart || '');
    const sessionType = params.get('type') === 'benchmark' ? 'benchmark' : 'training';
    return { type: 'train', cardId, sessionType };
  }

  // 兼容老版本 #/dashboard/:domain 路由，统一回退到主页
  return { type: 'home' };
}

function stringifyRoute(route: RouteLocation): string {
  if (route.type === 'home') return '#/';
  if (route.type === 'plan-train') return '#/plan-train';
  if (route.type === 'train') return `#/train/${route.cardId}?type=${route.sessionType}`;
  return '#/';
}

export function useHashRoute() {
  const [route, setRoute] = useState<RouteLocation>(() =>
    typeof window !== 'undefined' ? parseHash(window.location.hash) : { type: 'home' },
  );

  const scrollPositionsRef = useRef<Record<string, number>>({});
  const currentHashRef = useRef<string>(
    typeof window !== 'undefined' ? window.location.hash || '#/' : '#/',
  );

  useEffect(() => {
    const handleScroll = () => {
      const currentKey = currentHashRef.current || '#/';
      scrollPositionsRef.current[currentKey] = window.scrollY;
    };

    const handleHashChange = () => {
      const prevHash = currentHashRef.current || '#/';
      scrollPositionsRef.current[prevHash] = window.scrollY;

      const newHash = window.location.hash || '#/';
      currentHashRef.current = newHash;
      setRoute(parseHash(newHash));

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const targetY = scrollPositionsRef.current[newHash] ?? 0;
          window.scrollTo(0, targetY);
        });
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const navigate = useCallback((target: RouteLocation) => {
    const newHash = stringifyRoute(target);
    if (window.location.hash !== newHash) {
      const prevHash = currentHashRef.current || '#/';
      scrollPositionsRef.current[prevHash] = window.scrollY;
      window.location.hash = newHash;
    }
  }, []);

  return { route, navigate };
}
~~~~~
~~~~~typescript
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type {
  CardQueryOptions,
  CognitiveSkillTag,
  InteractionTag,
  SensoryTargetTag,
} from '../types/card';

export type RouteLocation =
  | { type: 'home'; query?: CardQueryOptions }
  | { type: 'train'; cardId: string; sessionType: 'training' | 'benchmark' }
  | { type: 'plan-train' };

function parseHomeQuery(params: URLSearchParams): CardQueryOptions | undefined {
  const packId = params.get('pack') || undefined;
  const targets = params.get('targets')?.split(',').filter(Boolean) as
    | SensoryTargetTag[]
    | undefined;
  const skills = params.get('skills')?.split(',').filter(Boolean) as
    | CognitiveSkillTag[]
    | undefined;
  const interactions = params.get('interactions')?.split(',').filter(Boolean) as
    | InteractionTag[]
    | undefined;
  const searchKeyword = params.get('q') || params.get('search') || undefined;
  const expRaw = params.get('exp');
  const includeExperimental =
    expRaw !== null ? expRaw === '1' || expRaw === 'true' : undefined;

  if (
    !packId &&
    (!targets || targets.length === 0) &&
    (!skills || skills.length === 0) &&
    (!interactions || interactions.length === 0) &&
    !searchKeyword &&
    includeExperimental === undefined
  ) {
    return undefined;
  }

  return {
    packId,
    targets: targets && targets.length > 0 ? targets : undefined,
    skills: skills && skills.length > 0 ? skills : undefined,
    interactions: interactions && interactions.length > 0 ? interactions : undefined,
    searchKeyword,
    includeExperimental,
  };
}

function parseHash(hash: string): RouteLocation {
  const cleanHash = hash.replace(/^#\/?/, '').trim();
  if (!cleanHash) return { type: 'home' };

  const [pathPart, queryPart] = cleanHash.split('?');
  const segments = pathPart.split('/').filter(Boolean);
  const queryParams = new URLSearchParams(queryPart || '');

  if (segments[0] === 'plan-train') {
    return { type: 'plan-train' };
  }

  if (segments[0] === 'train' && segments[1]) {
    const cardId = segments[1];
    const sessionType = queryParams.get('type') === 'benchmark' ? 'benchmark' : 'training';
    return { type: 'train', cardId, sessionType };
  }

  const homeQuery = parseHomeQuery(queryParams);
  return { type: 'home', query: homeQuery };
}

function stringifyRoute(route: RouteLocation): string {
  if (route.type === 'home') {
    if (!route.query) return '#/';
    const params = new URLSearchParams();
    if (route.query.packId && route.query.packId !== 'all') {
      params.set('pack', route.query.packId);
    }
    if (route.query.targets && route.query.targets.length > 0) {
      params.set('targets', route.query.targets.join(','));
    }
    if (route.query.skills && route.query.skills.length > 0) {
      params.set('skills', route.query.skills.join(','));
    }
    if (route.query.interactions && route.query.interactions.length > 0) {
      params.set('interactions', route.query.interactions.join(','));
    }
    if (route.query.searchKeyword?.trim()) {
      params.set('q', route.query.searchKeyword.trim());
    }
    if (route.query.includeExperimental) {
      params.set('exp', '1');
    }
    const qs = params.toString();
    return qs ? `#/?${qs}` : '#/';
  }
  if (route.type === 'plan-train') return '#/plan-train';
  if (route.type === 'train') return `#/train/${route.cardId}?type=${route.sessionType}`;
  return '#/';
}

export function useHashRoute() {
  const [route, setRoute] = useState<RouteLocation>(() =>
    typeof window !== 'undefined' ? parseHash(window.location.hash) : { type: 'home' },
  );

  const scrollPositionsRef = useRef<Record<string, number>>({});
  const currentHashRef = useRef<string>(
    typeof window !== 'undefined' ? window.location.hash || '#/' : '#/',
  );

  useEffect(() => {
    const handleScroll = () => {
      const currentKey = currentHashRef.current || '#/';
      scrollPositionsRef.current[currentKey] = window.scrollY;
    };

    const handleHashChange = () => {
      const prevHash = currentHashRef.current || '#/';
      scrollPositionsRef.current[prevHash] = window.scrollY;

      const newHash = window.location.hash || '#/';
      currentHashRef.current = newHash;
      setRoute(parseHash(newHash));

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const targetY = scrollPositionsRef.current[newHash] ?? 0;
          window.scrollTo(0, targetY);
        });
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const navigate = useCallback(
    (target: RouteLocation, options?: { replace?: boolean }) => {
      const newHash = stringifyRoute(target);
      if (window.location.hash !== newHash) {
        const prevHash = currentHashRef.current || '#/';
        scrollPositionsRef.current[prevHash] = window.scrollY;
        if (options?.replace) {
          const url = new URL(window.location.href);
          url.hash = newHash;
          window.history.replaceState(null, '', url.toString());
          currentHashRef.current = newHash;
          setRoute(parseHash(newHash));
        } else {
          window.location.hash = newHash;
        }
      }
    },
    [],
  );

  return { route, navigate };
}
~~~~~

#### Acts 2: 改造 `Home.tsx` 响应外部 `query` 与触发 `onQueryChange`

使 `Home` 组件能够接收来自路由的 `query` 属性，并在用户使用 `FilterEngine` 调整标签或搜索词时触发 `onQueryChange` 同步至外部路由。

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript
interface HomeProps {
  totalTimeMs: number;
  todayStats: Record<string, { count: number; timeMs: number }>;
  profiles: Record<string, UnifiedProfileData>;
  trainingPlan: TrainingPlan;
  allPlans?: TrainingPlan[];
  showExperimental?: boolean;
  onStartCard: (cardId: string, type: 'training' | 'benchmark') => void;
  onOpenCardSettings: (cardId: string) => void;
  onOpenCardAnalytics: (cardId: string) => void;
  onStartPlan: () => void;
  onOpenPlanEditor: () => void;
  onSelectPlan?: (planId: string) => void;
  onOpenGlobalSettings: () => void;
  onOpenGlobalStats: () => void;
}

export function Home({
  totalTimeMs,
  todayStats,
  profiles,
  trainingPlan,
  allPlans = [],
  showExperimental = false,
  onStartCard,
  onOpenCardSettings,
  onOpenCardAnalytics,
  onStartPlan,
  onOpenPlanEditor,
  onSelectPlan,
  onOpenGlobalSettings,
  onOpenGlobalStats,
}: HomeProps) {
  const [query, setQuery] = useState<CardQueryOptions>({
    includeExperimental: showExperimental,
  });

  // 结合全局设置与查询条件获取过滤后的卡片
  const filteredCards = useMemo(() => {
    return registry.queryCards({
      ...query,
      includeExperimental: showExperimental || query.includeExperimental,
    });
  }, [query, showExperimental]);
~~~~~
~~~~~typescript
interface HomeProps {
  totalTimeMs: number;
  todayStats: Record<string, { count: number; timeMs: number }>;
  profiles: Record<string, UnifiedProfileData>;
  trainingPlan: TrainingPlan;
  allPlans?: TrainingPlan[];
  showExperimental?: boolean;
  query?: CardQueryOptions;
  onQueryChange?: (query: CardQueryOptions) => void;
  onStartCard: (cardId: string, type: 'training' | 'benchmark') => void;
  onOpenCardSettings: (cardId: string) => void;
  onOpenCardAnalytics: (cardId: string) => void;
  onStartPlan: () => void;
  onOpenPlanEditor: () => void;
  onSelectPlan?: (planId: string) => void;
  onOpenGlobalSettings: () => void;
  onOpenGlobalStats: () => void;
}

export function Home({
  totalTimeMs,
  todayStats,
  profiles,
  trainingPlan,
  allPlans = [],
  showExperimental = false,
  query: externalQuery,
  onQueryChange,
  onStartCard,
  onOpenCardSettings,
  onOpenCardAnalytics,
  onStartPlan,
  onOpenPlanEditor,
  onSelectPlan,
  onOpenGlobalSettings,
  onOpenGlobalStats,
}: HomeProps) {
  const [localQuery, setLocalQuery] = useState<CardQueryOptions>({
    includeExperimental: showExperimental,
    ...(externalQuery || {}),
  });

  const activeQuery = externalQuery !== undefined ? externalQuery : localQuery;

  const handleQueryChange = (newQuery: CardQueryOptions) => {
    setLocalQuery(newQuery);
    onQueryChange?.(newQuery);
  };

  // 结合全局设置与查询条件获取过滤后的卡片
  const filteredCards = useMemo(() => {
    return registry.queryCards({
      ...activeQuery,
      includeExperimental: showExperimental || activeQuery.includeExperimental,
    });
  }, [activeQuery, showExperimental]);
~~~~~

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript
      {/* 大盘发现库核心筛选引擎 */}
      <FilterEngine
        query={query}
        totalMatches={filteredCards.length}
        onChange={(newQuery) => setQuery(newQuery)}
      />

      {/* 大盘卡片网格流 (Discovery Hub Cards Grid) */}
      {filteredCards.length === 0 ? (
        <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-12 flex flex-col items-center justify-center gap-3 text-center shadow-sm">
          <div className="p-4 bg-slate-50 text-slate-400 rounded-3xl">
            <Inbox className="w-8 h-8" />
          </div>
          <div className="text-base font-bold text-slate-800">未找到符合条件的训练模块</div>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            尝试调整或清空当前的多维筛选标签、搜索关键字，以探索更多训练模块。
          </p>
          <button
            type="button"
            onClick={() => setQuery({ includeExperimental: showExperimental })}
            className="mt-2 px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置所有筛选条件
          </button>
        </div>
      ) : (
~~~~~
~~~~~typescript
      {/* 大盘发现库核心筛选引擎 */}
      <FilterEngine
        query={activeQuery}
        totalMatches={filteredCards.length}
        onChange={handleQueryChange}
      />

      {/* 大盘卡片网格流 (Discovery Hub Cards Grid) */}
      {filteredCards.length === 0 ? (
        <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-12 flex flex-col items-center justify-center gap-3 text-center shadow-sm">
          <div className="p-4 bg-slate-50 text-slate-400 rounded-3xl">
            <Inbox className="w-8 h-8" />
          </div>
          <div className="text-base font-bold text-slate-800">未找到符合条件的训练模块</div>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            尝试调整或清空当前的多维筛选标签、搜索关键字，以探索更多训练模块。
          </p>
          <button
            type="button"
            onClick={() => handleQueryChange({ includeExperimental: showExperimental })}
            className="mt-2 px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置所有筛选条件
          </button>
        </div>
      ) : (
~~~~~

#### Acts 3: 在 `app.tsx` 中串联 URL Query 同步与训练退出还原

在 `App` 顶层将 `route.query` 接入 `Home`，并维护 `lastHomeRouteRef` 确保退出训练时精准回到带参数的筛选视图。

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
import { useCallback, useEffect, useState } from 'preact/hooks';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { GlobalStatsModal } from './components/GlobalStatsModal';
import { SettingsModal } from './components/SettingsModal';
import { WeaknessAnalyticsModal } from './components/WeaknessAnalyticsModal';
import { ToastContainer, type ToastMessage, type ToastType } from './components/common/Toast';
import { PlanEditorModal } from './components/plan/PlanEditorModal';
import { registry } from './core/registry';
import { useHashRoute } from './hooks/useHashRoute';
import { useTodayStats } from './hooks/useTodayStats';
import type { TrainingPlan } from './types/plan';
import { type UnifiedProfileData, repository } from './utils/db/index';
import {
  loadPlanStorageState,
  loadTrainingPlan,
  saveTrainingPlan,
  setActivePlan,
} from './utils/planStorage';
import { type UserSettings, getCardSettings, loadSettings } from './utils/settings';
import { GenericTrainingView } from './views/GenericTrainingView';
import { Home } from './views/Home';
import { PlanTrainingView } from './views/PlanTrainingView';

export function App() {
  const { route, navigate } = useHashRoute();
  const todayStats = useTodayStats();
~~~~~
~~~~~typescript
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { GlobalStatsModal } from './components/GlobalStatsModal';
import { SettingsModal } from './components/SettingsModal';
import { WeaknessAnalyticsModal } from './components/WeaknessAnalyticsModal';
import { ToastContainer, type ToastMessage, type ToastType } from './components/common/Toast';
import { PlanEditorModal } from './components/plan/PlanEditorModal';
import { registry } from './core/registry';
import { type RouteLocation, useHashRoute } from './hooks/useHashRoute';
import { useTodayStats } from './hooks/useTodayStats';
import type { TrainingPlan } from './types/plan';
import { type UnifiedProfileData, repository } from './utils/db/index';
import {
  loadPlanStorageState,
  loadTrainingPlan,
  saveTrainingPlan,
  setActivePlan,
} from './utils/planStorage';
import { type UserSettings, getCardSettings, loadSettings } from './utils/settings';
import { GenericTrainingView } from './views/GenericTrainingView';
import { Home } from './views/Home';
import { PlanTrainingView } from './views/PlanTrainingView';

export function App() {
  const { route, navigate } = useHashRoute();
  const todayStats = useTodayStats();
  const lastHomeRouteRef = useRef<RouteLocation>({ type: 'home' });
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
  useEffect(() => {
    if (route.type === 'home') {
      document.title = 'FormSight - 视觉造型构图与色彩感知训练系统';
    } else if (route.type === 'plan-train') {
      document.title = `${trainingPlan.name || '今日训练流'} - FormSight`;
    } else if (route.type === 'train') {
      const card = registry.getCardById(route.cardId);
      document.title = `${card?.title || '训练'} - FormSight`;
    }
  }, [route, trainingPlan.name]);
~~~~~
~~~~~typescript
  useEffect(() => {
    if (route.type === 'home') {
      lastHomeRouteRef.current = route;
      document.title = 'FormSight - 视觉造型构图与色彩感知训练系统';
    } else if (route.type === 'plan-train') {
      document.title = `${trainingPlan.name || '今日训练流'} - FormSight`;
    } else if (route.type === 'train') {
      const card = registry.getCardById(route.cardId);
      document.title = `${card?.title || '训练'} - FormSight`;
    }
  }, [route, trainingPlan.name]);
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {route.type === 'home' && (
        <Home
          totalTimeMs={totalTimeMs}
          todayStats={todayStats}
          profiles={profiles}
          trainingPlan={trainingPlan}
          allPlans={allPlans}
          showExperimental={settings.global.showExperimentalCards}
          onStartCard={(cardId, sessionType) => navigate({ type: 'train', cardId, sessionType })}
          onOpenCardSettings={(cardId) => setActiveSettingsCardId(cardId)}
          onOpenCardAnalytics={(cardId) => setActiveAnalyticsCardId(cardId)}
          onStartPlan={() => navigate({ type: 'plan-train' })}
          onOpenPlanEditor={() => setIsPlanEditorOpen(true)}
          onSelectPlan={handleSelectPlanOnHome}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
          onOpenGlobalStats={() => setIsGlobalStatsOpen(true)}
        />
      )}

      {route.type === 'plan-train' && (
        <PlanTrainingView
          plan={trainingPlan}
          settings={settings}
          onExit={async () => {
            await refreshProfiles();
            navigate({ type: 'home' });
          }}
        />
      )}

      {route.type === 'train' &&
        (() => {
          if (!profilesLoaded) {
            return (
              <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-slate-400 text-xs font-semibold">
                正在同步能力层阶与训练数据...
              </div>
            );
          }
          const activeCard = registry.getCardById(route.cardId);
          if (!activeCard) {
            navigate({ type: 'home' });
            return null;
          }
          const plugin = registry.getPluginByCardId(activeCard.id);
          if (!plugin) {
            navigate({ type: 'home' });
            return null;
          }
          const activeLevel = profiles[activeCard.id]?.currentLevel || 5;

          return (
            <GenericTrainingView
              key={`${activeCard.id}-${route.sessionType}`}
              card={activeCard}
              plugin={plugin}
              sessionType={route.sessionType}
              initialLevel={activeLevel}
              settings={getCardSettings(settings, activeCard.id)}
              globalSettings={settings.global}
              onExit={async () => {
                await refreshProfiles();
                navigate({ type: 'home' });
              }}
            />
          );
        })()}
~~~~~
~~~~~typescript
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {route.type === 'home' && (
        <Home
          totalTimeMs={totalTimeMs}
          todayStats={todayStats}
          profiles={profiles}
          trainingPlan={trainingPlan}
          allPlans={allPlans}
          showExperimental={settings.global.showExperimentalCards}
          query={route.query}
          onQueryChange={(newQuery) => navigate({ type: 'home', query: newQuery }, { replace: true })}
          onStartCard={(cardId, sessionType) => navigate({ type: 'train', cardId, sessionType })}
          onOpenCardSettings={(cardId) => setActiveSettingsCardId(cardId)}
          onOpenCardAnalytics={(cardId) => setActiveAnalyticsCardId(cardId)}
          onStartPlan={() => navigate({ type: 'plan-train' })}
          onOpenPlanEditor={() => setIsPlanEditorOpen(true)}
          onSelectPlan={handleSelectPlanOnHome}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
          onOpenGlobalStats={() => setIsGlobalStatsOpen(true)}
        />
      )}

      {route.type === 'plan-train' && (
        <PlanTrainingView
          plan={trainingPlan}
          settings={settings}
          onExit={async () => {
            await refreshProfiles();
            navigate(lastHomeRouteRef.current);
          }}
        />
      )}

      {route.type === 'train' &&
        (() => {
          if (!profilesLoaded) {
            return (
              <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-slate-400 text-xs font-semibold">
                正在同步能力层阶与训练数据...
              </div>
            );
          }
          const activeCard = registry.getCardById(route.cardId);
          if (!activeCard) {
            navigate(lastHomeRouteRef.current);
            return null;
          }
          const plugin = registry.getPluginByCardId(activeCard.id);
          if (!plugin) {
            navigate(lastHomeRouteRef.current);
            return null;
          }
          const activeLevel = profiles[activeCard.id]?.currentLevel || 5;

          return (
            <GenericTrainingView
              key={`${activeCard.id}-${route.sessionType}`}
              card={activeCard}
              plugin={plugin}
              sessionType={route.sessionType}
              initialLevel={activeLevel}
              settings={getCardSettings(settings, activeCard.id)}
              globalSettings={settings.global}
              onExit={async () => {
                await refreshProfiles();
                navigate(lastHomeRouteRef.current);
              }}
            />
          );
        })()}
~~~~~

### 下一步建议

1. **测试验证**：
   - 启动本地开发服务，在主页点击选择一个扩展包（如色彩/几何）并选中一个技能 Tag，观察地址栏 URL 是否同步更新为形如 `/#/?pack=geometry&skills=spatial_orientation`。
   - 点击任意卡片进入训练，做完一题或点击退出，验证是否无缝返回到带有选定 Tag 的主页发现库。
   - 尝试刷新浏览器或复制带参数的 URL 到新标签页打开，确认初始筛选状态能被 100% 还原。
