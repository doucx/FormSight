好的，现在我们将本次对 `src/app.tsx`（修复相对色感初始 Level 读取）和 `src/components/GlobalStatsModal.tsx`（添加相对色感全局统计与筛选）的修改作为一个完整的逻辑单元提交到 Git 仓库。

## [COMMIT] feat(stats): 修复相对色感层阶继承问题并添加全局统计支持

### 用户需求
用户要求将之前的修改创建为一个干净的 Git 提交。

### 评论
本次提交包含了两个核心改进：
1. 修复了相对色感模式重新开始训练时难度等级重置为 5 的 Bug。
2. 为全局数据统计弹窗（`GlobalStatsModal`）补全了相对色感模块的数据聚合与多维度筛选支持。

### 目标
1. 将修改的文件添加至 Git 暂存区。
2. 执行带有规范化提交信息的 Git 提交。

### 基本原理
根据 Quipu 协议，文件系统变更与 Git 提交操作必须严格隔离在独立的 Plan 中执行。当前计划为纯粹的 `[COMMIT]` 计划，仅包含 `git_add` 与 `git_commit` 指令。

### 标签
#intent/build #flow/ready #priority/high #comp/ui #concept/state #scope/dx #ai/instruct #task/domain/ui #task/object/git-commit #task/action/integration #task/state/end

---

### Script

#### Acts 1: 将更改暂存并提交

~~~~~act
git_add
src/app.tsx
src/components/GlobalStatsModal.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(stats): Fix relative color level persistence and add global stats support

1. Fix Relative Color Level Reset Bug:
   - Updated src/app.tsx to declare relativeProfiles state and fetch profiles by domain ('relative_color') in refreshProfiles.
   - Replaced hardcoded initialLevel={5} in RelativeColorTrainingView with activeRelativeLevel queried from database profiles.

2. Add Relative Color Support to Global Stats:
   - Updated GlobalStatsModal.tsx to include 'relative_color' in UnifiedRecord and FilterOption.
   - Fetched relative color trial records using getTrialRecords('relative_color') and integrated them into the unified timeline and heatmap/trend chart aggregation.
   - Added '相对色感' optgroup and options to the stats filter dropdown.
~~~~~

### 下一步建议

所有核心功能与统计模块已全部完整打通并成功提交。你可以随时运行 `npm run dev` 启动项目体验完整的寻星、绝对色感与相对色感全功能训练系统！
