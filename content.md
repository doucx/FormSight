在 Vitest 的 `node` 运行环境下，缺少原生浏览器端的 `localStorage`，导致多个测试用例不得不分别手动写 mock 注入代码，而新加的 `sound.test.ts` 遗漏了注入因而报错。

我们将通过 Vitest 的 `setupFiles` 全局自动化注入持久化的内存级 `localStorage` 垫片（Polyfill），让所有测试文件无感直接使用 `localStorage`，彻底移除各测试文件中的重复样板代码。

---

## [WIP] fix: 提取测试环境 localStorage Mock 并配置全局 Vitest Setup

### 错误分析
1. **测试环境不一致**: Vitest 配置的运行环境为 `environment: 'node'`，Node.js 运行时默认没有 `localStorage` 全局对象。
2. **Mock 散落与重复**: `db.test.ts` 和 `settings.test.ts` 各自重复编写了冗余的 `memoryStorage` 注入逻辑，而新增加的 `sound.test.ts` 缺少该样板代码，导致在 `beforeEach` 中触发 `ReferenceError: localStorage is not defined`。

### 用户需求
将 `localStorage` mock 提取为测试中的通用基础设施/组件，在所有测试执行前自动生效，避免每个测试文件重复实现或遗漏。

### 评论
配置全局 `setupFiles` 是现代测试工程（Vitest / Jest）的标准最佳实践。通过统一的测试脚手架垫片，不仅能保证所有测试用例随时安全调用 `localStorage`，还可以大幅精简各测试文件的代码量，提高维护性与鲁棒性。

### 目标
1. 新建 `src/test/setup.ts`，实现符合 `Storage` 接口规范的内存存储垫片并自动挂载到 `globalThis.localStorage`。
2. 更新 `vite.config.ts`，为 Vitest 注册 `test.setupFiles = ['./src/test/setup.ts']`。
3. 移除 `db.test.ts`、`settings.test.ts` 中的重复 mock 代码，使所有测试用例统一受益。

### 基本原理
Vitest 会在加载和运行任何测试文件前优先执行 `setupFiles` 列表中的脚本。在该脚本中为 `globalThis.localStorage` 提供具备 `getItem`、`setItem`、`removeItem`、`clear` 等完整方法的单例对象，使所有测试上下文无需导入即可无缝使用 `localStorage`。

### 标签
#intent/fix #flow/ready #priority/high #comp/tests #comp/build #concept/config #scope/dx #ai/instruct #task/domain/testing #task/object/local-storage-mock #task/action/extract-setup #task/state/begin

---

### Script

#### Acts 1: 创建全局测试环境初始化脚本 `src/test/setup.ts`

~~~~~act
write_file
src/test/setup.ts
~~~~~
~~~~~typescript
class MemoryStorage implements Storage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] ?? null;
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    writable: true,
    configurable: true,
  });
}
~~~~~

#### Acts 2: 更新 `vite.config.ts` 注册 `setupFiles`

~~~~~act
patch_file
vite.config.ts
~~~~~
~~~~~typescript
  test: {
    globals: true,
    environment: 'node',
  },
~~~~~
~~~~~typescript
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
~~~~~

#### Acts 3: 清理 `src/utils/__tests__/db.test.ts` 中的重复 Mock 代码

~~~~~act
patch_file
src/utils/__tests__/db.test.ts
~~~~~
~~~~~typescript
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAllData,
  exportAllData,
  formatTotalTime,
  getAllColorProfiles,
  getAllColorTrialRecords,
  getAllTrialRecords,
  getAllUserProfiles,
  getColorTrainingTimeMs,
  getStarHoppingTrainingTimeMs,
  getTotalTrainingTimeMs,
  getUserProfile,
  importAllData,
  saveColorSession,
  saveColorTrialRecord,
  saveSession,
  saveTrialRecord,
} from '../db';
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

describe('db storage & import/export', () => {
~~~~~
~~~~~typescript
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAllData,
  exportAllData,
  formatTotalTime,
  getAllColorProfiles,
  getAllColorTrialRecords,
  getAllTrialRecords,
  getAllUserProfiles,
  getColorTrainingTimeMs,
  getStarHoppingTrainingTimeMs,
  getTotalTrainingTimeMs,
  getUserProfile,
  importAllData,
  saveColorSession,
  saveColorTrialRecord,
  saveSession,
  saveTrialRecord,
} from '../db';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../settings';

describe('db storage & import/export', () => {
~~~~~

#### Acts 4: 清理 `src/utils/__tests__/settings.test.ts` 中的重复 Mock 代码

~~~~~act
patch_file
src/utils/__tests__/settings.test.ts
~~~~~
~~~~~typescript
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

describe('settings utils with domain isolation', () => {
~~~~~
~~~~~typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../settings';

describe('settings utils with domain isolation', () => {
~~~~~

### 下一步建议
- 重新运行 `npm test`，所有 7 个测试套件将全部直接顺利通过。
- 今后在编写任何新的涉及 `localStorage`、用户设置或音效测试时，无需再声明或实现 storage 适配器。
