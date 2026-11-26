# 校准协议（方案 B：per-card）

## 1. 目标

为**单张卡**估一个 80% JND；不做 family transfer，不做全量 33 卡，不做 20 题映射。

## 2. 触发

- 该卡没有 JND；
- JND 过期（默认 90 天）；
- 用户手动要求；
- 训练中明显异常，需要重测。

## 3. 选 levels

### 3.1 有历史/先验

- 用历史 PAVA 穿越点 ±5 级；
- 4–6 个 levels，每级 5–8 题，总 20–40 题。

### 3.2 没有先验

先做 10 题 bracket：

```
1 / 9 / 17 / 25 / 35，各 2 题
```

看哪一段跨过 0.8，再在跨点 ±5 级做 4–5 个 levels ×5–6 题。bracket 的 10 题可计入总数，也可不计；记录清楚。

## 4. 序列

- 每级等量；block 内 seed 打乱；
- 记录 seed 与完整 sequence；
- 不做自适应；level 由协议决定；
- 一次坐下完成；中断 >2h 标 `split` 重做；
- 中位 RT <300ms 判 invalid。

## 5. 记录与导出

- 写 `calibration_runs` / `calibration_trials`；
- 导出 `formsight-calibration-runs` JSON；
- 包含 cardId、levels、sequence、summary、逐题 details；
- 不写训练统计。

## 6. 估计

- 对 `p(success | level)` 做单调拟合/PAVA；
- 取 0.8 穿越点；给 bootstrap CI；
- 无穿越：`below-range` / `above-range` / `flat`，标 `low-confidence` 或 `out-of-range`。

## 7. 验证

- 隔天或换时段重测 20 题，levels 围绕预测阈值；
- 判定：Δ≤5 级，且不是 invalid；
- 通过：`calibrated`；
- 失败：`low-confidence`；最低 level 仍 <0.8：`out-of-range`。

## 8. 数据卫生

- 原始数据/本地副本在 `viska/local/calibration/`；
- tracked 只写聚合/状态；
- 不写绝对路径、Token、个人日程。
