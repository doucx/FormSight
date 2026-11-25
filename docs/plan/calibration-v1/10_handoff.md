# 交接

> 每次会话结束更新本文件。下一次会话从这里接，不翻旧聊天。

## 当前状态

| 项 | 值 |
|---|---|
| 日期 | 2026-11-25 |
| Gate | **G1 未通过（pilot v3 待做）** |
| 上次会话 | S03d（pilot v3 协议） |
| 下一步 | **S02d**：跑 pilot v3（5 个 run，~156 题） |
| Blocker | 无；需要约 156 题 |

## S03a 结论

导出：`formsight_calibration_all_2026-11-25_22-24.json`，5 runs / 120 trials / completed。

| run | acc | 结论 |
|---|---:|---|
| color_val | 0.85 | 唯一近似跨 0.8（~8；7–9） |
| star_single | 0.87 | 非单调；Level 被 R 混淆 |
| star_double_r | 0.57 | 全部 <0.8；窗口太高；R 混淆 |
| angle_parallel_2afc | 0.95 | 天花板；窗口太低 |
| persp_prop_division | 0.75 | 每级 3/4，平坦；窗口太窄 |

- G1 未通过：5/8 run，0 个族有强 family transfer 证据。
- 详见 `07_validation_report.md` §3b/§7/§8。
- 不要进入 S04 全量校准。

## 下一步（只做这一件）

S02d：

1. 打开 `#/calibrate`，先跑 `star_single`（前 5 题人工检查；明显不可做就 Esc 退出并报告）；
2. 再跑 `star_double_r`；然后 `color_val`、`color_hue`、`angle_comparison_2afc`；
3. 每个 run 一次坐下完成；每次会话最多 2–3 个 run，中间休息；
4. 中位 RT <300ms 的 run 会被 summary 标 invalid，S03 丢弃；
5. 完成后 Export all，放 `viska/local/calibration/`，告诉 S03e 文件名。

## 读取顺序

1. `00_README.md`
2. `01_decisions.md`
3. `02_card_status.md`
4. 本文件

## 不要做

- 不进入全量校准（S04）直到 G1 通过。
- 不迁移旧数据；不清 IDB；不提交原始 JSON。
- 不加新 card 类型。
- 不用 block 做测量。
- 不修改已记录的 D-001..D-023；要改就追加 D-xxx。
- 不在 tracked 文件写绝对路径、Token、个人日程。

## Artifact 版本

| 名称 | 版本 | 说明 |
|---|---|---|
| 历史快照 | 2026-11-24 | `sha256:ab2fb088…6554f9` |
| pilot 先验 | 2026-11-24 | `pilot-priors.json`，`sha256:6c5bb30…64cd` |
| pilot v1 导出 | 2026-11-25 | `formsight_calibration_all_2026-11-25_22-24.json`，`sha256:ce053c71…f99e` |
| pilot v2 导出 | 2026-11-25 | `formsight_calibration_all_2026-11-25_23-00.json`，`sha256:e08ade3a…d3586` |
| 校准导出格式 | `formsight-calibration-runs` v1 | 每 run 自动生成 |
| 代码基线 | `develop` @ `cdd2b3d` | pilot v3 + invalid flag |
| 校准 artifact | 未生成 | G2 产出 `calib-v1` |

## 本次会话的验证

- 只读分析 + 文档更新；未改代码。
- `11_experiment_log` 已由导出回填。
- 原始数据未进入 git；本地副本在 `viska/local/calibration/`。
