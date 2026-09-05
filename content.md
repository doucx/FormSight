所有修改已就绪，现在将这些更改作为一个完整的逻辑单元提交到版本控制系统中。

## [COMMIT] fix: 修复任务文字指引全局选项在多张卡片中未生效的问题

### 错误分析

此前在 `neg_area_comparison_2afc`、`neg_shape_match_2afc`、`fractal_edge_roughness` 等 12 张卡片中，入口 `index.tsx` 的 `renderCanvas` 函数未解构宿主环境传入的 `settings` 参数，或解构后遗漏了 `showCanvasHints` 的透传，同时 `FractalEdgeRoughnessView` 也缺失该属性声明。这导致当全局“显示任务文字指引”被关闭时，这些卡片由于缺少输入而退回到默认的 `showCanvasHints = true`，使得顶部提示胶囊无法受控隐藏。

### 用户需求

提交针对所有受影响卡片任务文字指引透传链路的修复代码，将其固化至 Git 历史。

### 评论

本次提交消除了各训练卡片在运行时设置透传层面的实现差异，使 `showCanvasHints` 这一全局偏好项在整个卡片矩阵中表现完全一致。

### 目标

1. 将 12 张卡片相关修改（包括 `FractalEdgeRoughnessView.tsx` 及各卡片 `index.tsx`）暂存并提交到 Git。
2. 附带规范详尽的 Conventional Commits 提交说明。

### 基本原理

按照 Quipu 协议规范，所有的文件系统修改操作已在上一计划中完成。本阶段仅执行 Git 暂存与提交操作，确保文件变更与版本控制动作严格隔离。

### 标签

#intent/fix #flow/ready #priority/high #comp/interfaces #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/task-hints-visibility #task/action/bug-fix #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交变更

我们将所有修复涉及的文件加入暂存区，并生成清晰的提交信息。

~~~~~act
git_add
src/cards/fractal_edge_roughness/FractalEdgeRoughnessView.tsx
src/cards/fractal_edge_roughness/index.tsx
src/cards/neg_area_comparison_2afc/index.tsx
src/cards/neg_shape_match_2afc/index.tsx
src/cards/neg_ratio_estimation/index.tsx
src/cards/persp_vp_convergence/index.tsx
src/cards/persp_gestalt_continuation/index.tsx
src/cards/persp_prop_division/index.tsx
src/cards/persp_prop_migration/index.tsx
src/cards/persp_structure_3d/index.tsx
src/cards/angle_comparison_2afc/index.tsx
src/cards/angle_parallel_2afc/index.tsx
src/cards/angle_estimation/index.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
fix(cards): ensure showCanvasHints setting propagates to all card views

Fixes an issue where disabling the global "show task hints" setting
did not hide the hint capsule in several cards.

Specifically:
- In `fractal_edge_roughness`, added `showCanvasHints` prop support to `FractalEdgeRoughnessView` and forwarded it to `QuestionCardShell`.
- In 12 card manifest files (`index.tsx`), unpacked `settings` in `renderCanvas` and explicitly passed `showCanvasHints` to their respective view components.
~~~~~

### 下一步建议

- **词典同义词规范整理**: 建议后续排查各个卡片内部对 `hint` 键名的命名（如 `hint`、`instruction`、`prompt`、`areaHint`），并在国际化词典层面做统一规范化梳理。
- **SDK Props 约束**: 考虑在 `@formsight/card-sdk` 中定义通用的 `BaseCardViewProps` 接口，以便在 TypeScript 编译期强制检查通用设置字段的透传完整性。
