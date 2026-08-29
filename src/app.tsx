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
