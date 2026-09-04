好的，我们已经完成了代码修改并通过了编译检查。现在是时候将这个改进作为一个完整的逻辑单元提交了。

我将生成一个 `[COMMIT]` 计划，其中包含 `git_add` 和 `git_commit` 指令，并提供下一步的建议。

---

## [COMMIT] refactor(core): 移除卡片契约向后兼容层并规范 engine/ui 架构

### 用户需求
彻底清理代码库中的向后兼容层代码，统一卡片清单的 `engine`（纯领域逻辑）与 `ui`（表现层绑定）架构契约。

### 评论
该改动消除了过渡期的冗余字段，使类型定义更加严格清晰，彻底杜绝了潜在的架构退化。

### 目标
1. 将本次重构涉及修改的 4 个核心文件（`cardContract.ts`, `registry.ts`, `GenericTrainingView.tsx`, `SettingsModal.tsx`）提交到 Git 版本库。

### 基本原理
遵循原子的 Git 提交原则，将契约升级与编译修复作为一个逻辑完整的单元进行固化。

### 标签
#intent/refine #flow/ready #priority/high #comp/core #concept/config #scope/core #ai/instruct #task/domain/architecture #task/object/card-manifest #task/action/refactor #task/state/end

---

### Script

#### Acts 1: 将变更文件添加到暂存区并提交

~~~~~act
git_add
src/core/cardContract.ts
src/core/registry.ts
src/views/GenericTrainingView.tsx
src/components/modals/SettingsModal.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(core): 移除卡片契约向后兼容层并规范 engine/ui 架构

- 从 CardManifest 契约中移除了遗留字段（training、根级 icon、根级 renderSettings）。
- 更新 GenericTrainingView 与 registry，统一通过 engine 与 ui 契约访问卡片能力。
- 修复 SettingsModal 中对已移除根级 renderSettings 属性的引用，确保 TypeScript 编译通过。
- 确立了领域计算层（engine）与视图表现层（ui）的严格隔离与规范。
~~~~~

### 下一步建议

- **功能验证**: 启动本地开发服务器 (`npm run dev`)，抽查几张卡片（如 `abs_gesture_axis`, `color_all`）的训练及设置弹窗，确认运行时表现完全正常。
- **静态检查**: 可配置 ESLint 规则限制算法工具层引入 UI 依赖，进一步长效固化代码纯洁性。
