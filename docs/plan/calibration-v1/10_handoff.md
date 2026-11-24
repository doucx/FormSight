# 交接

> 每次会话结束更新本文件。下一次会话从这里接，不翻旧聊天。

## 当前状态

| 项 | 值 |
|---|---|
| 日期 | 2026-11-24 |
| Gate | **G0 已通过（S00 合入 `develop`）** |
| 上次会话 | S00 |
| 下一步 | **S01**：写 `06`/`08`/`09`/`12`/`13`，跑 8 张试点先验 |
| Blocker | 无；S02 需要你补测 `star_single` / `star_double_r` 各 30 题 |

## S00 产出

- `docs/plan/README.md`
- `docs/plan/calibration-v1/00_README.md`
- `01_decisions.md`（D-001..D-015）
- `02_card_status.md`（33 张卡分组）
- `03_roadmap.md`（G0–G6 + 降级树）
- `04_schedule.md`（S00–S17）
- `05_acceptance.md`（指标 + gate + 四道验证）
- `10_handoff.md`（本文件）
- `PRIVACY.md`
- `.gitignore`（只忽略 `raw/`、`private/`、`*.local.*`）

## 下一步（只做这一件）

S01：

1. 写 `06_calibration_protocol.md`：补测怎么选题、怎么记录、失败怎么重来；
2. 写 `08_data_dictionary.md`：每卡 `details` 字段、单位、版本分界；
3. 写 `09_risk_register.md`、`12_glossary.md`、`13_artifact_manifest.md`；
4. 跑 8 张试点先验（只读历史，不写原始数据进仓库）；
5. 更新本文件与 `13`。

## 读取顺序

1. `00_README.md`
2. `01_decisions.md`
3. `02_card_status.md`
4. 本文件

## 不要做

- 不迁移旧数据；不清 IDB；不提交原始 JSON。
- 不加新 card 类型。
- 不用 block 做测量。
- 不修改已记录的 D-001..D-015；要改就追加 D-xxx。
- 不在 tracked 文件写绝对路径、Token、个人日程。

## 待确认（不阻塞 S01）

1. 试点 8 张（D-005）是否最终确认；若坚持 6 张，追加 D-016。
2. `rel_lightness_induction` / `neg_ratio_estimation` 边界卡：等 CI 还是直接排除。
3. `docs/plan` 的备份方式（私有仓库/加密同步/手动）。

## Artifact 版本

| 名称 | 版本 | 说明 |
|---|---|---|
| 数据快照 | 2026-11-24 | `sha256:ab2fb088…6554f9` |
| 代码基线 | `develop` @ `6c4e179` | S00 已合并；tag `calib-plan-v1` |
| 校准 artifact | 未生成 | G2 产出 `calib-v1` |
| 验证报告 | 未生成 | G1/G2/G5 更新 |

## 本次会话的验证

- `pnpm verify` 通过：42 个测试文件 / 454 个用例 / 3.85s（总耗时约 8.8s）。
- 文档-only，无代码改动。
- `docs/plan` 未被 biome/tsc 误扫，暂不需要加 ignore。
- `plan/calibration-v1` 已合并进 `develop`，可删除分支；保留 tag 即可。
