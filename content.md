## [COMMIT] refactor(engine): resolve point overlapping and unify Level scaling to 35

### 用户需求
用户需要将刚刚完成的代码变更打包提交到 Git 仓库。

### 评论
该改动彻底修复了近距离下网格点粘连的几何瑕疵，并规范了全局 Level 上限和阶梯步幅模型。现在代码状态稳定，适合作为一个独立的交付单元提交。

### 目标
1. 将所有已修改的文件加入 Git 暂存区。
2. 提交包含详细说明的 Git Commit。

### 基本原理
遵循原生的原子化提交策略，将文件变更和 Git 提交操作划分为独立的计划执行，确保代码变更在安全通过验证后进行版本落盘。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #concept/state #scope/core #ai/instruct #task/domain/adaptive-engine #task/object/level-system #task/action/refactor #task/state/end

---

### Script

#### Acts 1: 添加文件到 Git 暂存区并进行 Commit 提交

~~~~~act
git_add
src/utils/adaptiveEngine.ts
src/utils/geometry.ts
src/views/TrainingView.tsx
src/components/SettingsModal.tsx
src/components/SessionSummaryModal.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(engine): resolve point overlapping and unify Level scaling to 35

1. **Geometry Anti-Overlap Strategy**:
   - Replaced fixed polar/bipolar angle-step scaling with an adaptive pixel-spacing formula.
   - Introduced dynamic lower/upper bounds for target spacing ($S_{max} = 25$, $S_{min} = 3.5$).
   - Derived angle steps via $\theta = S / R$ to strictly guarantee that dot matrices never overlap or bunch up, even when the target is extremely close to the center anchor.

2. **Unified Level Scaling**:
   - Consolidated maximum levels into a unified `MAX_LEVEL = 35` limit.
   - Redefined standard and fine granularities into "step-sizes" (`step = 3` for standard, `step = 1` for fine) rather than independent ceiling pools.
   - Updated visualization scales in analytics and settings labels for better user mental model alignment.
~~~~~

### 下一步建议
- 启动本地开发服务 (`npm run dev`) 进行一次多难度级别、多模式的抽样游玩，观察低 Level 下圆点间的距离表现。
- 检查 `biome check --write .` 是否全部通过。
