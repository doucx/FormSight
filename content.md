好的，修改已经通过测试验证。现在我们将本次更改提交至 Git 仓库。

## [COMMIT] feat(relative-color): optimize node C color distribution based on difficulty level

### 用户需求
用户请求完成本次相对色感优化功能的代码提交。

### 评论
本次优化成功缩减了低难度下相对色感题目中 $C$ 与 $A$ 的色相与明度距离，有效平滑了新手入门难度曲线，且单元测试全部通过。

### 目标
1. 将 `relativeColorUtils.ts` 与单元测试的更改暂存到 Git。
2. 创建内容规范的 Git Commit 提交。

### 基本原理
按照 ACA 协议的“脚本与 Git 操作互斥”原则，我们在独立的计划中执行 `git_add` 与 `git_commit` 操作，确保所有代码变更已经过验证。

### 标签
#intent/tooling #flow/done #priority/medium #comp/engine #scope/core #ai/instruct #task/domain/color #task/object/relative-color-level-curve #task/action/refactor #task/status/completed #task/state/end

---

### Script

#### Acts 1: 添加文件到 Git 暂存区

~~~~~act
git_add
src/utils/relativeColorUtils.ts
src/utils/__tests__/relativeColorUtils.test.ts
~~~~~

#### Acts 2: 提交代码更改

~~~~~act
git_commit
~~~~~
~~~~~text
feat(relative-color): optimize node C color distribution based on difficulty level

- Dynamically scale the color distance between node C and node A based on the training level (t = (level - 1) / 34).
- At Level 1, node C is constrained to be very close to node A (hue offset <= 10°), making the vector shift (A -> B applied to C -> D) extremely intuitive for beginners.
- At Level 35, node C spans the full color gamut randomly for expert-level training.
- Added comprehensive unit tests in relativeColorUtils.test.ts to verify the level-based color scaling.
~~~~~

### 下一步建议
- 更改已顺利提交。你可以随时通过 `npm run dev` 启动系统进行全流程真机体验。
