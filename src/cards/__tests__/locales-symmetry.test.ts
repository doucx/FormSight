import { describe, expect, it } from 'vitest';
import {
  CHALLENGE_TAGS,
  DOMAIN_TAGS,
  FEATURE_TAGS,
  INTERACTION_TAGS,
  PATH_TAGS,
  STATUS_TAGS,
} from '../../config/tags';
import { i18n } from '../../core/i18n';
import enUSGlobal from '../../locales/en-US.json';
import zhCNGlobal from '../../locales/zh-CN.json';

/**
 * locale 递归对称与标签封闭契约（G1-10 / docs/architecture.md §4）
 *
 * 既有 locales-schema 测试只比较顶层 key；嵌套层级缺失时仍会静默回退原文。
 * 新标签值必须同时改 types、config/tags 与两份 locale，这里把该约束钉死。
 */

type Dict = Record<string, unknown>;

function flattenKeys(obj: unknown, prefix = '', out = new Set<string>()): Set<string> {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return out;

  for (const [key, value] of Object.entries(obj as Dict)) {
    const path = prefix ? `${prefix}.${key}` : key;
    out.add(path);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenKeys(value, path, out);
    }
  }
  return out;
}

function expectSymmetric(zh: Dict, en: Dict, label: string): void {
  const zhKeys = [...flattenKeys(zh)].sort();
  const enKeys = [...flattenKeys(en)].sort();

  expect(zhKeys, `${label} zh/en key mismatch`).toEqual(enKeys);
}

const cardLocaleModules = import.meta.glob<{ default: Dict }>('../*/locales/*.json', {
  eager: true,
});

interface CardLocales {
  'zh-CN.json'?: Dict;
  'en-US.json'?: Dict;
}

const cardLocales = new Map<string, CardLocales>();

for (const [modulePath, mod] of Object.entries(cardLocaleModules)) {
  const match = modulePath.match(/^\.\.\/([^/]+)\/locales\/([^/]+)\.json$/);
  if (!match) continue;

  const [, cardId, fileName] = match;
  const entry = cardLocales.get(cardId) ?? {};
  entry[`${fileName}.json` as keyof CardLocales] = mod.default;
  cardLocales.set(cardId, entry);
}

const TAG_GROUPS = {
  domains: DOMAIN_TAGS,
  paths: PATH_TAGS,
  challenges: CHALLENGE_TAGS,
  interactions: INTERACTION_TAGS,
  statuses: STATUS_TAGS,
  features: FEATURE_TAGS,
} as const;

describe('全局 locale 递归对称 (G1-10)', () => {
  it('zh-CN 与 en-US 的嵌套 key 集完全一致', () => {
    expectSymmetric(zhCNGlobal as Dict, enUSGlobal as Dict, 'global');
  });

  it('所有叶子值为非空字符串或字符串数组', () => {
    for (const dict of [zhCNGlobal as Dict, enUSGlobal as Dict]) {
      for (const [key, value] of Object.entries(dict)) {
        if (typeof value === 'string') expect(value.trim(), key).not.toBe('');
        if (Array.isArray(value)) {
          expect(value.length, key).toBeGreaterThan(0);
          expect(
            value.every((item) => typeof item === 'string' && item.trim() !== ''),
            key,
          ).toBe(true);
        }
      }
    }
  });
});

describe('卡片 locale 递归对称 (G1-10)', () => {
  const cardIds = [...cardLocales.keys()].sort();

  it('发现全部卡片语言包', () => {
    expect(cardIds.length).toBeGreaterThan(0);
  });

  for (const cardId of cardIds) {
    it(`card: ${cardId} 的 zh-CN 与 en-US 嵌套 key 一致`, () => {
      const locales = cardLocales.get(cardId);
      expect(locales?.['zh-CN.json']).toBeTypeOf('object');
      expect(locales?.['en-US.json']).toBeTypeOf('object');

      expectSymmetric(locales?.['zh-CN.json'] ?? {}, locales?.['en-US.json'] ?? {}, cardId);
    });

    it(`card: ${cardId} 不残留 views/labels 嵌套层级`, () => {
      const locales = cardLocales.get(cardId) ?? {};
      for (const dict of [locales['zh-CN.json'], locales['en-US.json']]) {
        expect(dict?.views).toBeUndefined();
        expect(dict?.labels).toBeUndefined();
      }
    });
  }
});

describe('标签 i18nKey 在两种语言下均可解析 (G1-10)', () => {
  const originalLocale = i18n.getLocale();

  for (const [groupName, group] of Object.entries(TAG_GROUPS)) {
    for (const [tagId, meta] of Object.entries(group)) {
      it(`${groupName}.${tagId} 可解析且非空`, () => {
        try {
          for (const locale of ['zh-CN', 'en-US']) {
            i18n.setLocale(locale);
            const translated = i18n.t(meta.i18nKey);
            expect(translated, `${locale}:${meta.i18nKey}`).not.toBe(meta.i18nKey);
            expect(translated.trim()).not.toBe('');
          }
        } finally {
          i18n.setLocale(originalLocale);
        }
      });
    }
  }
});
