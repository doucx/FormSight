所有针对历史 `mode` 字段的清理、数据库 Schema v4 升级、冗余迁移分支移除、单元测试对齐以及 `prune.ts` 冷数据修剪功能的清理均已就绪。现在将生成独立的 `[COMMIT]` 计划以提交这批变更。

## [COMMIT] refactor(storage): 清理数据库 mode 冗余字段并移除 prune 冷数据修剪功能

### 用户需求
将本次完成的“消除持久化债务、升级 IndexedDB 至 v4、清理历史迁移分支、对齐测试套件并移除冷数据修剪功能”的全部文件改动打包装配，创建标准的 Git 提交。

### 评论
本次提交彻底消除了自单体时期遗留的 `mode` 与 `cardId` 双生幽灵主键，全面统一步调至微内核卡片体系；同时精简了无用的数据冷修剪功能，使数据层与上层 UI 交互都更加精简、稳健且符合当前架构原则。

### 目标
1. 将修改后的业务代码、存储契约、国际化语言包和测试套件文件全部添加至 Git 暂存区。
2. 依据 Conventional Commits 规范创建详尽的 Git Commit 提交记录。

### 基本原理
按照 Quipu 协议约束，将破坏性/编辑性文件修改与版本控制提交物理隔离。在确认全部改动准确无误且测试对齐后，通过 `git_add` 与 `git_commit` 将该工作单元沉淀为原子化版本节点。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #concept/state #scope/core #scope/api #ai/instruct #task/domain/storage #task/object/schema-unification #task/action/refactor #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交代码变动

将所有修改与删除的文件加入暂存区，并执行原子化提交。

~~~~~act
git_add
src/components/settings/sections/DataGovernanceSection.tsx
src/core/registry.ts
src/hooks/useGlobalStatsData.ts
src/hooks/useTodayStats.ts
src/hooks/useTrainingSession.ts
src/locales/en-US.json
src/locales/zh-CN.json
src/storage/db/importExport.ts
src/storage/db/index.ts
src/storage/db/prune.ts
src/storage/db/queries.ts
src/storage/db/schema.ts
src/storage/repository.ts
src/stores/profileStore.ts
src/types/card.ts
src/utils/__tests__/db.test.ts
src/views/GenericTrainingView.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(storage): remove legacy mode field and prune functionality

- Upgrade IndexedDB schema to DB_VERSION = 4 and unify all entities/indexes to cardId
- Remove defensive `s.cardId || s.mode` fallback checks across queries, stats hooks, views, and stores
- Delete unused `src/storage/db/prune.ts` and its corresponding UI components and ConfirmModals in DataGovernanceSection
- Clean obsolete migration branches in `schema.ts` and streamline backup import/export
- Update `src/utils/__tests__/db.test.ts` to align with the schema definitions
- Remove obsolete prune i18n entries from zh-CN and en-US
~~~~~

---

### 下一步建议
- **分支推送**: 若已配置远端仓库，可执行 `git push` 将本地提交同步至远端分支。
- **CI/CD 观测**: 观察自动化流水线是否平稳运行通过类型检查、代码格式化（Biome）与测试用例验证。
