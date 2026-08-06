好的，既然代码修改已经完成并通过了验证，现在我们将其作为一个完整的逻辑工作单元进行 Git 提交。

## [COMMIT] feat(geometry): 引入非线性极坐标与双极透视干扰网格系统

### 用户需求
将寻星练习的干扰点网格从传统的笛卡尔正方形阵列重构为符合人类视觉感知规律的非线性极坐标（单锚点）与双极透视（双锚点）阵列，并将真理点随机陷落在网格的任意交叉节点上，全面提升训练的科学性与难度的一致性。

### 评论
这是一个重大的核心算法与架构升级。通过解耦像素物理步长、引入 Level 层阶、重构数据存储结构（DB v2），以及实现非线性拓扑点阵，系统正式脱离了局限于绝对像素的初级阶段，走向了专业视觉认知训练。

### 目标
1. 完成 Step 1：数据流与自适应难度层阶抽象（Level 1..N）。
2. 完成 Step 2：几何引擎重构，实现极坐标扇形网格与双极透视网格。
3. 修复真理点固定在中心节点的缺陷，实现全网格 25 个节点的随机陷落。
4. 修复语法编译错误，确保系统平稳运行。

### 基本原理
依据韦伯-费希纳定律，人类视空间定位具有相对比例和角度恒定的特性。非线性拓扑网络和随机节点陷落机制消除了远距离处的难度畸变，保证了训练质量。

### 标签
#intent/build #flow/ready #priority/high #comp/engine #concept/state #scope/core #ai/instruct #task/domain/geometry #task/object/polar-bipolar-grids #task/action/implementation #task/state/end

---

### Script

#### Acts 1: 添加更改并提交到 Git 仓库

将所有重构后的文件加入 Git 暂存区并创建规范的 Commit。

~~~~~act
git_add
src/types/index.ts
src/utils/adaptiveEngine.ts
src/utils/db.ts
src/utils/geometry.ts
src/components/StarCanvas.tsx
src/components/SessionSummaryModal.tsx
src/views/Dashboard.tsx
src/views/TrainingView.tsx
src/app.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(geometry): implement polar and bipolar perspective grids with randomized truth points

Replaces the traditional Cartesian (square) grid system with psychophysically sound topological networks:
1. Single Anchor: Polar fan-shaped grid (denser near anchor, sparser further away, radially curved).
2. Double Anchor: Bipolar perspective intersection grid (triangulation-based).
3. Difficulty Level Abstraction: Replaces raw pixel steps with Level 1..N progression, updating DB schema to v2 and refactoring the adaptive engine.
4. Truth Point Randomization: Ensures the true target point randomly falls on any of the 25 nodes in the 5x5 grid rather than fixed at the center.
5. View & Analytics Adaptation: Updates Dashboard, TrainingView, SummaryModal, and Canvas rendering to fully support the new topology.
~~~~~

### 下一步建议
- **弱点热力图升级**：由于网格已过渡到极坐标系，后续可将 `AnalyticsModal` 中的直角坐标热力图升级为“极坐标/双极角度-距离误差散点图”，以便更精准地分析用户的空间偏置。
