好的，我们已经完成了日常训练流编排与管理功能的全套实现与多轮体验优化。现在将这些变更作为一个完整的版本提交至 Git 仓库。

## [COMMIT] feat(plan): 实现多训练计划编排管理与沉浸式日常训练流系统

### 用户需求
将近期完成的训练计划编排系统（包含多计划管理、快速收藏切换、JSON 导入导出、静默阶段流转与结算总结等完整功能）进行代码暂存并提交。

### 评论
本次提交落地了 FormSight 的核心日常日课体系，使用户不仅能进行单模块自由训练，还能编排多阶段组合日课，并在各模块自适应难度与能力档案之间无缝联动，大幅提升了系统的日用黏性与训练效率。

### 目标
1. 将所有相关变更文件添加到 Git 暂存区。
2. 创建格式规范、内容详尽的 Git 提交记录。

### 基本原理
按照 Quipu 提交规范，在确认所有功能与交互调优稳定后，使用 `[COMMIT]` 计划执行 `git_add` 与 `git_commit`，将包含版本升级（0.3.7）在内的所有修改封存为独立的可交付节点。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #comp/ui #concept/state #scope/core #scope/ux #ai/instruct #task/domain/ui #task/object/training-plan-system #task/action/implementation #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交所有变更文件

~~~~~act
git_add
package.json
src/app.tsx
src/components/AbstractionCanvas.tsx
src/components/GlobalSettingsModal.tsx
src/components/plan/PlanEditorModal.tsx
src/components/plan/PlanHeroCard.tsx
src/components/plan/PlanStepTransitionOverlay.tsx
src/components/plan/PlanSummaryModal.tsx
src/config/planTemplates.ts
src/hooks/useHashRoute.ts
src/hooks/useTodayStats.ts
src/hooks/useTrainingSession.ts
src/types/plan.ts
src/utils/db/importExport.ts
src/utils/db/queries.ts
src/utils/planStorage.ts
src/views/GenericTrainingView.tsx
src/views/Home.tsx
src/views/PlanTrainingView.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(plan): Implement customizable multi-stage training plans and daily workflow

- Add TrainingPlan data structures, storage manager (planStorage), and pre-configured default templates (planTemplates).
- Introduce PlanHeroCard on Home view with instant plan switcher and quick-start flow.
- Add PlanEditorModal for stage reordering, trial count presets, cloning, and JSON import/export.
- Implement PlanTrainingView and PlanSummaryModal with seamless stage transitions and aggregated performance analysis.
- Extend useTrainingSession and useHashRoute to support fixed-trial progression and stage-wise adaptive level tracking.
- Bump package version to 0.3.7.
~~~~~

### 下一步建议
- **真机/打包验证**: 执行 `npm run build` 或 `pnpm check` 验证打包产物与类型系统的一致性。
- **阶段流动画与音效**: 考虑在阶段切换与计划总结时增加轻量过渡动效或成就提示音，进一步强化训练完成时的正反馈体验。
