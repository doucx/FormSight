好的，既然所有改动已经完成并经过确认，现在我们将这些改进作为一个完整的逻辑单元提交到 Git 仓库中。

以下是针对本次提交的 Quipu 计划：

## [COMMIT] feat(ui): 实现点阵悬停高亮、网格点吸附对齐及空白点击过滤

### 用户需求
用户需要将先前完成的“点阵悬停高亮”、“网格点精确吸附”与“空白区域点击过滤”功能作为一个完整的提交记录归档。

### 评论
该改动极大地提升了寻星练习 (Star-Hopping) 的交互品质和数据统计纯净度，将用户的认知负荷从鼠标微调中解放出来。现在可以将其正式提交。

### 目标
1. 将修改后的代码文件添加到 Git 暂存区。
2. 创建内容规范的 Git 提交。

### 基本原理
按照 Quipu 协议规范，代码修改与 Git 提交操作必须严格隔离在独立的 Plan 中。当前计划仅包含 `git_add` 和 `git_commit` 动作，标志着前序功能开发的完美闭环。

### 标签
#intent/build #flow/ready #priority/high #comp/ui #concept/ui #scope/dx #ai/instruct #task/domain/ui #task/object/grid-hover-and-snap #task/action/implementation #task/state/end

---

### Script

#### Acts 1: 将文件添加至 Git 暂存区

~~~~~act
git_add
src/types/index.ts
src/utils/geometry.ts
src/components/StarCanvas.tsx
src/views/TrainingView.tsx
~~~~~

#### Acts 2: 提交代码变更

~~~~~act
git_commit
~~~~~
~~~~~text
feat(ui): implement grid hover highlight, snap-to-grid, and blank click filtering

- Add `isWithinRange` to `HitResult` and implement `findNearestGridPoint` tolerance checking (radius <= 55% of gridStep).
- Implement interactive hover highlight (indigo-600, radius 6) on the right canvas when mouse is near a valid grid point.
- Filter out clicks outside the valid grid point capture range, preventing accidental misclicks in blank areas.
- Anchor all visual feedback (red error dots and dashed error lines) and saved session records strictly to the snapped grid point center (`nearestGridPoint`) rather than raw mouse coordinates.
~~~~~

### 下一步建议
- **运行构建验证**: 执行 `npm run build` 确保 TypeScript 编译通过且无任何类型错误。
- **开启新任务**: 如有其他优化需求（如音效反馈或移动端 Touch 支持），可启动新的宏观任务。
