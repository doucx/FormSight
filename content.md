## [WIP] 针对 Vitest 单元测试中暴露的异步签名、`indexedDB` 测试环境环境准备以及 `sound.ts` 同步快照读取问题进行修复

### 错误分析

1. **`sound.ts` 误调用异步 `loadSettings`**：`sound.ts` 中的 `playHitSound` 和 `playMissSound` 是同步高频音频调用，之前重构时直接调用了返回 `Promise<UserSettings>` 的 `loadSettings()`，导致 `settings.global` 报 `undefined` 错误。应改为调用内存单例快照 `getSettingsSnapshot()`。
2. **测试环境缺少全局 `indexedDB` Mock**：在 Node/Vitest 环境中，`setup.ts` 仅模拟了 `localStorage`，未引入 `fake-indexeddb/auto`，导致在无浏览器全局环境时调用 `getDB()` 抛出 `ReferenceError: indexedDB is not defined`。
3. **`settings.test.ts` 与 `sound.test.ts` 未使用 `await` 异步语法**：设置已升级为异步 IndexedDB 存储，单元测试用例需要改为 `async/await`。

### 用户需求
修复单元测试中关于 `indexedDB` 环境缺少、`sound.ts` 内存快照同步读取以及 `settings.test.ts` / `sound.test.ts` 的异步调用问题，确保所有 Vitest 测试 100% 绿灯通过。

### 评论
单元测试暴露出音频播放和存储异步化改造中的边缘细节。在高频无阻塞场景（如播放音频打击反馈）中，依赖内存中的瞬时快照 `getSettingsSnapshot()` 既能保障零延迟响应，又避免了异步 Promise 带来的类型错位。

### 目标
1. 修复 `src/utils/sound.ts`，使用 `getSettingsSnapshot()` 同步获取配置。
2. 在 `src/test/setup.ts` 中引入 `fake-indexeddb/auto` 支持 Node 测试环境。
3. 更新 `src/utils/__tests__/settings.test.ts` 与 `src/utils/__tests__/sound.test.ts`，正确使用 `async/await` 异步持久化接口。

### 基本原理
- 音频调用处于 UI 动画帧与交互事件的关键路径上，采用已在内存中就绪的 `getSettingsSnapshot()`，消灭微任务与 Promise 解析开销。
- 引入 `fake-indexeddb/auto` 为测试运行时注入纯内存 IndexedDB 实现，使 Node 能够无缝运行完整的 IDB 事务测试。

### 标签
#intent/fix #flow/ready #priority/critical #comp/tests #comp/runtime #concept/state #scope/core #ai/instruct #task/domain/testing #task/object/indexeddb-tests #task/action/fix #task/state/continue

---

### Script

#### Acts 1: 修复 `src/utils/sound.ts` 使用同步设置快照

~~~~~act
patch_file
src/utils/sound.ts
~~~~~
~~~~~typescript.old
import { loadSettings } from '../storage/settings';

let audioCtx: AudioContext | null = null;
~~~~~
~~~~~typescript.new
import { getSettingsSnapshot } from '../storage/settings';

let audioCtx: AudioContext | null = null;
~~~~~

~~~~~act
patch_file
src/utils/sound.ts
~~~~~
~~~~~typescript.old
export function playHitSound(streak = 0): void {
  const settings = loadSettings();
  if (!settings.global.soundEnabled) return;
~~~~~
~~~~~typescript.new
export function playHitSound(streak = 0): void {
  const settings = getSettingsSnapshot();
  if (!settings.global?.soundEnabled) return;
~~~~~

~~~~~act
patch_file
src/utils/sound.ts
~~~~~
~~~~~typescript.old
export function playMissSound(): void {
  const settings = loadSettings();
  if (!settings.global.soundEnabled) return;
~~~~~
~~~~~typescript.new
export function playMissSound(): void {
  const settings = getSettingsSnapshot();
  if (!settings.global?.soundEnabled) return;
~~~~~

#### Acts 2: 在 `src/test/setup.ts` 中引入 `fake-indexeddb/auto`

~~~~~act
patch_file
src/test/setup.ts
~~~~~
~~~~~typescript.old
class MemoryStorage implements Storage {
  private store: Record<string, string> = {};
~~~~~
~~~~~typescript.new
import 'fake-indexeddb/auto';

class MemoryStorage implements Storage {
  private store: Record<string, string> = {};
~~~~~

#### Acts 3: 适配 `src/utils/__tests__/settings.test.ts` 与 `sound.test.ts` 为异步测试

~~~~~act
write_file
src/utils/__tests__/settings.test.ts
~~~~~
~~~~~typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { getDB } from '../../storage/db/schema';
import {
  DEFAULT_SETTINGS,
  getCardSettings,
  loadSettings,
  saveSettings,
} from '../../storage/settings';

describe('settings utils with card-scoped isolation', () => {
  beforeEach(async () => {
    localStorage.clear();
    const db = await getDB();
    const tx = db.transaction('app_settings', 'readwrite');
    await tx.objectStore('app_settings').clear();
    await tx.done;
  });

  it('loadSettings - should return default settings when storage is empty', async () => {
    const settings = await loadSettings();
    expect(settings.global.soundEnabled).toBe(true);
    expect(settings.global.theme).toBe('system');
    expect(settings.cards.star_single.autoNext).toBe(true);
    expect(settings.cards.color_hue.autoNext).toBe(true);
    expect(settings.cards.rel_vector_shift.autoNext).toBe(true);
    expect(settings.cards.star_single.gridSize).toBe(3);
    expect(settings.cards.star_single.targetingMode).toBe('off');
    expect(settings.cards.color_hue.showToleranceBand).toBe(true);
    expect(settings.cards.color_hue.targetingMode).toBe('off');
    expect(settings.cards.color_all.enableHoverColorPreview).toBe(true);
  });

  it('saveSettings & loadSettings - should persist and retrieve card-scoped settings', async () => {
    const custom = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    custom.cards.star_single.autoNext = false;
    custom.cards.star_single.autoNextDelay = 800;
    custom.cards.star_single.gridSize = 4;

    custom.cards.color_hue.autoNext = true;
    custom.cards.color_hue.autoNextDelay = 300;
    custom.cards.color_hue.sliderHitMargin = 20;

    custom.cards.rel_vector_shift.autoNext = false;
    custom.cards.rel_vector_shift.autoNextDelay = 1200;

    await saveSettings(custom);

    const loaded = await loadSettings();
    expect(loaded.cards.star_single.autoNext).toBe(false);
    expect(loaded.cards.star_single.autoNextDelay).toBe(800);
    expect(loaded.cards.star_single.gridSize).toBe(4);

    expect(loaded.cards.color_hue.autoNext).toBe(true);
    expect(loaded.cards.color_hue.autoNextDelay).toBe(300);
    expect(loaded.cards.color_hue.sliderHitMargin).toBe(20);

    expect(loaded.cards.rel_vector_shift.autoNext).toBe(false);
    expect(loaded.cards.rel_vector_shift.autoNextDelay).toBe(1200);
  });

  it('loadSettings - should merge partial card settings with default values', async () => {
    const partialSettings = {
      global: {
        idleTimeout: 120,
        theme: 'dark',
      },
      cards: {
        star_single: {
          gridSize: 5,
        },
      },
    };

    const db = await getDB();
    await db.put('app_settings', partialSettings as any, 'global_settings');

    const loaded = await loadSettings();
    expect(loaded.global.idleTimeout).toBe(120);
    expect(loaded.global.theme).toBe('dark');
    expect(loaded.global.soundEnabled).toBe(DEFAULT_SETTINGS.global.soundEnabled);
    expect(loaded.cards.star_single.gridSize).toBe(5);
    expect(loaded.cards.star_single.autoNext).toBe(DEFAULT_SETTINGS.cards.star_single.autoNext);
    expect(loaded.cards.color_hue).toEqual(DEFAULT_SETTINGS.cards.color_hue);
    expect(loaded.cards.rel_vector_shift).toEqual(DEFAULT_SETTINGS.cards.rel_vector_shift);
    expect(loaded.cards.neg_ratio_estimation).toEqual(DEFAULT_SETTINGS.cards.neg_ratio_estimation);
  });

  it('getCardSettings - should return fallback default settings if card is not found', async () => {
    const settings = await loadSettings();
    const starSingle = getCardSettings(settings, 'star_single');
    expect(starSingle.autoNext).toBe(true);

    const nonExistent = getCardSettings(settings, 'non_existent_card');
    expect(nonExistent.autoNext).toBe(true);
  });
});
~~~~~

~~~~~act
write_file
src/utils/__tests__/sound.test.ts
~~~~~
~~~~~typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { loadSettings, saveSettings } from '../../storage/settings';
import { playHitSound, playMissSound } from '../sound';

describe('Web Audio Sound Manager', () => {
  beforeEach(async () => {
    localStorage.clear();
    await loadSettings();
  });

  it('should not throw in non-browser or disabled environments', async () => {
    // 默认启用下调用不抛异常
    expect(() => playHitSound(1)).not.toThrow();
    expect(() => playHitSound(5)).not.toThrow();
    expect(() => playMissSound()).not.toThrow();

    // 禁用声音
    const settings = await loadSettings();
    settings.global.soundEnabled = false;
    await saveSettings(settings);

    expect(() => playHitSound(1)).not.toThrow();
    expect(() => playMissSound()).not.toThrow();
  });
});
~~~~~

### 下一步建议

我们已经修复了异步调用签名与单测环境依赖，建议在终端重新运行 `vitest run` 验证所有 8 个测试文件（共 44 个测试用例）是否全部通过。
