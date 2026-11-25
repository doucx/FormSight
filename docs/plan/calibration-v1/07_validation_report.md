# 验证报告

状态：draft。§pilot-priors 已填（S01）；§fresh 已填（S03）；§holdout/§LOCO/§retest 因窗口失效无法完成。

## 1. 数据与版本

| 项 | 值 |
|---|---|
| 历史快照 | 2026-11-24 导出，`sha256:ab2fb088…6554f9` |
| 过滤 | 当前 cardId + `details` 存在 + `timestamp ≥ 2026-08-16` |
| 校准导出 | `formsight_calibration_all_2026-11-25_22-24.json`，`sha256:ce053c71…f99e` |
| 导出内容 | 5 runs / 120 trials / 全部 completed |
| 代码基线 | `develop` @ `b274d9a`（Calibration Runner） |
| 先验 artifact | `viska/local/calibration/pilot-priors.json`，`sha256:6c5bb30…64cd` |

原始数据与本地 artifact 不进仓库。

## 2. 先验方法

- 按 level 分箱；±2 级平滑，窗口 `n ≥ 20`；
- 加权等渗回归（PAVA，单调下降）；
- 找 `p=0.8` 的插值穿越点；bootstrap 300 次给 5–95% 区间；
- 若第一个有支撑的 level 已 ≤0.8，记 `below-range`，先验只作下界占位；
- 参数 logistic 只作诊断：数据范围不跨 0.8 时外推不稳定，不用于先验。

## 3. §pilot-priors（历史，S01）

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

## 3b. §fresh（S02/S02b，5 runs）

导出：`formsight_calibration_all_2026-11-25_22-24.json`，5 runs、120 trials，全部 completed。
每个 run 的 `index` 连续、无重复、details 齐全。

| run | n | hits | acc | 95% CI | 结论 | 历史先验 |
|---|---:|---:|---:|---|---|---:|
| color_val | 20 | 17 | 0.85 | 0.65–0.96 | 唯一近似跨过 0.8；L7=1.0, L9=0.6，穿越 7–9（点 ~8） | 6（below-range） |
| star_single | 30 | 26 | 0.87 | 0.71–0.95 | 非单调：L10/12=0.83, L14=0.67, L16/18=1.00 | 15 |
| star_double_r | 30 | 17 | 0.57 | 0.39–0.73 | 全部 <0.8；阈值在 20 以下 | 23 |
| angle_parallel_2afc | 20 | 19 | 0.95 | 0.79–0.99 | 天花板；L6–14 太容易，阈值 >14 | 9 |
| persp_prop_division | 20 | 15 | 0.75 | 0.54–0.90 | 完全平坦：每级都 3/4 | 14.4 |

### 数据质量

- `star_single` 跨 24 小时：3 题在 2026-11-24 22:06，27 题在 2026-11-25 22:17；不是一次坐下完成。
- `star_double_r` 顺序下滑：前 1/3 8/10，中 1/3 6/10，后 1/3 3/10；疲劳/顺序效应明显。
- `angle_parallel_2afc`：19/20，无有效阈值点；窗口整体偏易。
- `persp_prop_division`：每级精确 3/4，容差仅 0.054→0.036；窗口太窄，无法定位 80%。
- `color_val`：只有 L9（3/5）低于 0.8；阈值可由 7–9 插值，但 20 题下区间很宽。

### 逐级正确率

| 卡 | levels → accuracy |
|---|---|
| color_val | 3:0.80, 5:1.00, 7:1.00, 9:0.60 |
| star_single | 10:0.83, 12:0.83, 14:0.67, 16:1.00, 18:1.00 |
| star_double_r | 20:0.67, 21:0.67, 23:0.50, 25:0.50, 26:0.50 |
| angle_parallel_2afc | 6:1.00, 8:1.00, 10:0.75, 12:1.00, 14:1.00 |
| persp_prop_division | 9/11/13/15/17 全部 0.75 |

## 4. §holdout（无法完成）

原计划：历史训练、2026-10-01 之后测试。实际问题是 4/5 个 fresh run **没有有效的 80% 穿越点**：

- `star_double_r`、`angle_parallel_2afc`、`persp_prop_division` 分别为 below-range / above-range / flat；
- `star_single` 非单调；
- 只有 `color_val` 可做粗略外推。

因此不能用 Brier / log-loss 做有意义的 holdout；需要先重设窗口（见 §8）。

## 5. §LOCO（无法完成，仅有初步判断）

| 族 | 配对 | 初步判断 |
|---|---|---|
| color | color_val fresh ~8 vs color_hue 历史先验 13 | 差 ~5，边界；两个先验都弱，不能算通过 |
| spatial | star_single（非单调）vs star_double_r（<20） | 失败；而且两张卡都有 R 混淆 |
| angle | angle_parallel fresh >14 vs angle_comparison 历史 12 | 无法估计；窗口太易，判定失败 |
| ratio | persp_prop_division flat vs persp_prop_migration 历史 6 | 无法估计；判定失败 |

结论：**没有一族给出强证据**；family transfer 未被验证。

## 6. §retest（无意义）

原计划 4 张重测。由于 4/5 的阈值未建立，重测只会重复“测不到阈值”。重测应在 pilot v2 的窗口修正后做。

## 7. G1 结论

**G1 未通过（incomplete + invalid ranges）。**

- [ ] 8 张中 ≥6 张通过 holdout — 只完成 5/8，且 4/5 窗口无效
- [ ] ≥3/4 族 LOCO 中位 ≤5 级 — 0 族强证据
- [ ] 4 张重测 ≥3 张通过 — 未做（无有效阈值）
- [ ] `color_lightness` 被正确排除 — 本次未跑控制
- [ ] family transfer — 未验证

这不是“校准失败”，而是**试点帮我们在投入 300–400 题之前发现了三个问题**：

1. 历史先验来自 block 数据，窗口系统性偏窄/偏移；
2. `star_single` / `star_double_r` 的 Level 被随机距离 R 混淆，不是单调难度；
3. 固定 5 级窗口对指数难度映射太窄（angle 只覆盖 10.6°→5.5°，persp 只覆盖 0.054→0.036）。

## 8. 下一步：pilot v2

### 8.1 先修 star 生成器

`star_single` / `star_double_r` 目前 `S(level)` 是像素间距，角间距是 `S/R`；R 随机导致同一 Level 难度差 3–4 倍。建议：

- 把间距改成**角度/比例**：`step = f(level)`（度），径向和角向都用 `R * step`；
- 或把 `R` 纳入强度量，Level 由角度精度唯一决定；
- 修完后旧 Level 作废，两张卡标 `confounded/experimental`，重新标定。

### 8.2 pilot v2 窗口（8 张，约 184 题）

| 卡 | levels | 每级 | 总数 |
|---|---|---:|---:|
| color_hue | 9 / 11 / 13 / 15 / 17 | 4 | 20 |
| color_val | 5 / 7 / 9 / 11 / 13 | 4 | 20 |
| angle_parallel_2afc | 16 / 20 / 24 / 28 / 32 | 4 | 20 |
| angle_comparison_2afc | 14 / 18 / 22 / 26 / 30 | 4 | 20 |
| persp_prop_division | 5 / 9 / 13 / 17 / 21 / 25 | 4 | 24 |
| persp_prop_migration | 8 / 12 / 16 / 20 / 24 | 4 | 20 |
| star_single | 1 / 4 / 7 / 10 / 13 / 16 | 5 | 30 |
| star_double_r | 1 / 5 / 9 / 13 / 17 / 21 | 5 | 30 |

- 先修 star 生成器，再跑 star；
- 所有 run 必须在一次坐下完成；中断超过 2 小时标 `split` 并重做；
- 完成后重跑 §4–§7。

### 8.3 判定

- 8 张中 ≥6 张有有效 80% 穿越；
- ≥3/4 族 LOCO 中位 ≤5 级；
- 4 张重测 ≥3 张通过；
- 否则仍不进入全量校准。
