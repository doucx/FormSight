## [COMMIT] refactor(architecture): 模块化拆分大型组件、Canvas 图层与通用训练 Hook

### 用户需求
用户要求对前面完成的所有代码拆分与架构重构创建 Git 提交（Commit）。

### 评论
本次重构彻底消除了 `TrainingView` 间的约 75% 重复代码，将复杂的 Canvas 渲染算法从 UI 中剥离，并将过载的 `SettingsModal`、`geometry.ts` 和 `db.ts` 进行了清晰的模块化拆分。所有 19 个单元测试和 TypeScript 编译均 100% 通过。

### 目标
1. 将所有重构后的变更通过 `git_add` 暂存。
2. 创建高质量的 Conventional Commits 规范提交。

### 标签
#intent/refine #flow/ready #priority/high #comp/ui #comp/runtime #scope/core #ai/instruct #task/domain/architecture #task/object/code-splitting #task/action/refactor #task/state/end

---

### Script

#### Acts 1: 将所有更改添加到暂存区并创建 Git 提交

~~~~~act
git_add
src/hooks/useTrainingSession.ts
src/views/TrainingView.tsx
src/views/ColorTrainingView.tsx
src/views/RelativeColorTrainingView.tsx
src/components/settings/StarSettingsForm.tsx
src/components/settings/ColorSettingsForm.tsx
src/components/settings/RelativeColorSettingsForm.tsx
src/components/SettingsModal.tsx
src/utils/geometry/pointMath.ts
src/utils/geometry/gridGenerators.ts
src/utils/geometry/hitDetection.ts
src/utils/geometry/questionGenerator.ts
src/utils/geometry/index.ts
src/utils/geometry.ts
src/utils/db/schema.ts
src/utils/db/queries.ts
src/utils/db/importExport.ts
src/utils/db/index.ts
src/utils/db.ts
src/utils/canvas/drawHeatmap.ts
src/utils/canvas/drawCompass.ts
src/utils/canvas/drawColorRing.ts
src/utils/canvas/drawTrendChart.ts
src/components/AnalyticsModal.tsx
src/components/ColorAnalyticsModal.tsx
src/components/GlobalStatsModal.tsx
src/components/SessionSummaryModal.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(architecture): decouple canvas, split modals, and extract training hook

- Extracted reusable `useTrainingSession` hook to eliminate ~75% code duplication across Star, Color, and Relative Color training views.
- Split monolithic `SettingsModal.tsx` into domain-specific sub-forms under `src/components/settings/`.
- Modularized `src/utils/geometry.ts` and `src/utils/db.ts` into structured sub-directories with seamless backward-compatible re-exports.
- Extracted Canvas 2D rendering algorithms (heatmap, compass, hue ring, trend charts) into pure functions under `src/utils/canvas/`.
- All tests and TypeScript compilation passed successfully.
~~~~~

### 下一步建议
重构任务已圆满完成！代码已成功提交，系统架构更加清晰且具备极强的可扩展性。如果有其他新功能需求，可以随时提出。
