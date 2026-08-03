好的，我们现在将刚才的所有代码变更（总练习时长统计功能以及基准测试强制使用 3U1D 阶梯算子）作为一个完整的逻辑单元提交到 Git 暂存区并进行 Commit。

## [COMMIT] feat(training): 添加总练习时长统计并强制基准测试使用 3U1D 阶梯

### 用户需求
将之前完成的所有修改（在 Dashboard 顶栏右侧新增“天-小时-分钟”计量格式的累积练习总时长显示，以及强制基准测试统一采用经典 3U1D 阶梯自适应算子）作为一个完整的原子变更进行 Git 提交。

### 评论
该提交包含了一个核心新功能（练习总时长追踪与展示）和一个算法规范化优化（基准测试强制采用标准的 3U1D 阶梯测验算子），逻辑清晰且符合业务演进。

### 目标
1. 将 `src/utils/db.ts`、`src/views/Dashboard.tsx`、`src/app.tsx` 和 `src/views/TrainingView.tsx` 的改动添加到 Git 暂存区。
2. 创建内容详尽的 Git Commit。

### 基本原理
按照 Quipu 的工作流规范，在文件修改并通过验证后，使用独立的 `[COMMIT]` 计划执行 `git_add` 和 `git_commit` 操作，确保版本记录清晰、规范。

### 标签
#intent/build #flow/ready #priority/high #comp/ui #comp/runtime #concept/history #scope/core #ai/instruct #task/domain/version-control #task/object/git-commit #task/action/submission #task/state/end

---

### Script

#### Acts 1: 添加文件到 Git 暂存区

~~~~~act
git_add
src/utils/db.ts
src/views/Dashboard.tsx
src/app.tsx
src/views/TrainingView.tsx
~~~~~

#### Acts 2: 提交 Git 更改

~~~~~act
git_commit
~~~~~
~~~~~text
feat(training): add total practice duration tracking and enforce 3U1D staircase for benchmarks

1. Total Training Duration Tracking:
   - Added getTotalTrainingTimeMs() and formatTotalTime() in db.ts to aggregate completed session durations and format them as 'X天Y小时Z分钟'.
   - Updated Dashboard and App components to display the cumulative practice duration right next to the 'Star-Hopping' title in the header.

2. Benchmark Enforced Staircase Algorithm:
   - Enforced 'staircase' (3-Up/1-Down) adaptive mode for benchmark sessions, ensuring consistent psychophysical testing standards regardless of user preferences.
~~~~~

### 下一步建议
- 变动已顺利提交。你可以运行 `git status` 或 `git log` 查看提交记录，或使用 `npm run build` 确保生产环境打包无误。
