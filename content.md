好的，根据你的指示，我将为当前工作区的这批改动生成一个标准的 `[COMMIT]` 计划，将设置渲染机制改造（Schema 转向内联 `renderSettings`）、分析视图作用域翻译支持（`ScopedTranslator`）、卡片逻辑微调与 i18n 检查脚本等变更作为一个完整的工作单元进行提交。

## [COMMIT] refactor(cards): 重构设置渲染范式与分析视图作用域翻译体系

### 用户需求
将工作区中已完成的重构与调整提交到 Git 仓库，包括去除动态设置 Schema 转向组件化 `renderSettings`、在分析视图中注入作用域翻译器、完善词典与添加静态多语言检查脚本等。

### 评论
本次修改彻底移除了配置繁琐且缺乏表现力的 `DynamicDomainSettings` Schema 体系，改为在各卡片的 `CardManifest` 中显式声明 `renderSettings` Preact 渲染函数，极大提升了灵活性；同时为 Canvas/分析组件引入卡片级别的 `ScopedTranslator`，解决了之前分析视图侵入性拼接全局 key 的问题。这是一次高质量的解耦与重构。

### 目标
1. 暂存工作区中的所有新增、修改与删除的文件。
2. 遵循 Conventional Commits 规范，创建清晰严谨的 Git 提交。

### 基本原理
按照 ACA 规范，将纯净的文件系统变更与 Git 提交操作严格隔离。用户确认提交后，通过 `git_add` 与 `git_commit` 指令将代码变动固化在版本历史中。

### 标签
#intent/refine #flow/ready #priority/medium #comp/interfaces #comp/build #scope/core #scope/api #ai/instruct #task/domain/ui #task/object/card-settings-i18n #task/action/refactor #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交所有变更

我们将把已完成的设置渲染重构、作用域翻译注入及相关卡片逻辑统一提交。

~~~~~act
git_add
.
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(cards): refactor settings rendering paradigm and analytics i18n scoping

- Deprecate SettingFieldSchema and DynamicDomainSettings in favor of renderSettings component function in CardManifest
- Introduce ScopedTranslator and createScopedTranslator for isolated card-level translations in canvas visualizers and analytics diagnostics
- Update analytics signatures across all cards to accept scoped translator `t`
- Fix type definitions and evaluation in neg_shape_match_2afc and persp_structure_3d
- Add scripts/check-i18n.mjs to statically validate missing i18n keys across codebase
- Clean up unused exports and dependencies
~~~~~

### 下一步建议
- **多语言完整性验证**: 建议在终端运行 `node scripts/check-i18n.mjs`，确保代码中新增的全部词条在 `zh-CN.json` 和 `en-US.json` 中均已正确定位。
- **全量类型检查**: 运行 `npm run build` 或 `tsc --noEmit`，确保所有移除了旧 Schema 的卡片与设置组件均通过严格类型校验。
