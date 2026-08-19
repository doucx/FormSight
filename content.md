好的，我们已经完成了扁平卡片注册表与多维标签系统的架构重构，并修复了全局统计界面的适配问题。现在生成 Git 提交计划。

## [COMMIT] refactor(core): 重构训练模式架构为扁平卡片注册表与多维标签系统

### 用户需求
将训练架构从传统的 `Domain -> Mode` 树状层级重构为单一事实源的扁平卡片注册中心（Card Registry），并建立感官对象、认知技能、交互范式三维正交标签体系，将变更持久化提交到 Git 仓库。

### 评论
本次重构彻底消除了双重状态管理的复杂性，统一了 14 个训练卡片的类型契约与调度流程，同时保持了 IndexedDB 数据与组件交互的完全向后兼容，为后续跨领域能力画像与全能混刷训练打下了坚实基础。

### 目标
1. 暂存所有新增及修改的源文件。
2. 提交规范的 Conventional Commits 记录。

### 基本原理
按照系统安全策略，通过独立的 `[COMMIT]` 阶段将经过验证的代码变更原子化提交到 Git 历史。

### 标签
#intent/refine #flow/ready #priority/high #comp/core #comp/interfaces #concept/state #concept/executor #scope/core #scope/api #ai/instruct #task/domain/architecture #task/object/flat-card-registry #task/action/refactor #task/state/end #task/status/completed

---

### Script

#### Acts 1: 添加更改并提交

将重构后的文件添加到暂存区并创建 Git 提交。

~~~~~act
git_add
src/types/card.ts
src/config/cards.ts
src/config/trainingPlugins.tsx
src/config/domains.ts
src/components/dashboard/GenericDashboard.tsx
src/components/GlobalStatsModal.tsx
src/utils/db/schema.ts
src/utils/db/queries.ts
src/views/GenericTrainingView.tsx
src/app.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(core): evolve training hierarchy to flat card registry with orthogonal tag system

- Introduced `CardDefinition` and orthogonal 3D tag system (SensoryTarget, CognitiveSkill, Interaction) in `src/types/card.ts`.
- Created centralized `ALL_CARDS` registry in `src/config/cards.ts` with helper lookups and backward-compatible ID mapping.
- Decoupled `CARD_PLUGINS` dispatch in `src/config/trainingPlugins.tsx` to directly support card-level execution.
- Virtualized domain collections in `src/config/domains.ts` and `GenericDashboard.tsx`.
- Enhanced database storage layer (`src/utils/db/`) with automatic `cardId` population and dual-compatibility.
- Streamlined `GenericTrainingView.tsx` and `src/app.tsx` state machine to be driven directly by `cardId`.
- Fixed `GlobalStatsModal.tsx` filter lookups to adapt to the card registry.
~~~~~

---

### 下一步建议
- **标签筛选器 UI**：可以在主页或全部模式列表增加基于 `CognitiveSkill` 或 `Interaction` 的标签快速过滤器，方便针对特定技能（如“视错觉穿透”、“空间方位”）进行组合练习。
- **全能随机卡片流**：利用扁平卡片注册表 `ALL_CARDS`，开发一个跨领域的“每日挑战 / 随机刷题”功能。
