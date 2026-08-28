好的，我们已经完成了计划编辑器视图化升级、标签组件提取、多语言工具统一以及图表明亮主题适配等一系列重构与优化。

现在我将生成 `[COMMIT]` 计划，将这些改动作为一个完整的逻辑单元提交到 Git 仓库。

## [COMMIT] feat(plan): 重构计划编辑器为独立视图并优化交互与图表UI

### 用户需求
将当前的改动进行规范化提交，包括：
1. 将 `PlanEditorModal` 弹窗重构为全屏独立视图 `PlanEditorView`，并接入 Hash 路由体系 (`#/plan-editor`)。
2. 提取可复用的 `TagPill` 标签胶囊组件，统一主页及计划编辑器的多维筛选与标签展示交互。
3. 统一多语言辅助函数 `getCardTitle`、`getCardDesc`、`getPackTitle`，提升卡片与扩展包标题解析一致性。
4. 优化 `ModeCard` 首训引导逻辑与 `TrainingShell` 紧凑沉浸式状态栏。
5. 将 Canvas 图表从深色背景统一迁移至全局明亮主题风格。

### 评论
本次重构极大提升了应用在训练计划编排阶段的操作空间与用户体验，解决了此前弹窗空间狭窄受限的问题；同时通过抽象 `TagPill` 与多语言工具函数增强了代码可维护性与 UI 风格的一致性。

### 目标
1. 将所有涉及变更与新增的文件暂存到 Git。
2. 生成符合 Conventional Commits 规范的结构化提交信息并执行提交。

### 基本原理
按照 Git 规范化工作流，利用 Quipu `git_add` 和 `git_commit` 算子完成工作区暂存和提交，确保历史记录清晰可追溯。

### 标签
#intent/build #flow/ready #priority/high #comp/cli #concept/history #scope/core #scope/ux #ai/instruct #task/domain/ui #task/object/plan-editor #task/action/refactor #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交代码变更

~~~~~act
git_add
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(UI): migrate PlanEditor to dedicated view and polish overall UI

- Refactor `PlanEditorModal` into full-page `PlanEditorView` supporting hash routing (`#/plan-editor`)
- Introduce reusable `TagPill` component across discovery filter and plan editor
- Unify i18n helpers (`getCardTitle`, `getCardDesc`, `getPackTitle`) for title fallbacks
- Enhance `ModeCard` with zero-trial benchmark prioritization and refined layout
- Compact `TrainingShell` header for immersive training experience
- Modernize Canvas analytics charts with unified light-theme aesthetics
~~~~~

### 下一步建议
- **端到端功能验证**: 启动本地开发服务验证 `#/plan-editor` 路由跳转、计划保存与直接开练流程是否顺畅。
- **构建测试**: 运行 `npm run build` 或 `npm run test` 确保无 TypeScript 类型错误与构建异常。
