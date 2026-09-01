经排查，**认知档案（GlobalStatsView）** 及其他部分视图（如单卡认知分析、计划编辑器）在清空或导入数据后未能即时刷新，原因在于：
1. `useGlobalStatsData` 仅在组件初次挂载时（`useEffect(..., [])`）执行了一次从 IndexedDB `getDailySummaries()` 的异步拉取，没有响应应用层全局数据版本变化。
2. `useAppBootstrap` 在数据重置/还原时虽执行了 `refreshProfiles`，但未维护全局 `dataVersion` 信号，导致下游未挂载在顶层 state 的异步视图无法察觉底层数据库变动。
3. `AppRouter` 针对 `GlobalStatsView`、`CardAnalyticsView`、`PlanEditorView` 缺乏数据版本联动刷新机制。

我将生成一个计划修复这一问题。

## [WIP] fix: 全局响应数据导入与清空事件以即时刷新认知档案与所有视图

### 错误分析
- **认知档案 (GlobalStatsView)**：其底层 Hook `useGlobalStatsData` 依赖项数组为空 `[]`，仅在 Mount 时读取 IndexedDB，当用户在设置弹窗中导入/清空数据后关闭弹窗，该页面状态不会重新请求数据库。
- **单卡分析 (CardAnalyticsView)**：仅监听 `[plugin, card]`，无法感知底层历史记录在数据还原后的变更。
- **计划编辑器与计划训练 (PlanEditorView / PlanTrainingView)**：内部状态初始值基于本地存储快照，未绑定数据版本。

### 用户需求
在设置中执行「导入备份」、「清空数据」、「恢复官方计划」或「数据库瘦身」后，无需手动刷新页面或切换视图，认知档案（统计卡片、热力图、掌握度矩阵、演进趋势图）及所有关联页面能够立即响应并呈现最新数据。

### 评论
数据治理操作后保持单页应用（SPA）视图的一致性与响应性是非常关键的体验保障。引入全局响应式数据版本计数器（`dataVersion`）可精准触达所有异步拉取型子视图，既保持局部拉取的解耦设计，又实现全局数据的强一致刷新。

### 目标
1. 在 `useAppBootstrap` 中引入并暴露 `dataVersion` 状态，每次执行 `refreshProfiles` 时递增。
2. 改造 `useGlobalStatsData` 与 `GlobalStatsView`，支持传入 `dataVersion` 并在其变动时自动重新查询 `getDailySummaries()`。
3. 在 `AppRouter` 中透传 `dataVersion`，并为 `CardAnalyticsView`、`PlanEditorView`、`PlanTrainingView` 绑定数据版本 key。
4. 确保 `DataGovernanceSection` 中导入与修剪等异步操作正确 `await onDataChanged()`。

### 基本原理
通过在顶层 Hook `useAppBootstrap` 中维护一个受控的 `dataVersion` 计数器，一旦发生全量数据导入或清除，`refreshProfiles()` 触发 `dataVersion` 递增。下游视图通过 Hook 依赖项（`useEffect([dataVersion])`）或虚拟 DOM Key 重建（`key={dataVersion}`）自动触发最新数据拉取，彻底消除陈旧缓存。

### 标签
#intent/fix #flow/ready #priority/high #comp/runtime #concept/state #concept/ui #scope/ux #scope/core #ai/instruct #task/domain/storage #task/object/reactivity-sync #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 在 `useAppBootstrap` 中增加 `dataVersion` 状态驱动

~~~~~act
patch_file
src/hooks/useAppBootstrap.ts
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
  const [profilesLoaded, setProfilesLoaded] = useState<boolean>(false);
  const [totalTimeMs, setTotalTimeMs] = useState<number>(0);
  const [profiles, setProfiles] = useState<Record<string, UnifiedProfileData>>({});
  const [dataVersion, setDataVersion] = useState<number>(0);

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
    setDataVersion((v) => v + 1);
  }, [refreshTodayStats]);
~~~~~

~~~~~act
patch_file
src/hooks/useAppBootstrap.ts
~~~~~
~~~~~typescript
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
~~~~~typescript
    profilesLoaded,
    totalTimeMs,
    profiles,
    dataVersion,
    showToast,
    handleDismissToast,
    refreshProfiles,
    handleSelectPlanOnHome,
  };
}
~~~~~

#### Acts 2: 改造 `useGlobalStatsData` 与 `GlobalStatsView` 响应 `dataVersion`

~~~~~act
patch_file
src/hooks/useGlobalStatsData.ts
~~~~~
~~~~~typescript
export function useGlobalStatsData() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<DailySummaryData[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      const data = await getDailySummaries();
      if (isMounted) {
        setSummaries(data);
        setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);
~~~~~
~~~~~typescript
export function useGlobalStatsData(dataVersion = 0) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<DailySummaryData[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      const data = await getDailySummaries();
      if (isMounted) {
        setSummaries(data);
        setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [dataVersion]);
~~~~~

~~~~~act
patch_file
src/views/GlobalStatsView.tsx
~~~~~
~~~~~typescript
interface GlobalStatsViewProps {
  onExit?: () => void;
}

export function GlobalStatsView(_props: GlobalStatsViewProps = {}) {
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
~~~~~
~~~~~typescript
interface GlobalStatsViewProps {
  dataVersion?: number;
  onExit?: () => void;
}

export function GlobalStatsView({ dataVersion = 0, onExit: _onExit }: GlobalStatsViewProps = {}) {
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
  } = useGlobalStatsData(dataVersion);
~~~~~

#### Acts 3: 在 `AppRouter` 与 `App` 中传递 `dataVersion`

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
    profilesLoaded,
    totalTimeMs,
    profiles,
    showToast,
    handleDismissToast,
    refreshProfiles,
    handleSelectPlanOnHome,
  } = useAppBootstrap(route, refreshTodayStats);
~~~~~
~~~~~typescript
    profilesLoaded,
    totalTimeMs,
    profiles,
    dataVersion,
    showToast,
    handleDismissToast,
    refreshProfiles,
    handleSelectPlanOnHome,
  } = useAppBootstrap(route, refreshTodayStats);
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
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
        dataVersion={dataVersion}
        onRefreshProfiles={refreshProfiles}
        onSetTrainingPlan={setTrainingPlan}
        onSelectPlanOnHome={handleSelectPlanOnHome}
        onOpenCardSettings={(cardId) => setActiveSettingsCardId(cardId)}
        onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
        showToast={showToast}
      />
~~~~~

~~~~~act
patch_file
src/components/routing/AppRouter.tsx
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
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
  dataVersion: number;
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
  dataVersion,
  onRefreshProfiles,
  onSetTrainingPlan,
  onSelectPlanOnHome,
  onOpenCardSettings,
  onOpenGlobalSettings,
  showToast,
}: AppRouterProps) {
~~~~~

~~~~~act
patch_file
src/components/routing/AppRouter.tsx
~~~~~
~~~~~typescript
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
        plan={trainingPlan}
        settings={settings}
        onExit={async () => {
          await onRefreshProfiles();
          navigate(lastHomeRoute);
        }}
      />
    );
  }
~~~~~
~~~~~typescript
    if (route.type === 'stats') {
      return <GlobalStatsView dataVersion={dataVersion} onExit={() => navigate(lastHomeRoute)} />;
    }

    if (route.type === 'plan-editor') {
      return (
        <PlanEditorView
          key={`plan-editor-${dataVersion}`}
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
        key={`card-analytics-${route.cardId}-${dataVersion}`}
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
        key={`plan-train-${trainingPlan.id}-${dataVersion}`}
        plan={trainingPlan}
        settings={settings}
        onExit={async () => {
          await onRefreshProfiles();
          navigate(lastHomeRoute);
        }}
      />
    );
  }
~~~~~

#### Acts 4: 确保 `DataGovernanceSection` 异步操作均 `await onDataChanged()`

~~~~~act
patch_file
src/components/settings/sections/DataGovernanceSection.tsx
~~~~~
~~~~~typescript
  const handleImportFile = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      const file = target.files[0];
      try {
        setIsImporting(true);
        const text = await file.text();
        target.value = '';
        const success = await importAllData(text);
        if (success) {
          showToast(t('settings.importSuccessToast'), 'success');
          onDataChanged();
          onCloseModal();
        } else {
          showToast(t('settings.importInvalidToast'), 'error');
        }
      } catch (err) {
        console.error('Import exception:', err);
        showToast(t('settings.importInvalidToast'), 'error');
      } finally {
        setIsImporting(false);
      }
    }
  };

  const handlePruneConfirmed = async () => {
    setShowPruneConfirm(false);
    try {
      const res = await pruneColdRecords(90);
      showToast(t('settings.pruneSuccessToast', { count: res.prunedCount }), 'success');
      onDataChanged();
    } catch (err) {
      console.error('Prune failed:', err);
      showToast(t('settings.pruneFailToast'), 'error');
    }
  };
~~~~~
~~~~~typescript
  const handleImportFile = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      const file = target.files[0];
      try {
        setIsImporting(true);
        const text = await file.text();
        target.value = '';
        const success = await importAllData(text);
        if (success) {
          showToast(t('settings.importSuccessToast'), 'success');
          await onDataChanged();
          onCloseModal();
        } else {
          showToast(t('settings.importInvalidToast'), 'error');
        }
      } catch (err) {
        console.error('Import exception:', err);
        showToast(t('settings.importInvalidToast'), 'error');
      } finally {
        setIsImporting(false);
      }
    }
  };

  const handlePruneConfirmed = async () => {
    setShowPruneConfirm(false);
    try {
      const res = await pruneColdRecords(90);
      showToast(t('settings.pruneSuccessToast', { count: res.prunedCount }), 'success');
      await onDataChanged();
    } catch (err) {
      console.error('Prune failed:', err);
      showToast(t('settings.pruneFailToast'), 'error');
    }
  };
~~~~~

### 下一步建议
- 测试在「认知档案」页面中直接打开全局设置弹窗，执行「清空数据」或「还原备份」，关闭弹窗后验证热力图、掌握度指标及演进趋势图是否立即清空或展现导入数据。
- 确认在「探索大盘」和「训练计划」页面执行数据治理操作时，各卡片等级徽章与计划内容同步保持最新。
