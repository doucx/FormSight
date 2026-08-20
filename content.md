好的，我将为你生成一个 `[COMMIT]` 计划，将当前的工作区修改添加到暂存区并提交。

## [COMMIT] refactor(training): 提炼复用 Canvas 组件并新增画布提示与实验模块配置

### 用户需求
将当前关于 Canvas 渲染工具抽取、通用反馈与 2AFC 容器组件封装、OKLab 空间干扰项生成复用，以及画布提示与实验性卡片配置的各项优化变更创建为一个正式的 Git 提交。

### 评论
本次重构与增强不仅显著降低了各个训练 Canvas（如 `AbstractionCanvas`、`NegativeSpaceCanvas`、`RelativeColorCanvas`、`StarCanvas`）的代码冗余度，还将几何与色彩计算逻辑规范化（指数衰减插值、四面体等距色彩生成），同时引入了画布提示与实验性卡片过滤开关，全面提升了系统的可维护性与用户体验。

### 目标
1. 将所有已修改和新增的文件加入 Git 暂存区。
2. 创建一个结构清晰、内容完备的 Git 提交记录。

### 基本原理
根据 Git 提交规范与工作流准则，将已就绪且通过审查的变更打包为一个原子的 `[COMMIT]`，记录本次改动的核心内容、架构收益和功能点。

### 标签
#intent/build #flow/ready #priority/medium #comp/ui #concept/state #scope/dx #scope/ux #ai/instruct #task/domain/training #task/object/canvas-refactor #task/action/commit #task/state/end #task/status/completed

---

### Script

#### Acts 1: 添加更改并提交到 Git

将改动的文件加入暂存区，并生成规范的 Conventional Commit 提交信息。

~~~~~act
git_add
src/components/AbstractionCanvas.tsx
src/components/GlobalSettingsModal.tsx
src/components/NegativeSpaceCanvas.tsx
src/components/RelativeColorCanvas.tsx
src/components/StarCanvas.tsx
src/components/common/AnswerDiagnosticBar.tsx
src/components/common/Choice2AfcContainer.tsx
src/components/common/ContinuousTrackPanel.tsx
src/components/dashboard/GenericDashboard.tsx
src/components/dashboard/ModeCard.tsx
src/components/training/TrainingShell.tsx
src/config/cards.ts
src/config/trainingPlugins.tsx
src/types/card.ts
src/utils/abstractionUtils.ts
src/utils/canvas/drawPointGrid.ts
src/utils/canvas/drawPolygon.ts
src/utils/mathUtils.ts
src/utils/negativeSpaceUtils.ts
src/utils/oklchUtils.ts
src/utils/relativeColorUtils.ts
src/utils/settings.ts
src/views/GenericTrainingView.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(training): extract reusable canvas components and add hint settings

- Extract common canvas rendering logic (`drawPolygonCanvas`, `renderInteractivePointGrid`) into `src/utils/canvas/`
- Extract shared UI containers (`Choice2AfcContainer`, `AnswerDiagnosticBar`, `ContinuousTrackPanel`)
- Unify exponential decay interpolation and tetrahedral OKLab distractor generation into shared utility modules
- Add global settings for `showCanvasHints` and `showExperimentalCards`
- Update card definitions with gameplay instructions and experimental module flags
~~~~~

### 下一步建议
- **运行单元测试**: 建议运行测试套件（如 `pnpm test` 或 `npm run test`）以确保色彩计算、多边形生成与判断逻辑完全正常。
- **界面回归检查**: 在不同屏幕尺寸下测试各训练模式（特别是 2AFC 与 4AFC 布局），确保提示文本与响应式网格展示自然。
