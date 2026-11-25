# 路线图

按 gate 推进，不按日历。每个 gate 必须有可检查的产出；没有产出就不算过。

```
G0 语义与冻结
  ↓
G1 试点（8 张 + 1 张 out-of-range 控制）
  ↓
G2 全量校准（33 → 26 可校准 + 7 排除）
  ↓
G3 out-of-range 处理（规格 + experimental）
  ↓
G4 算子（per-card JND 滤波 + replay）
  ↓
G5 锚点（20 题 → θ + family 偏移）
  ↓
G6 清理（清 IDB，保留 JSON 与 artifact）
```

## G0 — 语义与冻结

- 目标：把“Level 到底测什么”定死；冻结校准语料与过滤规则。
- 输入：2026-11-24 导出；当前代码基线。
- 产出：`00`–`05` 文档；`01` 决策 D-001..D-015；数据集 hash；过滤规则；`PRIVACY.md`。
- 验收：文档合并到 `develop`；无代码改动；无原始数据进入 git。
- 依赖：无。
- 失败退路：如果文档评审否决 D-001/D-002，回到 `01` 追加新决策，不进入 G1。

## G1 — 试点（v1 未通过；v2 重试）

- 目标：验证校准流程与 **family transfer**，不是“把 8 张卡做完”。
- 试点：4 族 × 2 张 + 1 张 out-of-range 控制。
  - 颜色：`color_hue`、`color_val`
  - 空间：`star_single`、`star_double_r`
  - 角度：`angle_parallel_2afc`、`angle_comparison_2afc`
  - 比例：`persp_prop_division`、`persp_prop_migration`
  - 控制：`color_lightness`（应被正确排除）
- 输入：历史先验 + 试点固定序列（Calibration Runner；约 120 题：60 补测 + 60 重测）。
- 产出：pilot 先验、pilot 补测记录、`07_validation_report` §pilot。
- 验收：8 张中 ≥6 张通过 holdout；≥3/4 族 LOCO 中位 ≤5 级；4 张重测 ≥3 张通过；控制卡被正确排除。
- v1 结果：5/8 run；4/5 无有效 80% 穿越；star R 混淆；判 G1 未通过。
- v2 结果：8/8 卡；1/4 族弱证据；仍判未通过；v3 聚焦 5 张、每级 6 题。
- 依赖：G0。
- 失败退路：见下方“family transfer 降级树”。

## G2 — 全量校准

- 目标：对 33 张卡给出 `calibrated / targeted / redesign / no-details` 状态。
- 输入：历史 + 全量补测（300–400 题，分 3–4 次）。
- 产出：`calib-v1` artifact（含每卡 JND、CI、slope、guess、lapse、n、status）、`07_validation_report` §full。
- 验收：≥26 张可校准；≥70% 通过 holdout；7 张排除并标记；artifact 冻结。
- 依赖：G1。
- 失败退路：如果通过率 <70%，不进入 G4；先分析失败集中在哪些族，再决定是否缩减到“颜色族 + 按需单卡”。

## G3 — out-of-range 处理

- 目标：把“测不了”的卡变成“明确要改什么”的卡。
- 输入：`02_card_status` C 组；边界卡的 95% CI。
- 产出：每张卡的重设计规格（level 1 要更简单、参数映射怎么改、如何验证）；`experimental` 标记计划；`redesign backlog`。
- 验收：7 张候选全部有结论（确认排除或 CI 后保留）；不进入基线表；生成器修订另行排期。
- 依赖：G2。
- 失败退路：如果某张卡无法在不破坏训练价值的前提下扩展难度，保留 `experimental` 并排除出测量体系。

## G4 — 算子

- 目标：用 `calib-v1` 做先验，实现 per-card JND 滤波；离线 replay 对比 3U1D 细步 / block。
- 输入：artifact；历史 trial（只读）。
- 产出：算子实现（feature flag）、replay 报告、回归测试。
- 验收：冷启动 RMSE 比 3U1D 细步改善 ≥30%；稳态不劣化 >1 级；`pnpm verify` 通过。
- 依赖：G2。
- 失败退路：如果 replay 不达标，保留 3U1D 细步作为测量算子，JND 只做离线校准值；不强行上线。

## G5 — 锚点

- 目标：20 题锚点测试 → θ + family 偏移；给已校准卡更新基线。
- 输入：G2 artifact；6–8 张锚卡；20 题选题规则。
- 产出：锚点协议、锚点结果、`07_validation_report` §anchor、全局基线报告。
- 验收：≥70% 已校准卡预测误差 ≤5 级；θ/family 有 CI；未校准卡只显示族先验。
- 依赖：G4。
- 失败退路：如果 family transfer 在 G1 已失败，G5 降级为“单卡按需校准”，锚点只做 readiness 检查。

## G6 — 清理

- 目标：清 IDB 旧记录；保留 JSON、artifact、验证报告；完成交接。
- 输入：G2/G5 通过记录。
- 产出：清理记录、最终 `10_handoff`、`13_artifact_manifest`、retrospective。
- 验收：IDB 无旧记录；JSON 保留；artifact + 报告可追溯；计划归档或标 archived。
- 依赖：G5。
- 失败退路：任何 gate 未过，不清 IDB；计划转 paused。

## family transfer 降级树（G1 判定）

1. **1 全局 + 4 族**（原方案）：≥3/4 族 LOCO 中位 ≤5 级。
2. **1 全局 + 颜色族 + 按需单卡**：只有颜色族成立；其他族放弃跨卡迁移。
3. **1 全局 + 按需单卡**：全部族都不成立；放弃“不测全量给所有卡基线”，改为“用时再测 20–30 题”。
4. **只做 drift 检查**：连全局 θ 都不稳定；锚点仅用于检测“今天是否异常”，不赋值。

## 关键路径与并行

- 关键路径：G0 → G1 → G2 → G3 → G4 → G5 → G6。
- 可并行：G3 的重设计规格可与 G4 的算子开发并行；但重设计代码落地要等 G2 冻结，避免边改边校准。
- 不可并行：G2 的补测与校准必须按批完成；不要在同一批里改生成器。

## 范围冻结

- G4 之前不新增 card 类型（D-008）。
- G2 之前不改 out-of-range 卡的生成器（否则数据作废）。
- 任何 UI 改动不阻塞 gate；gate 只认 artifact 与验证报告。
