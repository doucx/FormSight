# ADR 0003：全部持久状态入 IndexedDB，导入/清空走单跨表事务

- 状态：已采纳（2026-09-03）
- 证据：`src/storage/db/importExport.ts#importAllData`（7 表 `readwrite` 事务）；`src/storage/settings.ts` 仅 `formsight_theme_cache` 使用 localStorage

## 背景

旧方案把状态割裂在两个介质：

- localStorage：全局设置、各卡偏好、训练计划列表；
- IndexedDB：答题记录、会话、日聚合、生涯档案。

`importAllData` 先异步清空并写入 IDB，再同步写 localStorage。若第二步因配额抛错，`catch` 里用手拍快照"回滚"，只是尽力而为——一旦失败，数据库与设置处于不一致的脏状态。两个介质无法组成 ACID 事务。

## 决策

1. **所有持久状态进 IndexedDB**（`app_settings`、`training_plans` 已迁入）。
2. **导入与清空在一个跨 7 张表的 readwrite 事务内完成**：失败即整体回滚，旧数据不变。
3. localStorage 只保留首屏主题缓存 `formsight_theme_cache`，且允许丢失。

## 备选与被否决

| 备选 | 否决理由 |
|---|---|
| 保留双介质，加补偿事务 | 无法真正原子；补偿逻辑本身会腐化 |
| 写 localStorage 失败时重试 | 配额错误不可恢复，重试只是延长不一致窗口 |
| 每次导入前导出全量备份 | 不能防止中途崩溃留下的半状态 |

## 代价

- 首屏主题必须接受"可能过期"（用内联脚本先渲染，随后由 IDB 校正）。
- 所有设置读取变异步；调用方必须处理加载态。
- 事务覆盖 7 表，任何一张表结构变更都要复核事务边界。

## 复核条件

- 任何新持久字段写进 localStorage；
- `importExport` 引入第二种介质或第二个事务；
- 或出现"导入成功但设置未生效"的真实反馈。

## 后果

- 备份/恢复是"全有或全无"，语义可向用户承诺。
- `clearAllData` 同时清空计划与设置，不再有"清数据不清计划"的历史行为。
- HAP `src/storage` scope 记录了 `DECISION ARCH` 与复现条件。
