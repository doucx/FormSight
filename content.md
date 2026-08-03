好的，现在我们进行代码的最终提交。由于所有文件修改已经完成并通过验证，我们将执行一个纯粹的 `[COMMIT]` 计划，将改动添加至暂存区并生成规范的 Git Commit。

## [COMMIT] feat(training): 引入轮次胜率评估自适应算法与目标正确率设置

### 用户需求
将之前完成的所有代码变更（自适应算法重构、偏好设置项扩展、设置弹窗 UI、训练视图精简）作为一个完整的逻辑工作单元进行 Git 提交。

### 评论
本次改动成功将寻星练习的自适应训练模式从过于敏感的 3U1D 阶梯法升级为带有目标正确率和轮次评估的 Block 算法，并在 UI 上移除了容易产生心理压力的进度高亮，使训练体验更加沉浸和科学。

### 目标
1. 将修改后的所有源码文件（`src/utils/settings.ts`, `src/utils/adaptiveEngine.ts`, `src/components/SettingsModal.tsx`, `src/views/TrainingView.tsx`）加入 Git 暂存区。
2. 创建结构清晰、符合 Conventional Commits 规范的 Git 提交。

### 基本原理
按照 ACA 协议与 Quipu 脚本规范，文件系统变更与 Git 提交操作必须严格隔离在不同的计划中。前置计划已完成文件修改，当前独立计划专注执行 `git_add` 与 `git_commit`。

### 标签
#intent/build #flow/ready #priority/high #comp/cli #concept/config #scope/core #ai/instruct #task/domain/adaptive-engine #task/object/git-commit #task/action/implementation #task/state/end

---

### Script

#### Acts 1: 添加文件到 Git 暂存区并提交

~~~~~act
git_add
src/utils/settings.ts
src/utils/adaptiveEngine.ts
src/components/SettingsModal.tsx
src/views/TrainingView.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(training): introduce block-based adaptive engine and target accuracy settings

- Replaced the volatile 3-Up / 1-Down staircase algorithm in adaptive training with a robust Block-based Mastery Engine (round win-rate evaluation).
- Added user-configurable settings: adaptive algorithm mode ('block' vs 'staircase'), target pass accuracy (70% - 90%), and block trial count (10 - 20).
- Refactored TrainingView and SettingsModal to support the new configuration seamlessly without intrusive stress-inducing progress highlights in the header.
- Ensured full backward compatibility with existing benchmark tests and standard trial recording.
~~~~~

### 下一步建议
- **数据分析扩展**: 可以考虑在 Dashboard 或后续的统计看板中，增加用户在各个难度网格步长（Grid Step）上的历史胜率热力图，帮助用户直观看到自己的空间感知能力进阶曲线。
