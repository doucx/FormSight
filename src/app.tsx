import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { GlobalStatsModal } from './components/GlobalStatsModal';
import { SettingsModal } from './components/SettingsModal';
import { WeaknessAnalyticsModal } from './components/WeaknessAnalyticsModal';
import { ToastContainer, type ToastMessage, type ToastType } from './components/common/Toast';
import { getCardTitle, i18n, useTranslation } from './core/i18n';
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
import { PlanEditorView } from './views/PlanEditorView';
import { PlanTrainingView } from './views/PlanTrainingView';

export function App() {
  const { t } = useTranslation();
  const { route, navigate } = useHashRoute();
  const { todayStats, refreshTodayStats } = useTodayStats();
  const lastHomeRouteRef = useRef<RouteLocation>({ type: 'home' });

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isGlobalStatsOpen, setIsGlobalStatsOpen] = useState<boolean>(false);
  const [activeSettingsCardId, setActiveSettingsCardId] = useState<string | null>(null);
  const [activeAnalyticsCardId, setActiveAnalyticsCardId] = useState<string | null>(null);

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

  useEffect(() => {
    if (route.type === 'home') {
      lastHomeRouteRef.current = route;
      document.title = `${t('common.appName')} - ${t('common.appSubtitle')}`;
    } else if (route.type === 'plan-editor') {
      document.title = `${t('plan.editPlan')} - ${t('common.appName')}`;
    } else if (route.type === 'plan-train') {
      document.title = `${trainingPlan.name || t('plan.todayPlan')} - ${t('common.appName')}`;
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

  const activeSettingsCard = activeSettingsCardId
    ? registry.getCardById(activeSettingsCardId)
    : null;
  const activeAnalyticsCard = activeAnalyticsCardId
    ? registry.getCardById(activeAnalyticsCardId)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {route.type === 'home' && (
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
          onOpenCardSettings={(cardId) => setActiveSettingsCardId(cardId)}
          onOpenCardAnalytics={(cardId) => setActiveAnalyticsCardId(cardId)}
          onStartPlan={() => navigate({ type: 'plan-train' })}
          onOpenPlanEditor={() => navigate({ type: 'plan-editor' })}
          onSelectPlan={handleSelectPlanOnHome}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
          onOpenGlobalStats={() => setIsGlobalStatsOpen(true)}
        />
      )}

      {route.type === 'plan-editor' && (
        <PlanEditorView
          initialPlan={trainingPlan}
          onExit={() => navigate(lastHomeRouteRef.current)}
          onPlanListChanged={refreshProfiles}
          onSaveAndExit={(newPlan) => {
            saveTrainingPlan(newPlan);
            setTrainingPlan(newPlan);
            refreshProfiles();
            showToast(t('common.planUpdatedToast'), 'success');
            navigate(lastHomeRouteRef.current);
          }}
          onStartPlanDirectly={(newPlan) => {
            saveTrainingPlan(newPlan);
            setTrainingPlan(newPlan);
            refreshProfiles();
            navigate({ type: 'plan-train' });
          }}
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
                {t('common.syncingProfiles')}
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

      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          onClose={() => setIsGlobalSettingsOpen(false)}
          onDataChanged={refreshProfiles}
          showToast={showToast}
        />
      )}

      {isGlobalStatsOpen && <GlobalStatsModal onClose={() => setIsGlobalStatsOpen(false)} />}

      {activeSettingsCard && (
        <SettingsModal
          card={activeSettingsCard}
          settings={settings}
          onClose={() => setActiveSettingsCardId(null)}
          onSave={(newSettings) => setSettings(newSettings)}
        />
      )}

      {activeAnalyticsCard && (
        <WeaknessAnalyticsModal
          card={activeAnalyticsCard}
          onClose={() => setActiveAnalyticsCardId(null)}
        />
      )}
    </div>
  );
}
