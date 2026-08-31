import { Sliders } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { useTranslation } from '../core/i18n';
import {
  type GlobalSettings,
  type UserSettings,
  loadSettings,
  saveSettings,
} from '../../storage/settings';
import { ModalShell } from '../common/ModalShell';
import type { ToastType } from '../common/Toast';
import { DataGovernanceSection } from '../settings/sections/DataGovernanceSection';
import { GeneralPreferencesSection } from '../settings/sections/GeneralPreferencesSection';
import { Button } from '../ui/button';

interface GlobalSettingsModalProps {
  settings?: UserSettings;
  onClose: () => void;
  onSave?: (newSettings: UserSettings) => void;
  onDataChanged: () => void;
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
  const [settings, setSettings] = useState<UserSettings>(() => externalSettings || loadSettings());

  useEffect(() => {
    if (externalSettings) {
      setSettings(externalSettings);
    }
  }, [externalSettings]);

  const handleUpdateGlobal = (patch: Partial<GlobalSettings>) => {
    const updated: UserSettings = {
      ...settings,
      global: {
        ...settings.global,
        ...patch,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onSave?.(updated);
    onDataChanged();
  };

  return (
    <ModalShell title={t('settings.title')} icon={Sliders} onClose={onClose} maxWidth="max-w-md">
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

      <div className="pt-2">
        <Button variant="default" onClick={onClose} className="w-full py-2.5 h-auto">
          {t('common.complete')}
        </Button>
      </div>
    </ModalShell>
  );
}
