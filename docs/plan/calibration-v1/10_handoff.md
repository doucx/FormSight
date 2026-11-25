# 交接

> 每次会话结束更新本文件。下一次会话从这里接，不翻旧聊天。

## 当前状态

| 项 | 值 |
|---|---|
| 日期 | 2026-11-25 |
| Gate | **G1 未通过（pilot v1 窗口失效；等待 S03b + S02c）** |
| 上次会话 | S03a（pilot v1 分析） |
| 下一步 | **S03b**：修 star 生成器 R 混淆；改 pilot v2 协议（8 张，~184 题） |
| Blocker | star_single / star_double_r 的 Level 被 R 混淆；angle/persp 窗口太窄 |

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

S03b：

1. 修 `star_single` / `star_double_r` 生成器：让间距按角度/R 比例缩放，消除 R 混淆；
2. 按 `07` §8.2 更新 `src/calibration/protocols.ts`（pilot v2，8 张，~184 题）；
3. 跑 `pnpm verify`；在 `07` 记录改动；
4. 更新本文件，等 S02c。

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
| 校准导出格式 | `formsight-calibration-runs` v1 | 每 run 自动生成 |
| 代码基线 | `develop` @ `b274d9a` | Calibration Runner + DB v5 |
| 校准 artifact | 未生成 | G2 产出 `calib-v1` |

## 本次会话的验证

- 只读分析 + 文档更新；未改代码。
- `11_experiment_log` 已由导出回填。
- 原始数据未进入 git；本地副本在 `viska/local/calibration/`。
