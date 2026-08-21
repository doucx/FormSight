## [COMMIT] refactor(training): track trial level transition and enhance trend visualization

~~~~~act
git_add
src/app.tsx
src/components/SessionSummaryModal.tsx
src/components/abstraction/GestureAxisView.tsx
src/components/plan/PlanSummaryModal.tsx
src/hooks/useTrainingSession.ts
src/utils/canvas/drawParticles.ts
src/utils/canvas/drawTrendChart.ts
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(training): track trial level transition and enhance trend visualization

- Split SessionHistoryItem level tracking into `levelBefore` and `levelAfter` to capture accurate adaptive level progression per trial.
- Update `SessionSummaryModal`, `PlanSummaryModal`, and session trend charts to properly compute and render start/end and intermediate level paths.
- Enhance GestureAxisView and drawParticles to visually display user selected values alongside target angles with hit/miss feedback coloring.
- Streamline canvas rendering logic for crowded and super-crowded trial points in trend charts.
~~~~~

---

### 下一步建议
- **运行测试**: 如果项目中包含对应的单元测试或端到端测试，建议执行 `npm test` 或相关测试命令，验证改动未引入任何回归问题。
- **状态标记**: 在确认无误后，您可以在本地仓库中彻底归档当前任务流。
