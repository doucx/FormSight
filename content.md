好的，现在我们已经通过了所有的测试与 Biome 静态代码检查，并且实现了：
1. 修改设置项时自动保存（无需点击保存按钮），且实时生效。
2. 重构了 `SettingsModal`，引入统一的 `updateSettings` 助手方法消除了 DRY 重复代码。
3. 支持点击背景遮罩区直接退出设置界面。

我们将这个完整的逻辑工作单元作为一个 `[COMMIT]` 计划提交。

## [COMMIT] feat(settings): 实现设置项自动保存、背景遮罩退出与 DRY 重构

### 用户需求
1. 实现修改设置项时的自动保存与实时生效。
2. 允许用户点击弹窗外部的背景遮罩直接退出设置界面。
3. 重构代码减少 DRY 问题并完美通过所有 Biome 静态检查。

### 评论
该改动不仅大幅简化了设置模块的用户交互，还消除了大量的冗余方法，提升了代码库的整体代码质量。

### 目标
将所有相关改动提交到 Git 仓库，形成一个高质量的逻辑提交。

### 基本原理
按照 Quipu 协议规范，将文件变更与 Git 提交操作分离在独立的计划中执行。

### 标签
#intent/build #flow/ready #priority/high #comp/ui #concept/config #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/settings-modal #task/action/auto-save-refactor #task/state/end

---

### Script

#### Acts 1: 将更改添加到 Git 暂存区并进行提交

~~~~~act
git_add
src/components/SettingsModal.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(settings): support auto-save, backdrop click to close, and DRY refactor

- Refactored 'SettingsModal' to introduce a unified 'updateSettings' helper method, eliminating repetitive individual setter functions and resolving DRY issues.
- Enabled automatic settings saving and instant application on every preference adjustment without requiring manual clicks on a save button.
- Added support for clicking the outer backdrop area or pressing Escape to close the settings modal directly.
- Resolved all Biome accessibility and semantic element linter errors.
~~~~~

### 下一步建议
- **回归测试**: 运行 `npm run dev` 完整体验所有功能，确保各训练模式与偏好设置的自动保存表现符合预期。
