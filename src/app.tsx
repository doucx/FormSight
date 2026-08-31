import { useState } from 'preact/hooks';
import { ToastContainer } from './components/common/Toast';
import { GlobalSettingsModal } from './components/modals/GlobalSettingsModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { AppRouter } from './components/routing/AppRouter';
import { registry } from './core/registry';
import { useAppBootstrap } from './hooks/useAppBootstrap';
import { useHashRoute } from './hooks/useHashRoute';
import { useTheme } from './hooks/useTheme';
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

  // 挂载夜间模式全局响应与监听
  useTheme(settings);

  const activeSettingsCard = activeSettingsCardId
    ? registry.getCardById(activeSettingsCardId)
    : null;

  return (
    <div className="min-h-screen bg-background dark:bg-background text-foreground antialiased transition-colors duration-200">
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
          settings={settings}
          onClose={() => setIsGlobalSettingsOpen(false)}
          onSave={(newSettings) => setSettings(newSettings)}
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
