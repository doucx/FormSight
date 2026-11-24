import { useEffect, useState } from 'preact/hooks';
import enUSGlobal from '../locales/en-US.json';
import zhCNGlobal from '../locales/zh-CN.json';

export type LocaleDictionary = Record<string, unknown>;
type TemplateParams = Record<string, string | number>;

function interpolate(text: string, params?: TemplateParams): string {
  if (!params) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, match) => String(params[match] ?? `{{${match}}}`));
}

function getSavedLocale(): string {
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

  /** 核心翻译查表方法，支持深层路径解析与模板插值 */
  public t = (key: string, params?: TemplateParams): string => {
    const result = this.lookup(key);
    if (typeof result !== 'string') return key;
    return interpolate(result, params);
  };

  /** 数组型词典（如月份名称）查表；未命中或非数组时返回 undefined，由调用方兜底 */
  public tArray = (key: string, params?: TemplateParams): string[] | undefined => {
    const result = this.lookup(key);
    if (!Array.isArray(result)) return undefined;
    return result.map((item) =>
      typeof item === 'string' ? interpolate(item, params) : String(item),
    );
  };

  private lookup(key: string): unknown {
    return (
      this.resolvePath(this.dictionaries[this.currentLocale], key) ??
      this.resolvePath(this.dictionaries[this.fallbackLocale], key)
    );
  }

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
    tArray: i18n.tArray,
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
export type ScopedTranslator = (key: string, params?: TemplateParams) => string;

/**
 * 为非 React 组件（纯函数、Canvas 渲染、计算模块）提供带卡片作用域的翻译器
 */
export function createScopedTranslator(cardId: string): ScopedTranslator {
  return (key, params) => {
    const isExplicitGlobal =
      key.startsWith('cards.') ||
      key.startsWith('common.') ||
      key.startsWith('global.') ||
      key.startsWith('tags.') ||
      key.startsWith('nav.') ||
      key.startsWith('stats.') ||
      key.startsWith('plan.') ||
      key.startsWith('home.');

    if (isExplicitGlobal) {
      return i18n.t(key, params);
    }

    const cardKey = `cards.${cardId}.${key.replace(/^\./, '')}`;
    const result = i18n.t(cardKey, params);

    if (result === cardKey) {
      return i18n.t(key, params);
    }

    return result;
  };
}

export function useCardTranslation(cardId: string) {
  const { locale, setLocale } = useTranslation();
  const cardT = createScopedTranslator(cardId);
  return { t: cardT, locale, setLocale };
}
