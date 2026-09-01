我将为你生成修复该问题的 Quipu 执行计划。

## [WIP] fix: 修复卡片专属默认配置在初始化与合并时丢失的问题

### 错误分析

在单卡架构演进过程中，卡片从旧版聚合扩展包（Pack）解耦为平铺单卡（Flat Cards）。但 `buildDefaultCardSettings` 仍旧只从 `registry.getPack(card.packId)?.defaultCardSettings` 获取默认配置。
由于新版卡片体系下 `card.packId` 为 `domain` 名称（并未注册 PackManifest），且 `CardDefinition` 未保存 `CardManifest` 中的 `defaultSettings`，导致所有单卡声明的个性化初始配置（如 `star_single.gridSize: 3`、`color_all.enableHoverColorPreview: true`、`color_hue.targetingMode: 'off'` 等）在系统构建默认设置时全部丢失，断言测试失败。

### 用户需求

修复 `settings.test.ts` 中的断言错误，打通 `CardManifest.defaultSettings` 到 `Registry` 及 `buildDefaultCardSettings` 的配置读取链路，并补充覆盖其他单卡专属配置的完整回归测试。

### 评论

这是一个非常关键的基础配置层重构遗留 Bug。打通卡片专属 `defaultSettings` 的传递，能够确保用户在初次使用或合并局部自定义配置时，所有卡片的个性化字段都具备正确的初始值，避免运行时访问 `undefined` 导致异常行为。

### 目标

1. 在 `CardDefinition` 类型定义中补充 `defaultSettings` 字段。
2. 在 `SystemDomainRegistry.registerCard` 注册单卡时注入 `defaultSettings`。
3. 在 `buildDefaultCardSettings` 中优先读取 `CardManifest` / `CardDefinition` 的专属 `defaultSettings` 并向下兼容。
4. 完善 `src/utils/__tests__/settings.test.ts`，补充全量专属配置的回归测试用例。

### 基本原理

通过在 `CardDefinition` 与 `Registry` 桥接层明确传递 `defaultSettings`，使 `buildDefaultCardSettings` 可以直接从注册的卡片清单中获取各项专属默认值（如 `gridSize`、`targetingMode`、`enableHoverColorPreview` 等），再与 `DEFAULT_BASE_SETTINGS` 及交互标签派生的兜底设置合并，从而保证配置的完整性与隔离性。

### 标签

#intent/fix #flow/ready #priority/high #comp/build #concept/config #scope/core #ai/instruct #task/domain/storage #task/object/card-default-settings #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 在 `CardDefinition` 中补充 `defaultSettings` 字段

我们首先在 `CardDefinition` 类型中补充可选的 `defaultSettings` 字段。

~~~~~act
patch_file
src/types/card.ts
~~~~~
~~~~~typescript
export interface CardDefinition {
  id: string;
  packId: string;
  mode: string;
  title?: string;
  desc?: string;
  instruction?: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  hasWeaknessAnalytics?: boolean;
  settingSchemas?: SettingFieldSchema[];
}
~~~~~
~~~~~typescript
export interface CardDefinition {
  id: string;
  packId: string;
  mode: string;
  title?: string;
  desc?: string;
  instruction?: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  hasWeaknessAnalytics?: boolean;
  settingSchemas?: SettingFieldSchema[];
  defaultSettings?: Record<string, unknown>;
}
~~~~~

#### Acts 2: 在 `registry.ts` 中注册 `defaultSettings`

在注册独立卡片时，将 `CardManifest.defaultSettings` 赋值给 `cardDef`。

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript
    // 3. 构建标准 CardDefinition
    const cardDef: CardDefinition = {
      id: card.id,
      packId: card.domain,
      mode: card.id,
      icon: card.icon,
      tags: card.tags,
      hasWeaknessAnalytics: Boolean(card.analytics?.views?.length),
      settingSchemas: normalizedSchemas,
    };
~~~~~
~~~~~typescript
    // 3. 构建标准 CardDefinition
    const cardDef: CardDefinition = {
      id: card.id,
      packId: card.domain,
      mode: card.id,
      icon: card.icon,
      tags: card.tags,
      hasWeaknessAnalytics: Boolean(card.analytics?.views?.length),
      settingSchemas: normalizedSchemas,
      defaultSettings: card.defaultSettings,
    };
~~~~~

#### Acts 3: 在 `settings.ts` 中提取并合并卡片专属默认设置

重构 `buildDefaultCardSettings`，优先从 `getCardManifest` 或 `card.defaultSettings` 读取默认值。

~~~~~act
patch_file
src/storage/settings.ts
~~~~~
~~~~~typescript
export function buildDefaultCardSettings(): Record<string, BaseModuleSettings> {
  const cards: Record<string, BaseModuleSettings> = {};
  if (!registry || typeof registry.getAllCards !== 'function') {
    return cards;
  }

  const allCards = registry.getAllCards();

  for (const card of allCards) {
    const pack = registry.getPack(card.packId);
    const packCardDefaults = pack?.defaultCardSettings?.[card.id] || {};

    const cardConfig: BaseModuleSettings = {
      ...DEFAULT_BASE_SETTINGS,
      ...packCardDefaults,
    };

    // 若声明了连续调制滑块交互，注入默认滑块偏好（若 Pack 未显式覆盖）
    if (card.tags?.interaction?.includes('continuous_mod')) {
      if (cardConfig.sliderHitMargin === undefined) {
        cardConfig.sliderHitMargin = 12;
      }
      if (cardConfig.showToleranceBand === undefined) {
        cardConfig.showToleranceBand = true;
      }
    }

    cards[card.id] = cardConfig;
  }

  return cards;
}
~~~~~
~~~~~typescript
export function buildDefaultCardSettings(): Record<string, BaseModuleSettings> {
  const cards: Record<string, BaseModuleSettings> = {};
  if (!registry || typeof registry.getAllCards !== 'function') {
    return cards;
  }

  const allCards = registry.getAllCards();

  for (const card of allCards) {
    const manifest = registry.getCardManifest?.(card.id);
    const pack = registry.getPack(card.packId);
    const cardDefaults =
      manifest?.defaultSettings ||
      card.defaultSettings ||
      pack?.defaultCardSettings?.[card.id] ||
      {};

    const cardConfig: BaseModuleSettings = {
      ...DEFAULT_BASE_SETTINGS,
      ...cardDefaults,
    };

    // 若声明了连续调制滑块交互，注入默认滑块偏好（若未显式覆盖）
    if (card.tags?.interaction?.includes('continuous_mod')) {
      if (cardConfig.sliderHitMargin === undefined) {
        cardConfig.sliderHitMargin = 12;
      }
      if (cardConfig.showToleranceBand === undefined) {
        cardConfig.showToleranceBand = true;
      }
    }

    cards[card.id] = cardConfig;
  }

  return cards;
}
~~~~~

#### Acts 4: 完善单测用例与回归测试

在 `src/utils/__tests__/settings.test.ts` 中补充对 `targetingMode`、`manualTargetSectors` 以及 `color_all.enableHoverColorPreview` 的验证断言。

~~~~~act
patch_file
src/utils/__tests__/settings.test.ts
~~~~~
~~~~~typescript
  it('loadSettings - should return default settings when localStorage is empty', () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.global.soundEnabled).toBe(true);
    expect(settings.global.theme).toBe('system');
    expect(settings.cards.star_single.autoNext).toBe(true);
    expect(settings.cards.color_hue.autoNext).toBe(true);
    expect(settings.cards.rel_vector_shift.autoNext).toBe(true);
    expect(settings.cards.star_single.gridSize).toBe(3);
    expect(settings.cards.color_hue.showToleranceBand).toBe(true);
  });
~~~~~
~~~~~typescript
  it('loadSettings - should return default settings when localStorage is empty', () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
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
~~~~~

### 下一步建议

- 运行 `pnpm test` 或 `vitest` 确认 8 个测试文件（44 个用例）全部通过。
- 确认无误后，生成 Git Commit 计划提交本次代码。
