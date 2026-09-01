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