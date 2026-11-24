# ADR 0002：CardManifest 保持 4 个泛型，details 在卡片内收窄

- 状态：已采纳（2026-09-04）
- 证据：`src/core/cardContract.ts`（`CardManifest<TQuestion, THitResult, TAnswerVal, TSettings>` 无第 5 泛型）

## 背景

33 张卡共用一张 `records` 表，逐题附加字段放在 `details`。曾提出给 `CardManifest` 增加第 5 个泛型 `TDetails`，让 `details` 在类型层面贯通"卡片 → 存储 → 分析"。

## 决策

**不加第 5 个泛型。** `details` 的形状由每张卡的 `analytics.tsx` 私有接口定义，读取时在卡片内做入口断言与降级。

## 理由

1. 内核（自适应引擎、存储、备份、导出）**从不消费** `details` 的字段，只搬运它。给它一个跨层泛型，等于让内核为一个它不理解的形状做参数化。
2. 多数卡片没有专属分析。加泛型会迫使 20+ 张卡声明空类型或 `unknown`，纯增噪音。
3. 真正的收益点不在"传得下去"，而在"读的时候校验"。校验器属于卡片，不属于内核。
4. 前提是存储层保证 `details` 物理不可变（禁止全局修剪），否则类型再准也会被空值击穿。

## 代价

- `UnifiedTrialRecord.details` 仍是 `Record<string, unknown>` + 索引签名，分析层靠 `as` 断言。
- 字段名写错不会在编译期报错，只会在运行时画出空图。这是**已知债务**，不是意外。

## 复核条件

- 需要跨卡片聚合 `details` 的同名字段（例如统一弱项诊断）；
- 或历史脏数据导致分析层崩溃，且无法在卡片内降级；
- 届时优先做**判别联合 + 每卡校验器**，而不是给 manifest 加泛型。

## 后果

- 新增卡片不需要在核心类型上登记 details 形状。
- 债务关闭条件写在 `docs/architecture.md` §8，HAP `src/core` scope 有对应记录。
- 复核触发：`event:cross_card_detail_aggregation`。
