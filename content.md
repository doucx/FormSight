好的，现在我们将这些改动作为一个完整的逻辑单元提交到 Git 仓库。

## [COMMIT] fix(ui): 移除刷题界面顶栏的实时总正确率显示

### 用户需求
用户要求创建 Git 提交，将前面完成的关于“删除刷题界面顶栏总正确率”的代码修改记录正式固化。

### 评论
将代码改动封装为规范的 Git 提交，确保开发历史记录清晰。

### 目标
1. 将修改后的 `TrainingView.tsx` 和 `ColorTrainingView.tsx` 添加到暂存区。
2. 创建符合 Conventional Commits 规范的 Git 提交。

### 基本原理
按照 Quipu 架构规范，文件系统变更与 Git 提交操作必须在不同的计划中隔离执行。现在文件修改已落地且验证通过，我们可以安全地执行 `git_add` 和 `git_commit`。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/training-header #task/action/refactor #task/state/end

---

### Script

#### Acts 1: 暂存并提交代码修改

~~~~~act
git_add
src/views/TrainingView.tsx
src/views/ColorTrainingView.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(ui): remove overall accuracy metric from training headers

Removes the real-time overall accuracy display from the header component in both Star Hopping (TrainingView) and Color Recognition (ColorTrainingView) modes.

This change reduces psychological pressure on users during practice sessions, allowing them to focus entirely on visual intuition and task performance rather than fluctuating metrics.
~~~~~

### 下一步建议
- **回归测试**: 可以执行 `npm run lint` 或 `npm run build` 确保没有引入任何 TypeScript 类型错误或未使用的变量告警。
