# calibration-v1 — QA 工具入口

## 目标

把校准作为**卡片难度轴诊断工具**：对任意卡跑固定 levels 的短 run，读 health，找出 too-easy / too-hard / flat / noisy 的卡，修它，再复验。

**不再产出训练用 per-card Level。**

## 当前状态

| 项 | 值 |
|---|---|
| 计划状态 | active（QA-only） |
| 当前 gate | **P0 完成；P1 审计待执行** |
| 工具入口 | `#/calibrate`（设置 → Data Governance → Calibration runs） |
| 代码基线 | `develop` @ `e47ba49` |

## 新会话只读这 4 份

1. `00_README.md`（本文件）
2. `01_decisions.md`
3. `02_card_status.md`
4. `10_handoff.md`

## 文档地图

| 文件 | 作用 |
|---|---|
| `00_README.md` | 目标、状态、入口 |
| `01_decisions.md` | 追加式决策（D-001..D-037） |
| `02_card_status.md` | 卡片现状、历史阈值、审计优先级 |
| `03_roadmap.md` | P0–P3 |
| `04_schedule.md` | 审计/修卡会话 |
| `05_acceptance.md` | QA health 验收 |
| `06_calibration_protocol.md` | 如何跑 QA run |
| `07_validation_report.md` | G1 失败历史（不再作为现行计划） |
| `09_risk_register.md` | 风险 |
| `10_handoff.md` | 下一次从这里接 |
| `11_experiment_log.md` | 每次 QA run 记录 |
| `13_artifact_manifest.md` | 导出 hash |

## 硬约束

- 校准 = QA；不写训练统计；不产出用户 Level。
- 不做 family / LOCO / 4 族 / 全量 33 卡 / 20 题映射。
- 一次只修一张卡；修完复验。
- tracked 不写绝对路径、Token、个人日程；原始 trial 放 `viska/local/calibration/`。

## 会话协议

开始：读 4 份 → 确认 P1/P2 的当前卡 → 跑 QA run 或修卡。
结束：更新 `10_handoff`、`11_experiment_log`、`02_card_status`；`pnpm verify`。
