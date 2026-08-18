好的，我们已经完成了核心架构的精简与去冗余。现在生成 `[COMMIT]` 计划以将这些变更提交到 Git 仓库。

## [COMMIT] refactor: 重构代码架构以精简体积并消除冗余

### 用户需求
将本次架构重构与体积精简的改动创建 Git Commit。

### 评论
本次提交移除了历史兼容债务，统一了元数据驱动视图和滑块复用逻辑，使代码库结构更加清晰纯粹，显著提升了可维护性。

### 目标
1. 将所有已修改的文件添加到 Git 暂存区。
2. 提交包含详细说明的 Git Commit。

### 基本原理
按照 Conventional Commits 规范创建结构化提交信息，记录本次架构重构的核心改动点与收益。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #comp/cli #concept/state #concept/ui #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/codebase-slimming #task/action/refactor #task/state/end #task/status/completed

---

### Script

#### Acts 1: 提交变更

我们将修改后的数据层、视图层和组件层文件添加到 Git 暂存区并创建提交。

~~~~~act
git_add
src/utils/db/schema.ts
src/utils/db/importExport.ts
src/utils/settings.ts
src/views/Home.tsx
src/app.tsx
src/components/GlobalStatsModal.tsx
src/components/ColorCanvas.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor: streamline architecture to reduce code size and remove legacy debt

- Remove legacy database version 4 migration code from schema.ts and importExport.ts
- Simplify settings persistence in settings.ts by dropping obsolete flat field migrations
- Convert Home.tsx and GlobalStatsModal.tsx to metadata-driven rendering via DOMAINS_CONFIG
- Consolidate per-domain training time tracking in app.tsx into a unified map
- Deduplicate slider logic in ColorCanvas.tsx by reusing HsvTrackSlider directly
~~~~~

### 下一步建议
- **CI / 代码检查**：运行 `npm run check` 确保所有文件符合 Biome 代码风格与类型约束。
- **功能回归验证**：在本地浏览器中访问各个训练模块（寻星、色感、相对色感、正负形）及全局统计弹窗，确保交互体验一致无误。
