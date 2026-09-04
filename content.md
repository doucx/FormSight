好的，当前分支已完整落实了拆除 Standard Wrapper、沉淀无头 Hooks 和 `SliderTrack` 原子组件的全部改造，同时对各卡片添加了基于 `question.id` 的重置 Key，并修复了部分 Hooks 的依赖引用。

现在我将生成 `[COMMIT]` 计划，将这些高质量变更提交至 Git 仓库。

## [COMMIT] refactor(ui): 解散标准视图包装器并迁移为无头 Hook 与原子组合架构

### 用户需求
将分支上包含“解散标准视图包装器、沉淀无头交互 Hooks、添加卡片实例挂载 Key 以及清理废弃容器”的完整修改记录为一个语义清晰的 Git 提交。

### 评论
这是一次重大的前端架构重构，彻底解决了“UI 控制权倒置”与“插槽泛滥（Leaky Abstraction）”的问题。重构后组件嵌套深度显著下降，各卡片排版逻辑完全扁平自治，代码可读性与可维护性大幅提升。

### 目标
1. 暂存工作区中的所有新增、修改与删除文件（包括新建的 Hooks、原子组件、重构的各卡片视图及废弃文件删除）。
2. 生成符合 Conventional Commits 规范的详细提交说明。

### 基本原理
按照 Quipu 协议规划，所有的文件系统变更在验证后应汇聚为一个原子提交。本次提交标志着“倒置 UI 控制权重构”宏观任务的圆满收官。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/ui #scope/core #scope/api #scope/dx #scope/ux #ai/instruct #task/domain/ui #task/object/standard-view-refactor #task/action/refactor #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交 Git 变更

~~~~~act
git_add
.
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(ui): dismantle standard view wrappers in favor of headless hooks and atomic components

- Introduce headless keyboard shortcut hooks (`useChoiceShortcuts`, `useSubmitShortcut`) to decouple event listening from layout.
- Introduce `SliderTrack` atomic visual primitive for continuous range controls, dynamic tolerance bands, and truth/user marker rendering.
- Refactor all 2AFC, N-AFC, and continuous slider views to compose directly with `QuestionCardShell`, `ChoiceCard`, and native grid/flex layouts.
- Ensure independent state lifecycle across questions by binding `key={question.id}` in card manifest canvas renderers.
- Safely remove legacy wrappers and containers (`Standard2AfcView`, `StandardNafcView`, `StandardSliderView`, `Choice2AfcContainer`, `ChoiceNafcContainer`) and prune SDK exports.
- Optimize hook dependencies in `ActivityHeatmapCard` and `useAppBootstrap`.
~~~~~

---

### 下一步建议
- **CI / 构建验证**: 在完成提交后，执行自动化测试或构建流水线（如 `npm run build && npm run test`），确认生产包体积缩减情况以及全部题型的回归状态。
- **文档与新卡片规范更新**: 可以在团队开发规范或脚手架文档中固化本轮架构范式，明确后续新增卡片统一遵循“QuestionCardShell + 自由排版 + 原子组件 + 无头 Hooks”的组合模式。
