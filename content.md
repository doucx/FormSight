## [COMMIT] feat(stats): add global statistics modal with sub-mode filtering, heatmap, and trend charts

### 用户需求
用户要求将全局统计面板的修改内容进行 Git 提交。

### 评论
该提交包含完整的全局统计分析功能：
1. 主页 Header 增加“统计”入口。
2. 实现 `GlobalStatsModal.tsx` 弹窗组件，包含大盘数据概览（今日、近7天、本年、生涯）。
3. 集成精细化下拉选择器（支持全量、寻星子模式、色感子模式过滤）。
4. 实现近 12 周打卡热力图及 Canvas 能力峰值演进轨迹折线图。

### 目标
1. 将暂存区所有改动（包括 `Home.tsx`, `app.tsx`, `GlobalStatsModal.tsx`）加入 Git 暂存。
2. 创建内容详尽的 Git 提交。

### 基本原理
按照 Quipu 执行协议，所有文件系统变更在验证完成后通过独立的 `[COMMIT]` 计划提交至 Git 仓库。

### 标签
#intent/build #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/global-stats #task/action/implementation #task/state/end #task/status/completed

---

### Script

#### Acts 1: 添加文件至暂存区并提交

~~~~~act
git_add
src/components/GlobalStatsModal.tsx
src/views/Home.tsx
src/app.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(stats): add global statistics modal with sub-mode filtering, heatmap, and trend charts

Introduces a comprehensive global statistics panel inspired by Anki, accessible directly from the Home view's header.

Key features:
1. **Multi-dimensional Filtering**: Includes a top-bar dropdown allowing users to filter statistics by all modules, specific Star-Hopping sub-modes (Single, Horizontal Double, Rotated Double), or Color-Sense sub-modes (Hue, Value, Saturation).
2. **Core Metrics**: Displays trial counts and accuracy rates for Today, Last 7 Days, This Year, and All-Time.
3. **Activity Heatmap**: A GitHub-style contribution grid reflecting activity density over the past 12 weeks (84 days).
4. **Progression Line Chart**: A canvas-based trend chart tracking daily peak difficulty levels over recent active days.
~~~~~

### 下一步建议
- 统计功能现已成功集成并提交！可以继续运行 `npm run dev` 体验应用。
