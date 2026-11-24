# FormSight 文档索引

本目录只放**人读的、稳定的**说明。跨会话的状态与约束在仓库根的 `.handoff/`（HAP），不在这里重复。

## 现行文档

| 文档 | 内容 | 读者 |
|---|---|---|
| [`architecture.md`](./architecture.md) | 卡片一等公民、平铺目录、manifest 契约、标签体系、SDK 边界、已否决方案、已知债务 | 贡献者、编码代理、架构评审 |
| [`training-methodology.md`](./training-methodology.md) | 80% 心流目标、3U1D/Block 自适应、Level 与正确率的语义、感知难度、诱导模型局限 | 产品、教研、卡片作者 |
| [`card-design-spec.md`](./card-design-spec.md) | 新卡检查表：五段 manifest、i18n 契约、确定性真值、干扰项、难度参数、反馈规范 | 新卡作者、编码代理 |
| [`data-engine.md`](./data-engine.md) | 存储拓扑、写时物化、单跨表事务、details 不可变契约、分页缺口、v0.x 归一化窗口 | 存储与统计维护者 |

## 决策记录（ADR）

| ADR | 决策 |
|---|---|
| [`0001-flat-cards.md`](./decisions/0001-flat-cards.md) | 卡片平铺为一等公民，废除 Pack / 域分组层 |
| [`0002-four-generics.md`](./decisions/0002-four-generics.md) | `CardManifest` 保持 4 个泛型，details 在卡片内收窄 |
| [`0003-single-idb-transaction.md`](./decisions/0003-single-idb-transaction.md) | 全部持久状态入 IndexedDB，导入/清空单跨表事务 |
| [`0004-v0x-normalization-window.md`](./decisions/0004-v0x-normalization-window.md) | v0.x 是破坏性字段归一化的唯一窗口 |

## 与 HAP 的关系

- `docs/` 负责**为什么**：完整论证、被否决的备选、代价、历史。
- `.handoff/` 负责**不要重提 / 不要重试**：一句话断言 + anchor + 复核触发条件，`adr=` 指回本目录。
- 同一段论证只写一次。修改决策时：先改 ADR，再用 `hap_commit` 更新记录（或 `reanchor`）。

## 写作约定

- 中文；不写本机绝对路径、主机名、Token（公开仓库）。
- 结论以代码为准；文档解释"为什么这样"和"哪些看着能优化其实不能"。
- 一次性打磨、已完成的任务、代码可推导的规格**不写文档**。
