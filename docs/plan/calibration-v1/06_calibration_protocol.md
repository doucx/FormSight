# 校准协议

本文件规定：怎么从历史数据得到先验、怎么补测、怎么记录、怎么判定失败。
适用于 G1 试点与 G2 全量；不适用于日常训练。

## 1. 输入与过滤

- 数据：2026-11-24 导出，`sha256:ab2fb088…6554f9`；仓库外保存。
- 只保留：当前 cardId、`details` 存在、`timestamp ≥ 2026-08-16`。
- 排除：10 个旧 cardId（860 条）、旧 domain 词表、无 `details` 的记录。
- 不把原始 JSON 复制进仓库；中间产物放 `viska/local/calibration/`。

## 2. 先验方法

1. 按 level 分箱，计算 `n` 与 `hit rate`；
2. 对 ±2 级窗口做平滑，要求窗口内 `n ≥ 20`；
3. 用加权等渗回归（PAVA，单调下降）拟合 `p(level)`；
4. 找拟合曲线穿过 0.8 的位置：相邻两点线性插值；
5. 若第一个有支撑的 level 已经 ≤0.8，记为 `below-range`，先验只作下界占位；
6. bootstrap 300 次，取 5–95% 作为粗略区间；
7. 参数 logistic 只作诊断：数据范围不跨 0.8 时外推极不稳定，不用于先验。

先验不是 JND，只是**补测选题的起点**。最终 JND 由补测 + 全量拟合给出。

## 3. 补测设计

### 3.1 工具

- 优先用 app 的 benchmark 模式（staircase）+ 细步（fine）；
- 若当前 profile 的起始 level 远离先验窗口，先记录实际轨迹，不强行改 profile；
- 现有 benchmark 上限 20 题；需要 30 题时，跑 20 + 10 两段，中间不换卡。

### 3.2 选题

- 以先验窗口为中心，覆盖窗口上下各 2–3 级；
- 不要在单一 level 上刷满 20 题；
- 每段结束后检查：是否覆盖了窗口？若 10 题后仍在窗口外，标 `window-missed`，停止并重排。

### 3.3 单次规模

- 每张卡 20–30 题；
- 单次不超过 30 题，避免疲劳；
- 同一张卡的两段之间至少间隔 10 分钟。

### 3.4 记录

每次补测写入 `11_experiment_log.md`（tracked，聚合）与本地明细（`viska/local/calibration/`）：

- 日期、卡、段号、题数；
- 起始 level、结束 level、level 序列；
- 每题 hit/miss、responseTimeMs；
- app 版本、显示设备/缩放（只写“同设备”，不写主机名）；
- 异常（中断、误触、窗口未命中）。

### 3.5 停止与重试

- 20 题后若窗口覆盖良好，停止；
- 若 20 题全部落在窗口一侧，标 `window-missed`，重排；
- 同一张卡最多重试 1 次；两次失败标 `low-confidence`，不再消耗；
- 疲劳、分心、环境变化：停止，记录，不硬做。

## 4. 全量校准

1. 对每张卡：历史先验 + 补测数据合并；
2. 拟合 `p(success | intensity)`，输出 JND、slope、guess、lapse、n、CI；
3. 无 `details` 的卡：只能按 level 拟合，标 `no-details`；
4. 简单等级仍 <0.8 的卡：标 `out-of-range`，不赋值；
5. 每卡状态：`calibrated / low-confidence / out-of-range / no-details`。

## 5. 验证（四道关）

- 时间留出：训练 `< 2026-10-01`，测试 `≥ 2026-10-01`；
- 留一卡（LOCO）：每族藏一张，预测其 JND；
- 新鲜重测：在预测阈值处 20 题，观察命中率 95% CI 覆盖 0.8；
- 敏感性：含/不含旧版本、不同斜率先验；漂移 >5 级标 `low-confidence`。

通过线见 `05_acceptance.md`。

## 6. 失败处理

| 现象 | 处理 |
|---|---|
| 窗口未命中 | 停止，重排；不把窗口外数据计入阈值 |
| 20 题 CI 太宽 | 加 10 题；仍宽则标 `low-confidence` |
| 重测偏离 >5 级 | 检查版本/窗口/疲劳；仍偏离则标 `low-confidence` |
| 某族 LOCO 失败 | 按 `03_roadmap` 降级，不强留 4 族 |
| 卡在最低级仍 <0.8 | 标 `out-of-range`，进 redesign 队列 |

## 7. 数据卫生

- 原始数据只放 `viska/local/calibration/`；
- tracked 只写聚合结果、状态、窗口、通过/失败；
- 不写绝对路径、主机名、Token、个人日程；
- 每次补测后计算本地文件 hash，写入 `13_artifact_manifest.md`。

## 8. 提交前检查

按 `PRIVACY.md` §4 的检查清单执行；不要在本文重复命令（避免扫描器匹配到自身）。
