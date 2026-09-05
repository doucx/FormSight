import { describe, expect, it } from 'vitest';

/**
 * 废弃别名与前缀黑名单：
 * 严禁在卡片私有词典中重新引入下列已被规范收敛或废弃的键名
 */
const FORBIDDEN_ALIAS_KEYS = [
  'areaHint',
  'ratioHint',
  'vertexHint',
  'instruction', // 全面废弃同义词；操作指引统一归口为 hint
  'taskHint', // 全面废弃同义词；操作指引统一归口为 hint
  'prompt', // 裸 prompt 废弃；题干标签统一使用 promptTitle，操作说明统一使用 hint
  'memoryStimulusHint',
  'memoryRecallHint',
];

type LocaleModule = { default?: Record<string, unknown> } | Record<string, unknown>;

// 基于 Vite 原生 import.meta.glob 收集所有卡片词典，无需依赖 Node.js 文件系统模块
const localeModules = import.meta.glob<LocaleModule>('../*/locales/*.json', {
  eager: true,
});

/**
 * 递归收集对象中的所有键名
 */
function getAllKeys(obj: unknown, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return [];
  }

  let keys: string[] = [];
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    keys.push(key);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(getAllKeys(value, fullPath));
    }
  }
  return keys;
}

interface CardLocales {
  [fileName: string]: Record<string, unknown>;
}

// 整理归类每个卡片的语言包内容
const cardLocalesMap: Record<string, CardLocales> = {};

for (const [modulePath, mod] of Object.entries(localeModules)) {
  const match = modulePath.match(/([^/]+)\/locales\/([^/]+)$/);
  if (!match) continue;

  const [, cardName, fileName] = match;
  if (!cardLocalesMap[cardName]) {
    cardLocalesMap[cardName] = {};
  }

  const raw = 'default' in mod && mod.default ? mod.default : mod;
  cardLocalesMap[cardName][fileName] = raw as Record<string, unknown>;
}

describe('Card Locales Schema & Deprecated Aliases Guard', () => {
  const cardNames = Object.keys(cardLocalesMap);

  it('should have discovered card locale modules via import.meta.glob', () => {
    expect(cardNames.length).toBeGreaterThan(0);
  });

  for (const cardName of cardNames) {
    describe(`card: ${cardName}`, () => {
      const locales = cardLocalesMap[cardName];

      for (const [file, json] of Object.entries(locales)) {
        it(`should not contain forbidden/deprecated alias keys in ${file}`, () => {
          const keys = getAllKeys(json);

          for (const forbiddenKey of FORBIDDEN_ALIAS_KEYS) {
            expect(
              keys,
              `Card "${cardName}" contains deprecated key "${forbiddenKey}" in ${file}`,
            ).not.toContain(forbiddenKey);
          }
        });
      }

      it('should maintain symmetric top-level keys between zh-CN.json and en-US.json', () => {
        const zhJson = locales['zh-CN.json'];
        const enJson = locales['en-US.json'];

        if (zhJson && enJson) {
          expect(
            Object.keys(zhJson).sort(),
            `Mismatch between keys of zh-CN.json and en-US.json in card "${cardName}"`,
          ).toEqual(Object.keys(enJson).sort());
        }
      });
    });
  }
});