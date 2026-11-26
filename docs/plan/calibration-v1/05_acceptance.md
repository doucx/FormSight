# 验收标准（QA-only）

## 1. QA run 有效性

- 任意已注册卡；
- 2–8 个 levels，1–12 题/级，总 20–48；
- 固定平衡序列，可复现/续做；
- 完成且中位 RT ≥300ms；
- 导出 `formsight-calibration-runs`。

## 2. Health 输出

`CalibrationSummary` 必须显示：

- T80 与 90% CI（可空）；
- 每级 n / hits / accuracy；
- L1 / last accuracy；
- 单调性 violations；
- noise RMS；
- invalid；
- 状态：`healthy / too-easy / too-hard / flat / noisy / review / invalid / insufficient`。

## 3. 审计通过线

一张卡算“健康”：

1. L1 ≥0.9，最高 level ≤0.2；
2. T80 在 8–28；
3. 正确率随 level 单调（允许 1 个小反转）；
4. 同 level 内不同刺激的正确率差 ≤0.15（如可测）；
5. 隔天重测 20 题，Δ≤5；
6. 不是 invalid / too-easy / too-hard / flat / noisy。

否则记录问题类型，进 P2。

## 4. P2 修复验收

- 同一 QA 窗口复验；
- health 从 too-easy/too-hard/flat/noisy 变为 healthy；
- 旧 Level/记录不追溯；只影响新题；
- `pnpm verify` 通过；
- 若改生成器，新增/更新对应测试。

## 5. 不做

- 不产出 per-card 训练 Level；
- 不做 family/LOCO/全量；
- 不做 20 题全局映射；
- 不把 QA 结果写进 `records` / `profiles` / `daily_summaries`。
