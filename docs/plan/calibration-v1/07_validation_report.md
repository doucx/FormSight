# 验证报告

状态：draft。§pilot-priors 已填（S01）；§fresh 已填（S03a）；§fresh2 已填（S03c）；holdout/retest 待 pilot v3。

## 1. 数据与版本

| 项 | 值 |
|---|---|
| 历史快照 | 2026-11-24 导出，`sha256:ab2fb088…6554f9` |
| 过滤 | 当前 cardId + `details` 存在 + `timestamp ≥ 2026-08-16` |
| 校准导出 | `formsight_calibration_all_2026-11-25_22-24.json`，`sha256:ce053c71…f99e` |
| 导出内容 | 5 runs / 120 trials / 全部 completed |
| 代码基线 | `develop` @ `619131d`（S03f） |
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

## 3c. §fresh2（S02c，pilot v2）

导出：`formsight_calibration_all_2026-11-25_23-00.json`，`sha256:e08ade3a…d3586`；11 runs / 8 protocols / 254 trials。
11 runs 中有重复：`star_single` 2 次、`angle_comparison` 3 次；其中一次 `angle_comparison` 中位 RT 133ms，判无效并丢弃。下表取**每协议最新且 RT≥300ms** 的 run。

| protocol | n | acc | 95% CI | levels → accuracy | 分类 | 说明 |
|---|---:|---:|---|---|---|---|
| color_hue | 20 | 0.75 | 0.54–0.90 | 9:.50 11:1.00 13:.75 15:.50 17:1.00 | non-monotone | 4/level 太少；交替 |
| color_val | 20 | 0.60 | 0.38–0.79 | 5:.75 7:.50 9:.50 11:.75 13:.50 | below-range | 阈值可能在 5 以下 |
| angle_parallel_2afc | 20 | 0.70 | 0.48–0.86 | 16:1.00 20:1.00 24:.75 28:.50 32:.25 | crossing ~23 | 干净、单调；可用 |
| angle_comparison_2afc | 20 | 0.75 | 0.54–0.90 | 14:.75 18:1.00 22:1.00 26:.25 30:.75 | non-monotone | 三次尝试 .60/.50/.75；不稳定 |
| persp_prop_division | 24 | 0.83 | 0.65–0.94 | 5:1.00 9:.75 13:1.00 17:.75 21:1.00 25:.50 | non-monotone | 末次穿越 ~23；噪声大 |
| persp_prop_migration | 20 | 0.90 | 0.72–0.98 | 8:1.00 12:1.00 16:1.00 20:.75 24:.75 | crossing ~19 | 可用但 4/level |
| star_double_r | 30 | 0.90 | 0.76–0.97 | 1:1.00 5:1.00 9:1.00 13:.60 17:1.00 21:.80 | non-monotone / ceiling | 需更高 levels 21–35 |
| star_single | 30 | 0.70 | 0.52–0.84 | 1:.60 4:.40 7:.60 10:.80 13:.80 16:1.00 | non-monotone / below | L1 仍 .60；两次 run 一致；疑似任务理解或几何问题 |

### 数据质量

- 11 runs / 8 protocols；`star_single` 两次（.63 / .70），`angle_comparison` 三次（.60 / .50 / .75）。
- `angle_comparison` 第二次中位 RT 133ms，明显无效；已丢弃。
- 22:41–23:00 约 19 分钟完成 254 题；后半段（star）可能疲劳。
- `star_single` 两次都在 L1 只有 .60，且 L4=.40；不是单调难度，先做 5 题人工检查再决定是否 out-of-range。
- `star_double_r` 1–21 已天花板；需要更高 levels。
- `color_val` v2 窗口 5–13 整体太难；阈值可能在 5 以下。
- `color_hue` / `angle_comparison` 4/level 的噪声主导，需要每级 6 题。

### 初步阈值（仅作规划）

- `angle_parallel_2afc`：~23（20→24 插值）。
- `persp_prop_migration`：~19（16→20 插值）。
- `persp_prop_division`：末次 ~23（21→25 插值），但非单调。
- ratio 族两卡差 ~4 级 → **弱 family transfer**。
- color / spatial / angle 仍无强证据。

## 3d. §fresh3（S02d，pilot v3）

导出：`formsight_calibration_all_2026-11-26_11-03.json`，`sha256:d1ea3a3b…a33c`；5 runs / 156 trials。
RT 正常（1.1–5.8s），无重复、无 invalid；运行间隔合理（10:18–11:03）。

| protocol | n | acc | 95% CI | levels → accuracy | 分类 / 估计 |
|---|---:|---:|---|---|---|
| color_hue | 30 | .80 | .63–.90 | 9:.833 11:1.00 13:1.00 15:.667 17:.500 | crossing ~14.2 |
| color_val | 30 | .63 | .46–.78 | 1:1.00 3:.667 5:.667 7:.167 9:.667 | non-monotone；L7 异常 |
| angle_comparison_2afc | 30 | .87 | .70–.95 | 14:1.00 18:1.00 22:.833 26:.833 30:.667 | crossing ~26.8 |
| star_single | 36 | .94 | .82–.99 | 1:1.00 4:1.00 7:.833 10:.833 13:1.00 16:1.00 | 天花板；阈值 >16 |
| star_double_r | 30 | .53 | .36–.70 | 17:1.00 21:.800 25:.600 29:.200 33:.600 35:.000 | 首次穿越 ~21；尾部噪声 |

### 关键观察

- `star_single` 在 1–16 全部 ≥.833，v2 的 .60 是疲劳/顺序，不是卡片下限；现在需要 16–35。
- `color_val` 的 L7 只有 1/6。L7 的目标 V 偏低（15/53/18/67），且误差 8–23；疑似低明度刺激混淆，不只是随机噪声。
- `angle_comparison` 干净；与 v2 的 `angle_parallel` ~23 配对，Δ~3.8 → angle 族弱通过。
- `star_double` 首次穿越 21，但 29/33/35 非单调；需要 19–27 确认。
- `color_hue` 干净，T~14.2；color 族只差 `color_val`。

### 初步 family transfer

| 族 | 状态 |
|---|---|
| color | color_hue 有；color_val 无 → 失败/待补 |
| spatial | star_double ~21；star_single 天花板 → 待补 |
| angle | angle_parallel ~23 vs angle_comparison ~27 → **弱通过**（Δ~4） |
| ratio | v2: division ~23 vs migration ~19 → **弱通过**（Δ~4） |

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

pilot v2 后：

- ratio：`persp_prop_migration` ~19、`persp_prop_division` ~23，差 ~4 → **弱证据**；
- angle：`angle_parallel_2afc` ~23，但 `angle_comparison` 不稳定 → 不能算通过；
- color / spatial：无有效阈值 → 失败。

pilot v3 后：angle 与 ratio 各为弱通过（Δ~4）；color/spatial 仍失败。

结论：**2/4 族弱证据，0 族强证据**；G1 仍未通过。

## 6. §retest（推迟到 v4）

原计划 4 张重测。pilot v2 后只有 angle/ratio 有初步阈值，color/spatial 没有；重测推迟到 pilot v4 的窗口修正后。

## 7. G1 结论

**G1 仍未通过（pilot v3）。**

- [x] 8 张卡都有过有效 run（跨 v2/v3）
- [ ] 8 张中 ≥6 张有有效 80% 穿越 — 目前 color_hue、angle_parallel、angle_comparison、star_double 有；color_val、star_single 缺；persp_division 噪声大
- [ ] ≥3/4 族 — angle/ratio 弱通过；color/spatial 失败
- [ ] 4 张重测 — 未做
- [ ] 控制卡 — 未跑

原因：

1. `color_val` L7 只有 1/6，低 V 刺激疑似混淆；需要更多数据/生成器约束。
2. `star_single` 1–16 天花板；需要 16–35。
3. `star_double` 首次穿越 21，但尾部 29–35 非单调；需要 19–27 确认。
4. angle/ratio 只是弱证据（Δ~4，4–5 题/级）。

## 8. 下一步：pilot v4（3 张，约 91 题）

### 8.1 窗口

| 卡 | levels | 每级 | 总数 | 目的 |
|---|---|---:|---:|---|
| star_single | 16 / 20 / 24 / 28 / 32 / 35 | 5 | 30 | 找 16 以上的阈值 |
| star_double_r | 19 / 21 / 23 / 25 / 27 | 5 | 25 | 确认 ~21 |
| color_val | 1 / 2 / 3 / 4 / 5 / 7 | 6 | 36 | 低端；确认 L7 异常 |

### 8.2 规则

- 每个 run 一次坐下完成；每次最多 2–3 个 run；star 先跑；
- 中位 RT <300ms 判无效；
- color_val 若 L7 仍异常，检查生成器的低 V 过滤，必要时约束 targetV 或按 ΔE 校准；
- star_single 若 16–35 仍不穿越，检查新几何是否整体偏易，再调整角度映射。

### 8.3 判定

- color：color_hue + color_val 都需有阈值；
- spatial：star_single 与 star_double 都需有阈值，且差 ≤5；
- angle/ratio 维持弱通过；
- 满足 ≥3/4 族后进 G2。
