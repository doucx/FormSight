测试失败是因为 `src/utils/__tests__/settings.test.ts` 中包含了一个专门验证旧版 domain 层级配置合并行为的测试用例 (`should merge legacy domain settings with default values`)。在彻底清理了旧版本的过渡兼容分支后，该测试用例需要同步更新为验证最新的基于卡片隔离 (`cards`) 的部分属性合并行为。

## [WIP] fix(test): 更新 settings 单测以匹配清理后的非 legacy 配置结构

### 错误分析
- **错误原因**: 在移除了 `src/utils/settings.ts` 中针对历史顶层 `star`、`color` 等旧键名的回退合并逻辑后，`settings.test.ts` 中的旧用例依然向 `localStorage` 写入旧结构 `{ star: { gridSize: 5 } }`，导致 `star_single.gridSize` 保持默认值 3 而非 5，引发断言失败。
- **解决方案**: 将该测试用例更新为对现有标准数据结构 `{ cards: { star_single: { gridSize: 5 } } }` 的部分覆盖（Partial Override）与默认值合并测试。

### 用户需求
修复单测断言失败，将测试用例中的旧版结构更新为符合当前架构的标准格式。

### 评论
单测应当紧密反映生产代码的设计意图。在旧版本代码清理完毕后，对应的遗留测试用例也应同步重构，确保测试套件的准确性。

### 目标
更新 `src/utils/__tests__/settings.test.ts` 中的 `loadSettings` 测试用例，验证局部卡片配置与默认配置的合并行为。

### 基本原理
将旧式的顶级域配置测试改造为对 `cards.star_single` 的局部覆盖测试，保持对配置合并能力的完备校验。

### 标签
#intent/fix #flow/ready #priority/medium
#comp/tests #concept/config #scope/dx
#ai/instruct
#task/domain/testing
#task/object/settings-tests
#task/action/bug-fix
#task/state/continue

---

### Script

#### Acts 1: 修正 settings.test.ts 中的测试用例

~~~~~act
patch_file
src/utils/__tests__/settings.test.ts
~~~~~
~~~~~typescript
  it('loadSettings - should merge legacy domain settings with default values', () => {
    const legacyPartialSettings = {
      global: {
        idleTimeout: 120,
      },
      star: {
        gridSize: 5,
      },
    };

    localStorage.setItem('formsight_user_settings', JSON.stringify(legacyPartialSettings));

    const loaded = loadSettings();
    expect(loaded.global.idleTimeout).toBe(120);
    expect(loaded.global.soundEnabled).toBe(DEFAULT_SETTINGS.global.soundEnabled);
    expect(loaded.cards.star_single.gridSize).toBe(5);
    expect(loaded.cards.star_single.autoNext).toBe(DEFAULT_SETTINGS.cards.star_single.autoNext);
    expect(loaded.cards.color_hue).toEqual(DEFAULT_SETTINGS.cards.color_hue);
    expect(loaded.cards.rel_vector_shift).toEqual(DEFAULT_SETTINGS.cards.rel_vector_shift);
    expect(loaded.cards.neg_ratio_estimation).toEqual(DEFAULT_SETTINGS.cards.neg_ratio_estimation);
  });
~~~~~
~~~~~typescript
  it('loadSettings - should merge partial card settings with default values', () => {
    const partialSettings = {
      global: {
        idleTimeout: 120,
      },
      cards: {
        star_single: {
          gridSize: 5,
        },
      },
    };

    localStorage.setItem('formsight_user_settings', JSON.stringify(partialSettings));

    const loaded = loadSettings();
    expect(loaded.global.idleTimeout).toBe(120);
    expect(loaded.global.soundEnabled).toBe(DEFAULT_SETTINGS.global.soundEnabled);
    expect(loaded.cards.star_single.gridSize).toBe(5);
    expect(loaded.cards.star_single.autoNext).toBe(DEFAULT_SETTINGS.cards.star_single.autoNext);
    expect(loaded.cards.color_hue).toEqual(DEFAULT_SETTINGS.cards.color_hue);
    expect(loaded.cards.rel_vector_shift).toEqual(DEFAULT_SETTINGS.cards.rel_vector_shift);
    expect(loaded.cards.neg_ratio_estimation).toEqual(DEFAULT_SETTINGS.cards.neg_ratio_estimation);
  });
~~~~~

### 下一步建议
运行 `npm test` 验证全部 44 项测试用例是否全部绿灯通过。
