好的，我们已经完成了「折线低模大形」、「动态势线寻源」以及「几何大模寻形」三个视知觉模块的高难度对抗性算法重构。现在生成 Git 提交计划。

## [COMMIT] refactor(abstraction): 重构折线低模大形与势线/大模逆向寻形的高难度对抗算法

### 用户需求
将本次针对视知觉概括与细化模块（折线低模大形、动态势线寻源、几何大模寻形）的高难度生成算法优化正式提交至 Git 版本库。

### 评论
本次重构彻底解决了高难度下干扰项过于简单的问题。通过引入对抗性几何扰动、随等级递增的顶点复杂度以及带各向同性噪点的弥散粒子流，显著提升了系统的训练硬核度与专业感知价值。

### 目标
1. 将 `src/utils/abstractionUtils.ts` 添加至 Git 暂存区。
2. 创建包含详尽变更说明的 Git Commit。

### 基本原理
按照 Conventional Commits 规范，清晰记录本次算法增强涉及的三个题型改进，确保历史提交记录的可追溯性与完整性。

### 标签
#intent/refine #flow/ready #priority/medium
#comp/runtime #concept/state #scope/core
#ai/instruct
#task/domain/abstraction
#task/object/perceptual-difficulty-algorithms
#task/action/refactor
#task/state/end
#task/status/completed

---

### Script

#### Acts 1: 提交代码变更

~~~~~act
git_add
src/utils/abstractionUtils.ts
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(abstraction): enhance perceptual challenge for polygon decimation and gesture/hull 2afc

- Refactored `POLYGON_DECIMATION` to dynamically scale vertex count from 4-5 up to 7-9 points and derive adversarial distractor hulls from the target hull.
- Enhanced `TD_GESTURE_2AFC` with dynamic particle spread ratios (0.18 to 0.56), isotropic background noise clutter, and tighter angle threshold (down to 4° at Level 35).
- Upgraded `TD_HULL_2AFC` to generate adversarial distractors with 85%+ contour similarity, forcing fine-grained vertex and proportion inspection.
~~~~~

### 下一步建议
- **回归测试**：可在本地运行 `npm test` 或 `npm run check` 确保测试套件与类型检查均正常通过。
- **全链路感知体验**：可以在浏览器中完整体验 Level 1 至 Level 35 的梯度爬升过程，检验各模块的难度过渡平滑度。
