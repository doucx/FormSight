好的，我们已经完成了【黑白素描归组】模块的纯分形噪声双频模型重构以及双视口原图对照与即点即答体验优化。现在我们将所有变更提交到 Git 仓库。

## [COMMIT] refactor(abstraction): 重构黑白素描归组为分形双频模型并支持双视口对照

### 用户需求
将本次重构与体验优化（FBM 分形噪声双频模型、Otsu 动态最优阈值求解、左侧灰阶原图对照、滑块即点即答交互）提交至版本库。

### 评论
本次重构彻底解决了该题型在视觉表达生硬、真理值固定以及空格盲过等核心问题，为视知觉概括感知训练提供了符合艺术素描观察原理的纯数学过程生成方案。

### 目标
1. 将新增的 `src/utils/noiseUtils.ts` 以及修改的 `src/utils/abstractionUtils.ts` 和 `src/components/AbstractionCanvas.tsx` 添加到暂存区。
2. 创建结构清晰规范的 Git Commit。

### 基本原理
按照 Conventional Commits 规范，将此次在 `abstraction` 领域针对 `notan-threshold` 题型的算法与交互重构打包固化。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/ui #scope/core #scope/ux #ai/instruct #task/domain/canvas #task/object/notan-threshold #task/action/refactor #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交代码更改

我们将修改和新增的文件添加到 Git 暂存区并生成提交。

~~~~~act
git_add
src/utils/noiseUtils.ts
src/utils/abstractionUtils.ts
src/components/AbstractionCanvas.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(abstraction): 重构黑白素描归组为分形双频模型并支持双视口对照

- 新增 noiseUtils 提供轻量 2D 梯度噪声、分形布朗运动 (FBM) 及 Otsu 大津法二值化阈值求解
- 采用宏观大结构场与微观噪波分层模型替代原有离散几何图元，真理阈值自然离散在 20~80 宽幅区间
- 画布支持双视口呈现：左侧未二值化灰阶原图，右侧实时二值显影
- 移除多余的确认提交按钮，支持滑块点击/释放即时判定 (Point-to-Commit)
~~~~~

### 下一步建议
- **弱点分析接入**：后续可以为 `abs_notan_threshold` 探索专属的弱点分析视图（如高调/低调阈值偏差倾向度分析）。
- **完整性回归**：测试其他卡片（如 `abs_gesture_axis`、`abs_polygon_decimation` 等）在最新交互下的平稳运行情况。
