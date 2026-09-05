由于当前项目运行在 Vite 前端与纯浏览器/客户端 TypeScript 环境下，并未配置 Node.js 运行时类型（缺少 `@types/node` 与 CommonJS 的全局 `__dirname`）。我们将测试用例重构为基于 Vite 原生的 `import.meta.glob` 实现，彻底摆脱对 Node.js 内置模块的依赖。

## [WIP] fix: 重构 locales 测试为基于 Vite import.meta.glob 的无 Node 依赖实现

### 错误分析
测试文件报出 5 处 TypeScript 编译错误：
1. `TS2307: Cannot find module 'node:fs' / 'node:path'`: 项目根 `tsconfig.json` 面向浏览器环境，未挂载 `@types/node` 模块定义，导致 Node 前缀协议模块解析失败。
2. `TS2304: Cannot find name '__dirname'`: 当前源码处于标准 ES Module (ESM) 模式，不存在 CommonJS 的全局变量 `__dirname`。
3. `TS7006: Parameter 'dirent' implicitly has an 'any' type`: `readdirSync` 返回值因缺失 Node 类型提示回退为隐式 `any`。

**解决方案**：
完全移除 `node:fs` 与 `node:path`，改用 Vite 原生内置且完全受 Vitest 支持的 `import.meta.glob` 进行静态模块批量收集与直接解析。这样不仅完全消除类型报错，还具备更快的静态解析速度与跨环境运行能力。

### 用户需求
修复 `src/cards/__tests__/locales-schema.test.ts` 中的 TypeScript 报错，使其在无需 `@types/node` 的纯 Vite/ESM 前端工程环境中正常通过编译和测试运行。

### 评论
使用打包器（Vite）的静态全局收集特性替代底层的宿主文件 I/O，是现代前端单测的最佳实践。它使得无论是 Node 环境、CI 容器，还是无头浏览器或 WebWorker 下运行测试，都能获得 100% 一致的模块解析表现。

### 目标
1. 移除 `node:fs`、`node:path` 以及 `__dirname`。
2. 改用 `import.meta.glob('../*/locales/*.json', { eager: true })` 收集卡片词典。
3. 补全强类型定义，消除所有的隐式 `any`。
4. 保证黑名单键与双语词典对称性校验逻辑完整无误。

### 基本原理
Vite 在构建与测试时会将 `import.meta.glob` 在编译期转换为对目标文件的静态导入。`{ eager: true }` 选项会直接将各卡片的 JSON 文件加载为已解析的对象结构。我们通过简单的路径正则提取出 `cardName` 与 `fileName`，将其组织为结构化字典进行断言。

### 标签
#intent/fix #flow/ready #priority/medium #comp/cards #comp/tests #scope/dx #ai/instruct #task/domain/i18n #task/object/card-locales-schema #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 重构 locales-schema.test.ts 使用 import.meta.glob

~~~~~act
write_file
src/cards/__tests__/locales-schema.test.ts
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';

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
~~~~~

---

### 下一步建议

1. **重新执行类型检查与测试**：运行 `pnpm vitest run src/cards/__tests__/locales-schema.test.ts`，验证 TypeScript 报错已完全解决且所有断言均全部通过。
2. **纳入持续集成校验**：确保该用例已包含在项目的自动化测试流程中，防止未来卡片开发出现别名劣化。
