import { useEffect, useState } from 'preact/hooks';
import enUSGlobal from '../locales/en-US.json';
import zhCNGlobal from '../locales/zh-CN.json';

export type LocaleDictionary = Record<string, unknown>;

function getSavedLocale(): string {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return 'zh-CN';
  }
  try {
    const raw = localStorage.getItem('formsight_user_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.global?.locale) {
        return parsed.global.locale;
      }
    }
  } catch {}
  return 'zh-CN';
}

class I18nManager {
  private currentLocale = 'zh-CN';
  private fallbackLocale = 'zh-CN';
  private dictionaries: Record<string, LocaleDictionary> = {};
  private listeners = new Set<(locale: string) => void>();

  constructor() {
    this.currentLocale = getSavedLocale();
    this.registerGlobalLocales({
      'zh-CN': zhCNGlobal as LocaleDictionary,
      'en-US': enUSGlobal as LocaleDictionary,
    });
  }

  public init(initialLocale?: string): void {
    if (initialLocale) {
      this.setLocale(initialLocale);
    } else {
      const saved = getSavedLocale();
      if (saved && saved !== this.currentLocale) {
        this.setLocale(saved);
      }
    }
  }

  public setLocale(locale: string): void {
    if (this.currentLocale !== locale) {
      this.currentLocale = locale;
      for (const listener of this.listeners) {
        listener(locale);
      }
    }
  }

  public getLocale(): string {
    return this.currentLocale;
  }

  public subscribe(listener: (locale: string) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** 注册全局系统级词典 */
  public registerGlobalLocales(locales: Record<string, LocaleDictionary>): void {
    for (const [lang, dict] of Object.entries(locales)) {
      if (!this.dictionaries[lang]) {
        this.dictionaries[lang] = {};
      }
      Object.assign(this.dictionaries[lang], dict);
    }
  }

  /** 由 Registry 在自动扫描 Pack 时调用，将 Pack 私有词典挂载至 `packs.<packId>` 命名空间 */
  public registerPackLocales(packId: string, locales: Record<string, LocaleDictionary>): void {
    for (const [lang, dict] of Object.entries(locales)) {
      if (!this.dictionaries[lang]) {
        this.dictionaries[lang] = {};
      }
      const root = this.dictionaries[lang];
      if (!root.packs || typeof root.packs !== 'object') {
        root.packs = {};
      }
      (root.packs as Record<string, unknown>)[packId] = dict;
    }
  }

  /** 由 Registry 在扫描 CardManifest 时调用，将 Card 私有词典挂载至 `cards.<cardId>` 命名空间 */
  public registerCardLocales(cardId: string, locales: Record<string, LocaleDictionary>): void {
    for (const [lang, dict] of Object.entries(locales)) {
      if (!this.dictionaries[lang]) {
        this.dictionaries[lang] = {};
      }
      const root = this.dictionaries[lang];
      if (!root.cards || typeof root.cards !== 'object') {
        root.cards = {};
      }
      (root.cards as Record<string, unknown>)[cardId] = dict;
    }
  }

  /** 核心翻译查表方法，支持深层路径解析、数组透传与模板插值 */
  public t = <T = string>(key: string, params?: Record<string, string | number>): T => {
    const activeDict =
      this.dictionaries[this.currentLocale] || this.dictionaries[this.fallbackLocale] || {};
    const result =
      this.resolvePath(activeDict, key) ??
      this.resolvePath(this.dictionaries[this.fallbackLocale], key);

    if (Array.isArray(result)) {
      if (!params) return result as unknown as T;
      return result.map((item) =>
        typeof item === 'string'
          ? item.replace(/\{\{(\w+)\}\}/g, (_, match) => String(params[match] ?? `{{${match}}}`))
          : item,
      ) as unknown as T;
    }

    if (typeof result !== 'string') {
      return key as unknown as T;
    }

    if (!params) return result as unknown as T;
    return result.replace(/\{\{(\w+)\}\}/g, (_, match) =>
      String(params[match] ?? `{{${match}}}`),
    ) as unknown as T;
  };

  private resolvePath(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== 'object') return undefined;
    return path.split('.').reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object' && part in acc) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
  }
}

export const i18n = new I18nManager();

export function useTranslation() {
  const [currentLocale, setCurrentLocale] = useState<string>(() => i18n.getLocale());

  useEffect(() => {
    return i18n.subscribe((newLocale) => {
      setCurrentLocale(newLocale);
    });
  }, []);

  return {
    t: i18n.t,
    locale: currentLocale,
    setLocale: (locale: string) => i18n.setLocale(locale),
  };
}

/**
 * 通用：解析卡片标题多语言回退 (优先卡片级词典 -> Pack词典 -> 静态默认值)
 */
export function getCardTitle(
  card: { id: string; packId?: string; title?: string },
  t = i18n.t,
): string {
  // 1. 优先从 Card 命名空间查询
  const cardKey = `cards.${card.id}.title`;
  const cardTitle = t(cardKey);
  if (cardTitle !== cardKey) return cardTitle;

  // 2. 回退从 legacy Pack 命名空间查询
  const packId = card.packId || 'core';
  const legacyPackKey = `packs.${packId}.cards.${card.id}.title`;
  const legacyTitle = t(legacyPackKey);
  if (legacyTitle !== legacyPackKey) return legacyTitle;

  // 3. 最终回退至静态字段或 ID
  return card.title || card.id;
}

/**
 * 通用：解析卡片玩法要领多语言回退 (优先卡片级词典 -> Pack词典 -> 静态字段 -> 描述)
 */
export function getCardInstruction(
  card: { id: string; packId?: string; instruction?: string; desc?: string },
  t = i18n.t,
): string {
  // 1. 优先从 Card 命名空间查询
  const cardKey = `cards.${card.id}.instruction`;
  const cardInst = t(cardKey);
  if (cardInst !== cardKey) return cardInst;

  // 2. 回退从 legacy Pack 命名空间查询
  const packId = card.packId || 'core';
  const legacyPackKey = `packs.${packId}.cards.${card.id}.instruction`;
  const legacyInst = t(legacyPackKey);
  if (legacyInst !== legacyPackKey) return legacyInst;

  // 3. 回退至静态字段
  if (card.instruction) return card.instruction;

  // 4. 最终回退至描述
  return getCardDesc(card, t);
}

/**
 * 通用：解析卡片描述多语言回退 (优先卡片级词典 -> Pack词典 -> 静态默认值)
 */
export function getCardDesc(
  card: { id: string; packId?: string; desc?: string },
  t = i18n.t,
): string {
  // 1. 优先从 Card 命名空间查询
  const cardKey = `cards.${card.id}.desc`;
  const cardDesc = t(cardKey);
  if (cardDesc !== cardKey) return cardDesc;

  // 2. 回退从 legacy Pack 命名空间查询
  const packId = card.packId || 'core';
  const legacyPackKey = `packs.${packId}.cards.${card.id}.desc`;
  const legacyDesc = t(legacyPackKey);
  if (legacyDesc !== legacyPackKey) return legacyDesc;

  // 3. 最终回退至静态字段
  return card.desc || '';
}

/**
 * 通用：解析扩展包标题多语言回退
 */
export function getPackTitle(
  pack: { packId: string; meta?: { title?: string } },
  t = i18n.t,
): string {
  const key = `packs.${pack.packId}.meta.title`;
  const translated = t(key);
  return translated !== key ? translated : pack.meta?.title || pack.packId;
}
