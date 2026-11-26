# 路线图

## 已结束：calibration-v1（G0–G1）

- G0：计划、语义、数据冻结、Calibration Runner、DB v5——完成。
- G1：四轮试点（~620 题）后**不通过**；仅 ratio 族有 family transfer 证据，color/spatial/angle 失败或不稳定。
- 结论：停止 family/global baseline 路线，转方案 B（D-033）。

历史细节见 `07_validation_report.md`；不再重跑 G1。

## 现行：方案 B（纯 per-card）

```
B0 决策与文档
  ↓
B1 per-card 校准入口（任意卡、任意 levels、20–40 题）
  ↓
B2 3 张代表卡的 per-card 校准 + 重测
  ↓
B3 把校准 JND 接进 Level/分析
  ↓
B4 20 题 readiness 检查（不映射 per-card）
  ↓
B5 清理/归档
```

### B0 — 决策与文档

- 目标：把“纯 per-card、按需校准、readiness only”写死。
- 产出：D-033..D-035；本路线图；`05_acceptance` 改写；`06` per-card 协议。
- 验收：文档合并；不再引用 family/LOCO 作为 gate。
- 依赖：S03g。

### B1 — per-card 校准入口

- 目标：不再只跑固定 3 个协议；能为**任意一张卡**创建 run。
- 功能：
  - 选卡；
  - 选择 levels（手填或从历史/先验生成）；
  - 每级题数、总题数上限；
  - 生成固定平衡序列，复用现有 Calibration Runner；
  - 导出同一 `formsight-calibration-runs` 格式。
- 验收：
  - 任意已注册卡能创建并完成 20–40 题 run；
  - 序列可复现、可续做；
  - 导出含 `cardId`、levels、sequence、summary；
  - `pnpm verify` 通过。
- 依赖：B0。

### B2 — per-card 校准 + 重测

- 目标：在 3 张代表卡上验证 per-card 流程，不做 family。
- 建议代表卡：
  - `color_hue`（绝对色相，已有较稳数据）
  - `star_single`（空间定位，噪声最大）
  - `persp_prop_division`（比例，ratio 族代表）
- 每卡：
  1. 20–40 题，levels 围绕历史/先验；
  2. 估 JND + CI；
  3. 隔天或换时段重测 20 题；
  4. 判定：CI 可接受、重测 Δ≤5、无 invalid。
- 验收：≥2/3 卡通过；失败卡标 `low-confidence` 或 `out-of-range`。
- 依赖：B1。

### B3 — 接进 Level/分析

- 目标：校准结果可用，不要求重写自适应算子。
- 最小实现：
  - 每张已校准卡存 `calibratedLevel` / `jnd` / `calibratedAt`；
  - 训练起始 level 用 `calibratedLevel`（没有则回退 profile）；
  - 卡片分析页显示“校准 Level / JND / 日期 / CI”；
  - 训练中的 block/3U1D 继续负责日常自适应，但不再冒充 80% 阈值。
- 验收：已校准卡显示校准值；未校准卡显示“未校准”；不改变既有统计口径。
- 依赖：B2。

### B4 — readiness 检查

- 目标：20 题混合检查只回答“今天是否适合训练/是否偏离基线”。
- 不做：映射到卡 Level、估维度能力、family 偏移。
- 最小实现：
  - 从已校准卡里抽 5–8 张锚卡；
  - 20 题，记录 hit/RT；
  - 与用户自己的滚动基线比较（例如近 30 天同卡同 level）；
  - 输出 `normal / drift / low-confidence`，不写 per-card Level。
- 验收：能区分明显异常；不产出 per-card 基线。
- 依赖：B3。

### B5 — 清理/归档

- 目标：导出校准 artifact，清 IDB 旧记录，归档计划。
- 验收：artifact + 报告 + handoff；原始 JSON 保留本地。

## 明确不再做

- family transfer / LOCO / 4 族模型；
- 20 题给所有卡基线；
- 全量 33 卡校准；
- pilot v5。

## 关键判断

- per-card 的成本是“每张卡 20–40 题”；只在对某张卡有需求时付。
- readiness 是唯一被数据支持的全局用途；不要重新包装成能力评估。
- 已校准卡的 Level 与训练 Level 要明确区分，避免再次混淆 80% 阈值与 block 平衡点。
