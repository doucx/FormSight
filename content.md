好的，我们已经完成了导航系统与视图拆分的重构工作。现在将这批变更作为一个完整的逻辑单元进行 Git 提交。

## [COMMIT] feat(ui): 重构全局导航系统并独立探索大盘视图

### 用户需求
将当前的导航栏抽离、重构探索大盘与今日工作台视图架构，并优化响应式布局相关的改动提交到 Git 仓库。

### 评论
本次重构将应用的主体架构升级为现代化的“工作台/大盘/计划/统计”多标签页体系，大幅降低了主页的认知负荷，提升了桌面与移动端的交互体验与扩展性。

### 目标
1. 将所有涉及全局导航、路由重构、视图拆分及多语言配置的修改文件添加到暂存区。
2. 创建符合 Conventional Commits 规范的结构化提交记录。

### 基本原理
按照规范要求，在已验证所有修改后，通过单一的 `[COMMIT]` 计划执行 `git_add` 与 `git_commit`，保持代码仓库历史清晰且语义明确。

### 标签
#intent/build #flow/ready #priority/high #comp/cli #concept/executor #scope/core #scope/ux #ai/instruct #task/domain/ui #task/object/navigation-layout #task/action/integration #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交变更

我们将修改的文件添加到 Git 暂存区，并生成描述详尽的提交记录。

~~~~~act
git_add
src/app.tsx
src/components/navigation/AppNavigation.tsx
src/components/plan/editor/PlanEditorHeader.tsx
src/components/plan/editor/PlanStageList.tsx
src/components/routing/AppRouter.tsx
src/hooks/useAppBootstrap.ts
src/hooks/useHashRoute.ts
src/locales/en-US.json
src/locales/zh-CN.json
src/views/DiscoveryView.tsx
src/views/GlobalStatsView.tsx
src/views/Home.tsx
src/views/PlanEditorView.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(ui): refactor global navigation and split discovery view

- Introduce AppNavigation component providing desktop sidebar and mobile bottom tab bar.
- Split module exploration and filtering out of Home into a dedicated DiscoveryView (`#/discovery`).
- Refactor Home view to focus on daily routine overview, stage breakdowns, and quick metrics.
- Update route definitions and document title sync in useHashRoute and useAppBootstrap.
- Remove redundant exit buttons from subviews now integrated into main navigation shell.
- Improve responsive layout for PlanStageList on narrower screens.
- Add internationalization strings for navigation tabs across locales.
~~~~~

### 下一步建议
- **端到端流程验证**: 建议在不同视口宽度（桌面宽屏与移动端模拟器）下测试路由跳转、训练流启动与筛选参数持久化。
- **暗黑模式/主题适配**: 后续可考虑为新增的 `AppNavigation` 与全局背景容器增加主题色彩配置支持。
