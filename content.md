好的，我们已经完成了代码修改与闲置暂停补偿逻辑的整合。现在生成 `[COMMIT]` 计划将此次变更正式提交至版本库。

## [COMMIT] feat(plan): 优化训练流计时展示并同步闲置用时补偿

### 用户需求
将训练计划流（Plan Training）中计时器优化与闲置暂停补偿的完整变更提交至版本库。

### 评论
本次变更完善了多阶段训练流的用户体验与数据精确度：移除了子卡片冗余计时，将总计时提至计划顶栏，并建立了会话闲置状态跨层同步机制，确保了训练时长的真实性。

### 目标
1. 将所有受影响的代码文件暂存。
2. 按照 Conventional Commits 规范生成结构化 Git Commit。

### 基本原理
按照 Git 操作隔离原则，在一个独立的 `[COMMIT]` 计划中完成变更记录与提交，保证工作区变更的原子性。

### 标签
#intent/build #flow/done #priority/medium #comp/ui #concept/state #scope/ux #ai/instruct #task/domain/ui #task/object/plan-timer #task/action/integration #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交变更

~~~~~act
git_add
src/components/training/TrainingShell.tsx
src/views/GenericTrainingView.tsx
src/views/PlanTrainingView.tsx
src/hooks/useTrainingSession.ts
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(plan): improve timer display and sync idle pause compensation in plan training flow

- Add `showTimer` toggle to `TrainingShell` and `GenericTrainingView` to allow hiding per-card timer in multi-stage training plans.
- Display cumulative total elapsed time in `PlanTrainingView` header navbar.
- Expose `onIdleChange` and `onIdleResume` callbacks in `useTrainingSession` and `GenericTrainingView`.
- Synchronize idle duration compensation to plan session start time, freezing timer during inactivity and excluding idle duration from total time.
~~~~~

### 下一步建议
- **回归测试**: 可在完成整套多阶段训练计划后检查结课总结（`PlanSummaryModal`）中的「总用时」与顶栏用时是否完全一致。
- **扩展性考量**: 未来可考虑在设置页中允许用户自定义闲置超时秒数（目前默认 60s）或一键开启/关闭计划顶栏计时显示。
