# 排期（QA-only）

## 已完成

- P0：Calibration Runner + 任意卡自定义 run + health summary + 文档。
- 四轮 pilot / G1 失败 / 方案 B 产品化取消（见 `07`）。

## 现行

| ID | 类型 | 目标 | 产出 | Gate |
|---|---|---|---|---|
| P1a | AI/人 | 审计 `star_single` / `star_double_r` | `02` 审计行 + 导出 | — |
| P1b | 人 | 审计 `color_val` | 同上 | — |
| P1c | 人 | 审计 `angle_parallel_2afc` / `persp_prop_division` / `angle_comparison_2afc` | 同上 | — |
| P1d | AI | 汇总审计；列出 too-easy/too-hard/flat/noisy | `02` 问题表 | **P1** |
| P2a | AI | 修 `star_single` / `star_double_r` 生成器 | 代码 + 测试 | — |
| P2b | AI | 修 `color_val` 低 V | 代码 + 测试 | — |
| P2c | AI | 修 angle/persp 难度映射 | 代码 + 测试 | — |
| P2d | 人 | 每张修完复验 20–30 题 | health 对比 | **P2** |
| P3 | AI | 训练侧回归；Level 语义说明 | `docs/` + `pnpm verify` | **P3** |

## 会话模板

```
Session ID:
类型:
Goal:
读取（4 份）:
输入:
步骤:
产出:
验收:
Next:
Blocker:
```

## 停止规则

- 单卡两次复验仍 noisy/floor/ceiling：标 `redesign`，不再消耗。
- 审计发现是“卡片设计”而非“参数”问题：停手，先设计。
- 不改测试来让 health 变绿；health 只是报告。
