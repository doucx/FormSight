export type StepGranularity = 'standard' | 'fine';

export interface UserSettings {
  autoNext: boolean;            // 点击后是否自动翻页
  autoNextDelay: number;       // 自动翻页延迟 (ms)
  stepGranularity: StepGranularity; // 步长粒度 ('standard': 默认阶梯, 'fine': 1px逐级)
}

const SETTINGS_KEY = 'star_hopping_user_settings';

export const DEFAULT_SETTINGS: UserSettings = {
  autoNext: true,
  autoNextDelay: 500,
  stepGranularity: 'standard',
};

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load user settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save user settings:', e);
  }
}