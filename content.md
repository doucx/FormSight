好的，功能实现与代码检查已全部完成，现在我们将这些变更整理为一个结构完备的 Git 提交。

## [COMMIT] feat(negative-space): 新增负形边界反切定点训练模式

### 用户需求
将“负形边界反切定点（Negative Boundary Vertex Fitting）”功能及其双 Canvas 交互与自适应点阵生成相关修改提交到 Git 仓库。

### 评论
该训练模式将寻星网格判定与正负形轮廓感知深度融合，为美术起形训练提供了高效的专项强化工具，代码已通过 Biome 与 TypeScript 构建验证。

### 目标
1. 将所有相关修改文件添加到 Git 暂存区。
2. 创建符合 Conventional Commits 规范的提交记录。

### 基本原理
将新增的负形几何算法、双 Canvas 渲染交互组件以及领域配置注册一次性收敛为一个逻辑完备的交付节点。

### 标签
#intent/build #flow/ready #priority/high
#comp/runtime #scope/core #scope/ux
#ai/instruct
#task/domain/geometry #task/object/negative-space-vertex-fitting #task/action/build #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交代码变更

~~~~~act
git_add
src/utils/negativeSpaceUtils.ts
src/components/NegativeSpaceCanvas.tsx
src/config/domains.ts
src/config/trainingPlugins.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(negative-space): add negative boundary vertex fitting training mode

- Introduce NEGATIVE_VERTEX_FITTING mode to negative space domain
- Implement dynamic polygon key vertex truncation and adaptive local distractor grid generation
- Support dual-canvas interactive layout (reference vs fitting canvas) with hover attraction, hit detection, and real contour completion feedback
- Clean up unused imports and satisfy canvas keyboard accessibility linting
~~~~~

---

### 下一步建议
- 可以在应用中实际体验“负形边界反切定点”模式，根据练习反馈决定是否需要添加专属弱点分析图表或在全局设置中增加针对该模式的网格配置项。
