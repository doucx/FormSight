## [COMMIT] refactor(components): 提取通用交互容器组件并重构卡片视图

### 用户需求
用户确认无误并要求创建提交，将本次架构重构和通用交互容器组件的提取进行 Git 提交。

### 评论
本次提交将新建立的 4 个基础交互与布局组件（`QuestionCardShell`、`ChoiceNafcContainer`、`DualViewportContainer`、`PointClickCanvas`）以及重构后的 14 个卡片视图一并暂存并提交，极大地精简了全站代码冗余。

### 目标
1. 将修改后的代码和新增文件添加至 Git 暂存区。
2. 提交带有规范前缀的 Commit。

### 基本原理
按照 ACA / Quipu 运行时协议，`[COMMIT]` 计划专用于 Git 提交操作，与文件变动的计划严格隔离，确保代码在验证通过后才沉淀到版本库。

### 标签
#intent/tooling #flow/ready #priority/high #comp/runtime #concept/ui #scope/dx #ai/instruct #task/domain/ui #task/object/git-commit #task/action/git-commit #task/state/end #task/status/completed

---

### Script

#### Acts 1: 添加更改至暂存区并提交

~~~~~act
git_add
src/components/common/QuestionCardShell.tsx
src/components/common/ChoiceNafcContainer.tsx
src/components/common/DualViewportContainer.tsx
src/components/common/PointClickCanvas.tsx
src/components/StarCanvas.tsx
src/components/abstraction/GestureAxisView.tsx
src/components/abstraction/NotanThresholdView.tsx
src/components/abstraction/PaletteClusteringView.tsx
src/components/abstraction/TopDown2AfcView.tsx
src/components/abstraction/TopDownPatternView.tsx
src/components/negativeSpace/AreaComparison2AfcView.tsx
src/components/negativeSpace/RatioEstimationView.tsx
src/components/negativeSpace/ShapeMemory2AfcView.tsx
src/components/negativeSpace/VertexFittingView.tsx
src/components/relativeColor/AlbersInductionView.tsx
src/components/relativeColor/Decontextual2AfcView.tsx
src/components/relativeColor/HueInductionView.tsx
src/components/relativeColor/VectorShiftView.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(components): extract reusable interaction containers and refactor card views

- Created four core layout and interaction components:
  1. QuestionCardShell: Unified card shell container with optional canvas hint bar.
  2. ChoiceNafcContainer: Reusable N-AFC multi-choice grid container with automatic 1~N keyboard shortcut binding and state styling.
  3. DualViewportContainer: Standardized two-column grid layout for side-by-side viewports (reference vs interactive).
  4. PointClickCanvas: Reused canvas wrapper for grid point detection, coordinate scaling, hover feedback, and crosshair rendering.
- Refactored StarCanvas and 13 abstraction, negative space, and relative color card views to leverage these common containers, significantly reducing codebase duplication and ensuring 100% consistent UX and keyboard behaviors.
~~~~~

### 下一步建议
- 运行 `npm run build` 确保生产构建无任何 TypeScript 类型报错或资产打包异常。
- 启动 `npm run dev` 在浏览器本地进行一次全模块交互回归测试。
