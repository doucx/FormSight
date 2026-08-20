import { migrateLegacySettings } from './db/migration';

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

export interface GlobalSettings {
  idleTimeout: number;
  soundEnabled: boolean;
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
  },
  cards: {
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
  },
};

export function loadSettings(): UserSettings {
  try {
    migrateLegacySettings();
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_SETTINGS;

    // 自动兼容并迁移旧版 domain 挂载的配置
    const cards: Record<string, BaseModuleSettings> = { ...DEFAULT_SETTINGS.cards };

    if (parsed.cards && typeof parsed.cards === 'object') {
      for (const [cardId, val] of Object.entries(parsed.cards)) {
        cards[cardId] = {
          ...(cards[cardId] || DEFAULT_BASE_SETTINGS),
          ...(val as Record<string, unknown>),
        };
      }
    } else {
      // 从旧结构（star/color/relative_color/negative_space）迁移到卡片
      if (parsed.star) {
        cards.star_single = { ...cards.star_single, ...parsed.star };
        cards.star_double_h = { ...cards.star_double_h, ...parsed.star };
        cards.star_double_r = { ...cards.star_double_r, ...parsed.star };
      }
      if (parsed.color) {
        cards.color_hue = { ...cards.color_hue, ...parsed.color };
        cards.color_val = { ...cards.color_val, ...parsed.color };
        cards.color_sat = { ...cards.color_sat, ...parsed.color };
        cards.color_all = { ...cards.color_all, ...parsed.color };
      }
      if (parsed.relative_color) {
        cards.rel_vector_shift = { ...cards.rel_vector_shift, ...parsed.relative_color };
        cards.rel_lightness_induction = {
          ...cards.rel_lightness_induction,
          ...parsed.relative_color,
        };
        cards.rel_hue_induction = { ...cards.rel_hue_induction, ...parsed.relative_color };
        cards.rel_decontextual_2afc = { ...cards.rel_decontextual_2afc, ...parsed.relative_color };
      }
      if (parsed.negative_space) {
        cards.neg_ratio_estimation = { ...cards.neg_ratio_estimation, ...parsed.negative_space };
        cards.neg_area_comparison_2afc = {
          ...cards.neg_area_comparison_2afc,
          ...parsed.negative_space,
        };
        cards.neg_vertex_fitting = { ...cards.neg_vertex_fitting, ...parsed.negative_space };
        cards.neg_shape_match_2afc = { ...cards.neg_shape_match_2afc, ...parsed.negative_space };
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
