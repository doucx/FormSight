## [COMMIT] refactor(i18n): 统一卡片 i18n 架构并重构全部卡片视图以使用 useCardTranslation

### 用户需求
梳理全部卡片视图，移除直接引用的全局 `useTranslation()` 及 `cards.<cardId>.` 绝对字符串，统一部署 `useCardTranslation`。

### 评论
这是一项重要的架构重构与规范统一工作。通过将卡片内部的翻译键从全局命名空间中剥离并展平，并强制采用专用的 `useCardTranslation`，不仅大大简化了 locales 词典的层级结构，还彻底解耦了卡片私有国际化与全局词典的耦合度，显著提升了系统的可维护性和扩展性。

### 目标
1. 将所有已修改的卡片组件、locales 词典文件、路由清理以及自动化审计脚本添加到 Git 暂存区。
2. 创建一个结构规范、描述清晰的 Git 提交，标记本次国际化架构重构任务的顺利结束。

### 基本原理
由于文件修改已经完成，我们需要遵循 Quipu 的操作隔离原则，在一个独立的 `[COMMIT]` 计划中执行 `git_add` 和 `git_commit`，确保所有变更安全入库。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #comp/runtime #concept/config #scope/core #ai/instruct #task/domain/i18n #task/object/card-translation #task/action/refactor #task/state/end

---

### Script

#### Acts 1: 添加更改到暂存区并提交
我们将所有修改过的卡片组件、locales 文件及审计脚本添加到 Git 暂存区，并提交更改。

~~~~~act
git_add
scripts/audit-card-i18n.mjs
src/cards/abs_gesture_axis/AbsGestureAxisView.tsx
src/cards/abs_notan_threshold/AbsNotanThresholdView.tsx
src/cards/abs_palette_clustering/AbsPaletteClusteringView.tsx
src/cards/abs_polygon_decimation/AbsPolygonDecimationView.tsx
src/cards/abs_td_gesture_2afc/AbsTdGesture2afcView.tsx
src/cards/abs_td_hull_2afc/AbsTdHull2afcView.tsx
src/cards/abs_td_notan_2afc/AbsTdNotan2afcView.tsx
src/cards/abs_td_palette_2afc/AbsTdPalette2afcView.tsx
src/cards/angle_comparison_2afc/AngleComparison2AfcView.tsx
src/cards/angle_comparison_2afc/locales/en-US.json
src/cards/angle_comparison_2afc/locales/zh-CN.json
src/cards/angle_estimation/AngleEstimationView.tsx
src/cards/angle_estimation/locales/en-US.json
src/cards/angle_estimation/locales/zh-CN.json
src/cards/angle_parallel_2afc/AngleParallel2AfcView.tsx
src/cards/angle_parallel_2afc/locales/en-US.json
src/cards/angle_parallel_2afc/locales/zh-CN.json
src/cards/color_all/ColorAllView.tsx
src/cards/fractal_edge_roughness/FractalEdgeRoughnessView.tsx
src/cards/fractal_edge_roughness/locales/en-US.json
src/cards/fractal_edge_roughness/locales/zh-CN.json
src/cards/neg_area_comparison_2afc/NegAreaComparison2AfcView.tsx
src/cards/neg_area_comparison_2afc/locales/en-US.json
src/cards/neg_area_comparison_2afc/locales/zh-CN.json
src/cards/neg_ratio_estimation/NegRatioEstimationView.tsx
src/cards/neg_ratio_estimation/locales/en-US.json
src/cards/neg_ratio_estimation/locales/zh-CN.json
src/cards/neg_shape_match_2afc/NegShapeMatch2AfcView.tsx
src/cards/neg_shape_match_2afc/locales/en-US.json
src/cards/neg_shape_match_2afc/locales/zh-CN.json
src/cards/neg_vertex_fitting/NegVertexFittingView.tsx
src/cards/neg_vertex_fitting/locales/en-US.json
src/cards/neg_vertex_fitting/locales/zh-CN.json
src/cards/persp_gestalt_continuation/PerspGestaltContinuationView.tsx
src/cards/persp_gestalt_continuation/locales/en-US.json
src/cards/persp_gestalt_continuation/locales/zh-CN.json
src/cards/persp_prop_division/PerspPropDivisionView.tsx
src/cards/persp_prop_division/locales/en-US.json
src/cards/persp_prop_division/locales/zh-CN.json
src/cards/persp_prop_migration/PerspPropMigrationView.tsx
src/cards/persp_prop_migration/locales/en-US.json
src/cards/persp_prop_migration/locales/zh-CN.json
src/cards/persp_structure_3d/PerspStructure3DView.tsx
src/cards/persp_structure_3d/locales/en-US.json
src/cards/persp_structure_3d/locales/zh-CN.json
src/cards/persp_vp_convergence/PerspVpConvergenceView.tsx
src/cards/persp_vp_convergence/locales/en-US.json
src/cards/persp_vp_convergence/locales/zh-CN.json
src/cards/rel_decontextual_2afc/RelDecontextual2AfcView.tsx
src/cards/rel_decontextual_2afc/locales/en-US.json
src/cards/rel_decontextual_2afc/locales/zh-CN.json
src/cards/rel_hue_induction/RelHueInductionView.tsx
src/cards/rel_hue_induction/locales/en-US.json
src/cards/rel_hue_induction/locales/zh-CN.json
src/cards/rel_lightness_induction/RelLightnessInductionView.tsx
src/cards/rel_lightness_induction/locales/en-US.json
src/cards/rel_lightness_induction/locales/zh-CN.json
src/cards/rel_vector_shift/RelVectorShiftView.tsx
src/cards/rel_vector_shift/locales/en-US.json
src/cards/rel_vector_shift/locales/zh-CN.json
src/components/routing/AppRouter.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(i18n): unify card i18n architecture and refactor views to use useCardTranslation

- Introduced automated audit script `scripts/audit-card-i18n.mjs` to enforce card i18n architectural contracts.
- Refactored all card views to replace global `useTranslation()` and absolute `cards.<cardId>.` keys with `useCardTranslation`.
- Flattened nested `views` and `labels` structures in card-private locale JSON files across all modules.
- Cleaned up unused props and imports in AppRouter and various views.
~~~~~

### 下一步建议
- 运行审计脚本 `node scripts/audit-card-i18n.mjs` 验证当前项目国际化契约是否全部通过。
- 进行项目构建与测试验证，确保所有卡片视图渲染正常。
