import { RotateCcw, Sliders } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';
import {
  type GlobalSettings,
  type UserSettings,
  loadSettings,
  saveSettings,
} from '../../storage/settings';
import { resetGlobalSettingsAction } from '../../stores/settingsStore';
import { ModalShell } from '../common/ModalShell';
import type { ToastType } from '../common/Toast';
import { DataGovernanceSection } from '../settings/sections/DataGovernanceSection';
import { GeneralPreferencesSection } from '../settings/sections/GeneralPreferencesSection';
import { Button } from '../ui/button';

interface GlobalSettingsModalProps {
  settings?: UserSettings;
  onClose: () => void;
  onSave?: (newSettings: UserSettings) => void;
  onDataChanged: () => Promise<void> | void;
  showToast: (msg: string, type?: ToastType) => void;
}

export function GlobalSettingsModal({
  settings: externalSettings,
  onClose,
  onSave,
  onDataChanged,
  showToast,
}: GlobalSettingsModalProps) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<UserSettings>(
    () =>
      externalSettings || {
        global: {
          locale: 'zh-CN',
          idleTimeout: 60,
          soundEnabled: true,
          sliderHitMargin: 12,
          showCanvasHints: true,
        },
        cards: {},
      },
  );

  useEffect(() => {
    if (externalSettings) {
      setSettings(externalSettings);
    } else {
      loadSettings().then((s) => setSettings(s));
    }
  }, [externalSettings]);

  const handleUpdateGlobal = async (patch: Partial<GlobalSettings>) => {
    const updated: UserSettings = {
      ...settings,
      global: {
        ...settings.global,
        ...patch,
      },
    };
    await saveSettings(updated);
    setSettings(updated);
    onSave?.(updated);
    onDataChanged();
  };

  const handleResetGlobal = async () => {
    const next = await resetGlobalSettingsAction();
    setSettings(next);
    onSave?.(next);
    onDataChanged();
    showToast(t('common.resetSuccessToast'), 'success');
  };

  return (
    <ModalShell
      title={t('settings.title')}
      icon={Sliders}
      onClose={onClose}
      maxWidth="max-w-md"
      headerAction={
        <Button
          variant="ghost"
          size="iconSm"
          onClick={handleResetGlobal}
          title={t('common.resetToDefault')}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      }
      footer={
        <Button variant="default" onClick={onClose} className="w-full py-2.5 h-auto rounded-2xl">
          {t('common.complete')}
        </Button>
      }
    >
      <GeneralPreferencesSection
        settings={settings}
        onUpdateGlobal={handleUpdateGlobal}
        showToast={showToast}
      />

      <DataGovernanceSection
        onDataChanged={onDataChanged}
        onCloseModal={onClose}
        showToast={showToast}
      />
    </ModalShell>
  );
}
