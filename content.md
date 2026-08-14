好的，现在我将这些修改添加到 Git 暂存区并进行提交。

## [COMMIT] chore: 移除专项强化中的智能自动模式与一键强化功能

### 用户需求
将之前对视角误差分析、色相分析模态框以及训练偏好设置中所做的清理操作（移除“一键开启专项强化”与“智能自动”靶向模式）作为一个逻辑完整的单元进行 Git 提交。

### 评论
此次提交简化了训练系统的靶向交互机制，去除了不可控的自动诊断算子，使功能更加直观和轻量。

### 目标
1. 使用 `git add` 将所有修改过的源文件和组件文件加入暂存区。
2. 使用带有详尽说明的 `git commit` 提交更改。

### 基本原理
按照 Quipu 协议，在文件变更稳定且经过确认后，使用独立的计划执行 Git 提交操作，形成清晰的版本历史记录。

### 标签
#intent/tooling #flow/done #priority/medium #comp/build #scope/dx #ai/instruct #task/domain/ui #task/object/settings-modal #task/action/implementation #task/state/end

---

### Script

#### Acts 1: 添加更改到暂存区并提交

~~~~~act
git_add
src/components/AnalyticsModal.tsx
src/components/ColorAnalyticsModal.tsx
src/components/SettingsModal.tsx
src/utils/colorUtils.ts
src/utils/geometry.ts
src/utils/settings.ts
src/views/ColorTrainingView.tsx
src/views/TrainingView.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(training): Remove smart auto targeting and quick-enable features

- Removed the "智能自动" (Smart Auto) targeting mode from user preferences, leaving only 'off' and 'manual' options.
- Cleaned up automated weak sector calculation logic from training views.
- Removed the "一键开启xx专项强化" buttons and handlers from both star-hopping and color analysis modals.
- Simplified header diagnostic badges.
~~~~~

### 下一步建议
当前阶段的任务已全部完成，系统已成功移除所有关于“一键开启”与“智能自动”的弱点强化设计。你可以随时开始构建或运行项目。
