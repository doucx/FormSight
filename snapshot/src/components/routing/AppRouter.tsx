import { useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import type { RouteLocation } from '../../hooks/useHashRoute';
import { getCardSettings } from '../../storage/settings';
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
import { CardAnalyticsView } from '../../views/CardAnalyticsView';
import { DiscoveryView } from '../../views/DiscoveryView';
import { GenericTrainingView } from '../../views/GenericTrainingView';
import { GlobalStatsView } from '../../views/GlobalStatsView';
import { HomeView } from '../../views/HomeView';
import { PlanEditorView } from '../../views/PlanEditorView';
import { PlanTrainingView } from '../../views/PlanTrainingView';
import { AppNavigation } from '../navigation/AppNavigation';

interface AppRouterProps {
  route: RouteLocation;
  navigate: (target: RouteLocation, options?: { replace?: boolean }) => void;
  lastHomeRoute: RouteLocation;
  onOpenCardSettings: (cardId: string) => void;
  onOpenGlobalSettings: () => void;
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
    const manifest = registry.getCardManifest(route.cardId);
    if (!activeCard || !manifest) {
      navigate(lastHomeRoute);
      return null;
    }
    const activeLevel = currentProfiles[activeCard.id]?.currentLevel || 5;

    return (
      <GenericTrainingView
        key={`${activeCard.id}-${route.sessionType}`}
        card={activeCard}
        manifest={manifest}
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
