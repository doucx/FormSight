好的，我们已经完成了配置与训练计划存储向 IndexedDB 的全面迁移与异步化重构，并且修复了相关的类型检查与测试用例。现在我们将这些变更统一提交到 Git 仓库。

## [COMMIT] refactor(storage): 将用户设置与训练计划完整迁移至 IndexedDB

### 用户需求

将当前所有涉及设置与训练计划的修改（包括 IndexedDB v3 升级、内存快照访问、导入导出事务化以及测试用例更新）提交到 Git 仓库。

### 评论

这次提交彻底完成了 FormSight 数据层从 LocalStorage 到 IndexedDB 的收敛升级。不仅解决了大容量数据存储与并发事务一致性问题，还通过旁路缓存与内存快照机制确保了首屏渲染与高频事件（音效、空闲检测）的零延迟体验。

### 目标

1. 将修改的文件添加至 Git 暂存区。
2. 创建符合 Conventional Commits 规范的提交记录，详细记录架构演进与修复细节。

### 基本原理

通过 Git 提交将此阶段性工作固化为一个原子化变更单元，保证提交历史清晰、可追溯。

### 标签

#intent/refine #flow/ready #priority/high #comp/runtime #concept/state #scope/core #ai/instruct #task/domain/storage #task/object/indexeddb-migration #task/action/integration #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交变更

~~~~~act
git_add
src/components/modals/GlobalSettingsModal.tsx
src/components/modals/SettingsModal.tsx
src/components/plan/editor/usePlanEditorState.ts
src/components/routing/AppRouter.tsx
src/components/settings/sections/DataGovernanceSection.tsx
src/hooks/useAppBootstrap.ts
src/hooks/useTheme.ts
src/hooks/useTrainingSession.ts
src/main.tsx
src/storage/db/importExport.ts
src/storage/db/schema.ts
src/storage/planStorage.ts
src/storage/repository.ts
src/storage/settings.ts
src/test/setup.ts
src/utils/__tests__/settings.test.ts
src/utils/__tests__/sound.test.ts
src/utils/sound.ts
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(storage): migrate settings and training plans to IndexedDB

- Upgrade IndexedDB schema to v3, adding `app_settings`, `training_plans`, and `app_metadata` object stores with automatic legacy LocalStorage data migration.
- Provide async storage interfaces (`loadSettings`, `saveSettings`, `loadPlanStorageState`, `savePlanStorageState`) alongside fast in-memory snapshots (`getSettingsSnapshot`, `getPlanStorageStateSnapshot`).
- Implement bypass theme/locale caching to prevent screen flicker during HTML bootstrap.
- Unify `importAllData` and `clearAllData` under single ACID IndexedDB transactions.
- Update UI components, custom hooks, sound managers, and Vitest test suites (using `fake-indexeddb`) for full compatibility.
~~~~~

### 下一步建议

- **跨环境验证**: 在浏览器中测试导入导出完整 JSON 备份功能，确认迁移前后的数据完全一致。
- **性能监控**: 监控首屏加载与主题切换时的交互性能，确认 IndexedDB 异步化后无任何感知卡顿。
