import { useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import type { RouteLocation } from '../../hooks/useHashRoute';
import type { UnifiedProfileData } from '../../storage/db/schema';
import { saveTrainingPlan } from '../../storage/planStorage';
import { type UserSettings, getCardSettings } from '../../storage/settings';
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
        <HomeView
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
