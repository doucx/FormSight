# 排期

方案 B（纯 per-card）。G1 已关闭；不再做全量/family。

## 已完成（历史）

- S00–S03g：计划、协议、Calibration Runner、四轮 pilot、G1 判定。
- 结论：G1 不通过；仅 ratio 族有 family 证据；转 B。
- 详情见 `07_validation_report.md`。

## 现行

| ID | 类型 | 目标 | 产出 | Gate | 预计 |
|---|---|---|---|---|---|
| B0 | AI | 写 B 决策/路线图/验收/协议 | `01`、`03`、`05`、`06` | — | done |
| B1a | AI | per-card run 创建：任意卡 + levels + 题数 | `src/calibration/` | — | 1–2 sessions |
| B1b | AI | Calibration 列表加入“新建 run”表单 | UI | **B1** | 1 session |
| B2a | 人 | 3 张代表卡各 30 题：color_hue / star_single / persp_prop_division | `11` B2a | — | 1.5 h |
| B2b | 人 | 3 张卡各 20 题重测 | `11` B2b | — | 1 h |
| B2c | AI | per-card JND + CI + 重测判定 | `07` §B2 | **B2** | 1 session |
| B3 | AI | calibratedLevel 接入训练/分析 | 代码 + 测试 | **B3** | 2 sessions |
| B4a | AI | readiness 20 题设计 | spec | — | 1 session |
| B4b | 人 | 跑 2–3 次 readiness | `11` B4b | — | 40 min × 2–3 |
| B4c | AI | readiness 验证 | `07` §B4 | **B4** | 1 session |
| B5 | AI | artifact、清 IDB、归档 | `13`、`10` | — | 1 session |

## 会话模板

```
Session ID:
类型（AI / 人 / 评审）:
Goal（一句话）:
读取（最多 4 个文件）:
输入 artifact:
步骤:
产出:
验收:
Next（一个动作）:
Blocker:
```

## 停止规则

- 单卡连续两次重测 Δ>5：标 `low-confidence`，不再消耗。
- 最低 level 仍 <0.8：标 `out-of-range`，进 redesign。
- readiness 无法区分 normal/drift：退回“只记录，不判定”。
- 不再开 pilot v5；不再做 family/LOCO。
