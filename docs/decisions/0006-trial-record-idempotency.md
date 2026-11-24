# ADR 0006：答题记录幂等——同一 record.id 重放显式拒绝

- 状态：已采纳（2026-11-24）
- 证据：`src/storage/db/queries.ts#saveTrialRecord`；`viska/ledger.md` G1-04
- 相关决策：[`0003-single-idb-transaction.md`](./0003-single-idb-transaction.md)、[`0005-storage-import-validation.md`](./0005-storage-import-validation.md)

## 背景

`saveTrialRecord` 在同一个事务里更新三处：

- `records.put(record)`：按 `id` 幂等覆盖；
- `daily_summaries`：`totalCount + 1`、`hitCount` 累加；
- `user_profiles`：`totalTrials + 1`、`totalHits` 累加。

因此同一 `record.id` 被重放（网络重试、`handleAnswer` 重入、未来离线重放）时，
明细不会重复，但聚合与档案会**双计**。统计看板只读物化聚合，所以这是一个静默的
数据错误：正在训练的用户不会看到任何异常，只有数字慢慢偏离。

## 决策

**同一 `record.id` 的第二次写入显式拒绝，而不是「静默覆盖且不累加」。**

1. 在写任何表之前，于同一 readwrite 事务内读取 `records.get(record.id)`；
   已存在则抛 `DuplicateTrialRecordError`（携带 `recordId`），事务不产生任何写入。
2. 错误类与守卫 `isDuplicateTrialRecordError` 放在 `src/storage/db/queries.ts`，
   供调用方按类型捕获，不依赖错误文案。
3. 调用方契约：会话层（`useTrainingSession.handleAnswer`）捕获该错误后
   **不中断会话、不重复计数**，以 toast 提示「该题已保存」；这是唯一允许的兜底。
   任何新的 `saveTrialRecord` 调用点都必须处理该错误，否则会在控制台产生未处理拒绝。

选择「拒绝」而不是「静默去重」的理由：静默去重会让「重复提交」与「正常保存」
不可区分，重试逻辑永远无法被验证；显式拒绝把不变量交给调用方，且不掩盖上游的
重入缺陷。

## 代价

- 调用方必须处理新错误类型；漏处理会在控制台留下未处理拒绝（CI 不拦截，但可观测）。
- 若未来引入「离线队列重放」，重放器必须先做去重；这是队列层的责任，不是存储层的。

## 复核条件

- `event:offline_replay_introduced`：引入离线队列时重新评估错误语义；
- 或出现「合法重试被拒绝」的真实反馈（说明 `id` 生成策略有碰撞）。

## 后果

- `records` 的 `id` 成为事实上的幂等键；生成 `record.id` 的调用点必须保证唯一。
- 门账 G1-04 的检查同时覆盖「拒绝」与「聚合零写入」。
