# 数据引擎：物化聚合、单事务与 details 契约

> 状态：现行（对应 v0.6.x）
> 读者：存储层、统计看板、导入导出维护者
> 关联：[`decisions/0003-single-idb-transaction.md`](./decisions/0003-single-idb-transaction.md)、[`decisions/0004-v0x-normalization-window.md`](./decisions/0004-v0x-normalization-window.md)

## 1. 存储拓扑

全部持久状态在 IndexedDB（`src/storage/db/schema.ts`）：

| 表 | 内容 | 写入时机 |
|---|---|---|
| `sessions` | 一次训练的会话摘要 | 结算时 |
| `records` | 逐题明细 | 每题作答 |
| `daily_summaries` | 按日物化聚合 | **与 records 同一事务** |
| `user_profiles` | 每卡/全局能力档案 | 与 records 同一事务 |
| `app_settings` | 全局与每卡设置 | 设置变更 |
| `training_plans` | 用户计划 | 计划编辑 |
| `app_metadata` | 版本与迁移标记 | 初始化/迁移 |

`localStorage` 只保留首屏主题缓存 `formsight_theme_cache`（避免 FOUC）。**除它以外不得新增任何 localStorage 持久状态。**

## 2. 写时物化

`saveTrialRecord` 在**同一个 readwrite 事务**内同时更新 `records`、`daily_summaries`、`user_profiles`。

- 原因：10 万+ 明细的读时全表扫描会造成 O(N) 反序列化、堆峰值与主线程卡顿。
- 代价：写路径变长，且必须保证三者一致。
- 约束：**统计看板只读物化聚合，不得全表扫 `records`**。需要明细时按索引限量读取。

新增一个统计维度时，优先问"能否在写入时增量维护"，而不是"读的时候再算"。

## 3. 导入 / 清空：单事务、不可部分恢复

`importAllData` 与 `clearAllData` 在**一个跨 7 张表的 readwrite 事务**内完成：先清空，再写入。

- 任一步失败 → 整个事务回滚 → 旧数据保持不变。
- 不存在"IndexedDB 已提交、localStorage 写失败"的半恢复状态。历史上双介质方案在配额错误时只能做"尽力回滚"，会留下脏数据。
- 因此：**不得**在导入/清空路径上引入第二种持久介质或第二个事务。

导出走流式/分块（`exportAllDataStream`），避免大备份一次性驻留内存。

## 4. details 契约

`UnifiedTrialRecord`：

```ts
interface UnifiedTrialRecord {
  id: string;
  sessionId: string;
  cardId: string;
  domain?: string;
  timestamp: number;
  difficultyLevel: number;
  isHit: boolean;
  responseTimeMs: number;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}
```

- `details` 是**卡片私有语义**：`targetHSV`、`userClick`、`vertices` 等。
- **物理不可变**：禁止任何全局清理/裁剪/降采样删除 `details` 字段。它是分析主数据，不是可丢弃负载。
- 读取时 `getTrialRecordsByCard` 会把 `details` 平铺到记录根对象；下游必须容忍字段缺失（历史记录可能没有新字段），缺失时降级，不得抛错。
- 已知债务：索引签名让类型系统失效，分析层靠 `as` 断言。关闭条件是引入判别联合或每卡 `RecordDetails` 校验器（见 `architecture.md` §8）。

### 反面案例：90 天修剪

2026-08 曾实现"90 天后把 `details` 置空"的冷数据修剪。结果：`color_hue`、`star_single` 等图表读 `r.targetHSV[0]` 直接抛错白屏，被迫在各卡写 `parseHsvTuple` 之类守卫。该机制已删除。**任何以"节省空间"为由改动 `details` 的提案，先读这段。**

## 5. 聚合与降采样

- 图表需要的长序列在 Worker 中降采样（LTTB、2D binning），主线程保留同构降级路径。
- Worker 协议必须可降级：`workerClient` 在 Worker 不可用时同步计算。
- 降采样只影响"画出来的点"，不得回写存储。

## 6. 查询与分页

未知上限时不要 `getAllFromIndex` 后 `slice`。按卡明细应使用 `IDBKeyRange` 游标限量读取。

现状：`getTrialRecordsByCard` 仍是一次性取回再切片，10 万级下会变慢。这是一个**已知缺口**，不是设计选择。

## 7. 字段归一化窗口

v0.x 是唯一廉价的破坏性迁移窗口：用户量小、本地库可重建。

- 已执行：删除 `mode` 字段、`cardId` 成为唯一键、删除 prune、统一 `domain` 语义。
- 之后（v1.0 起）：只做**增量迁移**（新增字段 + 默认值 + 迁移脚本），不再删除字段或改写主键。
- 复核触发：出现第一份真实外部用户的长期数据，或版本号到达 1.0。

## 8. 失败史

| 事故 | 症状 | 现行约束 |
|---|---|---|
| 双介质持久化 | 导入时 IDB 已写入、localStorage 配额失败 → 半恢复脏状态 | 单事务、单介质 |
| 90 天 details 修剪 | 图表白屏、各卡补守卫 | details 不可变 |
| `key={dataVersion}` 重挂 | 整屏闪烁、滚动与表单态丢失 | 用 signals store |
| 读时全表扫描 | 10 万条卡顿、堆峰值 | 写时物化 |

这些约束已写入 HAP（`src/storage` scope），改动前请先 `hap_read scope=src/storage`。
