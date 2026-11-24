# 交接

> 每次会话结束更新本文件。下一次会话从这里接，不翻旧聊天。

## 当前状态

| 项 | 值 |
|---|---|
| 日期 | 2026-11-24 |
| Gate | **G1 待做（S01c 工具就绪，等待 S02/S02b）** |
| 上次会话 | S01c（Calibration Runner） |
| 下一步 | **S02**：`star_single` 30、`star_double_r` 30；**S02b**：`color_val` / `angle_parallel_2afc` / `persp_prop_division` 各 20 |
| Blocker | 需要约 120 题；工具已就绪，不再需要手动调级 |

## S01c 产出

- 设置 → Data Governance → **Calibration runs**，或 `#/calibrate`；
- 5 个固定序列 run；Start / Resume / Export / Export all / Clear；
- 每题自动写 `calibration_runs` / `calibration_trials`，**不写训练统计**；
- 完成后自动生成 byLevel summary，导出 `formsight-calibration-runs` JSON；
- 中断可 Resume；导出前不需要手填 `11_experiment_log`。

代码：

- `src/calibration/`：protocols、sequence、repository、export、view、runner、summary；
- `schema.ts`：DB_VERSION 5，新增两个 store；
- `importExport.ts` / `clearAllData`：包含校准数据；
- `useTrainingSession`：`scheduledLevels`；`GenericTrainingView` / `TrainingShell`：protocol 锁与 trial 回调；
- `useHashRoute` / `AppRouter`：`#/calibrate`。

## 下一步（只做这一件）

S02 + S02b：

1. 打开 `#/calibrate`；
2. 依次完成 5 个 run（顺序不限）：
   - `star_single` 30 题
   - `star_double_r` 30 题
   - `color_val` 20 题
   - `angle_parallel_2afc` 20 题
   - `persp_prop_division` 20 题
3. 每个 run 完成页点 **Export run**；全部完成后点 **Export all**；
4. 把导出的 JSON 放 `viska/local/calibration/`，告诉 S03 文件名。

## 读取顺序

1. `00_README.md`
2. `01_decisions.md`
3. `02_card_status.md`
4. 本文件

## 不要做

- 不迁移旧数据；不清 IDB；不提交原始 JSON。
- 不加新 card 类型。
- 不用 block 做测量。
- 不修改已记录的 D-001..D-019；要改就追加 D-xxx。
- 不在 tracked 文件写绝对路径、Token、个人日程。

## 待确认（不阻塞 S02）

1. `rel_lightness_induction` / `neg_ratio_estimation` 边界卡：等 CI 还是直接排除。
2. `docs/plan` 的备份方式（私有仓库/加密同步/手动）。

## Artifact 版本

| 名称 | 版本 | 说明 |
|---|---|---|
| 数据快照 | 2026-11-24 | `sha256:ab2fb088…6554f9` |
| pilot 先验 | 2026-11-24 | `pilot-priors.json`，`sha256:6c5bb30…64cd` |
| pilot 脚本 | 2026-11-24 | `pilot_priors.py`，`sha256:1a43065…7ac` |
| 校准导出 | `formsight-calibration-runs` v1 | 每 run 自动生成 |
| 代码基线 | `develop` @ S01c commit | S00 tag `calib-plan-v1` |
| 校准 artifact | 未生成 | G2 产出 `calib-v1` |

## 本次会话的验证

- `pnpm verify`：46 个测试文件 / 464 个用例全部通过。
- 新增校准 sequence/repository/export/backup 测试。
- 文档-only 改动随后一并提交。
- 原始数据未进入 git。
