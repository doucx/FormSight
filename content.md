好的，我们已经完成了将全局统计与单卡认知分析重构为独立页面视图、全面适配 Canvas HiDPI、以及增强训练计划编辑器等工作。现在我将生成一个包含 Git 提交的完整计划。

## [COMMIT] feat: 将统计与单卡分析重构为一等视图并完善 HiDPI 渲染

### 用户需求
将全局统计（`GlobalStatsModal`）与单卡弱点分析（`WeaknessAnalyticsModal`）从模态弹窗重构为全屏的一等路由视图（`GlobalStatsView` 与 `CardAnalyticsView`），并在所有模块中引入通用作答耗时（SAT）与层阶分布分析；同时优化高分屏（HiDPI）Canvas 渲染与训练计划编辑器的移动端交互。

### 评论
将分析与统计升级为一等路由视图（支持 `#/stats` 与 `#/analytics/:cardId`）极大地提升了用户在不同设备上的交互体验和 URL 可分享性/可回溯性。结合 HiDPI Canvas 适配与通用的认知诊断体系，为后续扩展更多专业认知训练模块打下了坚实基础。

### 目标
1. 提交将统计/单卡分析转为一等视图及相关路由扩展的全部修改。
2. 提交 Canvas HiDPI 适配及相关组件（PointClickCanvas、StarCanvas、DrawPolygon 等）的绘制优化。
3. 提交计划编辑器（PlanEditorView）对紧凑型筛选器与移动端双 Tab 的增强。
4. 升级版本号至 `0.5.2` 并同步中英文本地化文案。

### 基本原理
将文件变动暂存并记录为一次结构清晰、符合规范的 Conventional Commit 提交。本次提交涵盖了路由系统扩展、视图层拆分、画布高清化渲染以及国际化配置的完整工作单元。

### 标签
#intent/build #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/analytics-and-stats-views #task/action/refactor #task/state/end #task/status/completed

---

### Script

#### Acts 1: 提交所有代码与视图重构变更

将修改的文件与新增视图添加到 Git 暂存区并创建提交。

~~~~~act
git_add
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat: promote stats and card analytics to full views and add HiDPI rendering

- Refactored GlobalStatsModal and WeaknessAnalyticsModal into first-class route views (GlobalStatsView and CardAnalyticsView).
- Extended useHashRoute to support #/stats and #/analytics/:cardId?tab=... routes.
- Added universal analytics views (SAT speed-accuracy and difficulty plateau distribution) for all training cards.
- Integrated setupHiDpiCanvas across all canvas visualizers and interactive views for crisp rendering on high-density screens.
- Enhanced PlanEditorView with compact FilterEngine integration and mobile-friendly tab navigation.
- Bumped version to 0.5.2 and updated i18n locale strings.
~~~~~

### 下一步建议
- **回归测试**: 运行自动化测试或在移动端与桌面端实际检验各个训练卡片的 Canvas 交互与分析页面渲染效果。
- **发布准备**: 如需发布新版本，可考虑打上 `v0.5.2` 的 Git Tag 并推送到远端仓库。
