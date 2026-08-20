收到，这就为您将本次计划训练流交互优化与版本升级的修改提交到 Git 仓库。

## [COMMIT] feat(plan): 优化训练流退出交互与配置加载容错并升级版本至 0.3.8

### 用户需求
将当前关于计划训练流顶部交互优化（统一退出按钮至流水线控制栏）、卡片配置加载失败兜底容错以及版本号升级至 0.3.8 的更改打包为 Git 提交。

### 评论
将训练流的退出控制收拢至最外层流水线工具栏，避免了双重退出按钮带来的视觉和语义冲突；同时补充了 `getProfile` 的异步 catch 容错，防止卡片数据异常时界面死锁在加载态，显著提升了交互体验与应用健壮性。

### 目标
1. 暂存所有已修改的文件（`package.json`、`PlanHeroCard.tsx`、`TrainingShell.tsx`、`GenericTrainingView.tsx`、`PlanTrainingView.tsx`）。
2. 生成符合 Conventional Commits 规范的提交信息。

### 基本原理
使用 Quipu 的 `git_add` 与 `git_commit` 专用指令，将本次变更作为独立的原子提交沉淀到版本库中，确保提交历史清晰、可回溯。

### 标签
#intent/build #flow/ready #priority/medium #comp/interfaces #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/plan-training-flow #task/action/integration #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交代码更改

将本次涉及版本升级与计划训练流交互优化的全部文件加入暂存区并生成 commit。

~~~~~act
git_add
package.json
src/components/plan/PlanHeroCard.tsx
src/components/training/TrainingShell.tsx
src/views/GenericTrainingView.tsx
src/views/PlanTrainingView.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(plan): improve training flow exit UI, add profile fallback, and bump to v0.3.8

- Add showExitButton prop to TrainingShell and GenericTrainingView to allow hiding the inner exit button.
- Add an explicit 'Exit Training Flow' button to PlanTrainingView's top status bar for consistent UX.
- Add catch fallback handling for getProfile in PlanTrainingView to prevent infinite loading on card profile fetch failures.
- Format PlanHeroCard reduction logic.
- Bump version to 0.3.8.
~~~~~

### 下一步建议
- **回归测试**: 启动本地开发服务，完整跑一次多阶段的训练计划（Plan），验证中途退出、完成阶段切换以及跳过阶段时的交互与总结弹窗是否正常。
- **发布准备**: 如需发布构建产物或更新 Changelog，可继续执行构建脚本与发布流程。
