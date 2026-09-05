import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const CARDS_ROOT = path.resolve(__dirname, '..');

/**
 * 废弃别名与前缀黑名单：
 * 严禁在卡片私有词典中重新引入下列已被规范收敛或废弃的键名
 */
const FORBIDDEN_ALIAS_KEYS = [
  'areaHint',
  'ratioHint',
  'vertexHint',
  'prompt', // 裸 prompt 废弃；题干标签统一使用 promptTitle，操作说明统一使用 hint
  'memoryStimulusHint',
  'memoryRecallHint',
];

/**
 * 获取所有卡片包目录（排除 __tests__ 等内部辅助目录）
 */
function getCardDirectories(): string[] {
  return fs
    .readdirSync(CARDS_ROOT, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory() && !dirent.name.startsWith('__'))
    .map((dirent) => dirent.name);
}

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

describe('Card Locales Schema & Deprecated Aliases Guard', () => {
  const cardDirs = getCardDirectories();

  it('should have discovered valid cards directories', () => {
    expect(cardDirs.length).toBeGreaterThan(0);
  });

  for (const cardName of cardDirs) {
    describe(`card: ${cardName}`, () => {
      const localesDir = path.join(CARDS_ROOT, cardName, 'locales');
      const hasLocales = fs.existsSync(localesDir);

      if (!hasLocales) {
        return;
      }

      const localeFiles = ['zh-CN.json', 'en-US.json'];

      for (const file of localeFiles) {
        const filePath = path.join(localesDir, file);

        it(`should not contain forbidden/deprecated alias keys in ${file}`, () => {
          if (!fs.existsSync(filePath)) return;

          const content = fs.readFileSync(filePath, 'utf-8');
          const json = JSON.parse(content);
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
        const zhPath = path.join(localesDir, 'zh-CN.json');
        const enPath = path.join(localesDir, 'en-US.json');

        if (fs.existsSync(zhPath) && fs.existsSync(enPath)) {
          const zhJson = JSON.parse(fs.readFileSync(zhPath, 'utf-8'));
          const enJson = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

          expect(
            Object.keys(zhJson).sort(),
            `Mismatch between keys of zh-CN.json and en-US.json in card "${cardName}"`,
          ).toEqual(Object.keys(enJson).sort());
        }
      });
    });
  }
});
