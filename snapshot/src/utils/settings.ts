export type StepGranularity = 'standard' | 'fine';
export type AdaptiveMode = 'block' | 'staircase';
export type TargetingMode = 'off' | 'manual';

export interface BaseModuleSettings {
  autoNext: boolean;
  autoNextDelay: number;
  stepGranularity: StepGranularity;
  adaptiveMode: AdaptiveMode;
  targetAccuracy: number;
  blockSize: number;
}

export interface StarSettings extends BaseModuleSettings {
  gridSize: number;
  targetingMode: TargetingMode;
  manualTargetSectors: number[];
}

export interface ColorSenseSettings extends BaseModuleSettings {
  sliderHitMargin: number;
  showToleranceBand: boolean;
  enableHoverColorPreview: boolean;
  targetingMode: TargetingMode;
  manualTargetSectors: number[];
}

export interface RelativeColorSettings extends BaseModuleSettings {
  sliderHitMargin: number;
  showToleranceBand: boolean;
  enableHoverColorPreview: boolean;
}

export interface NegativeSpaceSettings extends BaseModuleSettings {
  sliderHitMargin: number;
  showToleranceBand: boolean;
}

export interface GlobalSettings {
  idleTimeout: number;
  soundEnabled: boolean;
}

export interface UserSettings {
  global: GlobalSettings;
  star: StarSettings;
  color: ColorSenseSettings;
  relative_color: RelativeColorSettings;
  negative_space: NegativeSpaceSettings;
}

const SETTINGS_KEY = 'star_hopping_user_settings';

export const DEFAULT_BASE_SETTINGS: BaseModuleSettings = {
  autoNext: true,
  autoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
};

export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    idleTimeout: 60,
    soundEnabled: true,
  },
  star: {
    ...DEFAULT_BASE_SETTINGS,
    gridSize: 3,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  color: {
    ...DEFAULT_BASE_SETTINGS,
    sliderHitMargin: 12,
    showToleranceBand: true,
    enableHoverColorPreview: true,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  relative_color: {
    ...DEFAULT_BASE_SETTINGS,
    sliderHitMargin: 12,
    showToleranceBand: true,
    enableHoverColorPreview: true,
  },
  negative_space: {
    ...DEFAULT_BASE_SETTINGS,
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
};

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_SETTINGS;

    return {
      global: { ...DEFAULT_SETTINGS.global, ...(parsed.global || {}) },
      star: { ...DEFAULT_SETTINGS.star, ...(parsed.star || {}) },
      color: { ...DEFAULT_SETTINGS.color, ...(parsed.color || {}) },
      relative_color: { ...DEFAULT_SETTINGS.relative_color, ...(parsed.relative_color || {}) },
      negative_space: { ...DEFAULT_SETTINGS.negative_space, ...(parsed.negative_space || {}) },
    };
  } catch (e) {
    console.error('Failed to load user settings, fallback to default:', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save user settings:', e);
  }
}
