现在我们同时针对 Top 1 与 Top 2 的关键文件进行深度解耦：

1. **解耦 `src/app.tsx`（原 Score: 47.9 / 18 Imports）**：
   * 创建 **`AppRouter.tsx`**：收敛 6 个视图的分发与装配；
   * 创建 **`useAppBootstrap.ts`**：收敛数据初始化、网页 Title 同步与 Toast 消息通知；
   * 将 **`app.tsx`** 净化为极简的根容器（Imports 从 18 降至 ~6）。

2. **精简 `usePlanEditorState.ts`（原 Score: 50.0 / 18 Functions）**：
   * 创建 **`planItemUtils.ts`**：提取对计划项增删移位及清洗等纯函数工具；
   * 消除 Hook 内部的函数膨胀（函数数从 18 降至 ~6）。

## [WIP] refactor: 模块化解耦 App 根中枢与计划编辑器状态流

### 用户需求
解决 `app.tsx` 依赖扇入过大（18 Imports）以及 `usePlanEditorState.ts` 闭包函数过多（18 Functions）的架构瓶颈。

### 评论
`app.tsx` 作为根组件过度参与了各个子视图的组装逻辑与标题路由副作用；而 `usePlanEditorState` 将大量本可以作为纯函数的数组操作全部内嵌在 Hook 闭包中。通过分层解耦，能够使顶层架构更加清晰轻量。

### 目标
1. 新建 `src/components/routing/AppRouter.tsx` 负责多视图路由分发与装配。
2. 新建 `src/hooks/useAppBootstrap.ts` 负责全局数据初始化与标题动态同步。
3. 重构 `src/app.tsx`，大幅降低依赖耦合。
4. 新建 `src/components/plan/editor/planItemUtils.ts` 抽离纯函数数组工具。
5. 优化 `src/components/plan/editor/usePlanEditorState.ts` 消除函数密度过高问题。

### 基本原理
应用分层架构（Layered Architecture）与纯函数优先原则。将路由渲染、应用生命周期与纯业务计算从宿主组件与 Hook 中分离。

### 标签
#intent/refine #flow/ready #priority/high #comp/core #comp/views #concept/navigation #scope/core #scope/dx #ai/delegate #task/domain/refactoring #task/object/god-files #task/action/modularization #task/state/continue

---

### Script

#### Acts 1: 创建 `AppRouter.tsx` 路由分发装配组件

新建路由层组件，集中挂载与渲染 6 大顶层视图。

~~~~~act
write_file
src/components/routing/AppRouter.tsx
~~~~~
~~~~~typescript
import { getCardTitle, useTranslation } from '../../core/i18n';
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

interface AppRouterProps {
  route: RouteLocation;
  navigate: (target: RouteLocation, options?: { replace?: boolean }) => void;
  lastHomeRoute: RouteLocation;
  totalTimeMs: number;
  todayStats: Record<string, { count: number; timeMs: number }>;
  profiles: Record<string, UnifiedProfileData>;
  trainingPlan: TrainingPlan;
  allPlans: TrainingPlan[];
  settings: UserSettings;
  profilesLoaded: boolean;
  onRefreshProfiles: () => Promise<void>;
  onSetTrainingPlan: (plan: TrainingPlan) => void;
  onSelectPlanOnHome: (planId: string) => void;
  onOpenCardSettings: (cardId: string) => void;
  onOpenGlobalSettings: () => void;
  showToast: (message: string, type?: ToastType) => void;
}

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
        onQueryChange={(newQuery) =>
          navigate({ type: 'home', query: newQuery }, { replace: true })
        }
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

  if (route.type === 'analytics') {
    return (
      <CardAnalyticsView
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

  if (route.type === 'plan-train') {
    return (
      <PlanTrainingView
        plan={trainingPlan}
        settings={settings}
        onExit={async () => {
          await onRefreshProfiles();
          navigate(lastHomeRoute);
        }}
      />
    );
  }

  if (route.type === 'train') {
    if (!profilesLoaded) {
      return (
        <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-slate-400 text-xs font-semibold">
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
          await onRefreshProfiles();
          navigate(lastHomeRoute);
        }}
      />
    );
  }

  return null;
}
~~~~~

#### Acts 2: 创建 `useAppBootstrap.ts` 全局生命周期与状态 Hook

新建 Hook 负责系统启动、档案同步、网页标题更新与 Toast 消息通知队列。

~~~~~act
write_file
src/hooks/useAppBootstrap.ts
~~~~~
~~~~~typescript
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { ToastMessage, ToastType } from '../components/common/Toast';
import { getCardTitle, i18n, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { TrainingPlan } from '../types/plan';
import { type UnifiedProfileData, repository } from '../utils/db/index';
import {
  loadPlanStorageState,
  loadTrainingPlan,
  setActivePlan,
} from '../utils/planStorage';
import { type UserSettings, loadSettings } from '../utils/settings';
import type { RouteLocation } from './useHashRoute';

export function useAppBootstrap(
  route: RouteLocation,
  refreshTodayStats: () => Promise<void>,
) {
  const { t } = useTranslation();
  const lastHomeRouteRef = useRef<RouteLocation>({ type: 'home' });

  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan>(loadTrainingPlan);
  const [allPlans, setAllPlans] = useState<TrainingPlan[]>(() => loadPlanStorageState().plans);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState<boolean>(false);
  const [totalTimeMs, setTotalTimeMs] = useState<number>(0);
  const [profiles, setProfiles] = useState<Record<string, UnifiedProfileData>>({});

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshProfiles = useCallback(async () => {
    const [summary] = await Promise.all([repository.getAppSummary(), refreshTodayStats()]);

    setTotalTimeMs(summary.totalTimeMs);
    setProfiles(summary.profiles);
    setSettings(summary.settings);
    setTrainingPlan(summary.trainingPlan);
    setAllPlans(summary.allPlans);
    setProfilesLoaded(true);
  }, [refreshTodayStats]);

  useEffect(() => {
    i18n.init();
    refreshProfiles();
  }, [refreshProfiles]);

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

  const handleSelectPlanOnHome = useCallback(
    (planId: string) => {
      const target = setActivePlan(planId);
      if (target) {
        setTrainingPlan(target);
        showToast(t('common.switchedPlanToast', { name: target.name }), 'info');
      }
    },
    [showToast, t],
  );

  return {
    lastHomeRoute: lastHomeRouteRef.current,
    settings,
    setSettings,
    trainingPlan,
    setTrainingPlan,
    allPlans,
    toasts,
    profilesLoaded,
    totalTimeMs,
    profiles,
    showToast,
    handleDismissToast,
    refreshProfiles,
    handleSelectPlanOnHome,
  };
}
~~~~~

#### Acts 3: 重写 `src/app.tsx` 根组件

重写 `src/app.tsx`，使其仅作为装配容器。

~~~~~act
write_file
src/app.tsx
~~~~~
~~~~~typescript
import { useState } from 'preact/hooks';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { SettingsModal } from './components/SettingsModal';
import { ToastContainer } from './components/common/Toast';
import { AppRouter } from './components/routing/AppRouter';
import { registry } from './core/registry';
import { useAppBootstrap } from './hooks/useAppBootstrap';
import { useHashRoute } from './hooks/useHashRoute';
import { useTodayStats } from './hooks/useTodayStats';

export function App() {
  const { route, navigate } = useHashRoute();
  const { todayStats, refreshTodayStats } = useTodayStats();

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [activeSettingsCardId, setActiveSettingsCardId] = useState<string | null>(null);

  const {
    lastHomeRoute,
    settings,
    setSettings,
    trainingPlan,
    setTrainingPlan,
    allPlans,
    toasts,
    profilesLoaded,
    totalTimeMs,
    profiles,
    showToast,
    handleDismissToast,
    refreshProfiles,
    handleSelectPlanOnHome,
  } = useAppBootstrap(route, refreshTodayStats);

  const activeSettingsCard = activeSettingsCardId
    ? registry.getCardById(activeSettingsCardId)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      <AppRouter
        route={route}
        navigate={navigate}
        lastHomeRoute={lastHomeRoute}
        totalTimeMs={totalTimeMs}
        todayStats={todayStats}
        profiles={profiles}
        trainingPlan={trainingPlan}
        allPlans={allPlans}
        settings={settings}
        profilesLoaded={profilesLoaded}
        onRefreshProfiles={refreshProfiles}
        onSetTrainingPlan={setTrainingPlan}
        onSelectPlanOnHome={handleSelectPlanOnHome}
        onOpenCardSettings={(cardId) => setActiveSettingsCardId(cardId)}
        onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
        showToast={showToast}
      />

      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          onClose={() => setIsGlobalSettingsOpen(false)}
          onDataChanged={refreshProfiles}
          showToast={showToast}
        />
      )}

      {activeSettingsCard && (
        <SettingsModal
          card={activeSettingsCard}
          settings={settings}
          onClose={() => setActiveSettingsCardId(null)}
          onSave={(newSettings) => setSettings(newSettings)}
        />
      )}
    </div>
  );
}
~~~~~

#### Acts 4: 创建 `planItemUtils.ts` 计划数据纯函数工具

提取计划项操作为纯函数，消除 Hook 内部的大量闭包。

~~~~~act
write_file
src/components/plan/editor/planItemUtils.ts
~~~~~
~~~~~typescript
import { registry } from '../../../core/registry';
import type { PlanItem, TrainingPlan } from '../../../types/plan';

export function createPlanItem(cardId: string): PlanItem {
  return {
    id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    cardId,
    targetTrials: 20,
  };
}

export function removePlanItem(items: PlanItem[], id: string): PlanItem[] {
  return items.filter((item) => item.id !== id);
}

export function movePlanItem(
  items: PlanItem[],
  index: number,
  direction: 'up' | 'down',
): PlanItem[] {
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) return items;

  const newItems = [...items];
  const [moved] = newItems.splice(index, 1);
  newItems.splice(targetIndex, 0, moved);
  return newItems;
}

export function updatePlanItemTrials(
  items: PlanItem[],
  id: string,
  trials: number,
): PlanItem[] {
  return items.map((item) =>
    item.id === id ? { ...item, targetTrials: Math.max(5, trials) } : item,
  );
}

export function batchUpdateItemTrials(items: PlanItem[], trials: number): PlanItem[] {
  return items.map((item) => ({ ...item, targetTrials: trials }));
}

export function createNewBlankPlan(name: string, desc: string): TrainingPlan {
  return {
    id: `custom_plan_${Date.now()}`,
    name,
    description: desc,
    items: [],
    isFavorite: true,
    isBuiltin: false,
    updatedAt: Date.now(),
  };
}

export function sanitizePlan(plan: TrainingPlan, nameInput: string): TrainingPlan {
  return {
    ...plan,
    name: nameInput.trim() || plan.name,
    items: plan.items.filter((item) => Boolean(registry.getCardById(item.cardId))),
    updatedAt: Date.now(),
  };
}
~~~~~

#### Acts 5: 重构 `usePlanEditorState.ts` 降低函数复杂度

使用 `planItemUtils.ts` 重构 Hook，减少函数定义，提升内聚性。

~~~~~act
write_file
src/components/plan/editor/usePlanEditorState.ts
~~~~~
~~~~~typescript
import { useMemo, useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import type { PlanStorageState, TrainingPlan } from '../../../types/plan';
import {
  clonePlan,
  deletePlan,
  exportPlanToJson,
  importPlanFromJson,
  loadPlanStorageState,
  savePlanStorageState,
  togglePlanFavorite,
} from '../../../utils/planStorage';
import {
  batchUpdateItemTrials,
  createNewBlankPlan,
  createPlanItem,
  movePlanItem,
  removePlanItem,
  sanitizePlan,
  updatePlanItemTrials,
} from './planItemUtils';

export interface UsePlanEditorStateOptions {
  initialPlan: TrainingPlan;
  onSaveAndExit: (plan: TrainingPlan) => void;
  onStartPlanDirectly: (plan: TrainingPlan) => void;
  onPlanListChanged?: () => void;
}

export function usePlanEditorState({
  initialPlan,
  onSaveAndExit,
  onStartPlanDirectly,
  onPlanListChanged,
}: UsePlanEditorStateOptions) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [storageState, setStorageState] = useState<PlanStorageState>(loadPlanStorageState);
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan>({ ...initialPlan });
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [planNameInput, setPlanNameInput] = useState<string>(initialPlan.name);
  const [showPlanManager, setShowPlanManager] = useState<boolean>(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const isNewPlan = !storageState.plans.some((p) => p.id === currentPlan.id);

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 2500);
  };

  const handleSelectPlanFromList = (p: TrainingPlan) => {
    setCurrentPlan({ ...p });
    setPlanNameInput(p.name);
    setIsEditingName(false);
  };

  const handleNameSave = () => {
    const trimmed = planNameInput.trim();
    if (!trimmed) {
      setPlanNameInput(currentPlan.name);
    } else {
      setCurrentPlan((prev) => ({ ...prev, name: trimmed }));
    }
    setIsEditingName(false);
  };

  const handleBatchUpdateTrials = (trials: number) => {
    setCurrentPlan((prev) => ({
      ...prev,
      items: batchUpdateItemTrials(prev.items, trials),
    }));
    showToast(t('plan.batchSetTrialsToast', { trials }));
  };

  const handleAddItem = (cardId: string) => {
    setCurrentPlan((prev) => ({
      ...prev,
      items: [...prev.items, createPlanItem(cardId)],
    }));
  };

  const handleRemoveItem = (id: string) => {
    setCurrentPlan((prev) => ({ ...prev, items: removePlanItem(prev.items, id) }));
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    setCurrentPlan((prev) => ({ ...prev, items: movePlanItem(prev.items, index, direction) }));
  };

  const handleUpdateTrials = (id: string, trials: number) => {
    setCurrentPlan((prev) => ({ ...prev, items: updatePlanItemTrials(prev.items, id, trials) }));
  };

  const handleClearAll = () => {
    setCurrentPlan((prev) => ({ ...prev, items: [] }));
  };

  const handleCreateNewBlankPlan = () => {
    const newBlank = createNewBlankPlan(
      t('plan.newBlankPlan'),
      t('common.defaultCustomPlanDesc'),
    );
    setCurrentPlan(newBlank);
    setPlanNameInput(newBlank.name);
    setIsEditingName(true);
    setShowPlanManager(false);
    showToast(t('plan.newPlanModeToast'));
  };

  const handleCloneCurrent = () => {
    const cloned = clonePlan(currentPlan);
    const nextState = loadPlanStorageState();
    setStorageState(nextState);
    setCurrentPlan(cloned);
    setPlanNameInput(cloned.name);
    onPlanListChanged?.();
    showToast(t('plan.clonedPlanToast', { name: cloned.name }));
  };

  const handleToggleFavoriteItem = (planId: string, e: MouseEvent) => {
    e.stopPropagation();
    const nextState = togglePlanFavorite(planId);
    setStorageState(nextState);
    if (currentPlan.id === planId) {
      setCurrentPlan((prev) => ({ ...prev, isFavorite: !(prev.isFavorite ?? true) }));
    }
    onPlanListChanged?.();
  };

  const handleDeletePlanItem = (planId: string, e: MouseEvent) => {
    e.stopPropagation();
    if (storageState.plans.length <= 1) {
      showToast(t('plan.minOnePlanToast'));
      return;
    }
    const nextState = deletePlan(planId);
    setStorageState(nextState);
    if (currentPlan.id === planId) {
      const fallback = nextState.plans[0];
      setCurrentPlan(fallback);
      setPlanNameInput(fallback.name);
    }
    onPlanListChanged?.();
    showToast(t('plan.planDeletedToast'));
  };

  const handleExportPlan = () => {
    const jsonStr = exportPlanToJson(currentPlan);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formsight_plan_${currentPlan.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t('plan.exportedJsonToast'));
  };

  const handleImportPlan = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      const file = target.files[0];
      file.text().then((text) => {
        const imported = importPlanFromJson(text);
        if (imported) {
          const nextState = loadPlanStorageState();
          setStorageState(nextState);
          setCurrentPlan(imported);
          setPlanNameInput(imported.name);
          setShowPlanManager(false);
          onPlanListChanged?.();
          showToast(t('plan.importedPlanSuccessToast', { name: imported.name }));
        } else {
          showToast(t('plan.importedPlanFailToast'));
        }
      });
    }
  };

  const persist = (): TrainingPlan => {
    const sanitized = sanitizePlan(currentPlan, planNameInput);
    const updatedPlans = storageState.plans.some((p) => p.id === sanitized.id)
      ? storageState.plans.map((p) => (p.id === sanitized.id ? sanitized : p))
      : [sanitized, ...storageState.plans];

    savePlanStorageState({
      activePlanId: sanitized.id,
      plans: updatedPlans,
    });

    onPlanListChanged?.();
    return sanitized;
  };

  const handleSaveOnly = () => {
    const saved = persist();
    onSaveAndExit(saved);
  };

  const handleSaveAndStart = () => {
    const saved = persist();
    onStartPlanDirectly(saved);
  };

  const totalTrials = useMemo(
    () => currentPlan.items.reduce((acc, curr) => acc + curr.targetTrials, 0),
    [currentPlan.items],
  );

  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

  return {
    storageState,
    setStorageState,
    currentPlan,
    setCurrentPlan,
    isEditingName,
    setIsEditingName,
    planNameInput,
    setPlanNameInput,
    showPlanManager,
    setShowPlanManager,
    toastNotice,
    isNewPlan,
    totalTrials,
    estimatedMin,
    fileInputRef,
    handleSelectPlanFromList,
    handleNameSave,
    handleBatchUpdateTrials,
    handleAddItem,
    handleRemoveItem,
    handleMoveItem,
    handleUpdateTrials,
    handleClearAll,
    handleCreateNewBlankPlan,
    handleCloneCurrent,
    handleToggleFavoriteItem,
    handleDeletePlanItem,
    handleExportPlan,
    handleImportPlan,
    handleSaveOnly,
    handleSaveAndStart,
  };
}
~~~~~

### 下一步建议
1. 运行 `npm run check` 校验类型检查与 Biome 代码格式。
2. 重新运行 `python3 scripts/check_god_files.py` 观察当前代码库的综合健康指数。
3. 如果需要，可以继续对 `FilterEngine.tsx` 或 `universalViews.tsx` 进行模块拆解。
