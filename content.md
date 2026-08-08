## [COMMIT] refactor(ui): 调整练习时长显示位置至主页与模块卡片，移除看板顶栏时间并精简主页卡片标签

### 用户需求
将寻星练习和色感训练的独立与总练习时长整合到主页展示，隐藏各看板内部的重复计时，并清空主页卡片顶部的冗余徽章。

### 评论
本次迭代通过对时长统计算子与视图组件的重构，优化了多模块应用的导航体验与界面纯净度。

### 目标
1. 提交所有关于时间展示重构与 UI 精简的代码变更。

### 基本原理
根据协议，当所有代码变更已完成并通过验证后，打包为规范的 Git 提交。

### 标签
#intent/build #flow/ready #priority/high #comp/build #concept/sync #scope/core #ai/instruct #task/domain/ui #task/object/git-commit #task/action/integration #task/state/end

---

### Script

#### Acts 1: 添加修改到暂存区

~~~~~act
git_add
src/utils/db.ts
src/app.tsx
src/views/Home.tsx
src/views/Dashboard.tsx
src/views/ColorDashboard.tsx
~~~~~

#### Acts 2: 提交代码变更

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(ui): relocate training timers to home cards and streamline UI

- Update database queries to independently compute star-hopping and color training durations.
- Display overall training time on the home top bar and respective module times on the home cards.
- Remove redundant timer badges from sub-dashboards and strip unnecessary category tags from home cards.
~~~~~

### 下一步建议
- **回归测试**: 可以进行一次端到端的全功能测试，确保计时器在各个模式下能够准确累计并在主页和卡片上正确呈现。
