好的，我们已经顺利完成了针对项目中全部大型上帝组件、超长视图与高耦合中枢的系统性重构与物理拆解。

现在我们将生成 `[COMMIT]` 计划，将这些高质量的重构成果作为一个完整的逻辑单元提交到 Git 仓库中。

## [COMMIT] refactor: 全面重构解耦核心上帝组件与超长模块

### 用户需求
将本次针对系统中全部严重过载文件（包括 `PlanEditorView`, `GlobalSettingsModal`, `GlobalStatsView`, `app.tsx`, `FilterEngine`, `universalViews`, `perspectiveUtils`）的模块化拆解成果提交至 Git 仓库。

### 评论
本次重构严格遵循单一职责与关注点分离原则，成功将原先 SLOC 400~550 行的巨型视图及高扇入中枢解耦为高内聚、易测试的纯函数工具、子组件与自定义 Hook，显著提升了工程的可维护性与架构健壮度。

### 目标
1. 将所有新建与重构的子模块、Hooks、工具函数及主视图加入 Git 暂存区。
2. 创建符合规范且信息详实的 Git 提交记录。

### 基本原理
通过将状态机（Hooks）、展示层（Presenter Components）、领域计算与 I/O（Pure Utils）分层隔离，消除了上帝组件与多职责坏味道。作为阶段性重构的里程碑进行原子化提交。

### 标签
#intent/refine #flow/ready #priority/high #comp/views #comp/core #comp/settings #concept/state #concept/ui #scope/core #scope/dx #ai/delegate #task/domain/refactoring #task/object/god-files #task/action/modularization #task/state/end #task/status/completed

---

### Script

#### Acts 1: 添加更改并创建 Git 提交

将所有重构涉及的文件添加到暂存区，并创建详细的 Conventional Commit 记录。

~~~~~act
git_add
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(core): decouple god components, monolithic views and heavy utils

- Refactored PlanEditorView by extracting usePlanEditorState hook, PlanEditorHeader, and pure planItemUtils
- Modularized GlobalSettingsModal into GeneralPreferencesSection and DataGovernanceSection
- Deconstructed GlobalStatsView by extracting useGlobalStatsData hook, StatsMetricCards, CognitiveMasteryGrid, and ActivityHeatmapCard
- Decoupled app.tsx into AppRouter and useAppBootstrap lifecycle hook
- Streamlined FilterEngine with dedicated AdvancedTagMatrix
- Split universalViews into dedicated speedAccuracyView and difficultyPlateauView modules
- Decomposed perspectiveUtils into perspectiveTypes, perspectiveCanvas, and perspectiveGenerators
- Added scripts/check_god_files.py for complexity analysis
~~~~~

### 下一步建议
- **回归测试**: 运行 `npm run test` 或 `npm run dev` 验证全流程交互（计划编排、全局统计、设置切换、训练流程等）功能完整正常。
- **静态检查**: 运行 `npm run check` 保持持续的格式与静态类型合规。
