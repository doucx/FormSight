好的，既然我们已经完成了代码修改并通过了类型检查，现在将这些变更作为一个完整的逻辑单元提交到 Git 仓库中。

我将生成一个 `[COMMIT]` 计划来完成暂存和提交。

## [COMMIT] refactor(card): 将 abs_gesture_axis 拆分为双视口并列渲染并修复主题类型

### 用户需求
将“动态势线提取”(abs_gesture_axis) 模块重构为左右双视口并列渲染，并提交所有代码改动。

### 评论
此次重构成功将粒子散点流场与提取势线在视觉上解耦，不仅显著提升了写生临摹的真实体验，还与“动态势线寻源”模块保持了高度一致的组件标准。

### 目标
1. 将修改后的本地文件添加到 Git 暂存区。
2. 创建符合 Conventional Commits 规范的 Git 提交。

### 基本原理
按照系统规范，文件系统变更与 Git 提交操作必须严格隔离在不同的计划中执行。在确认代码和类型编译无误后，通过 `git add` 与 `git commit` 将本次演进安全封存。

### 标签
#intent/refine #flow/ready #priority/high #comp/cards #concept/ui #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/gesture-axis-viewports #task/action/refactor #task/state/end #task/status/completed

---

### Script

#### Acts 1: 将变更添加到暂存区并创建 Git 提交

~~~~~act
git_add
src/cards/abs_gesture_axis/locales/zh-CN.json
src/cards/abs_gesture_axis/locales/en-US.json
src/cards/abs_gesture_axis/utils/generator.ts
src/cards/abs_gesture_axis/AbsGestureAxisView.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(card): split abs_gesture_axis into dual viewports and fix theme type

- Refactored 'abs_gesture_axis' card to decouple the particle flow field and the extracted gesture axis into two independent side-by-side viewports using DualViewportContainer, aligning with the UX symmetry of 'abs_td_gesture_2afc'.
- Updated locales in both zh-CN and en-US with dedicated viewport titles.
- Fixed a TypeScript compilation error in generator.ts by replacing 'CANVAS_THEME.shape.border' with 'CANVAS_THEME.shape.stroke'.
~~~~~

### 下一步建议
- **运行全量测试**: 可以执行项目的自动化测试套件（如 `pnpm test`），确保所有卡片契约和交互逻辑保持完全健康。
- **继续探索其他卡片**: 如果需要对其他卡片进行类似的视口或交互优化，我们可以继续规划下一步工作。
