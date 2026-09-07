好的，现在我们将所有对卡片视图的冗余文本报告清理及 2AFC 反馈统一化修改作为一个完整的逻辑交付单元，打包提交到 Git 仓库。

## [COMMIT] refactor(cards): 清理揭晓冗余报告并统一 2AFC 反馈图标

### 用户需求
用户已确认上述针对第一类冗余文本报告和第二类 2AFC 选项动态数据的清理方案，并指示创建 Git 提交。

### 评论
本次重构精简了 4 款卡片的底部文本报告栏及 4 款 2AFC 卡片的选项动态数值标注，统一规范为极简的绿色 Check 打勾反馈，彻底消除了界面在揭晓时的布局高度跳变与认知噪音，使全站的训练交互体验达到了高度一致。

### 目标
1. 将当前工作区中对各个卡片视图组件（`AngleEstimationView`, `PerspVpConvergenceView`, `PerspPropDivisionView`, `PerspPropMigrationView`, `AngleComparison2AfcView`, `AngleParallel2AfcView`, `NegAreaComparison2AfcView`, `RelDecontextual2AfcView`）以及多语言 JSON 文件的修改添加至 Git 暂存区。
2. 生成一份结构清晰、内容详尽的 Conventional Commits 规范提交。

### 基本原理
按照 Quipu 协议，在文件变更经过验证且处于就绪状态后，将变更原子化地提交。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/dx #scope/ux #ai/instruct #task/domain/ui #task/object/reveal-feedback #task/action/cleanup #task/state/end

---

### Script

#### Acts 1: 暂存并提交所有重构更改

我们将所有修改的文件添加到 Git 暂存区并进行结构化提交。

~~~~~act
git_add
src/cards/angle_estimation/AngleEstimationView.tsx
src/cards/angle_estimation/locales/zh-CN.json
src/cards/angle_estimation/locales/en-US.json
src/cards/persp_vp_convergence/PerspVpConvergenceView.tsx
src/cards/persp_vp_convergence/locales/zh-CN.json
src/cards/persp_vp_convergence/locales/en-US.json
src/cards/persp_prop_division/PerspPropDivisionView.tsx
src/cards/persp_prop_division/locales/zh-CN.json
src/cards/persp_prop_division/locales/en-US.json
src/cards/persp_prop_migration/PerspPropMigrationView.tsx
src/cards/persp_prop_migration/locales/zh-CN.json
src/cards/persp_prop_migration/locales/en-US.json
src/cards/angle_comparison_2afc/AngleComparison2AfcView.tsx
src/cards/angle_parallel_2afc/AngleParallel2AfcView.tsx
src/cards/angle_parallel_2afc/locales/zh-CN.json
src/cards/angle_parallel_2afc/locales/en-US.json
src/cards/neg_area_comparison_2afc/NegAreaComparison2AfcView.tsx
src/cards/neg_area_comparison_2afc/locales/zh-CN.json
src/cards/neg_area_comparison_2afc/locales/en-US.json
src/cards/rel_decontextual_2afc/RelDecontextual2AfcView.tsx
src/cards/rel_decontextual_2afc/locales/zh-CN.json
src/cards/rel_decontextual_2afc/locales/en-US.json
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(cards): remove redundant reveal text reports and standardize 2AFC feedback

Removes redundant bottom text report bars ("Target vs User Error") from continuous estimation and perspective division cards (angle_estimation, persp_vp_convergence, persp_prop_division, persp_prop_migration) to prevent visual clutter and layout shifts.

Also standardizes 2AFC comparison cards (angle_comparison_2afc, angle_parallel_2afc, neg_area_comparison_2afc, rel_decontextual_2afc) by removing dynamic numerical text labels from option headers upon reveal, unifying them to a clean, standard green checkmark icon feedback across the entire card ecosystem.
~~~~~

### 下一步建议
- **全面构建验证**: 建议运行 `pnpm build` 确认 TypeScript 类型定义及各语言包编译均通过。
- **视觉回归检查**: 可以在开发服务器中实际体验相关卡片，确保揭晓时的动画平滑且无任何高度闪烁。
