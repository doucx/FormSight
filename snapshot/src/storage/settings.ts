import { registry } from '../core/registry';
import { getDB } from './db/schema';

export type StepGranularity = 'standard' | 'fine';
export type AdaptiveMode = 'block' | 'staircase';
export type TargetingMode = 'off' | 'manual';
export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

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
  locale: string;
  theme?: ThemeMode;
  idleTimeout: number;
  soundEnabled: boolean;
  sliderHitMargin: number;
  showCanvasHints?: boolean;
}

export interface UserSettings {
  global: GlobalSettings;
  cards: Record<string, BaseModuleSettings>;
}

export const DEFAULT_BASE_SETTINGS: BaseModuleSettings = {
  autoNext: true,
  autoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
};

/**
 * 纯粹基于 SystemDomainRegistry 中的卡片与 Pack 声明式定义聚合初始默认配置
 */
export function buildDefaultCardSettings(): Record<string, BaseModuleSettings> {
  const cards: Record<string, BaseModuleSettings> = {};
  if (!registry || typeof registry.getAllCards !== 'function') {
    return cards;
  }

  const allCards = registry.getAllCards();

  for (const card of allCards) {
    const manifest = registry.getCardManifest?.(card.id);
    const cardDefaults = manifest?.defaultSettings || card.defaultSettings || {};

    const cardConfig: BaseModuleSettings = {
      ...DEFAULT_BASE_SETTINGS,
      ...cardDefaults,
    };

    if (card.tags?.interaction?.includes('continuous_mod')) {
      if (cardConfig.sliderHitMargin === undefined) {
        cardConfig.sliderHitMargin = 12;
      }
      if (cardConfig.showToleranceBand === undefined) {
        cardConfig.showToleranceBand = true;
      }
    }

    cards[card.id] = cardConfig;
  }

  return cards;
}

export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    locale: 'zh-CN',
    theme: 'system',
    idleTimeout: 60,
    soundEnabled: true,
    sliderHitMargin: 12,
    showCanvasHints: true,
  },
  get cards() {
    return buildDefaultCardSettings();
  },
  set cards(v) {
    Object.defineProperty(this, 'cards', {
      value: v,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  },
};

/** 内存中的设置单例缓存，保障同步读取性能与响应即时性 */
let cachedSettings: UserSettings = {
  global: { ...DEFAULT_SETTINGS.global },
  cards: buildDefaultCardSettings(),
};

/**
 * 极简启动旁路缓存读写（仅用于 HTML 首屏防白屏闪烁）
 */
function syncBypassCache(settings: UserSettings): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    if (settings.global.theme) {
      localStorage.setItem('formsight_theme_cache', settings.global.theme);
    }
    if (settings.global.locale) {
      localStorage.setItem('formsight_locale_cache', settings.global.locale);
    }
  } catch {}
}

export function getCachedBypassTheme(): ThemeMode {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return 'system';
  try {
    const t = localStorage.getItem('formsight_theme_cache');
    if (t === 'light' || t === 'dark' || t === 'system') return t;
  } catch {}
  return 'system';
}

export function getCachedBypassLocale(): string {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return 'zh-CN';
  try {
    const l = localStorage.getItem('formsight_locale_cache');
    if (l) return l;
  } catch {}
  return 'zh-CN';
}

/**
 * 从 IndexedDB 异步加载全局设置并更新内存缓存
 */
export async function loadSettings(): Promise<UserSettings> {
  try {
    const db = await getDB();
    const stored = await db.get('app_settings', 'global_settings');
    const defaultCards = buildDefaultCardSettings();

    if (!stored) {
      const initialSettings: UserSettings = {
        global: { ...DEFAULT_SETTINGS.global, locale: getCachedBypassLocale(), theme: getCachedBypassTheme() },
        cards: defaultCards,
      };
      cachedSettings = initialSettings;
      await db.put('app_settings', initialSettings, 'global_settings');
      syncBypassCache(initialSettings);
      return initialSettings;
    }

    const mergedCards: Record<string, BaseModuleSettings> = { ...defaultCards };
    if (stored.cards && typeof stored.cards === 'object') {
      for (const [cardId, val] of Object.entries(stored.cards)) {
        mergedCards[cardId] = {
          ...(mergedCards[cardId] || DEFAULT_BASE_SETTINGS),
          ...(val as Record<string, unknown>),
        };
      }
    }

    const resolvedSettings: UserSettings = {
      global: { ...DEFAULT_SETTINGS.global, ...(stored.global || {}) },
      cards: mergedCards,
    };

    cachedSettings = resolvedSettings;
    syncBypassCache(resolvedSettings);
    return resolvedSettings;
  } catch (e) {
    console.error('Failed to load user settings from IndexedDB, using fallback:', e);
    return cachedSettings;
  }
}

/** 同步读取当前内存已加载的设置 */
export function getSettingsSnapshot(): UserSettings {
  return cachedSettings;
}

/**
 * 异步保存设置到 IndexedDB，同时更新内存与旁路缓存
 */
export async function saveSettings(settings: UserSettings): Promise<void> {
  cachedSettings = settings;
  syncBypassCache(settings);
  try {
    const db = await getDB();
    await db.put('app_settings', settings, 'global_settings');
  } catch (e) {
    console.error('Failed to save user settings to IndexedDB:', e);
  }
}

export function getCardSettings(settings: UserSettings, cardId: string): BaseModuleSettings {
  return settings.cards[cardId] || DEFAULT_SETTINGS.cards[cardId] || DEFAULT_BASE_SETTINGS;
}