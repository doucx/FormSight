# 卡片现状

- 数据快照：2026-11-24 导出，`sha256:ab2fb088…6554f9`
- 代码基线：`develop` @ `4374acd`
- 范围：当前注册的 33 张卡；旧 cardId 记录已排除（D-014）
- `cross80`：粗略 80% 穿越 level，仅用于定位补测范围，不是 JND
- 计数会随补测更新；不要在表里手调数字，更新时注明来源

> **方案 B（2026-11-26）**：以下阈值只作 per-card 起点；不再做 family transfer，不再用 20 题映射所有卡。

## 汇总

| 组 | 卡数 | 含义 |
|---|---:|---|
| calibratable | 13 | 历史基本够，可直接拟合 |
| targeted | 13 | 80% 阈值附近缺数据，需补测 20–30 题（3 张 star 标 experimental） |
| confounded | 0 | v1 的 star R 混淆已在 S03b 修复；待 v2 校准 |
| redesign | 7 | 最简单等级仍到不了 80%，先排除并排队改生成器 |

## A. calibratable（13）

| 卡 | 族 | 标签 | n / details | ≤15 | cross80 | 备注 |
|---|---|---|---:|---:|---:|---|
| color_hue | color | C / abs | 2308 / 2308 | 236 | 14 | pooled T~13.6；low-confidence |
| color_val | color | C / abs | 1799 / 1799 | 998 | 7 | pooled T~5.1；low-confidence |
| color_sat | color | C / abs | 1578 / 1578 | 213 | 11 | 连续 ΔE |
| abs_td_hull_2afc | form | F / con | 942 / 942 | 390 | 8 | 2AFC |
| neg_vertex_fitting | spatial | F+S / abs+fg | 781 / 781 | 781 | 5 | L5 n=10，CI 宽 |
| neg_shape_match_2afc | form | F / rel+wm+fg | 780 / 780 | 308 | 4 | L4 n=20，边界 |
| rel_hue_induction | color | C / rel+ill | 716 / 716 | 596 | 8 | 相对色 |
| abs_palette_clustering | color | C / ext | 618 / 618 | 557 | 5 | 多选 |
| color_all | color | C / abs | 611 / 611 | 158 | 16 | 连续 ΔE |
| rel_decontextual_2afc | color | C / rel+ill | 883 / 883 | 133 | 17 | 2AFC |
| abs_notan_threshold | rhythm | R / ext+fg | 821 / 821 | 121 | 27 | 图底 |
| fractal_edge_roughness | rhythm | R / ext+abs+ill | 360 / 360 | 120 | 8 | 分形粗糙度 |
| persp_prop_migration | form | F+S / rel+wm+dt | 306 / 306 | 116 | 14 | pooled T~19.2；ratio 通过 |

## B. targeted（13；3 张 star 标 experimental）

| 卡 | 族 | 标签 | n / details | ≤15 | cross80 | 补测 |
|---|---|---|---:|---:|---:|---|
| star_single | spatial | S / abs | 2663 / 1107 | 1 | 17 | pooled T~16.1；v3/v4 边界噪声；experimental |
| star_double_r | spatial | S+F / abs+rel+dt | 2108 / 888 | 0 | 25 | pooled T~23.6；experimental |
| star_double_h | spatial | S+F / abs+rel | 463 / 37 | 0 | 24 | 生成器已修；v2 未排；experimental |
| neg_area_comparison_2afc | ratio | F / rel+fg | 1362 / 1362 | 54 | 23 | 25 题，L20–25 |
| abs_gesture_axis | rhythm | R / ext | 1144 / 1144 | 85 | 17 | 25 题，L14–20 |
| abs_td_gesture_2afc | rhythm | R / con | 978 / 978 | 67 | 14 | 25 题，L10–16 |
| abs_td_notan_2afc | rhythm | R / con+fg | 902 / 902 | 44 | 26 | 30 题，L22–30 |
| angle_parallel_2afc | angle | F+S / rel | 531 / 531 | 64 | 11 | pooled T~23.0；low-confidence |
| angle_comparison_2afc | angle | F+S / rel | 498 / 498 | 60 | 14 | 不稳定：pooled ~16 / v3 ~26.8；fail |
| persp_vp_convergence | form | S / rel | 327 / 327 | 40 | 23 | 30 题，L20–26 |
| persp_prop_division | ratio | F / abs | 289 / 289 | 70 | 17 | pooled T~21.1；ratio 通过 |
| persp_gestalt_continuation | form | S / rel+ill | 286 / 286 | 40 | 26 | 30 题，L22–30 |
| abs_td_palette_4afc | color | C / con | 240 / 240 | 73 | 14 | 25 题，L10–18 |

## C. redesign（7，先排除 + experimental）

| 卡 | 族 | 标签 | n / details | 最低级正确率 | 问题 / 下一步 |
|---|---|---|---:|---|---|
| rel_vector_shift | color | C / rel+ill | 1523 / 1523 | L2 = 0.68 | 向下扩展难度；确认 CI |
| abs_polygon_decimation | form | F / ext | 1107 / 1107 | L2 = 0.75 | 向下扩展难度；确认 CI |
| rel_lightness_induction | color | C / rel+ill | 599 / 599 | L5 = 0.77 | 边界，先用 95% CI 确认 |
| neg_ratio_estimation | ratio | F / abs+fg | 246 / 246 | L5 = 0.77 | 边界，先用 95% CI 确认 |
| color_lightness | color | C / abs+ill | 220 / 220 | L1 = 0.73 | 明确 out-of-range；改生成器 |
| angle_estimation | angle | F+S / abs | 102 / 102 | L5 = 0.69 | 明确 out-of-range；改生成器 |
| spatial_fractal | form | S / ext | 282 / 0 | L1 = 0.64 | 无 details；改生成器 + 补 details |

## S03g 最终判定（2026-11-26，pilot v4 + pooled）

- pooled 阈值：color_hue ~13.6、color_val ~5.1、star_single ~16.1、star_double ~23.6、angle_parallel ~23.0、angle_comparison ~16.1/26.8（不稳定）、persp_division ~21.1、persp_migration ~19.2。
- family transfer：仅 ratio 通过（Δ~1.9）；color Δ~8.5、spatial Δ~7.5、angle 不稳定 → fail。
- **G1 不通过**；不再做 pilot v5，转降级方案（见 `07` §8）。
- 同族卡不是同一能力；20–30 题/卡压不住 run-to-run 方差。

## S03e fresh3 结果（2026-11-26，pilot v3）

- `color_hue`：.80，T~14.2，干净。
- `color_val`：.63，L7=1/6 异常（低 V）；需 v4。
- `angle_comparison_2afc`：.87，T~26.8，干净；与 angle_parallel ~23 弱通过。
- `star_single`：.94，1–16 天花板；v4 16–35。
- `star_double_r`：.53，T~21；尾部噪声；v4 19–27 确认。
- G1 仍未通过（2/4 族弱证据）；pilot v4 聚焦 3 张、~91 题。

## S03c fresh2 结果（2026-11-25，pilot v2）

- 11 runs / 8 protocols；`star_single` 2 次、`angle_comparison` 3 次；其中一次 angle_comparison 133ms/题，判无效。
- `angle_parallel_2afc`：~23，干净单调；可用。
- `persp_prop_migration`：~19；`persp_prop_division`：~23 但非单调 → ratio 弱证据。
- `color_hue` / `angle_comparison`：非单调，4/level 噪声大；需要 6/level。
- `color_val`：.60 且 below-range；窗口整体偏难。
- `star_single`：两次 L1 都 .60；先 5 题人工检查；仍 <.8 则 out-of-range。
- `star_double_r`：.90 天花板；需要 21–35。
- G1 仍未通过；pilot v3 聚焦 5 张。

## S03 fresh 结果（2026-11-25，pilot v1）

- `color_val`：唯一近似跨 0.8（~8；7–9 插值）；20 题，区间宽。
- `star_single`：非单调；Level 与 R 混淆；S03b 已改为角间距常量。
- `star_double_r`：全部 <0.8；阈值在 20 以下；S03b 同样修复。
- `angle_parallel_2afc`：19/20，天花板；窗口整体偏易。
- `persp_prop_division`：每级 3/4，平坦；窗口太窄。
- 结论：G1 未通过；pilot v2 需要先修 star 生成器，再换更宽窗口。详见 `07_validation_report.md` §3b/§7/§8。

## P1 审计优先级（QA-only，2026-11-26）

| 优先级 | 卡 | 建议 levels | 每级 | 已知问题 |
|---:|---|---|---:|---|
| 1 | star_single | 12/14/16/18/20 | 6 | T~16；v3/v4 边界噪声 |
| 1 | star_double_r | 19/21/23/25/27 | 6 | T~23.6；尾部非单调 |
| 2 | color_val | 1/3/5/7/9 | 6 | T~5.1；低 V 不稳 |
| 2 | color_hue | 11/13/15/17 | 6 | T~13.6；确认单调 |
| 3 | angle_parallel_2afc | 20/22/24/26/28 | 6 | T~23 |
| 3 | angle_comparison_2afc | 22/24/26/28/30 | 6 | 历史不稳定 |
| 3 | persp_prop_division | 17/19/21/23/25 | 6 | T~21 |
| 3 | persp_prop_migration | 15/17/19/21/23 | 6 | T~19 |
| 4 | Level≈1/35 的卡 | 1/9/17/25/35 ×2 | 2 | 找 floor/ceiling |

审计结果写本表上方“S03g 最终判定”之后的备注；问题卡进 P2。

## 标签缩写

- 域：F = form_and_proportion，S = spatial_structure，C = color_and_value，R = rhythm_and_notan
- 路径：ext = extraction，con = concretization，abs = absolute_estimation，rel = relational_mapping
- 抗性：ill = illusion_piercing，fg = figure_ground_reversal，wm = working_memory，dt = dimensional_translation

## 更新规则

- 每次 gate（G1/G2/G3/G5）后更新一次；
- 补测后更新 `n`、`≤15`、`cross80`，并注明日期；
- `redesign` 卡在生成器修订前不得进入基线表；
- 新增卡必须先补 `family` 与 `intensity` 元数据，否则标 `no-details`。
