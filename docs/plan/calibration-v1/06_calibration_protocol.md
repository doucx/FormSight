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

## 3. 补测执行（Calibration Runner）

### 3.1 入口

- 设置 → Data Governance → **Calibration runs**，或直接打开 `#/calibrate`；
- 列表里 5 个试点 run；点 Start / Resume；
- 每题自动落库，自动下一题（700ms）；
- 完成后进入 summary，点 Export run / Export all 下载 JSON。

数据写 `calibration_runs` / `calibration_trials`，不写 `records` / `sessions` / `profiles` / `daily_summaries`。

### 3.2 固定序列

| protocolId | 卡 | levels | 每级题数 | 总数 |
|---|---|---|---:|---:|
| `pilot-star-single` | star_single | 10 / 12 / 14 / 16 / 18 | 6 | 30 |
| `pilot-star-double-r` | star_double_r | 20 / 21 / 23 / 25 / 26 | 6 | 30 |
| `pilot-color-val` | color_val | 3 / 5 / 7 / 9 | 5 | 20 |
| `pilot-angle-parallel` | angle_parallel_2afc | 6 / 8 / 10 / 12 / 14 | 4 | 20 |
| `pilot-persp-prop-division` | persp_prop_division | 9 / 11 / 13 / 15 / 17 | 4 | 20 |

- 每个 block 内每级各一次，block 内用 seed 打乱；
- 记录 `seed` 与完整 `sequence`；中途停下也大致均衡；
- 不做自适应，不需要手动调 level；
- 不需要手填 `11_experiment_log`：导出文件里的 `summary.byLevel` 就是记录来源。

### 3.3 单次规模

- 每个 run 20–30 题；
- 单次不超过 30 题，避免疲劳；
- 中途可以 Esc 暂停；已答题目已落库，回来点 Resume。

### 3.4 记录

每次 run 写入主 DB 的 `calibration_runs` / `calibration_trials`；导出 JSON 包含：

- protocol 快照、seed、完整 sequence；
- 每题 index / level / isHit / responseTimeMs / timestamp / details；
- `summary`（n、hits、accuracy、byLevel）。

导出的 JSON 放 `viska/local/calibration/`，不要提交。

### 3.5 停止与重试

- 中途退出：run 保持 `in-progress`，可 Resume；
- 想放弃：在列表里不继续即可；不要手改 level；
- 写入失败：停止，导出已有数据，检查 IDB；
- 疲劳/分心：Esc 暂停，改天继续；
- 同一 run 不要重复答同一题；重复写入按 `runId:index` 幂等。

### 3.6 pilot v2（待跑）

v1 的 5 级窗口对指数难度映射太窄：angle 只覆盖 10.6°→5.5°，persp 只覆盖 0.054→0.036；star 的 Level 还被随机 R 混淆。v2 规则：

- 先修 `star_single` / `star_double_r` 生成器（间距按角度/R 比例缩放）；
- 8 张卡、约 184 题；窗口见 `07_validation_report.md` §8.2；
- 单 run 一次完成；中断 >2 小时标 `split` 重做（D-023）；
- v2 通过前不进入全量校准。

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
