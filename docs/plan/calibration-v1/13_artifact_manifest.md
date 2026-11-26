# Artifact Manifest

记录校准用到的数据、脚本、产物及其 hash。每次生成新 artifact 或重跑脚本后更新。

## 当前

| artifact | 位置 | 版本/时间 | sha256 | 说明 |
|---|---|---|---|---|
| 数据快照 | `<DATASET_JSON>`（仓库外） | 2026-11-24 | `ab2fb0886a2ec576eb28c0e45f503354c3f503f48deec532687ec4d5746554f9` | 29,233 条 records；导出 version 4 |
| pilot 先验 | `viska/local/calibration/pilot-priors.json` | 2026-11-24 | `6c5bb3040d3eb0277eb049d00617489b2a738ff15b5a49078c2d153dd77464cd` | 8 张试点 + 1 控制；本地 gitignored |
| pilot 脚本 | `viska/local/calibration/pilot_priors.py` | 2026-11-24 | `1a430653d18fd6b21775076d1c775b33c8ec41fba9fc0f6f2d999a20512d07ac` | 等渗先验；本地 gitignored |
| 计划 tag | git tag `calib-plan-v1` | 2026-11-24 | — | S00 合并点 |
| 代码基线 | `develop` @ `d42f86a` | 2026-11-26 | — | QA tools |
| 校准导出 | `formsight-calibration-runs` v1 | 2026-11-24 | — | 每 run 自动生成；本地 |
| pilot v1 导出 | `formsight_calibration_all_2026-11-25_22-24.json` | 2026-11-25 | `ce053c710fe5dfdfcfa44f53fd421adc9be785e0a4ad75c03606dc88f822f99e` | 5 runs / 120 trials |
| pilot v2 导出 | `formsight_calibration_all_2026-11-25_23-00.json` | 2026-11-25 | `e08ade3af6fb546aaf8dc99bde755cee05836a5fbbd96bc0b9527380134d3586` | 11 runs / 8 protocols / 254 trials |
| pilot v3 导出 | `formsight_calibration_all_2026-11-26_11-03.json` | 2026-11-26 | `d1ea3a3b3abb2e7ab03fabd782f0dfe9131cfd4fe4e625edbc207552fba9a33c` | 5 runs / 156 trials |
| pilot v4 导出 | `formsight_calibration_all_2026-11-26_12-28.json` | 2026-11-26 | `67a5281b5195e8aa41f1717bdffbb2f41963ae50e096d688582caccbc3f694c9` | 3 runs / 91 trials |
| 校准 artifact | 未生成 | G2 | — | `calib-v1` |
| 全量验证报告 | 未生成 | G2 | — | 见 `07_validation_report.md` |

## 计划产物

| 名称 | 何时 | 内容 |
|---|---|---|
| `calib-v0.9` | S04 | 全量先验 + 状态草稿 |
| `calib-v1` | S08/G2 | 每卡 JND、CI、slope、guess、lapse、n、status |
| `anchor-v1` | S16/G5 | θ、family 偏移、锚点结果 |
| `validation-full` | G2 | holdout/LOCO/retest 结果 |

## 规则

- 本地 artifact 不进 git；tracked 只记路径、hash、版本、状态。
- 重跑脚本后必须更新 hash；hash 不一致的 artifact 不得引用。
- artifact 必须记录 `codeVersion` 与数据 `sha256`；两者缺一不可。
- 若脚本从 `viska/local/` 提升为 `scripts/`，先去掉数据集路径，再单独评审。

## 变更记录

| 日期 | 变更 |
|---|---|
| 2026-11-24 | 初始 manifest；记录数据快照、pilot 先验、脚本 hash |
