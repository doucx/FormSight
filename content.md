好的，我们在精简架构时已经移除了旧版本扁平配置的手动迁移逻辑，现在需要同步清理 `src/utils/__tests__/settings.test.ts` 中过时的遗留迁移测试用例，并补全对新结构回退与合并机制的测试。

## [WIP] test(settings): 清理已废弃的旧版本配置迁移单测

### 用户需求
清理 `settings.test.ts` 中由于移除旧版扁平迁移兼容而失败的过时测试用例。

### 评论
随着老旧数据兼容逻辑的剥离，对应的回归测试已不再适用。将其移除并保留对当前分层隔离配置与默认回退特性的测试，可以确保测试套件的准确性与健康度。

### 目标
1. 移除 `src/utils/__tests__/settings.test.ts` 中的 `loadSettings - should smoothly migrate legacy flat settings` 测试用例。
2. 保持领域隔离配置的持久化与空值回退测试用例正常运行。

### 基本原理
测试用例应与当前系统的核心契约保持一致。在决定不长期兼容旧测试版扁平草稿数据后，测试应专注于当前 `UserSettings` 的各领域隔离存储与读取。

### 标签
#intent/tooling #flow/ready #priority/medium #comp/tests #concept/config #scope/dx #ai/instruct #task/domain/testing #task/object/settings-test #task/action/cleanup #task/state/begin

---

### Script

#### Acts 1: 更新 settings 单测文件

~~~~~act
write_file
src/utils/__tests__/settings.test.ts
~~~~~
~~~~~typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../settings';

describe('settings utils with domain isolation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadSettings - should return default settings when localStorage is empty', () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.global.soundEnabled).toBe(true);
    expect(settings.star.autoNext).toBe(true);
    expect(settings.color.autoNext).toBe(true);
    expect(settings.relative_color.autoNext).toBe(true);
    expect(settings.star.gridSize).toBe(3);
    expect(settings.color.showToleranceBand).toBe(true);
  });

  it('saveSettings & loadSettings - should persist and retrieve domain-scoped settings', () => {
    const custom = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    custom.star.autoNext = false;
    custom.star.autoNextDelay = 800;
    custom.star.gridSize = 4;

    custom.color.autoNext = true;
    custom.color.autoNextDelay = 300;
    custom.color.sliderHitMargin = 20;

    custom.relative_color.autoNext = false;
    custom.relative_color.autoNextDelay = 1200;

    saveSettings(custom);

    const loaded = loadSettings();
    expect(loaded.star.autoNext).toBe(false);
    expect(loaded.star.autoNextDelay).toBe(800);
    expect(loaded.star.gridSize).toBe(4);

    expect(loaded.color.autoNext).toBe(true);
    expect(loaded.color.autoNextDelay).toBe(300);
    expect(loaded.color.sliderHitMargin).toBe(20);

    expect(loaded.relative_color.autoNext).toBe(false);
    expect(loaded.relative_color.autoNextDelay).toBe(1200);
  });

  it('loadSettings - should merge partial settings with default values', () => {
    const partialSettings = {
      global: {
        idleTimeout: 120,
      },
      star: {
        gridSize: 5,
      },
    };

    localStorage.setItem('star_hopping_user_settings', JSON.stringify(partialSettings));

    const loaded = loadSettings();
    expect(loaded.global.idleTimeout).toBe(120);
    expect(loaded.global.soundEnabled).toBe(DEFAULT_SETTINGS.global.soundEnabled);
    expect(loaded.star.gridSize).toBe(5);
    expect(loaded.star.autoNext).toBe(DEFAULT_SETTINGS.star.autoNext);
    expect(loaded.color).toEqual(DEFAULT_SETTINGS.color);
    expect(loaded.relative_color).toEqual(DEFAULT_SETTINGS.relative_color);
    expect(loaded.negative_space).toEqual(DEFAULT_SETTINGS.negative_space);
  });
});
~~~~~

### 下一步建议
- **执行测试套件**：运行 `npm run test` 验证所有单测用例（40 个测试用例）是否全部通过。
- **创建 COMMIT**：测试验证全部通过后，生成 Git 提交计划完成此次清理。
