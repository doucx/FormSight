# ADR 0005：备份导入先全量校验、再开事务清空

- 状态：已采纳（2026-11-24）
- 证据：`src/storage/db/importExport.ts#importAllData`；`viska/ledger.md` G1-03
- 相关决策：[`0003-single-idb-transaction.md`](./0003-single-idb-transaction.md)、[`0004-v0x-normalization-window.md`](./0004-v0x-normalization-window.md)

## 背景

ADR 0003 承诺「任一步失败 → 整个事务回滚 → 旧数据保持不变」。实现只做了「一个跨 7 表事务」，
没有做「失败前不产生副作用」：

- `validateImportBundle` 只检查 `appName` 与四个数组是否为数组，不检查元素形状；
- 清空请求先进入事务，随后的 `put()` 若因 `keyPath` 缺失（`id: undefined`）抛 `DataError`，
  这是**同步异常**，不会自动中止已排队的请求，7 张表的 `clear()` 照常提交；
- `catch` 仅 `return false`，没有 `tx.abort()`。

实测结果：导入非法备份返回 `false`，但旧记录被清空为 0 条。用户被告知「导入失败」，
数据却已丢失——这比「部分恢复」更严重，因为没有任何介质保存旧状态。

## 决策

1. **先全量校验，再开事务清空。** 校验是纯函数，覆盖：
   - 顶层：`appName === 'FormSight'`、`version` 为 `0..DB_VERSION` 的整数；
   - 数组：`sessions/records/profiles/dailySummaries` 若存在必须为数组；
   - 元素：各表最小必填键（`id/cardId/timestamp` 等）与键类型；任一条非法即整体拒绝。
2. **未知 `cardId` 归一化为 `core`**，保持与 `saveTrialRecord` 相同的 domain 解析语义；
   不因未知卡片拒绝备份。
3. **`catch` 内补 `tx.abort()` 作为防御网**，但它是兜底，不是主路径：主路径在事务开始前
   就不会走到清空。
4. `version` 缺失或超版本一律拒绝，并在错误信息中给出「备份版本 / 当前版本」；
   v0.x 窗口内不保留旧备份的读时垫片（ADR 0004）。

## 代价

- 校验需要遍历一次全部记录，导入前多一次 O(N) 纯计算；相对 IDB 写入可忽略。
- 旧版本（无 `version`）备份被拒绝：v0.x 阶段可接受，v1.0 起必须提供显式升级路径
  （见 ADR 0004 与 `docs/data-engine.md` §7）。

## 复核条件

- `event:import_validation_bypass`：出现任何绕过元素校验的导入入口；
- 或出现「校验通过但导入失败」的真实反馈（说明校验与写入语义漂移）；
- 或引入第二种持久介质（ADR 0003 复核条件同时触发）。

## 后果

- 导入失败是「无副作用」的，可以向用户承诺「失败即未改动」。
- 新增表或字段时，必须同步更新校验器与 `viska/ledger.md` 的 G1-03；
  校验器是导入路径的唯一闸门。
