# ADR 0008：训练流升级为多类型阶段管道

- 状态：已采纳（2026-11-24）
- 证据：`src/types/plan.ts`；`src/core/plan/stages.ts`；`src/views/PlanTrainingView.tsx`
- 相关决策：[`0004-v0x-normalization-window.md`](./0004-v0x-normalization-window.md)

## 背景

训练流原本只支持卡片阶段：`PlanItem` 强绑定 `cardId + targetTrials`，
`PlanTrainingView` 也硬编码了 `GenericTrainingView`。这挡掉了三类产品能力：

- 新手教程 / 领域过渡 / 结语需要在卡片之间插入一页文字；
- 高强度视觉训练需要强制休息，降低视疲劳；
- 编辑器需要把“提示”“休息”和卡片放在同一条可拖拽的管道里。

如果继续用 `cardId` 的哨兵值（例如 `__message__`）编码新阶段，读取方必须靠约定
辨认类型，导出、备份、清洗与编辑器都会各写一套判断。

## 决策

1. **`PlanItem` 改为以 `type` 为判别字段的联合类型**：`card` / `message` / `rest`。
   - 卡片阶段保留 `type?: 'card'`，旧数据没有 `type` 时按卡片解释；
   - **不回写**旧计划只为补 `type`，避免每次加载都变成一次迁移；
   - 导出 JSON 仍省略卡片阶段的 `type`，旧导出文件可直接导入。
2. **归一化只设一个入口** `normalizePlanItems()`：持久化加载、JSON 导入、官方预设
   fork 都经过它。未知 `type`、悬空 `cardId`、非法元素统一丢弃；题量与休息时长
   在此收敛到边界值。`changed` 标记决定是否需要回写 IndexedDB。
3. **提示页只支持 Markdown 子集，不解析原始 HTML**：`parseMarkdownBlocks()` 与
   `parseInlineMarkdown()` 在 node 环境可测，渲染层只产出文本节点，避免 XSS 与
   移动端样式破坏。
4. **统计口径分离**：题量、层阶与总结只统计卡片阶段；休息时间计入计划总用时，
   不计入“注意力活跃训练时间”。计划预计时长 = 卡片 3.5s/题 + 提示 20s + 休息配置。
5. **官方预设的文字用 i18n key 引用**，在 fork 时解析，避免同一段教程在预设文件里
   维护中英两份正文。

## 代价

- 所有读取 `PlanItem` 的界面都要先做类型分支；用 `isCardStage` / `isMessageStage`
  / `isRestStage` 三个守卫收口，禁止直接访问某个变体独有的字段。
- 旧计划在首次出现悬空卡片或缺失阶段 id 时会被清洗并回写一次，`updatedAt` 变化。
- Markdown 子集是自维护的解析器，新增语法（表格、链接等）需要同时补解析与渲染。

## 复核条件

- `event:plan_stage_schema_v2`：需要新增阶段类型或改判别字段时，重新评估是否引入
  正式迁移，而不是继续加可选字段；
- `event:v1_release`：与 ADR 0004 一起复核，v1.0 后只允许增量扩展。

## 后果

- 训练流可以表达“欢迎页 → 卡片 → 领域过渡 → 卡片 → 休息 → 结语”，并由同一个
  执行器推进，无需外部弹窗串联。
- 新增阶段类型的最小改动是：扩联合类型 + 归一化分支 + 视图分支 + 预设/编辑器入口，
  存储 schema 不需要升级。
