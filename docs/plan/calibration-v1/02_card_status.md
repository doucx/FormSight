# 卡片现状

- 数据快照：2026-11-24 导出，`sha256:ab2fb088…6554f9`
- 代码基线：`develop` @ `4374acd`
- 范围：当前注册的 33 张卡；旧 cardId 记录已排除（D-014）
- `cross80`：粗略 80% 穿越 level，仅用于定位补测范围，不是 JND
- 计数会随补测更新；不要在表里手调数字，更新时注明来源

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
| color_hue | color | C / abs | 2308 / 2308 | 236 | 14 | 连续 ΔE；v2 9–17 |
| color_val | color | C / abs | 1799 / 1799 | 998 | 7 | fresh ~8；v2 5–13 |
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
| persp_prop_migration | form | F+S / rel+wm+dt | 306 / 306 | 116 | 14 | v2 8–24 |

## B. targeted（13；3 张 star 标 experimental）

| 卡 | 族 | 标签 | n / details | ≤15 | cross80 | 补测 |
|---|---|---|---:|---:|---:|---|
| star_single | spatial | S / abs | 2663 / 1107 | 1 | 17 | v1 confounded；生成器已修；v2 1–16；experimental |
| star_double_r | spatial | S+F / abs+rel+dt | 2108 / 888 | 0 | 25 | v1 confounded；生成器已修；v2 1–21；experimental |
| star_double_h | spatial | S+F / abs+rel | 463 / 37 | 0 | 24 | 生成器已修；v2 未排；experimental |
| neg_area_comparison_2afc | ratio | F / rel+fg | 1362 / 1362 | 54 | 23 | 25 题，L20–25 |
| abs_gesture_axis | rhythm | R / ext | 1144 / 1144 | 85 | 17 | 25 题，L14–20 |
| abs_td_gesture_2afc | rhythm | R / con | 978 / 978 | 67 | 14 | 25 题，L10–16 |
| abs_td_notan_2afc | rhythm | R / con+fg | 902 / 902 | 44 | 26 | 30 题，L22–30 |
| angle_parallel_2afc | angle | F+S / rel | 531 / 531 | 64 | 11 | v2 16–32 |
| angle_comparison_2afc | angle | F+S / rel | 498 / 498 | 60 | 14 | v2 14–30 |
| persp_vp_convergence | form | S / rel | 327 / 327 | 40 | 23 | 30 题，L20–26 |
| persp_prop_division | ratio | F / abs | 289 / 289 | 70 | 17 | v2 5–25 |
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

## S03 fresh 结果（2026-11-25）

- `color_val`：唯一近似跨 0.8（~8；7–9 插值）；20 题，区间宽。
- `star_single`：非单调；Level 与 R 混淆；S03b 已改为角间距常量。
- `star_double_r`：全部 <0.8；阈值在 20 以下；S03b 同样修复。
- `angle_parallel_2afc`：19/20，天花板；窗口整体偏易。
- `persp_prop_division`：每级 3/4，平坦；窗口太窄。
- 结论：G1 未通过；pilot v2 需要先修 star 生成器，再换更宽窗口。详见 `07_validation_report.md` §3b/§7/§8。

## 标签缩写

- 域：F = form_and_proportion，S = spatial_structure，C = color_and_value，R = rhythm_and_notan
- 路径：ext = extraction，con = concretization，abs = absolute_estimation，rel = relational_mapping
- 抗性：ill = illusion_piercing，fg = figure_ground_reversal，wm = working_memory，dt = dimensional_translation

## 更新规则

- 每次 gate（G1/G2/G3/G5）后更新一次；
- 补测后更新 `n`、`≤15`、`cross80`，并注明日期；
- `redesign` 卡在生成器修订前不得进入基线表；
- 新增卡必须先补 `family` 与 `intensity` 元数据，否则标 `no-details`。
