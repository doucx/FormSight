好的，我们已经完成了 FormSight 四个阶段（Phase 1 ~ Phase 4）的完整重构与技术债还清工作。

现在我们生成提交计划，将所有变更作为一个完整的、逻辑严密的交付单元提交到 Git 仓库。

## [COMMIT] refactor(arch): 完成 FormSight 四阶段架构重构与还债实施

### 用户需求
将本次完成的数据层重构、弱点分析插件化、声明式 Hash 路由、Retina 高清画布与强类型改造提交到 Git 仓库。

### 评论
本次重构彻底消除了项目早期的历史包袱，统一了 FormSight 的核心数据契约，强化了 SOLID 架构原则，并极大提升了用户在高分屏下的视知觉训练体验与工程健壮性。

### 目标
1. 将所有已重构和新增的代码文件暂存。
2. 提交一份详尽且符合 Conventional Commits 规范的 Git Commit。

### 基本原理
按照 Quipu 协议约束，在独立的 `[COMMIT]` 节点中执行版本控制提交，确保所有变更已被验证。

### 标签
#intent/refine #flow/ready #priority/high #comp/build #concept/history #scope/core #scope/dx #scope/ux #ai/instruct #task/domain/storage #task/object/database-migration #task/action/refactor #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交代码更改

~~~~~act
git_add
src/
scripts/
package.json
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(arch): 完成 FormSight 四阶段架构重构与还债实施

- Phase 1 (基建与数据迁移):
  - 数据库与存储键重命名为 FormSightDB 与 formsight_user_settings，并实现从 StarHoppingDB 的平滑自动迁移。
  - 用户画像表主键与训练记录全面升级为以 cardId 为核心的单一数据源，重命名 totalTrainedCards 为 totalTrials。
  - 归档实验脚本至 scripts/color-analysis/。

- Phase 2 (OCP 与功能闭环):
  - 新建 WeaknessAnalyticsPlugin 策略体系，解耦 WeaknessAnalyticsModal。
  - 为相对色感与正负形空间感知实现专有的弱点分析与诊断图谱，并在全局 4 个领域全量开放弱点分析。
  - 重构 SessionSummaryModal 与 TrainingShell，消除单锚点硬编码，动态适配所有卡片类型。

- Phase 3 (路由与 UI 现代化):
  - 引入轻量级声明式 Hash 路由 (useHashRoute)，支持 URL 状态持久化、深度直达与刷新保持。
  - 封装全局 Toast 提示容器与 ConfirmModal，全面移除阻塞式 alert() 与 confirm()。

- Phase 4 (Retina 渲染与类型加固):
  - 封装 setupHiDpiCanvas 流水线，消除高分屏下 Canvas 锯齿模糊。
  - 消除 trainingPlugins 与 analyticsPlugins 中的 any 逃逸与压制，实现 100% 强类型。
  - 加固色域与彩度采样算法，增加确定性边界保护。
~~~~~

### 下一步建议
- **CI/CD 构建检查**: 运行 `npm run build` 和 `npm run preview` 确认生产打包产物及 PWA Service Worker 离线可用性。
- **发布更新**: 如需对外发布，可适当递增 `package.json` 中的 patch 版本号。
