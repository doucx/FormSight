我们将正式开始将 `@preact/signals` 引入 FormSight 项目，构建统一的细粒度响应式状态层，并彻底消除 `AppRouter` 中基于 `key={...dataVersion}` 的组件全量重挂载反模式。

## [WIP] feat: 引入 @preact/signals 重构响应式状态总线并消除 key-bumping

### 用户需求
在 FormSight 中引入 `@preact/signals`，重构状态管理机制，建立统一的响应式 Store，消除因为数据更新而采用 `key={...dataVersion}` 暴力卸载/重挂载视图组件的现象，提升渲染性能并保留 UI 交互瞬时状态。

### 评论
当前架构采用 `dataVersion` 计数器作为强制重绘触发器，在 Preact 这种轻量高效的虚拟 DOM 运行时中属于典型反模式。引入 `@preact/signals` 不仅能实现组件级乃至 DOM 文本节点级别的极致精准局部刷新，还能显著精简组件间的 Props 传递，使得代码结构更具扩展性与可维护性。

### 目标
1. 安装 `@preact/signals` 运行时依赖。
2. 在 `src/stores/` 下创建模块化响应式 Store（`settingsStore`、`planStore`、`profileStore`、`toastStore`）。
3. 重构数据读写链路，使 IndexedDB 与 Signal 响应式同步。
4. 重构 `src/components/routing/AppRouter.tsx`，移除 `dataVersion` 相关 key 绑定。
5. 重构 `src/hooks/useAppBootstrap.ts` 与 `src/app.tsx`，使其与 Signal Store 深度集成。
6. 更新 `GlobalStatsView` 等组件，去除对 `dataVersion` 的依赖。

### 基本原理
通过 Preact Signals 的细粒度依赖追踪机制，让各个视图与组件直接订阅所需状态（例如 `$activePlan`、`$profiles`、`$todayStatsMap`、`$toasts`）。当底层数据写入 IndexedDB 后，通过 Store 动作直接更新 Signal 值（必要时配合 `batch()` 进行批量原子更新），让变更仅波及具体消费该数据的 DOM 节点或组件，避免整树卸载重建。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/state #scope/core #scope/dx #ai/instruct #task/domain/state #task/object/preact-signals-integration #task/action/implementation #task/state/begin

---

### Script

#### Acts 2: 创建模块化 Store 集合

在 `src/stores/` 目录下分别创建用户偏好、训练计划、能力档案统计、全局 Toast 等 Signal Stores。

~~~~~act
write_file
src/stores/settingsStore.ts
~~~~~
~~~~~typescript
import { computed, signal } from '@preact/signals';
import { applyThemeToDocument } from '../hooks/useTheme';
import {
  DEFAULT_SETTINGS,
  type ThemeMode,
  type UserSettings,
  loadSettings as loadSettingsFromDB,
  saveSettings as saveSettingsToDB,
} from '../storage/settings';

export const $settings = signal<UserSettings>(DEFAULT_SETTINGS);

export const $currentTheme = computed<ThemeMode>(() => $settings.value.global.theme || 'system');
export const $currentLocale = computed<string>(() => $settings.value.global.locale || 'zh-CN');

export async function initSettingsStore(): Promise<UserSettings> {
  const loaded = await loadSettingsFromDB();
  $settings.value = loaded;
  applyThemeToDocument(loaded.global.theme);
  return loaded;
}

export async function updateGlobalSettings(
  patch: Partial<UserSettings['global']>,
): Promise<UserSettings> {
  const next: UserSettings = {
    ...$settings.value,
    global: {
      ...$settings.value.global,
      ...patch,
    },
  };
  $settings.value = next;
  if (patch.theme) {
    applyThemeToDocument(patch.theme);
  }
  await saveSettingsToDB(next);
  return next;
}

export async function updateCardSettings(
  cardId: string,
  patch: Record<string, unknown>,
): Promise<UserSettings> {
  const currentCard = $settings.value.cards[cardId] || {};
  const next: UserSettings = {
    ...$settings.value,
    cards: {
      ...$settings.value.cards,
      [cardId]: {
        ...currentCard,
        ...patch,
      } as any,
    },
  };
  $settings.value = next;
  await saveSettingsToDB(next);
  return next;
}
~~~~~

~~~~~act
write_file
src/stores/planStore.ts
~~~~~
~~~~~typescript
import { computed, signal } from '@preact/signals';
import {
  EMPTY_TRAINING_PLAN,
  clonePlan as clonePlanFromStorage,
  deletePlan as deletePlanFromStorage,
  loadPlanStorageState,
  resetPlansToDefault as resetPlansFromStorage,
  savePlanStorageState,
  togglePlanFavorite as toggleFavoriteFromStorage,
} from '../storage/planStorage';
import type { PlanStorageState, TrainingPlan } from '../types/plan';

export const $allPlans = signal<TrainingPlan[]>([]);
export const $activePlanId = signal<string>(EMPTY_TRAINING_PLAN.id);

export const $activePlan = computed<TrainingPlan>(() => {
  return (
    $allPlans.value.find((p) => p.id === $activePlanId.value) ||
    $allPlans.value[0] ||
    EMPTY_TRAINING_PLAN
  );
});

export const $favoritePlans = computed<TrainingPlan[]>(() => {
  return $allPlans.value.filter((p) => p.isFavorite ?? true);
});

export async function initPlanStore(): Promise<PlanStorageState> {
  const state = await loadPlanStorageState();
  $allPlans.value = state.plans;
  $activePlanId.value = state.activePlanId;
  return state;
}

export async function setActivePlanAction(planId: string): Promise<TrainingPlan | null> {
  const target = $allPlans.value.find((p) => p.id === planId);
  if (!target) return null;

  $activePlanId.value = planId;
  await savePlanStorageState({
    activePlanId: planId,
    plans: $allPlans.value,
  });
  return target;
}

export async function savePlanAction(plan: TrainingPlan): Promise<TrainingPlan> {
  const index = $allPlans.value.findIndex((p) => p.id === plan.id);
  const updatedPlan: TrainingPlan = {
    ...plan,
    updatedAt: Date.now(),
  };

  let nextPlans: TrainingPlan[];
  if (index >= 0) {
    nextPlans = [...$allPlans.value];
    nextPlans[index] = updatedPlan;
  } else {
    nextPlans = [updatedPlan, ...$allPlans.value];
  }

  $allPlans.value = nextPlans;
  $activePlanId.value = updatedPlan.id;

  await savePlanStorageState({
    activePlanId: updatedPlan.id,
    plans: nextPlans,
  });
  return updatedPlan;
}

export async function togglePlanFavoriteAction(planId: string): Promise<void> {
  const nextState = await toggleFavoriteFromStorage(planId);
  $allPlans.value = nextState.plans;
  $activePlanId.value = nextState.activePlanId;
}

export async function deletePlanAction(planId: string): Promise<void> {
  const nextState = await deletePlanFromStorage(planId);
  $allPlans.value = nextState.plans;
  $activePlanId.value = nextState.activePlanId;
}

export async function resetPlansAction(): Promise<void> {
  const nextState = await resetPlansFromStorage();
  $allPlans.value = nextState.plans;
  $activePlanId.value = nextState.activePlanId;
}

export async function clonePlanAction(plan: TrainingPlan): Promise<TrainingPlan> {
  const cloned = await clonePlanFromStorage(plan);
  const nextState = await loadPlanStorageState();
  $allPlans.value = nextState.plans;
  $activePlanId.value = cloned.id;
  return cloned;
}
~~~~~

~~~~~act
write_file
src/stores/profileStore.ts
~~~~~
~~~~~typescript
import { batch, computed, signal } from '@preact/signals';
import {
  getAllProfiles,
  getTodaySummaries,
  getTrainingTimeMs,
} from '../storage/db/queries';
import type { DailySummaryData, UnifiedProfileData } from '../storage/db/schema';

export const $profiles = signal<Record<string, UnifiedProfileData>>({});
export const $todaySummaries = signal<DailySummaryData[]>([]);
export const $totalTimeMs = signal<number>(0);
export const $isProfilesLoaded = signal<boolean>(false);

export const $todayStatsMap = computed<Record<string, { count: number; timeMs: number }>>(() => {
  const map: Record<string, { count: number; timeMs: number }> = {};
  for (const s of $todaySummaries.value) {
    const key = s.cardId || s.mode;
    if (!map[key]) {
      map[key] = { count: 0, timeMs: 0 };
    }
    map[key].count += s.totalCount;
    map[key].timeMs += s.totalTimeMs;
  }
  return map;
});

export const $allProfilesList = computed<UnifiedProfileData[]>(() => {
  return Object.values($profiles.value);
});

export const $overallStats = computed(() => {
  const list = $allProfilesList.value;
  const totalTrials = list.reduce((acc, p) => acc + (p.totalTrials || 0), 0);
  const totalHits = list.reduce((acc, p) => acc + (p.totalHits || 0), 0);
  const accuracy = totalTrials > 0 ? Math.round((totalHits / totalTrials) * 100) : 0;
  return { totalTrials, totalHits, accuracy };
});

export async function refreshAppData(): Promise<void> {
  const [timeMs, profileList, todayList] = await Promise.all([
    getTrainingTimeMs(),
    getAllProfiles(),
    getTodaySummaries(),
  ]);

  const pMap: Record<string, UnifiedProfileData> = {};
  for (const p of profileList) {
    pMap[p.cardId] = p;
  }

  batch(() => {
    $totalTimeMs.value = timeMs;
    $profiles.value = pMap;
    $todaySummaries.value = todayList;
    $isProfilesLoaded.value = true;
  });
}
~~~~~

~~~~~act
write_file
src/stores/toastStore.ts
~~~~~
~~~~~typescript
import { signal } from '@preact/signals';
import type { ToastMessage, ToastType } from '../components/common/Toast';

export const $toasts = signal<ToastMessage[]>([]);

export function showToast(message: string, type: ToastType = 'info'): void {
  const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
  $toasts.value = [...$toasts.value, { id, message, type }];
}

export function dismissToast(id: string): void {
  $toasts.value = $toasts.value.filter((t) => t.id !== id);
}
~~~~~

~~~~~act
write_file
src/stores/index.ts
~~~~~
~~~~~typescript
export * from './settingsStore';
export * from './planStore';
export * from './profileStore';
export * from './toastStore';
~~~~~

#### Acts 3: 重构 `src/hooks/useAppBootstrap.ts` 结合 Signal Stores

精简 `useAppBootstrap`，移除重复的状态声明与 `dataVersion` 计数器，让其专注于核心生命周期引导与页面 Title 响应。

~~~~~act
write_file
src/hooks/useAppBootstrap.ts
~~~~~
~~~~~typescript
import { useCallback, useEffect, useRef } from 'preact/hooks';
import { getCardTitle, i18n, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import { $activePlan, $allPlans, initPlanStore, setActivePlanAction } from '../stores/planStore';
import {
  $isProfilesLoaded,
  $profiles,
  $todayStatsMap,
  $totalTimeMs,
  refreshAppData,
} from '../stores/profileStore';
import { $settings, initSettingsStore } from '../stores/settingsStore';
import { $toasts, dismissToast, showToast } from '../stores/toastStore';
import type { RouteLocation } from './useHashRoute';

export function useAppBootstrap(route: RouteLocation) {
  const { t } = useTranslation();
  const lastHomeRouteRef = useRef<RouteLocation>({ type: 'home' });

  useEffect(() => {
    i18n.init();
    Promise.all([initSettingsStore(), initPlanStore(), refreshAppData()]);
  }, []);

  // 动态更新页面标题
  useEffect(() => {
    const currentPlanName = $activePlan.value.name;
    if (route.type === 'home') {
      lastHomeRouteRef.current = route;
      document.title = `${t('nav.dashboard')} - ${t('common.appName')}`;
    } else if (route.type === 'discovery') {
      lastHomeRouteRef.current = route;
      document.title = `${t('nav.discovery')} - ${t('common.appName')}`;
    } else if (route.type === 'plan-editor') {
      document.title = `${t('plan.editPlan')} - ${t('common.appName')}`;
    } else if (route.type === 'plan-train') {
      document.title = `${currentPlanName || t('plan.todayPlan')} - ${t('common.appName')}`;
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
  }, [route, $activePlan.value.name, t]);

  const handleSelectPlanOnHome = useCallback(
    async (planId: string) => {
      const target = await setActivePlanAction(planId);
      if (target) {
        showToast(t('common.switchedPlanToast', { name: target.name }), 'info');
      }
    },
    [t],
  );

  return {
    lastHomeRoute: lastHomeRouteRef.current,
    settings: $settings.value,
    trainingPlan: $activePlan.value,
    allPlans: $allPlans.value,
    toasts: $toasts.value,
    profilesLoaded: $isProfilesLoaded.value,
    totalTimeMs: $totalTimeMs.value,
    profiles: $profiles.value,
    todayStats: $todayStatsMap.value,
    showToast,
    handleDismissToast: dismissToast,
    refreshProfiles: refreshAppData,
    handleSelectPlanOnHome,
  };
}
~~~~~

#### Acts 4: 重构 `AppRouter.tsx` 消除 `key={...dataVersion}`

修改 `AppRouter`，彻底去除 `key={...dataVersion}`，让 View 组件在数据刷新时仅触发响应式局部重绘，保持常驻生命周期。

~~~~~act
write_file
src/components/routing/AppRouter.tsx
~~~~~
~~~~~typescript
import { useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import type { RouteLocation } from '../../hooks/useHashRoute';
import type { UnifiedProfileData } from '../../storage/db/schema';
import { getCardSettings, type UserSettings } from '../../storage/settings';
import {
  $activePlan,
  $allPlans,
  savePlanAction,
  setActivePlanAction,
} from '../../stores/planStore';
import {
  $isProfilesLoaded,
  $profiles,
  $todayStatsMap,
  $totalTimeMs,
  refreshAppData,
} from '../../stores/profileStore';
import { $settings } from '../../stores/settingsStore';
import { showToast } from '../../stores/toastStore';
import type { TrainingPlan } from '../../types/plan';
import { CardAnalyticsView } from '../../views/CardAnalyticsView';
import { DiscoveryView } from '../../views/DiscoveryView';
import { GenericTrainingView } from '../../views/GenericTrainingView';
import { GlobalStatsView } from '../../views/GlobalStatsView';
import { HomeView } from '../../views/HomeView';
import { PlanEditorView } from '../../views/PlanEditorView';
import { PlanTrainingView } from '../../views/PlanTrainingView';
import type { ToastType } from '../common/Toast';
import { AppNavigation } from '../navigation/AppNavigation';

interface AppRouterProps {
  route: RouteLocation;
  navigate: (target: RouteLocation, options?: { replace?: boolean }) => void;
  lastHomeRoute: RouteLocation;
  totalTimeMs?: number;
  todayStats?: Record<string, { count: number; timeMs: number }>;
  profiles?: Record<string, UnifiedProfileData>;
  trainingPlan?: TrainingPlan;
  allPlans?: TrainingPlan[];
  settings?: UserSettings;
  profilesLoaded?: boolean;
  onRefreshProfiles?: () => Promise<void>;
  onSetTrainingPlan?: (plan: TrainingPlan) => void;
  onSelectPlanOnHome?: (planId: string) => void;
  onOpenCardSettings: (cardId: string) => void;
  onOpenGlobalSettings: () => void;
  showToast?: (message: string, type?: ToastType) => void;
}

export function AppRouter({
  route,
  navigate,
  lastHomeRoute,
  onOpenCardSettings,
  onOpenGlobalSettings,
}: AppRouterProps) {
  const { t } = useTranslation();

  const currentPlan = $activePlan.value;
  const currentSettings = $settings.value;
  const currentProfiles = $profiles.value;
  const currentTodayStats = $todayStatsMap.value;
  const currentTotalTime = $totalTimeMs.value;
  const profilesLoaded = $isProfilesLoaded.value;
  const allPlansList = $allPlans.value;

  const isMainShellPage =
    route.type === 'home' ||
    route.type === 'discovery' ||
    route.type === 'plan-editor' ||
    route.type === 'stats';

  const renderMainContent = () => {
    if (route.type === 'home') {
      return (
        <HomeView
          totalTimeMs={currentTotalTime}
          todayStats={currentTodayStats}
          profiles={currentProfiles}
          trainingPlan={currentPlan}
          allPlans={allPlansList}
          onStartPlan={() => navigate({ type: 'plan-train' })}
          onOpenPlanEditor={() => navigate({ type: 'plan-editor' })}
          onSelectPlan={(pId) => setActivePlanAction(pId)}
          onNavigateToDiscovery={() => navigate({ type: 'discovery' })}
          onNavigateToStats={() => navigate({ type: 'stats' })}
        />
      );
    }

    if (route.type === 'discovery') {
      return (
        <DiscoveryView
          todayStats={currentTodayStats}
          profiles={currentProfiles}
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
          initialPlan={currentPlan}
          onExit={() => navigate(lastHomeRoute)}
          onPlanListChanged={refreshAppData}
          onSaveAndExit={async (newPlan) => {
            await savePlanAction(newPlan);
            await refreshAppData();
            showToast(t('common.planUpdatedToast'), 'success');
            navigate(lastHomeRoute);
          }}
          onStartPlanDirectly={async (newPlan) => {
            await savePlanAction(newPlan);
            await refreshAppData();
            navigate({ type: 'plan-train' });
          }}
        />
      );
    }

    return null;
  };

  if (isMainShellPage) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row w-full">
        <AppNavigation
          currentRoute={route}
          onNavigate={(target) => navigate(target)}
          onOpenSettings={onOpenGlobalSettings}
        />
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 overflow-y-auto">
          {renderMainContent()}
        </main>
      </div>
    );
  }

  if (route.type === 'analytics') {
    return (
      <CardAnalyticsView
        key={`card-analytics-${route.cardId}`}
        cardId={route.cardId}
        initialTab={route.tab}
        onExit={() => navigate(lastHomeRoute)}
        onStartTraining={(cId) => navigate({ type: 'train', cardId: cId, sessionType: 'training' })}
        onStartBenchmark={(cId) =>
          navigate({ type: 'train', cardId: cId, sessionType: 'benchmark' })
        }
        onOpenSettings={onOpenCardSettings}
      />
    );
  }

  if (route.type === 'plan-train') {
    return (
      <PlanTrainingView
        key={`plan-train-${currentPlan.id}`}
        plan={currentPlan}
        settings={currentSettings}
        onExit={async () => {
          await refreshAppData();
          navigate(lastHomeRoute);
        }}
      />
    );
  }

  if (route.type === 'train') {
    if (!profilesLoaded) {
      return (
        <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-muted-foreground text-xs font-semibold">
          {t('common.syncingProfiles')}
        </div>
      );
    }
    const activeCard = registry.getCardById(route.cardId);
    if (!activeCard) {
      navigate(lastHomeRoute);
      return null;
    }
    const plugin = registry.getPluginByCardId(activeCard.id);
    if (!plugin) {
      navigate(lastHomeRoute);
      return null;
    }
    const activeLevel = currentProfiles[activeCard.id]?.currentLevel || 5;

    return (
      <GenericTrainingView
        key={`${activeCard.id}-${route.sessionType}`}
        card={activeCard}
        plugin={plugin}
        sessionType={route.sessionType}
        initialLevel={activeLevel}
        settings={getCardSettings(currentSettings, activeCard.id)}
        globalSettings={currentSettings.global}
        onExit={async () => {
          await refreshAppData();
          navigate(lastHomeRoute);
        }}
      />
    );
  }

  return null;
}
~~~~~

#### Acts 5: 重构 `src/views/GlobalStatsView.tsx`

去除 `GlobalStatsView` 中的 `dataVersion` 入参，让其在挂载与交互时自然聚合与展示。

~~~~~act
write_file
src/views/GlobalStatsView.tsx
~~~~~
~~~~~typescript
import { Activity, BarChart2, ChevronDown, Filter } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import { ActivityHeatmapCard } from '../components/stats/ActivityHeatmapCard';
import { CognitiveMasteryGrid } from '../components/stats/CognitiveMasteryGrid';
import { StatsMetricCards } from '../components/stats/StatsMetricCards';
import { Select } from '../components/ui/select';
import { CHALLENGE_TAGS, DOMAIN_TAGS, PATH_TAGS } from '../config/tags';
import { renderTrendChartCanvas } from '../core/canvas/charts/drawTrendChart';
import { getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import { useGlobalStatsData } from '../hooks/useGlobalStatsData';
import type { CognitivePathTag, MentalChallengeTag, VisualDomainTag } from '../types/card';

interface GlobalStatsViewProps {
  onExit?: () => void;
}

export function GlobalStatsView({ onExit: _onExit }: GlobalStatsViewProps = {}) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    loading,
    selectedFilter,
    setSelectedFilter,
    getCurrentFilterLabel,
    stats,
    dailyData,
    heatmapData,
    pathMasteryList,
    challengeMasteryList,
  } = useGlobalStatsData();

  const allCards = registry.getAllCards();

  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (canvas) {
      renderTrendChartCanvas(canvas, dailyData);
    }
  }, [loading, dailyData]);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 顶部主操作栏 */}
      <header className="w-full bg-card border border-border rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-accent text-primary rounded-2xl shadow-xs">
            <BarChart2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">
              {t('stats.title')}
            </h1>
            <p className="text-xs text-muted-foreground font-medium">{t('stats.subTitle')}</p>
          </div>
        </div>

        {/* 筛选选择器 */}
        <div className="relative flex items-center self-end sm:self-center w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-primary absolute left-3 pointer-events-none z-10" />
          <Select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter((e.target as HTMLSelectElement).value)}
            className="w-full sm:w-auto max-w-xs truncate"
          >
            <option value="all">{t('stats.allModules')}</option>

            <optgroup label={t('stats.optgroupDomains')}>
              {(Object.keys(DOMAIN_TAGS) as VisualDomainTag[]).map((domain) => (
                <option key={`domain:${domain}`} value={`domain:${domain}`}>
                  {t(DOMAIN_TAGS[domain].i18nKey)}
                </option>
              ))}
            </optgroup>

            <optgroup label={t('stats.optgroupPaths')}>
              {(Object.keys(PATH_TAGS) as CognitivePathTag[]).map((path) => (
                <option key={`path:${path}`} value={`path:${path}`}>
                  {t(PATH_TAGS[path].i18nKey)}
                </option>
              ))}
            </optgroup>

            <optgroup label={t('stats.optgroupChallenges')}>
              {(Object.keys(CHALLENGE_TAGS) as MentalChallengeTag[]).map((ch) => (
                <option key={`challenge:${ch}`} value={`challenge:${ch}`}>
                  {t(CHALLENGE_TAGS[ch].i18nKey)}
                </option>
              ))}
            </optgroup>

            <optgroup label={t('stats.optgroupCards')}>
              {allCards.map((card) => (
                <option key={`card:${card.id}`} value={`card:${card.id}`}>
                  {getCardTitle(card, t)}
                </option>
              ))}
            </optgroup>
          </Select>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 pointer-events-none z-10" />
        </div>
      </header>

      {/* 主体展示区 */}
      {loading ? (
        <div className="h-96 bg-card rounded-3xl border border-border p-6 flex items-center justify-center text-muted-foreground text-sm shadow-sm">
          {t('stats.loading')}
        </div>
      ) : stats.allTime.total === 0 ? (
        <div className="h-96 bg-card rounded-3xl border border-border p-6 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2 shadow-sm">
          <Activity className="w-10 h-10 text-muted-foreground" />
          {t('stats.noRecords', { filter: getCurrentFilterLabel() })}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <StatsMetricCards stats={stats} streakDays={Object.keys(dailyData).length} />

          <CognitiveMasteryGrid
            pathMasteryList={pathMasteryList}
            challengeMasteryList={challengeMasteryList}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActivityHeatmapCard heatmapData={heatmapData} />

            <div className="bg-card border border-border shadow-sm p-6 rounded-3xl flex flex-col gap-2">
              <div className="text-sm font-bold text-foreground flex items-center justify-between">
                <span>{t('stats.trendTitle')}</span>
                <span className="text-xs font-medium text-muted-foreground bg-muted text-muted-foreground px-2.5 py-0.5 rounded-lg">
                  {t('stats.dailyMaxLevel')}
                </span>
              </div>
              <canvas ref={canvasRef} width={480} height={160} className="w-full mt-2" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
~~~~~

#### Acts 6: 重构 `src/app.tsx` 消除多余 Props 管道

将 `app.tsx` 改造为直连 Signal Stores 的现代纯粹顶层容器。

~~~~~act
write_file
src/app.tsx
~~~~~
~~~~~typescript
import { useState } from 'preact/hooks';
import { ToastContainer } from './components/common/Toast';
import { GlobalSettingsModal } from './components/modals/GlobalSettingsModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { AppRouter } from './components/routing/AppRouter';
import { registry } from './core/registry';
import { useAppBootstrap } from './hooks/useAppBootstrap';
import { useHashRoute } from './hooks/useHashRoute';
import { useTheme } from './hooks/useTheme';
import { refreshAppData } from './stores/profileStore';
import { $settings } from './stores/settingsStore';
import { $toasts, dismissToast, showToast } from './stores/toastStore';

export function App() {
  const { route, navigate } = useHashRoute();
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [activeSettingsCardId, setActiveSettingsCardId] = useState<string | null>(null);

  const { lastHomeRoute } = useAppBootstrap(route);

  // 挂载夜间模式全局响应与监听
  useTheme($settings.value);

  const activeSettingsCard = activeSettingsCardId
    ? registry.getCardById(activeSettingsCardId)
    : null;

  return (
    <div className="min-h-screen bg-background dark:bg-background text-foreground antialiased transition-colors duration-200">
      <AppRouter
        route={route}
        navigate={navigate}
        lastHomeRoute={lastHomeRoute}
        onOpenCardSettings={(cardId) => setActiveSettingsCardId(cardId)}
        onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
      />

      <ToastContainer toasts={$toasts.value} onDismiss={dismissToast} />

      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          settings={$settings.value}
          onClose={() => setIsGlobalSettingsOpen(false)}
          onSave={() => refreshAppData()}
          onDataChanged={refreshAppData}
          showToast={showToast}
        />
      )}

      {activeSettingsCard && (
        <SettingsModal
          card={activeSettingsCard}
          settings={$settings.value}
          onClose={() => setActiveSettingsCardId(null)}
          onSave={() => refreshAppData()}
        />
      )}
    </div>
  );
}
~~~~~

### 下一步建议
1. 执行 `npm run build` 或 `npm test` 校验类型系统与打包完整性。
2. 在浏览器中实际验证主页切换计划、进入训练作答、完成阶段跳转与返回主页的流畅度，确认没有任何 DOM 卸载闪烁或卡顿。
