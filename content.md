好的，我们已经完成了「黑白素描归组」、「几何大模寻形」以及「折线低模大形」三个模块算法的全面升级与重构，并成功将实验性卡片转正。

现在我将生成 `[COMMIT]` 计划，将修改提交至 Git 仓库。

## [COMMIT] feat(abstraction): 重构视知觉概括与细化算法并转正实验性卡片

### 用户需求
将视知觉概括（Abstraction）与具象细化（Concretization）模块中完成的算法重构和卡片转正变更提交至 Git 版本控制。

### 评论
本次变更实现了基于分形细化的正向层次生成算子（`fractalizePolygon`），彻底替代了机械式的 RDP 抽稀算法，并重构了二值化素描归组的多层次动态阈值场景，显著提升了核心训练模块的认知科学性与趣味性。

### 目标
1. 将 `src/utils/abstractionUtils.ts` 与 `src/config/cards.ts` 变更加入 Git 暂存区。
2. 创建结构清晰规范的 Conventional Git 提交记录。

### 基本原理
按照工作流规范，在所有文件系统变更验证就绪后，执行专用的 `[COMMIT]` 计划以保证每一次提交都是原子化的、自解释的完整工作单元。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/executor #scope/core #ai/instruct #task/domain/abstraction #task/object/experimental-cards #task/action/refactor #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交修改

将相关的算法实现和卡片配置变更添加到暂存区并创建提交。

~~~~~act
git_add
src/utils/abstractionUtils.ts
src/config/cards.ts
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(abstraction): upgrade visual abstraction & refinement algorithms

- Implement `fractalizePolygon` for edge subdivision and organic high-frequency noise injection.
- Refactor `NOTAN_THRESHOLD` with multi-shape foreground-background clustering and dynamic midpoint threshold calculation.
- Refactor `TD_HULL_2AFC` and `POLYGON_DECIMATION` to use forward fractal hierarchy, completely replacing the RDP decimation loop.
- Remove experimental flags for `abs_notan_threshold` and `abs_td_hull_2afc` to promote them to official training cards.
~~~~~

### 下一步建议
- **弱点分析接入**：考虑为 `NOTAN_THRESHOLD`（二值化明度偏置分析）和 `POLYGON_DECIMATION` 设计专属的弱点分析插件（`WeaknessAnalyticsPlugin`），进一步丰富数据看板的维度。
- **视觉微调**：在真实设备上观察 `fractalizePolygon` 在高分辨率屏幕上的线宽和抗锯齿效果，确保视觉体验舒适。
