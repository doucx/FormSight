# 交接

> 每次会话结束更新本文件。下一次会话从这里接，不翻旧聊天。

## 当前状态

| 项 | 值 |
|---|---|
| 日期 | 2026-11-24 |
| Gate | **G1 待做（S01 完成，等待试点补测/重测）** |
| 上次会话 | S01 |
| 下一步 | **S02**：`star_single` 30、`star_double_r` 30；**S02b**：`color_val` / `angle_parallel_2afc` / `persp_prop_division` 各 20 |
| Blocker | 需要约 120 题补测/重测；工具起始 level 可能不在窗口（R-04） |

## S01 产出

- `06_calibration_protocol.md`：先验、补测、记录、失败处理
- `07_validation_report.md`：§pilot-priors 已填；holdout/LOCO/retest 待 S03
- `08_data_dictionary.md`：字段、单位、版本分界、33 卡 details 键
- `09_risk_register.md`：R-01..R-15
- `11_experiment_log.md`：S02/S02b 模板
- `12_glossary.md`
- `13_artifact_manifest.md`
- 更新 `02` 的试点窗口、`03` 的 G1 题量、`04` 的 S02b
- 本地产物：`viska/local/calibration/pilot-priors.json`、`pilot_priors.py`

## 下一步（只做这一件）

S02 + S02b：

1. `star_single` 30 题：窗口 10–18；
2. `star_double_r` 30 题：窗口 20–26；
3. 重测 `color_val` 20 题：窗口 3–9；
4. 重测 `angle_parallel_2afc` 20 题：窗口 6–14；
5. 重测 `persp_prop_division` 20 题：窗口 9–17；
6. 每次填 `11_experiment_log.md`；逐题明细放 `viska/local/calibration/`；
7. 若 10 题后仍在窗口外，标 `window-missed`，停止并重排。

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

## 待确认（不阻塞 S02）

1. 试点 8 张（D-005）是否最终确认。
2. `rel_lightness_induction` / `neg_ratio_estimation` 边界卡：等 CI 还是直接排除。
3. `docs/plan` 的备份方式（私有仓库/加密同步/手动）。

## Artifact 版本

| 名称 | 版本 | 说明 |
|---|---|---|
| 数据快照 | 2026-11-24 | `sha256:ab2fb088…6554f9` |
| pilot 先验 | 2026-11-24 | `pilot-priors.json`，`sha256:6c5bb30…64cd` |
| pilot 脚本 | 2026-11-24 | `pilot_priors.py`，`sha256:1a43065…7ac` |
| 代码基线 | `develop` @ `fb6256d` | S00 tag `calib-plan-v1` |
| 校准 artifact | 未生成 | G2 产出 `calib-v1` |

## 本次会话的验证

- 文档-only + 本地分析脚本；提交后跑 `pnpm verify`。
- 确认 `docs/plan` 未被 biome/tsc 误扫。
- 原始数据未进入 git。
