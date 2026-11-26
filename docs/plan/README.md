# 项目计划

本目录存放**跨会话的项目级计划**：路线图、排期、验收、交接。

它与 `docs/` 其余部分的分工：

- `docs/architecture.md` 等：产品或架构的稳定说明；
- `docs/decisions/`：不可逆决策的 ADR；
- `docs/plan/`：一个具体项目的执行计划，允许随进度更新；
- `.handoff/`：机器可读的最小状态（NEXT / 不可逆 DECISION）。

计划本身也是项目记忆：决策为什么变、哪个 gate 没过、哪张卡被排除，都留在 git 历史里。因此计划是 **tracked** 的；原始 trial、绝对路径、个人日程等敏感内容不进本目录，放 `viska/local/`（已 gitignore）。细则见各计划的 `PRIVACY.md`。

## 现行计划

| 计划 | 状态 | 目标 | 入口 |
|---|---|---|---|
| `calibration-v1` | active（2026-11-26 转方案 B） | 纯 per-card：按需 20–40 题/卡估 80% JND；不做 family/全量；20 题只做 readiness | [`calibration-v1/00_README.md`](./calibration-v1/00_README.md) |

## 生命周期

- **active**：正在推进，gate 未全部通过；
- **paused**：等待补测/外部输入；
- **archived**：结束或放弃，移动到 `archive/`，保留历史。

## 阅读顺序（新会话）

只读 4 份：`calibration-v1/00_README.md`、`01_decisions.md`、`02_card_status.md`、`10_handoff.md`。
不要读 `.journal.jsonl`，不要翻旧聊天。
