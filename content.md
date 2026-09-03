好的，我们已经完成了 Phase 1 的代码修改与验证。现在将本次重构成果作为独立的逻辑单元提交到 Git 仓库。

## [COMMIT] refactor(core): 废除旧式 TrainingPlugin 转译层并使调度流直连 CardManifest

### 用户需求
将 Phase 1 的架构重构工作成果提交到 Git 暂存区与版本库，固化契约归一化与去冗余的改造。

### 评论
通过彻底消除 `TrainingPlugin` 双重契约和已无意义的 `mode` 参数，系统的训练调用链路得以大幅简化，各卡片直接作为自包含的 `CardManifest` 参与运行时调度。

### 目标
1. 将所有受影响的文件添加到 Git 暂存区：
   - `src/core/contracts.ts`
   - `src/core/registry.ts`
   - `src/views/GenericTrainingView.tsx`
   - `src/views/PlanTrainingView.tsx`
   - `src/components/routing/AppRouter.tsx`
2. 创建符合 Conventional Commits 规范的提交，详实阐述重构动因与架构变化。

### 基本原理
按照系统演进路线图（Phase 1），训练组件现在直接依赖 `CardManifest` 的 `training` 核心闭环，移除了无意义的 `mode` 参数透传与多余的运行时包装层。本提交确保了该阶段改造的原子性与完整性。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #scope/core #scope/api #task/domain/architecture #task/object/training-plugin #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 提交变更

将修改后的契约与视图调度层文件添加到 Git 暂存区，并创建详细的提交记录。

~~~~~act
git_add
src/core/contracts.ts
src/core/registry.ts
src/views/GenericTrainingView.tsx
src/views/PlanTrainingView.tsx
src/components/routing/AppRouter.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(core): remove legacy TrainingPlugin adapter layer and connect runtime directly to CardManifest

- Removed obsolete TrainingPlugin interface and related type aliases from contracts.ts.
- Removed cardPluginMap and pluginAdapter boilerplate from SystemDomainRegistry.
- Refactored GenericTrainingView to accept and consume CardManifest directly, removing the redundant 'mode' parameter from question generation and answer evaluation.
- Updated PlanTrainingView and AppRouter to query CardManifest directly from the registry.
- Completed Phase 1 of the architecture roadmap towards decoupling engine computation from view rendering.
~~~~~

---

### 下一步建议

当前提交已顺利归档 Phase 1 阶段工作。接下来建议继续执行路线图中的 **Phase 2（计算内核与 Preact 视图彻底解耦）**：
1. **以 `star_single`（单锚点）为标杆范式**：
   - 提取 `engine.ts`：将极坐标点阵生成、欧氏距离容错评估等算法提取为无 DOM、无 Preact 依赖的纯计算内核，支持纯逻辑极速单测与 Web Worker 异步计算。
   - 保留 `view.tsx`：专注于 Canvas 渲染与触控手势交互代理。
2. **规范化用户作答输出**：
   - 纠正 `star_single` 内部反向透传判题结果的倒置依赖，交互层 `onAnswer` 仅提交真实交互点坐标 `Point`，判分交由调度层和计算内核完成。

随时告诉我即可开始 Phase 2！
