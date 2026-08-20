好的，所有历史迁移与过渡冗余代码已清理完毕，相关测试用例也已同步更新。现在将本次重构工作作为一个完整的交付单元提交至 Git。

## [COMMIT] refactor(db): 彻底清理数据库与配置系统的历史版本迁移冗余

### 用户需求
在确认所有用户均已迁移至统一新架构后，将清理旧版数据库及 LocalStorage 兼容过渡代码的修改提交到版本库。

### 评论
本次提交清理了废弃的迁移脚本与冗余的降级分支，使核心存储模块与配置管理层完全基于现代卡片架构运行，显著精简了代码结构并消除了不必要的运行时探查开销。

### 目标
1. 将所有涉及冗余清理与测试更新的文件添加到暂存区。
2. 创建包含详尽上下文的 Conventional Commit 提交信息。

### 基本原理
将对 `src/utils/db/*`、`src/utils/settings.ts`、`src/types/card.ts` 及相应单测的改动进行原子化提交，标记本次重构任务的顺利闭环。

### 标签
#intent/refine #flow/ready #priority/medium
#comp/engine #comp/tests #concept/state #scope/core
#ai/instruct
#task/domain/storage
#task/object/migration-cleanup
#task/action/refactor
#task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交代码

~~~~~act
git_add
src/utils/db/migration.ts
src/utils/db/schema.ts
src/utils/db/queries.ts
src/utils/db/importExport.ts
src/utils/settings.ts
src/types/card.ts
src/utils/__tests__/settings.test.ts
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(db): remove legacy migration and compatibility layers

Clean up transitional database migration and legacy settings compatibility code now that all users have updated to the unified architecture:
- Delete `src/utils/db/migration.ts` and remove `migrateLegacyDatabase` call from DB initialization.
- Remove legacy domain-based settings fallback parsing and localStorage key migrations in `settings.ts`.
- Simplify `getProfilesByDomain` in `queries.ts` to directly use IndexedDB indexes without manual repair loops.
- Remove deprecated compatibility fields in `importExport.ts` and `types/card.ts`.
- Update `settings.test.ts` to assert on card-scoped partial overrides instead of legacy formats.
~~~~~

### 下一步建议
- 可以运行 `npm run build` 和 `npm run lint` 验证构建与静态代码质量。
- 后续如果开发新模块，可以直接依据标准 CardDefinition 接口与统一数据模型进行扩展。
