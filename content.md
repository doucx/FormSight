## [COMMIT] feat(discovery): add automatic card capability and feature tags to filter engine

### 用户需求
用户确认修改已完成，要求提交当前的变更。

### 评论
所有涉及卡片完备度（独特设置、专属分析）的自动推导、倒排索引、筛选矩阵 UI 以及路由持久化已全部编码完毕，并且在独立计划中准备进行 Git 提交。

### 目标
1. 将当前的工作区变更暂存至 Git 暂存区。
2. 创建内容详尽的 Conventional Commit 提交。

### 基本原理
按照 Quipu 协议的要求，文件修改操作与 Git 提交操作必须严格隔离在不同的计划中执行。当前计划为 `[COMMIT]` 纯提交计划，不包含任何文件修改指令。

### 标签
#intent/tooling #flow/ready #priority/high
#comp/cli #concept/config #scope/dx
#ai/instruct
#task/domain/ui #task/object/filter-capability-tags #task/action/commit #task/state/end

---

### Script

#### Acts 1: 暂存并提交所有代码修改

~~~~~act
git_add
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(discovery): add automatic card capability and feature tags to filter engine

- Automatically detect 'hasCustomSettings' and 'hasDedicatedAnalytics' from card manifests during registry initialization.
- Introduce CardFeatureTag ('has_settings', 'no_settings', 'has_analytics', 'no_analytics') and corresponding inverted index support.
- Add 'Capabilities' (功能完备度) section to AdvancedTagMatrix and FilterEngine to enable dual-direction filtering for developers and users.
- Support URL query serialization for the 'features' filter parameter in hash routing.
- bump version
~~~~~

### 下一步建议
- 启动应用进行本地验证，点击高级筛选中的完备度标签，检查卡片过滤结果是否准确。
