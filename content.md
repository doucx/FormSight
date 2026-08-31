好的，我们已经完成了 Design System 基础设施搭建、`cva` UI 原子组件建设、全局语义化 Tokens 批量迁移与清洗工作。现在生成 `[COMMIT]` 计划将这一重构成果正式提交到 Git 仓库。

## [COMMIT] feat(ui): 建立 Design System 语义化令牌并基于 cva 重构全局 UI 组件

### 用户需求
将引入的 `cva` + `clsx` + `tailwind-merge` 架构、9 大核心 UI 原语组件（`Button`、`Card`、`Badge`、`ChoiceCard`、`Input`、`Select`、`Switch`、`MetricCard`、`Callout`）以及全局业务视图对语义化 CSS 变量（Tokens）的改造全量提交。

### 评论
这是一次重要的工程架构升级。通过将分散的 Tailwind 硬编码样式和复杂的条件分支集中收敛到 `cva` 变体与 Design Tokens 体系中，不仅彻底解决了明暗模式适配的心智负担，还为未来新 Pack 和新功能的扩展打下了统一、可维护的设计规范基石。

### 目标
1. 将所有 Design System 相关的新增文件与修改暂存到 Git。
2. 创建结构清晰、内容详尽的 Git Commit 记录。

### 基本原理
按照 Conventional Commits 规范，清晰记录基础设施依赖变动、核心 UI 抽象层建立以及对全站 90+ 组件及视图的语义化重构，确保版本演进历史具备高可读性与可追溯性。

### 标签
#intent/build #intent/refine #flow/ready #priority/high #comp/ui #comp/build #concept/ui #scope/core #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/design-system #task/action/unification #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交变更

我们将所有改动添加到 Git 暂存区并生成规范的提交信息。

~~~~~act
git_add
package.json
package-lock.json
tailwind.config.js
src/index.css
src/utils/cn.ts
src/components/ui/
src/components/common/
src/components/discovery/
src/components/navigation/
src/components/plan/
src/components/settings/
src/components/stats/
src/components/training/
src/core/analytics/
src/packs/
src/views/
src/app.tsx
src/utils/__tests__/colorUtils.test.ts
scripts/
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(ui): implement design system with cva, tailwind-merge and semantic tokens

- Add core UI dependencies: class-variance-authority, clsx, tailwind-merge
- Introduce cn() style merger utility in src/utils/cn.ts
- Define global CSS HSL tokens for :root and .dark themes in src/index.css
- Configure Tailwind to map background, foreground, card, muted, accent, border, input and ring tokens
- Build 9 core UI primitives in src/components/ui/: Button, Card, Badge, ChoiceCard, Input, Select, Switch, MetricCard, Callout
- Migrate all common components (TagPill, Toast, ModalShell, QuestionCardShell, Choice2AfcContainer, ChoiceNafcContainer, etc.) to use cva variants and semantic tokens
- Refactor views, analytics modals, settings, and pack components to eliminate hardcoded slate/indigo color classes
- Add automated unification scanning and batch refactoring scripts under scripts/
~~~~~

### 下一步建议
- **新特性开发**: Design System 已就绪，可以基于这套规范继续开发新扩展包（如 `Layout`、`Typography` 或高级透视训练）。
- **组件文档化/故事书**: 考虑在后续为 `src/components/ui/` 中的原语编写轻量级示例或测试，确保团队协作时组件的一致使用。
