# 验证报告

状态：draft。§pilot-priors 已填（S01）；§holdout / §LOCO / §retest 待 S03。

## 1. 数据与版本

| 项 | 值 |
|---|---|
| 数据快照 | 2026-11-24 导出，`sha256:ab2fb088…6554f9` |
| 过滤 | 当前 cardId + `details` 存在 + `timestamp ≥ 2026-08-16` |
| 代码基线 | `develop` @ `0695afe`（先验生成时） |
| 先验 artifact | `viska/local/calibration/pilot-priors.json`，`sha256:6c5bb30…64cd` |
| 先验脚本 | `viska/local/calibration/pilot_priors.py`，`sha256:1a43065…7ac` |

原始数据与本地 artifact 不进仓库。

## 2. 先验方法

- 按 level 分箱；±2 级平滑，窗口 `n ≥ 20`；
- 加权等渗回归（PAVA，单调下降）；
- 找 `p=0.8` 的插值穿越点；bootstrap 300 次给 5–95% 区间；
- 若第一个有支撑的 level 已 ≤0.8，记 `below-range`，先验只作下界占位；
- 参数 logistic 只作诊断：数据范围不跨 0.8 时外推不稳定，不用于先验。

## 3. §pilot-priors（8 张 + 1 控制）

| 卡 | 族 | n | level 范围 | 位置 | 先验 | 90% 区间 | 补测窗口 | 状态 |
|---|---|---:|---|---|---:|---|---|---|
| color_hue | color | 1066 | 15–22 | below-range | 13（占位） | 13–13 | 10–16 | prior-weak |
| color_val | color | 1037 | 8–20 | below-range | 6（占位） | 6–6 | 3–9 | prior-ok |
| star_single | spatial | 1107 | 5–25 | inside | 15 | 15–15 | 10–18 | prior-weak |
| star_double_r | spatial | 888 | 25–31 | below-range | 23（占位） | 23–23 | 20–26 | prior-weak |
| angle_parallel_2afc | angle | 531 | 5–32 | inside | 9 | 9–15 | 6–14 | prior-ok |
| angle_comparison_2afc | angle | 498 | 5–29 | inside | 12 | 12–17 | 8–17 | prior-ok |
| persp_prop_division | ratio | 289 | 5–20 | inside | 14.4 | 12–15 | 9–17 | prior-ok |
| persp_prop_migration | ratio | 306 | 5–23 | inside | 6 | 6–12 | 6–14 | prior-weak |
| color_lightness | color | 220 | 1–8 | below-range | — | — | 不补测 | out-of-range-control |

说明：

- `below-range` 的“先验”是占位下界，不是 JND；补测要围绕窗口下探。
- `color_hue` / `color_val` 的历史在 8/16 后有 details，但 80% 点靠近或低于观测下界；补测窗口要覆盖 3–16。
- `star_single` 的 `n_low=1`：低等级几乎没有样本；先验弱，S02 补测 30 题。
- `star_double_r` 全部数据在 25–31；先验弱，S02 补测 30 题。
- `persp_prop_migration` 的等渗穿越 6 受低等级噪声影响；binned 曲线显示 8/11 仍 0.80、14 降到 0.66；窗口取 6–14，标 `prior-weak`。
- `color_lightness` 在 L1 仍 0.73，确认 out-of-range；不补测，作为控制。

## 4. §holdout（S03 待填）

- 训练：`timestamp < 2026-10-01`；
- 测试：`timestamp ≥ 2026-10-01`；
- 指标：Brier / log-loss vs 常数 0.6、vs 当前 block 映射；
- 通过线：≥70% 卡优于 baseline。

## 5. §LOCO（S03 待填）

按族藏一张，预测其 JND：

| 族 | 藏起 | 用其余预测 |
|---|---|---|
| color | color_hue | color_val |
| color | color_val | color_hue |
| spatial | star_single | star_double_r |
| spatial | star_double_r | star_single |
| angle | angle_parallel_2afc | angle_comparison_2afc |
| angle | angle_comparison_2afc | angle_parallel_2afc |
| ratio | persp_prop_division | persp_prop_migration |
| ratio | persp_prop_migration | persp_prop_division |

通过线：≥3/4 族中位误差 ≤5 级。

## 6. §retest（S03 待填）

- 4 张：`color_val`、`angle_parallel_2afc`、`persp_prop_division`、`star_single`（或 `star_double_r`）；
- 各 20 题，落在预测阈值附近；
- 判定：命中率 95% CI 覆盖 0.8；JND 偏移 ≤5 级或落在预测 CI 内；
- 通过线：≥3/4。

## 7. G1 结论（S03 待填）

- [ ] 8 张中 ≥6 张通过 holdout
- [ ] ≥3/4 族 LOCO 中位 ≤5 级
- [ ] 4 张重测 ≥3 张通过
- [ ] `color_lightness` 被正确排除
- [ ] 若 ≥2 族失败，按 `03_roadmap` 降级

结论：待填。
