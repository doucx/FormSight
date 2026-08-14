由于 Vitest 运行在 Node.js 环境（`environment: 'node'`），默认缺少浏览器 DOM 环境提供的 `localStorage` 全局变量，因此在直接访问 `localStorage.clear()` 时抛出了 `ReferenceError`。

下面是修复此问题的 Quipu 计划。

## [WIP] fix: 为 settings 测试脚本添加 localStorage 内存 Mock

### 错误分析
在 `src/utils/__tests__/settings.test.ts` 中运行时报错：
`ReferenceError: localStorage is not defined`

**原因**:
我们在 `vite.config.ts` 中将 Vitest 环境设置为了纯 Node.js 环境（`environment: 'node'`），而 Node.js 原生并不具备浏览器端的 `window.localStorage` 全局对象。

**解决方案**:
在 `settings.test.ts` 中通过 `globalThis.localStorage` 注入一个轻量级内嵌的内存版 `localStorage` Polyfill（支持 `getItem`、`setItem` 和 `clear`），无需引入额外的重量级 DOM 环境包，即可完成配置读写逻辑的测试。

### 用户需求
解决 `settings.test.ts` 在 Node 环境下运行时由于缺少 `localStorage` 导致的测试断言失败问题。

### 评论
使用零依赖的内嵌存储 Mock 模拟 Web Storage API 是针对 Node 测试环境的经典高效实践，能显著提升测试运行速度并保持配置简洁。

### 目标
在 `src/utils/__tests__/settings.test.ts` 中加入 `localStorage` Mock 实现，确保该测试用例顺利通关。

### 基本原理
通过 `Object.defineProperty` 在 `globalThis` 上定义一个内存 Store 闭包，拦截 `localStorage` 的 `getItem`, `setItem` 和 `clear` 操作。

### 标签
#intent/fix #flow/ready #priority/high #comp/tests #concept/executor #scope/dx #ai/instruct #task/domain/testing #task/object/settings-test-fix #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 更新 settings.test.ts 补充 localStorage Mock

~~~~~act
patch_file
src/utils/__tests__/settings.test.ts
~~~~~
~~~~~typescript.old
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../settings';

describe('settings utils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadSettings - should return default settings when localStorage is empty', () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('saveSettings & loadSettings - should persist and retrieve custom settings', () => {
    const custom = { ...DEFAULT_SETTINGS, gridSize: 4, autoNext: false };
    saveSettings(custom);
    const loaded = loadSettings();
    expect(loaded.gridSize).toBe(4);
    expect(loaded.autoNext).toBe(false);
  });
});
~~~~~
~~~~~typescript.new
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../settings';

const memoryStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorage,
    writable: true,
  });
}

describe('settings utils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadSettings - should return default settings when localStorage is empty', () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('saveSettings & loadSettings - should persist and retrieve custom settings', () => {
    const custom = { ...DEFAULT_SETTINGS, gridSize: 4, autoNext: false };
    saveSettings(custom);
    const loaded = loadSettings();
    expect(loaded.gridSize).toBe(4);
    expect(loaded.autoNext).toBe(false);
  });
});
~~~~~

### 下一步建议
运行 `npm run test`，验证所有测试文件（包括 `settings.test.ts` 及 `db.test.ts` 等）是否全部顺利运行并通过。
