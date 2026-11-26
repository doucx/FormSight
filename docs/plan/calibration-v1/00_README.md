# calibration-v1 — 入口

## 目标（一句话）

方案 B：每张卡按需校准出 80% JND；不做 family transfer，不做全量 33 卡；20 题混合检查只做 readiness。

## 当前状态

| 项 | 值 |
|---|---|
| 计划状态 | active |
| 当前 gate | **B0 完成；B1 per-card 校准入口待做** |
| 当前会话 | B1（任意卡创建 per-card run） |
| 数据快照 | 2026-11-24 导出，`sha256:ab2fb088…6554f9` |
| 代码基线 | `develop` @ `619131d` |

## 新会话只读这 4 份

1. `00_README.md`（本文件）
2. `01_decisions.md`
3. `02_card_status.md`
4. `10_handoff.md`

不要读 `.journal.jsonl`；不要翻旧聊天；不要重新论证已记录的决策。

## 文档地图

| 文件 | 作用 |
|---|---|
| `00_README.md` | 目标、状态、阅读顺序 |
| `01_decisions.md` | 追加式决策日志（D-xxx） |
| `02_card_status.md` | 33 张卡的现状与下一步 |
| `03_roadmap.md` | G0–G6、依赖、失败退路 |
| `04_schedule.md` | 会话单元、关键路径、工作量 |
| `05_acceptance.md` | 指标、gate 通过线、方向判断 |
| `06_calibration_protocol.md` | 补测/校准/重测的操作规程 |
| `07_validation_report.md` | 验证结果与证据 |
| `08_data_dictionary.md` | 数据字段、单位、版本分界 |
| `09_risk_register.md` | 风险与缓解 |
| `10_handoff.md` | 每次会话结束更新；下一次从这里接 |
| `11_experiment_log.md` | 每次补测/重测的记录 |
| `12_glossary.md` | 术语 |
| `13_artifact_manifest.md` | artifact 版本、hash、codeVersion |
| `PRIVACY.md` | 脱敏规范与提交前检查 |

## 状态图例

**卡片覆盖（`02`）**

- `A`：低等级（≤15）≥200 条，历史基本够；
- `B`：100–199 条，需要收缩先验；
- `C`：50–99 条，建议补测 20–30 题；
- `D`：<50 条，必须补测。

**卡片状态**

- `calibratable`：可从历史校准；
- `targeted`：需要补测；
- `redesign`：最简单等级仍到不了 80%，先排除、标 experimental、排队改生成器；
- `no-details`：无物理细节，无法按强度拟合。

**校准状态（未来 artifact）**

- `calibrated`：有 JND + CI，进入基线表；
- `low-confidence`：CI 太宽，只给族先验；
- `out-of-range`：不赋值；
- `legacy`：旧 Level，不参与比较。

## 本计划的硬约束（不要重提）

- 纯 per-card；不做 family transfer / LOCO / 4 族。
- 不做全量 33 卡；按需 20–40 题/卡。
- 20 题检查只做 readiness，不写 per-card Level。
- 不迁移旧数据；旧 JSON 保留；只清 IDB。
- tracked 文件不写绝对路径、Token、个人日程；原始 trial 放 `viska/local/calibration/`。

## 会话协议

**开始**：读 4 份 → 确认 gate → 只做 `10_handoff` 的 `Next` → 不改已记录决策（要改就追加 D-xxx）。

**结束**：更新 `10_handoff`；有补测就写 `11_experiment_log`；有新 artifact 就更新 `13_artifact_manifest`；必要时在 HAP 留一条 `NEXT`。

## 数据边界

- 原始导出：`<DATASET_JSON>`（仓库外；hash 见上）；
- 本地原始区：`viska/local/calibration/`（gitignored）；
- tracked 计划只放聚合计数、状态、决策、聚合指标；
- 逐题记录、绝对路径、个人日程不进本目录。

详细规则见 `PRIVACY.md`。
