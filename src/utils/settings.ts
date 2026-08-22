import { registry } from '../core/registry';

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

// 动态根据注册表中的卡片定义构建初始默认配置
function buildDefaultCardSettings(): Record<string, BaseModuleSettings> {
  const cards: Record<string, BaseModuleSettings> = {};
  const allCards = registry.getAllCards();

  for (const card of allCards) {
    const cardConfig: BaseModuleSettings = { ...DEFAULT_BASE_SETTINGS };

    // 如果卡片包含滑块交互，配置默认容错与外延感应
    if (card.tags?.interaction?.includes('continuous_slider')) {
      cardConfig.sliderHitMargin = 12;
      cardConfig.showToleranceBand = true;
    }

    if (card.packId === 'star') {
      cardConfig.gridSize = 3;
      cardConfig.targetingMode = 'off';
      cardConfig.manualTargetSectors = [];
    } else if (card.id === 'color_hue') {
      cardConfig.enableHoverColorPreview = true;
      cardConfig.targetingMode = 'off';
      cardConfig.manualTargetSectors = [];
    } else if (card.id === 'color_all') {
      cardConfig.enableHoverColorPreview = true;
    }

    cards[card.id] = cardConfig;
  }

  return cards;
}

export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    idleTimeout: 60,
    soundEnabled: true,
    sliderHitMargin: 12,
    showCanvasHints: true,
    showExperimentalCards: false,
  },
  cards: buildDefaultCardSettings(),
};

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_SETTINGS;

    const defaultCards = buildDefaultCardSettings();
    const cards: Record<string, BaseModuleSettings> = { ...defaultCards };

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
