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

  /** 由 Registry 在自动扫描独立 Card 时调用，将 Card 私有词典挂载至 `cards.<cardId>` 命名空间 */
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
 * 通用：解析卡片标题多语言 (优先 cards.<cardId>.title)
 */
export function getCardTitle(card: { id: string; title?: string }, t = i18n.t): string {
  const cardKey = `cards.${card.id}.title`;
  const translatedCard = t(cardKey);
  return translatedCard !== cardKey ? translatedCard : card.title || card.id;
}

/**
 * 通用：解析卡片描述多语言 (优先 cards.<cardId>.desc)
 */
export function getCardDesc(card: { id: string; desc?: string }, t = i18n.t): string {
  const cardKey = `cards.${card.id}.desc`;
  const translatedCard = t(cardKey);
  return translatedCard !== cardKey ? translatedCard : card.desc || '';
}

/**
 * 卡片局部翻译 Hook，优先查找 `cards.<cardId>.<key>`，未命中时自动回退到全局词典
 */
export function useCardTranslation(cardId: string) {
  const { t: baseT, locale, setLocale } = useTranslation();

  const cardT = <T = string>(key: string, params?: Record<string, string | number>): T => {
    const isExplicitGlobal =
      key.startsWith('cards.') ||
      key.startsWith('common.') ||
      key.startsWith('global.') ||
      key.startsWith('tags.') ||
      key.startsWith('nav.') ||
      key.startsWith('settings.') ||
      key.startsWith('stats.') ||
      key.startsWith('plan.') ||
      key.startsWith('home.');

    if (isExplicitGlobal) {
      return baseT<T>(key, params);
    }

    const cardKey = `cards.${cardId}.${key.replace(/^\./, '')}`;
    const result = baseT<T>(cardKey, params);

    // 若未在卡片局部命名空间查找到（返回了原始拼装 key），回退尝试直接查全局
    if (typeof result === 'string' && result === cardKey) {
      return baseT<T>(key, params);
    }

    return result;
  };

  return { t: cardT, locale, setLocale };
}
