# 交接

> 每次会话结束更新本文件。下一次会话从这里接，不翻旧聊天。

## 当前状态

| 项 | 值 |
|---|---|
| 日期 | 2026-11-26 |
| Gate | **B0 完成；B1 per-card 校准入口待做** |
| 上次会话 | S04/B0（选方案 B，改写路线图/验收/协议） |
| 下一步 | **B1**：任意已注册卡创建 20–40 题 per-card run |
| Blocker | 无 |

## 方案 B

- 纯 per-card：每张卡独立 JND/Level；
- 不做 family transfer / LOCO / 4 族；
- 不做全量 33 卡；按需 20–40 题/卡；
- 20 题混合检查只做 readiness，不写 per-card Level。

G1 已关闭：四轮 pilot 后仅 ratio 族有 family 证据；color/spatial/angle 失败或不稳定。详见 `07_validation_report.md`。

## 下一步（只做这一件）

B1：

1. Calibration 列表增加“新建 run”：
   - 选任意已注册卡；
   - 填 levels（逗号分隔）与每级题数；
   - 生成固定平衡序列，复用现有 Runner；
2. 导出仍用 `formsight-calibration-runs`；
3. 跑 `pnpm verify`；更新本文件，等 B2。

## 读取顺序

1. `00_README.md`
2. `01_decisions.md`
3. `02_card_status.md`
4. 本文件

## 不要做

- 不做 family/LOCO/全量校准。
- 不做 pilot v5。
- 不迁移旧数据；不清 IDB；不提交原始 JSON。
- 不在 tracked 文件写绝对路径、Token、个人日程。

## Artifact 版本

| 名称 | 版本 | 说明 |
|---|---|---|
| 历史快照 | 2026-11-24 | `sha256:ab2fb088…6554f9` |
| pilot v1–v4 | 2026-11-25/26 | 见 `13_artifact_manifest.md` |
| 代码基线 | `develop` @ `619131d` | pilot v4 |
| per-card artifact | 未生成 | B2 |

## 本次会话的验证

- 文档-only；`pnpm verify` 49 文件 / 471 用例全绿。
- 原始数据本地副本在 `viska/local/calibration/`。
