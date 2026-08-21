好的，收到你的提交请求。本次重构完成了垂直领域的彻底解耦与下沉，将卡片定义、分析视图以及领域专属工具统一收敛至各领域模块中，并通过 `SystemDomainRegistry` 实现核心注册与驱动，清理了旧的聚合配置与冗余包装。

我将为你生成执行 Git 提交的计划。

## [COMMIT] refactor(domains): modularize domain cards, analytics plugins, and utils into core registry

### 用户需求
将领域解构与注册表重构的相关修改（包括卡片定义迁移、分析插件下沉到各 domain 目录、核心注册表集成、测试与导入路径修复以及废弃组件/工具的清理）进行 Git 提交。

### 评论
此次重构消除了原先中心化 `cards.ts` 和 `plugins/` 目录的强耦合，建立起标准化的 `DomainManifest` 与统一 `registry` 机制，显著提升了后续增加新感知训练领域时的扩展性与可维护性。

### 目标
1. 将当前工作区所有相关的重构文件加入 Git 暂存区。
2. 提交规范的 Commit 记录，清晰陈述领域模块下沉与注册表重构的上下文与收益。

### 基本原理
按照项目规范，通过 `git_add` 将修改与删除的文件同步到暂存区，并使用符合 Conventional Commits 规范的提交信息记录本次重构，为后续功能迭代提供干净稳定的代码基线。

### 标签
#intent/refine #flow/ready #priority/medium #comp/core #concept/state #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/domain-registry-refactor #task/action/refactor #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交重构更改

将所有修改、删除及新增的领域模块文件加入 Git 暂存区并创建提交。

~~~~~act
git_add
.
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(domains): modularize domain cards, analytics plugins, and utils into core registry

- Migrate card definitions and analytics plugins from central config into domain-level manifests (abstraction, angle, color, negative_space, relative_color, star).
- Integrate `SystemDomainRegistry` in `src/core/registry.ts` to dynamically resolve all domain cards, manifests, and plugins.
- Move domain-specific math and hit detection utilities under `src/domains/<domain>/utils/`.
- Clean up obsolete top-level components, shim re-exports, and deprecated plugin wrappers.
- Update import paths across tests, hooks, and database query handlers.
~~~~~

### 下一步建议
- **运行自动化测试**: 执行测试套件（如 `pnpm test` 或 `vitest run`），验证所有重构后的领域模块导入与单元测试均通过。
- **功能点检**: 启动开发服务器，检查各训练领域（特别是包含弱点分析视图的寻星、色感、正负形模块）的卡片切换与作答流程是否正常运作。
