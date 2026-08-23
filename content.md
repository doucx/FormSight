## [COMMIT] refactor(cards): Migrate experimental flag to card status tags and filter engine

### 用户需求
用户希望将原有的全局或卡片级布尔 `isExperimental` 标志迁移为标准的卡片状态标签 (`CardStatusTag`: `'stable' | 'experimental' | 'deprecated'`)，并将其集成到 `FilterEngine` 检索和过滤体系中。

### 评论
这次重构清理了旧的全局实验性卡片开关，代之以统一且可扩展的状态标签系统。它增强了发现系统（Discovery/FilterEngine）的灵活性，使用户可以通过状态标签自主过滤稳定模块和实验性模块。

### 目标
1. 在 `card.ts` 中引入 `CardStatusTag` 类型，并在 `CardTags` 中加入 `status` 字段，同时移除 `CardDefinition` 和 `CardQueryOptions` 上的 `isExperimental` / `includeExperimental`。
2. 更新各个卡片包（如 `perspective`）中的卡片定义，将其 `isExperimental: true` 迁移至 `tags: { ..., status: 'experimental' }`。
3. 调整 `InvertedCardIndex` 和 `SystemDomainRegistry`，支持基于 `statuses` 数组的多状态交集查询。
4. 改造 `FilterEngine`、`GlobalSettingsModal` 和路由相关钩子，提供现代化的状态标签多选与筛选交互。

### 基本原理
通过将布尔开关属性重构为结构化的标签属性，代码保持了领域模型的纯洁性。索引层引入了 `statusMap`，使得基于状态标签的过滤能够高效执行，同时兼容了 URL 参数的解析与序列化。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #comp/runtime #comp/cli #concept/state #scope/core #ai/instruct #task/domain/storage #task/object/card-status-tags #task/action/refactor #task/state/end

---

### Script

#### Acts 1: 添加修改到 Git 暂存区

~~~~~act
git_add
src/app.tsx
src/components/GlobalSettingsModal.tsx
src/components/discovery/FilterEngine.tsx
src/components/plan/editor/CardPickerPanel.tsx
src/components/training/TrainingShell.tsx
src/core/registry.ts
src/hooks/useHashRoute.ts
src/packs/perspective/index.ts
src/types/card.ts
src/utils/settings.ts
src/views/Home.tsx
~~~~~

#### Acts 2: 提交代码变更

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(cards): Migrate experimental flag to card status tags and filter engine

- Replace boolean `isExperimental` on cards with `status` field inside `CardTags`.
- Introduce `CardStatusTag` ('stable' | 'experimental' | 'deprecated').
- Update index and query engine (`SystemDomainRegistry`, `InvertedCardIndex`) to support multi-status filtering via `statuses`.
- Enhance `FilterEngine` UI to support filtering by status tags, replacing the global experimental toggle in settings.
- Update route parsing and serialization to maintain query backward compatibility.
~~~~~

### 下一步建议
- 验证所有卡片网格和筛选器在不同查询参数下的表现。
- 确保测试用例（如有）同步更新以适应新的 `statuses` 查询选项。
