太棒了，看到相关的图表和卡片分析组件已经完善。按照您的请求，接下来我们将当前的改动封装成一个清晰、规范的 Git 提交。

以下是本次提交计划：

## [WIP] feat(analytics): 添加 fractal_edge_roughness 分析图表与高分屏画布自适应修复

### 用户需求
用户希望将之前实现的 `fractal_edge_roughness` 卡片分析可视化逻辑落地，同时修复全屏高分屏 (HiDPI) 画布的尺寸与样式自适应问题。

### 评论
本次修改涉及业务图表工具类的编写、分析面板渲染函数的绑定，以及 `CardAnalyticsView` 和 `hidpi.ts` 中针对画布缩放的样式对齐，极大地提升了分析看板的图表渲染质量和移动/桌面端兼容性。

### 目标
1. 新增 `fractal_edge_roughness` 的可视化图表实现文件 (`charts.ts`)。
2. 将 `createFractalEdgeRoughnessAnalytics` 中的偏置散点图与频段敏感度图与实际 Canvas 渲染挂钩。
3. 优化 HiDPI 画布初始化逻辑，确保图表在不同尺寸下清晰自适应。
4. 将变更完整暂存并生成 Git 提交。

### 基本原理
利用标准 2D Canvas API 结合 `setupHiDpiCanvas` 适配高密度屏幕，并通过桶平均趋势线算法为用户提供直观的心理物理学感知偏差反馈。

### 标签
#intent/build #flow/ready #priority/high #comp/engine #concept/ui #scope/core #ai/instruct #task/domain/analytics #task/object/fractal-edge-roughness #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 添加文件到暂存区并发起 Git 提交

~~~~~act
git_add
src/cards/fractal_edge_roughness/analytics.tsx
src/cards/fractal_edge_roughness/utils/charts.ts
src/core/canvas/charts/drawTrendChart.ts
src/core/canvas/hidpi.ts
src/views/CardAnalyticsView.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(analytics): add fractal_edge_roughness charts and fix HiDPI canvas scaling

- Implement roughness bias scatter and trend chart for fractal edge roughness card.
- Implement roughness band sensitivity chart with accuracy and error statistics.
- Fix canvas HiDPI sizing logic and container adaptation in CardAnalyticsView.
- Bind chart visualizer callbacks in createFractalEdgeRoughnessAnalytics.
~~~~~

### 下一步建议
- **多端验证**: 建议在不同分辨率的屏幕及移动设备上预览 `fractal_edge_roughness` 卡片分析看板，确认画布显示比例和文字清晰度。
- **扩展分析**: 后续可结合卡片契约规范，为更多感知心理物理学卡片增加专属的趋势分析视图。
