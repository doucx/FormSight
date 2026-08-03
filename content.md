好的，现在我们将刚刚修复的代码变更提交到 Git 仓库中。

## [COMMIT] fix(geometry): 修复双锚点模式下弱点靶向强化失效的 bug

### 错误分析

双锚点模式（水平双锚点和旋转双锚点）在生成目标点拓扑坐标 `(px, py)` 时，完全遗漏了 `options` 传入的靶向扇区参数，导致专项靶向强化功能在单锚点模式下有效，但在双锚点模式下退化为纯随机出题。

### 用户需求

提交针对 `src/utils/geometry.ts` 的修复，使双锚点模式也能正确依据设定的目标弱点扇区进行加权出题。

### 评论

该提交完成了对靶向强化逻辑在双锚点下的闭环支持。

### 目标

1. 将修改后的 `src/utils/geometry.ts` 加入 Git 暂存区。
2. 撰写规范的 Git Commit Message 并完成提交。

### 基本原理

通过 `git_add` 与 `git_commit` 将已验证的代码修改安全地持久化至仓库历史中。

### 标签

#intent/tooling #flow/ready #priority/high #comp/build #concept/history #scope/core #ai/instruct #task/domain/testing #task/object/targeting-mode #task/action/bug-fix #task/state/end #task/status/completed

---

### Script

#### Acts 1: 添加并提交修改

~~~~~act
git_add
src/utils/geometry.ts
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
fix(geometry): fix targeted weakness reinforcement failing in double anchor modes

The question generation logic in double anchor modes (double_h and double_r) previously ignored the 'options' parameter and generated target positions (px, py) purely at random. This caused the targeted weakness reinforcement feature to fail completely in double-anchor training sessions.

This commit introduces valid pair filtering based on target sectors for double-anchor modes, ensuring that 70% of targeted questions correctly align with the user's configured weak sectors, matching the behavior of single-anchor mode.
~~~~~

### 下一步建议

- **功能全面回归测试**: 建议在应用中对“单锚点”、“水平双锚点”、“旋转双锚点”三种模式分别开启手动靶向强化，检查练习题目的方向分布是否符合预期。
