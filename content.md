好的，我们已经完成了 `@preact/signals` 的全链路引入和响应式状态重构，并对数据备份还原与清空链路的响应式更新做好了闭环。现在我们将生成 `[COMMIT]` 计划以提交本次工作单元。

## [COMMIT] feat(state): 引入 @preact/signals 重构全局响应式状态管理

### 用户需求
将本次引入 `@preact/signals` 响应式状态总线、消除 `key={...dataVersion}` 重挂反模式以及完善数据治理实时响应的改动打包提交至 Git 仓库。

### 评论
本次重构将 FormSight 的状态架构提升至现代化细粒度响应式标准，彻底消除了全屏 View 卸载导致的闪烁与交互状态丢失问题，为后续更多模块的扩展和复杂交互奠定了坚实的基础。

### 目标
1. 将所有新创建的 `src/stores/` 模块和修改过的路由、组件、Hook 与依赖配置加入 Git 暂存区。
2. 创建结构清晰、符合 Conventional Commits 规范的 Git 提交记录。

### 基本原理
按照 Quipu 操作协议，在用户确认执行代码修改后，单独使用一个包含 `git_add` 与 `git_commit` 的纯提交计划完成版本入库，确保工作单元的可追溯性与原子性。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/state #scope/core #scope/dx #ai/instruct #task/domain/state #task/object/preact-signals-integration #task/action/implementation #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交代码更改

将依赖变更、响应式 Store 模块及相关重构代码暂存并提交。

~~~~~act
git_add
package.json
package-lock.json
src/stores/settingsStore.ts
src/stores/planStore.ts
src/stores/profileStore.ts
src/stores/toastStore.ts
src/stores/index.ts
src/hooks/useAppBootstrap.ts
src/hooks/useGlobalStatsData.ts
src/components/routing/AppRouter.tsx
src/views/GlobalStatsView.tsx
src/app.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(state): migrate global state architecture to @preact/signals

- Introduce @preact/signals and create modular stores in `src/stores/`:
  - `settingsStore`: reactive user preferences and theme/locale state.
  - `planStore`: reactive plan library, active plan, and plan mutation actions.
  - `profileStore`: reactive user profiles, all daily summaries, and computed statistics.
  - `toastStore`: global reactive notification queue.
- Remove `dataVersion` key-bumping anti-pattern in `AppRouter.tsx` to prevent unnecessary component tree teardowns and preserve transient UI/scroll states.
- Connect `useGlobalStatsData` directly to `$dailySummaries` for instantaneous reactivity on data clear, import, or training completion.
- Provide unified `reloadAllStores` action for comprehensive state synchronization during data governance operations.
~~~~~

### 下一步建议
- **性能观察**：在更复杂的低端移动设备或较长连续训练会话中观察内存占用与帧率表现，确认无额外内存泄漏。
- **扩展卡片状态**：后续若有特定复杂训练卡片（如多点拟合或高频拾色），可直接在其私有模块中结合 Signal 进行局部高频计算解耦。
