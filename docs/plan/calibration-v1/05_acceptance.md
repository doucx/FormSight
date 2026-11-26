# 验收标准与方向

## 1. 口径

方案 B：**纯 per-card**。每张卡独立 JND/Level；不做 family transfer；20 题检查只做 readiness。

## 2. 指标

| 指标 | 定义 | 用途 |
|---|---|---|
| JND | 该卡 `p(success)=0.8` 处的 level | 单卡基线 |
| CI 宽度 | JND 的 90% 区间宽度（level） | 可信度 |
| 重测 Δ | 两次独立 run 的 JND 差 | 可靠性 |
| invalid | 中位 RT <300ms 或未 completed | 丢弃 |
| readiness | 20 题混合检查的结果 | 只判 normal/drift |

不再使用：LOCO、family Δ、per-card 20 题映射。

## 3. per-card run 通过线

一张卡的校准算 `calibrated` 需同时满足：

1. 20–40 题，4–6 个 levels，每级 ≥5 题；
2. 有 JND 与 CI；CI 宽度 ≤8 级；
3. 隔天/换时段重测 20 题，Δ≤5 级；
4. 两次 run 都不是 invalid；
5. 不是 out-of-range（最低 level 仍 <0.8）。

否则标 `low-confidence` 或 `out-of-range`，不进入 Level 集成。

## 4. B gate

### B1

- 任意已注册卡能创建 20–40 题 run；
- 序列可复现、可续做；
- 导出含 cardId/levels/sequence/summary；
- `pnpm verify` 通过。

### B2

- 3 张代表卡（color_hue / star_single / persp_prop_division）；
- ≥2/3 通过 per-card 通过线；
- 失败卡有明确状态。

### B3

- 已校准卡显示 `calibratedLevel` / JND / 日期 / CI；
- 未校准卡显示“未校准”；
- 训练起始 level 用 calibratedLevel（没有则回退 profile）；
- 不改变既有统计口径。

### B4

- 20 题 readiness 只输出 normal/drift/low-confidence；
- 不写 per-card Level；
- 与用户自己的滚动基线比较。

## 5. 失效与回退

- 单卡失败：标 `low-confidence`，可重测一次；仍失败则保持“未校准”。
- 重测 Δ>5：检查疲劳/窗口；标 `low-confidence`。
- 某卡最低 level 仍 <0.8：标 `out-of-range`，进 redesign backlog。
- readiness 漂移：只提示，不改 Level。

## 6. 不再承诺

- 不承诺“一张卡校准后推出其他卡”；
- 不承诺“20 题给所有卡基线”；
- 不承诺跨用户/人群比较。
