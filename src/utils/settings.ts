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
  [key: string]: unknown;
}

export interface StarSettings extends BaseModuleSettings {
  gridSize?: number;
  targetingMode?: TargetingMode;
  manualTargetSectors?: number[];
}

export interface ColorSenseSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
  enableHoverColorPreview?: boolean;
  targetingMode?: TargetingMode;
  manualTargetSectors?: number[];
}

export interface RelativeColorSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
  enableHoverColorPreview?: boolean;
}

export interface NegativeSpaceSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
}

export interface AbstractionSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
}

export interface GlobalSettings {
  idleTimeout: number;
  soundEnabled: boolean;
  sliderHitMargin: number;
  showCanvasHints?: boolean;
  showExperimentalCards?: boolean;
}

export interface UserSettings {
  global: GlobalSettings;
  cards: Record<string, BaseModuleSettings>;
}

const SETTINGS_KEY = 'formsight_user_settings';

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
    sliderHitMargin: 12,
    showCanvasHints: true,
    showExperimentalCards: false,
  },
  cards: {
    angle_estimation: {
      ...DEFAULT_BASE_SETTINGS,
      sliderHitMargin: 12,
      showToleranceBand: true,
    },
    angle_comparison_2afc: { ...DEFAULT_BASE_SETTINGS },
    angle_parallel_2afc: { ...DEFAULT_BASE_SETTINGS },
    star_single: {
      ...DEFAULT_BASE_SETTINGS,
      gridSize: 3,
      targetingMode: 'off',
      manualTargetSectors: [],
    },
    star_double_h: {
      ...DEFAULT_BASE_SETTINGS,
      gridSize: 3,
      targetingMode: 'off',
      manualTargetSectors: [],
    },
    star_double_r: {
      ...DEFAULT_BASE_SETTINGS,
      gridSize: 3,
      targetingMode: 'off',
      manualTargetSectors: [],
    },
    color_hue: {
      ...DEFAULT_BASE_SETTINGS,
      sliderHitMargin: 12,
      showToleranceBand: true,
      enableHoverColorPreview: true,
      targetingMode: 'off',
      manualTargetSectors: [],
    },
    color_val: { ...DEFAULT_BASE_SETTINGS, sliderHitMargin: 12, showToleranceBand: true },
    color_sat: { ...DEFAULT_BASE_SETTINGS, sliderHitMargin: 12, showToleranceBand: true },
    color_all: {
      ...DEFAULT_BASE_SETTINGS,
      sliderHitMargin: 12,
      showToleranceBand: true,
      enableHoverColorPreview: true,
    },
    rel_vector_shift: { ...DEFAULT_BASE_SETTINGS, sliderHitMargin: 12, showToleranceBand: true },
    rel_lightness_induction: {
      ...DEFAULT_BASE_SETTINGS,
      sliderHitMargin: 12,
      showToleranceBand: true,
    },
    rel_hue_induction: { ...DEFAULT_BASE_SETTINGS, sliderHitMargin: 12, showToleranceBand: true },
    rel_decontextual_2afc: { ...DEFAULT_BASE_SETTINGS },
    neg_ratio_estimation: {
      ...DEFAULT_BASE_SETTINGS,
      sliderHitMargin: 12,
      showToleranceBand: true,
    },
    neg_area_comparison_2afc: { ...DEFAULT_BASE_SETTINGS },
    neg_vertex_fitting: { ...DEFAULT_BASE_SETTINGS },
    neg_shape_match_2afc: { ...DEFAULT_BASE_SETTINGS },
    abs_gesture_axis: { ...DEFAULT_BASE_SETTINGS, sliderHitMargin: 12, showToleranceBand: true },
    abs_polygon_decimation: { ...DEFAULT_BASE_SETTINGS },
    abs_notan_threshold: { ...DEFAULT_BASE_SETTINGS, sliderHitMargin: 12, showToleranceBand: true },
    abs_palette_clustering: { ...DEFAULT_BASE_SETTINGS },
    abs_td_gesture_2afc: { ...DEFAULT_BASE_SETTINGS },
    abs_td_hull_2afc: { ...DEFAULT_BASE_SETTINGS },
    abs_td_notan_2afc: { ...DEFAULT_BASE_SETTINGS },
    abs_td_palette_2afc: { ...DEFAULT_BASE_SETTINGS },
  },
};

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_SETTINGS;

    const cards: Record<string, BaseModuleSettings> = { ...DEFAULT_SETTINGS.cards };

    if (parsed.cards && typeof parsed.cards === 'object') {
      for (const [cardId, val] of Object.entries(parsed.cards)) {
        cards[cardId] = {
          ...(cards[cardId] || DEFAULT_BASE_SETTINGS),
          ...(val as Record<string, unknown>),
        };
      }
    }

    return {
      global: { ...DEFAULT_SETTINGS.global, ...(parsed.global || {}) },
      cards,
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

export function getCardSettings(settings: UserSettings, cardId: string): BaseModuleSettings {
  return settings.cards[cardId] || DEFAULT_SETTINGS.cards[cardId] || DEFAULT_BASE_SETTINGS;
}
