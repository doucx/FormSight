# 实验日志

只记补测/重测的聚合结果；逐题明细放 `viska/local/calibration/`，不进仓库。

## 记录模板

| 字段 | 说明 |
|---|---|
| session | S02 / S02b / S05… |
| 日期 | 本地日期 |
| 卡 | cardId |
| 段 | 1/2… |
| 起始–结束 level | 实际轨迹 |
| 题数 | 本段 |
| 命中 | hits / n |
| 窗口覆盖 | 是/否；覆盖了哪些 level |
| 异常 | 中断、误触、疲劳、窗口未命中 |
| 备注 | 设备/缩放只写“同设备” |

## S01（2026-11-24）

- 无补测。
- 生成 8 张试点 + 1 控制的历史先验；见 `07_validation_report.md` §pilot-priors。
- 本地 artifact：`viska/local/calibration/pilot-priors.json`。

## S02（已填）

由 Calibration Runner 自动记录；导出 `formsight-calibration-runs` 后，用 `summary.byLevel` 生成下表。

| session | 日期 | 卡 | 题数 | 命中 | 覆盖 | 异常 |
|---|---|---|---:|---:|---|---|
| S02 | 2026-11-25 | star_single | 30 | 26 | 10–18 | 跨 11-24/11-25，split |
| S02 | 2026-11-25 | star_double_r | 30 | 17 | 20–26 | 后段正确率下滑 |

## S02b（已填）

| session | 日期 | 卡 | 题数 | 命中 | 覆盖 | 异常 |
|---|---|---|---:|---:|---|---|
| S02b | 2026-11-25 | color_val | 20 | 17 | 3–9 | 仅 L9 低于 0.8 |
| S02b | 2026-11-25 | angle_parallel_2afc | 20 | 19 | 6–14 | 天花板 |
| S02b | 2026-11-25 | persp_prop_division | 20 | 15 | 9–17 | 每级 3/4，平坦 |

## S02c（2026-11-25，pilot v2）

导出：`formsight_calibration_all_2026-11-25_23-00.json`；11 runs / 254 trials；22:41–23:00。

| protocol | runs | 选取 | n | acc | 异常 |
|---|---|---:|---:|---:|---|
| color_hue | 1 | 1 | 20 | .75 | 非单调 |
| color_val | 1 | 1 | 20 | .60 | below-range |
| angle_parallel_2afc | 1 | 1 | 20 | .70 | 干净 crossing ~23 |
| angle_comparison_2afc | 3 | 第 3 次 | 20 | .75 | 前两次 .60/.50；一次 133ms 无效 |
| persp_prop_division | 1 | 1 | 24 | .83 | 非单调，~23 |
| persp_prop_migration | 1 | 1 | 20 | .90 | crossing ~19 |
| star_single | 2 | 第 2 次 | 30 | .70 | L1 .60；两次一致 |
| star_double_r | 1 | 1 | 30 | .90 | 天花板；需 21–35 |

- 无效 run：`angle_comparison` 22:48:22，中位 RT 133ms，丢弃。
- 节奏：19 分钟 254 题；后半段 star 可能疲劳。
- 详细结论见 `07_validation_report.md` §3c/§7/§8。

## S02d（已填，pilot v3）

| session | 日期 | 卡 | 题数 | 命中 | 覆盖 | 异常 |
|---|---|---|---:|---:|---|---|
| S02d | 2026-11-26 | star_single | 36 | 34 | 1–16 | 天花板 |
| S02d | 2026-11-26 | star_double_r | 30 | 16 | 17–35 | 尾部非单调 |
| S02d | 2026-11-26 | color_val | 30 | 19 | 1–9 | L7=1/6 |
| S02d | 2026-11-26 | color_hue | 30 | 24 | 9–17 | 干净 |
| S02d | 2026-11-26 | angle_comparison_2afc | 30 | 26 | 14–30 | 干净 |

## S02e（已填，pilot v4）

| session | 日期 | 卡 | 题数 | 命中 | 覆盖 | 异常 |
|---|---|---|---:|---:|---|---|
| S02e | 2026-11-26 | star_single | 30 | 8 | 16–35 | 地板 |
| S02e | 2026-11-26 | star_double_r | 25 | 18 | 19–27 | ~25.5 |
| S02e | 2026-11-26 | color_val | 36 | 33 | 1–7 | 天花板 |

## 规则

- 每次 run 完成即可导出；不要等全部做完。
- 窗口覆盖由固定序列保证；若实际 level 序列与协议不一致，记录异常。
- 疲劳/中断：Esc 暂停；Resume 继续；不要手改 level。
- 记录里不写绝对路径、主机名、个人日程。
