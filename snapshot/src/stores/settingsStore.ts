import { computed, signal } from '@preact/signals';
import { applyThemeToDocument } from '../hooks/useTheme';
import {
  type BaseModuleSettings,
  DEFAULT_BASE_SETTINGS,
  DEFAULT_SETTINGS,
  type ThemeMode,
  type UserSettings,
  loadSettings as loadSettingsFromDB,
  saveSettings as saveSettingsToDB,
} from '../storage/settings';

export const $settings = signal<UserSettings>(DEFAULT_SETTINGS);

export const $currentTheme = computed<ThemeMode>(() => $settings.value.global.theme || 'system');
export const $currentLocale = computed<string>(() => $settings.value.global.locale || 'zh-CN');

export async function initSettingsStore(): Promise<UserSettings> {
  const loaded = await loadSettingsFromDB();
  $settings.value = loaded;
  applyThemeToDocument(loaded.global.theme);
  return loaded;
}

export async function updateGlobalSettings(
  patch: Partial<UserSettings['global']>,
): Promise<UserSettings> {
  const next: UserSettings = {
    ...$settings.value,
    global: {
      ...$settings.value.global,
      ...patch,
    },
  };
  $settings.value = next;
  if (patch.theme) {
    applyThemeToDocument(patch.theme);
  }
  await saveSettingsToDB(next);
  return next;
}

export async function updateCardSettings(
  cardId: string,
  patch: Partial<BaseModuleSettings> | Record<string, unknown>,
): Promise<UserSettings> {
  const currentCard = $settings.value.cards[cardId] || DEFAULT_BASE_SETTINGS;
  const next: UserSettings = {
    ...$settings.value,
    cards: {
      ...$settings.value.cards,
      [cardId]: {
        ...currentCard,
        ...patch,
      } as BaseModuleSettings,
    },
  };
  $settings.value = next;
  await saveSettingsToDB(next);
  return next;
}