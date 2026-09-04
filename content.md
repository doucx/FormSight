好的，我们已经完成了路径别名配置、`@formsight/card-sdk` 基础设施搭建，并将 `src/cards/` 目录下的所有卡片文件迁移到了 SDK 统一导入，同时同步更新了 `piconfig.json`。现在我们将这一逻辑完整的工作单元提交到 Git 仓库。

## [COMMIT] feat(sdk): establish card sdk and migrate card host imports to alias

### 用户需求
将本次“路径别名配置、Card SDK 基础设施构建、卡片跨级依赖收敛以及上下文工具配置更新”的改动打包为一个标准的 Git 提交。

### 评论
本次改造彻底消除了所有卡片对宿主内部物理目录路径（`../../../../core/...`、`../../../utils/...` 等）的强耦合，为后续卡片独立化、第三方扩展接入以及 UI 原子化重构打下了坚实的防腐地基。

### 目标
1. 将所有涉及别名配置、SDK 导出、卡片导入替换及配置更新的文件暂存到 Git。
2. 提交一份详尽遵循 Conventional Commits 规范的 Git 提交信息。

### 基本原理
完成卡片层与宿主内核解耦这一完整里程碑，将架构演进的第一阶段成果进行固化与持久化记录。

### 标签
#intent/build #flow/done #priority/high #comp/interfaces #concept/config #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/card-sdk #task/action/setup #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交代码变更

我们将修改后的别名配置、新增的 SDK 文件、批量迁移后的卡片源文件以及更新后的 `piconfig.json` 提交到版本控制中。

~~~~~act
git_add
tsconfig.json
vite.config.ts
piconfig.json
src/card-sdk/index.ts
src/cards
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(sdk): establish card sdk and migrate card host imports to alias

- Configure path aliases '@/*' and '@formsight/card-sdk' in tsconfig.json and vite.config.ts
- Create src/card-sdk/index.ts exporting math, procedural noise, geometry, OKLab color models, HiDPI canvas utilities, analytics charts, point loupe hook, i18n, theme tokens, and common UI primitives
- Mark legacy view wrappers (StandardNafcView, Standard2AfcView, StandardSliderView) as @deprecated in the SDK for graceful migration
- Batch migrate all 20+ cards under src/cards/ to import host utilities strictly from '@formsight/card-sdk', eliminating deep relative paths (../../../../)
- Update piconfig.json to reflect current project architecture and remove stale pack paths
~~~~~

### 下一步建议
- **重构 UI 控制权**：目前 SDK 基础设施已全部到位，所有卡片均已接入 `@formsight/card-sdk`。下一步可以推进文档中指出的第二大痛点——**“倒置的 UI 控制权”**：
  1. 提炼 `useNafcShortcuts`、`use2AfcShortcuts` 等原子键盘快捷键 Hook。
  2. 将原子 Hook 通过 `@formsight/card-sdk` 导出。
  3. 改造 `src/cards/` 中使用 `StandardNafcView` 的各个卡片（如 `rel_vector_shift`, `abs_palette_clustering` 等），让卡片自行进行原生组合式布局，逐步淘汰并彻底删除老旧的 `StandardNafcView` 包装器。
