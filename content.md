好的，我们已经完成了针对 DRY 与重复代码克隆的系统重构并修复了模块导出问题。现在我将为你生成一个 `[COMMIT]` 计划，将这些代码改进与清理作为一个完整的逻辑单元提交到 Git 仓库。

## [COMMIT] refactor: 消除 Canvas 样板代码、样式克隆与重复度量计算

### 用户需求
将本次 DRY 治理、Canvas 绘图与通用统计分析提炼、公共组件样式抽离以及时间格式化统一等重构工作提交至 Git 版本控制。

### 评论
本次提交显著收敛了各扩展包及核心模块间的重复代码，消除了大量 Canvas 2D 上下文初始化、准确率聚合及 Modal/Filter 重复 UI 结构，为后续扩展打下更简洁健壮的工程基础。

### 目标
1. 将所有涉及重构与治理的文件加入 Git 暂存区。
2. 创建一条语义清晰、结构完整的 Conventional Commit 提交信息。

### 基本原理
按照系统规范，在独立的 `[COMMIT]` 计划中仅执行 Git 暂存与提交操作，确保代码变动的原子性与可追溯性。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #comp/runtime #comp/interfaces #scope/core #scope/dx #ai/instruct #task/domain/refactoring #task/object/dry-consolidation #task/action/git-commit #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交代码变动

~~~~~act
git_add
scripts/check_dry.py
src/components/SessionSummaryModal.tsx
src/components/discovery/FilterEngine.tsx
src/components/plan/PlanSummaryModal.tsx
src/components/training/TrainingShell.tsx
src/core/analytics/universalViews.tsx
src/core/canvas/hidpi.ts
src/core/contracts.ts
src/packs/abstraction/canvas/drawPaletteTiles.ts
src/packs/abstraction/canvas/drawParticles.ts
src/packs/abstraction/components/TopDown2AfcView.tsx
src/packs/angle/utils/angleUtils.ts
src/packs/color/analytics.tsx
src/packs/negative_space/analytics.tsx
src/packs/perspective/utils/perspectiveUtils.ts
src/packs/star/analytics.tsx
src/utils/canvas/drawColorRing.ts
src/utils/canvas/drawCompass.ts
src/utils/canvas/drawHeatmap.ts
src/utils/canvas/drawHueBiasChart.ts
src/utils/theme.ts
src/utils/time.ts
src/views/PlanTrainingView.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor: consolidate canvas boilerplates, dry up analytics and reusable styles

- Add `setup2DCanvas` helper in `src/core/canvas/hidpi.ts` for standardized canvas initialization.
- Provide `calculateBasicOverallStats` in `src/core/contracts.ts` to deduplicate overall stats computations across pack analytics.
- Refactor canvas utilities across packs (`abstraction`, `angle`, `perspective`) to use unified 2D canvas setup.
- Extract `PromptFrame` and `CANVAS_OPTION_CLASS` in `TopDown2AfcView` to reduce Tailwind class set duplications.
- Unify time formatting via `formatSecondsToTimer` and accuracy colors/badges in `src/utils/theme.ts`.
- Integrate `ModalShell` into `SessionSummaryModal` and `PlanSummaryModal`.
~~~~~

### 下一步建议
- **CI 规则集成**: 可考虑将 `python scripts/check_dry.py --fail-on-smells` 配置到 Pre-commit Hook 或 GitHub Actions 工作流中，防止后续功能开发中引入新的代码克隆。
- **性能监控**: 验证海量历史答题记录下的 Canvas 渲染帧率与分析大盘加载速度。
