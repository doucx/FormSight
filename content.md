## [WIP] 修复 `src/utils/__tests__/settings.test.ts` 中触发 Biome linter `lint/suspicious/noExplicitAny` 规则的类型断言问题

### 错误分析

在 `src/utils/__tests__/settings.test.ts` 中为了模拟不完整配置写入 IndexedDB，使用了 `partialSettings as any`。Biome 代码规范禁止直接使用 `any` 破坏类型检查，应将其改为类型安全的 `as unknown as UserSettings`。

### 用户需求
消除 `src/utils/__tests__/settings.test.ts` 中的 `any` 类型断言，使 Biome 代码风格与质量校验 100% 顺利通过。

### 评论
遵循零 `any` 的严格类型规范，能够确保项目代码在静态分析工具与 CI 流水线中始终保持清洁与健壮。

### 目标
将 `partialSettings as any` 替换为符合规范的 `as unknown as UserSettings`。

### 基本原理
通过 `as unknown as UserSettings` 进行安全的二次转型，既能满足单元测试对于模拟不完整结构存入存储的需求，又严格遵守了 linter 的无 `any` 规则。

### 标签
#intent/fix #flow/ready #priority/medium #comp/tests #concept/config #scope/dx #ai/instruct #task/domain/testing #task/object/lint-rules #task/action/fix #task/state/continue

---

### Script

#### Acts 1: 消除 `settings.test.ts` 中的 `any` 转型

~~~~~act
patch_file
src/utils/__tests__/settings.test.ts
~~~~~
~~~~~typescript.old
    const db = await getDB();
    await db.put('app_settings', partialSettings as any, 'global_settings');

    const loaded = await loadSettings();
~~~~~
~~~~~typescript.new
    const db = await getDB();
    await db.put('app_settings', partialSettings as unknown as UserSettings, 'global_settings');

    const loaded = await loadSettings();
~~~~~

### 下一步建议

建议再次运行 `npm run check`（或 `biome check .`）与 `vitest run`，确认 linter 与所有单元测试均无错误通过。
