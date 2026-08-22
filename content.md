好的，我们已经完成了 FormSight v0.4.0 的全量架构重构。现在将这些关键演进与代码变更打包为一个完整的逻辑单元进行提交。

我将生成一个 `[COMMIT]` 计划，执行 `git_add .` 和 `git_commit`。

## [COMMIT] feat(core): 升级 v0.4.0 核心架构——内容扩展包化与高性能数据引擎

### 用户需求
将 FormSight 系统升级至 v0.4.0，解耦传统的单层 Domain 分类为 Pack 扩展包与多维标签检索体系，同时重构底层数据层为写时物化聚合与 Web Worker 高性能计算架构，完成代码的暂存与 Git 提交。

### 评论
本次升级是 FormSight 自发布以来最重要的一次底层与交互演进。通过将 Domain 概念升华为 Pack 与多维语义标签（感官目标、认知技能、交互形态），彻底打破了卡片横向扩展的分类学壁垒；通过写时物化视图 (`daily_summaries`)、冷热数据修剪、LTTB 降采样与 Web Worker 异步分流，彻底解决了 10 万+ 级训练记录下的内存与渲染瓶颈。

### 目标
1. 使用 `git_add .` 将所有变更暂存。
2. 提交包含详细架构演进说明的规范 Conventional Commit 记录。

### 基本原理
按照规范将所有文件修改通过单次暂存操作收敛，并使用结构化的提交信息完整记录 v0.4.0 的两项核心解耦（内容本体解耦与数据引擎演进）。

### 标签
#intent/build #flow/ready #priority/high #comp/core #comp/engine #comp/ui #concept/state #concept/executor #scope/core #scope/api #scope/ux #ai/instruct #task/domain/architecture #task/object/v0.4.0-engine-refactor #task/action/commit #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交变更

我们将所有工作区改动添加到 Git 暂存区并创建提交。

~~~~~act
git_add
.
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(core): release v0.4.0 - pack ontology & high-performance data engine

- Refactor domain architecture into modular Packs (src/packs/*) with faceted tagging system (SensoryTarget, CognitiveSkill, InteractionTag).
- Introduce InvertedCardIndex for sub-millisecond multi-dimensional card discovery and filtering.
- Implement Discovery Hub and FilterEngine on Home view and PlanEditorModal.
- Upgrade IndexedDB schema to v2 with materialized write-time daily summaries (daily_summaries) for O(1) stats queries.
- Introduce LTTB (Largest-Triangle-Three-Buckets) downsampling and dedicated Web Worker for off-thread compute (binning, bias analysis, downsampling).
- Add streaming export/import pipelines and cold data pruning mechanism to prevent memory bottlenecks.
- Update tests and UI components to align with the new pack contracts and data layers.
~~~~~

### 下一步建议
- **执行测试验证**: 运行 `npm run test` 或 `pnpm test`，确保所有单元测试与数据库迁移逻辑持续通过。
- **构建生产制品**: 运行 `npm run build` 验证 TypeScript 类型检查与 Vite 打包构建是否完全顺畅。
- **扩展新 Pack**: 可以基于新的 `PackManifest` 规范，快速接入更多基于多维认知的训练模块扩展包。
