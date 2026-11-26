# 交接

> 每次会话结束更新本文件。下一次会话从这里接，不翻旧聊天。

## 当前状态

| 项 | 值 |
|---|---|
| 日期 | 2026-11-26 |
| Gate | **G1 不通过（family transfer 仅 ratio 成立）** |
| 上次会话 | S03g（pilot v4 + pooled 判定） |
| 下一步 | **S04**：选降级方案 A/B，改写路线图；不再做 pilot v5 |
| Blocker | 需要你拍板方案 A（全局+ratio+按需单卡）或 B（纯 per-card） |

## S03g 结论

v4 导出 3 runs / 91 trials：`star_single` .27（16–35 地板）、`color_val` .92（天花板）、`star_double_r` .72（~25.5）。

pooled v1–v4（有效 run）：

| 卡 | T80 |
|---|---:|
| color_hue | ~13.6 |
| color_val | ~5.1 |
| star_single | ~16.1 |
| star_double_r | ~23.6 |
| angle_parallel_2afc | ~23.0 |
| angle_comparison_2afc | ~16.1 / v3 ~26.8（不稳定） |
| persp_prop_division | ~21.1 |
| persp_prop_migration | ~19.2 |

family transfer：

- color Δ~8.5；spatial Δ~7.5；angle 不稳定；**仅 ratio Δ~1.9 通过**。
- G1 不通过；不再做 pilot v5。
- 原因：同族两张卡不是同一能力；20–30 题/卡压不住 run-to-run 方差。

## 下一步（只做这一件）

S04：拍板降级方案。

- **A（推荐）**：1 全局 + ratio 族 + 按需单卡；color/spatial/angle 需要时测 20–40 题。
- **B**：纯 per-card；全局基准只做 readiness/drift。
- C：可靠性研究（2 卡 ×2 次，+120 题）——不推荐，不会改变 7–8 级差。

选定后：更新 `01`、`03`、`04`，再决定 G2/G4 的新形态；当前 S05–S17 草案作废。

## 读取顺序

1. `00_README.md`
2. `01_decisions.md`
3. `02_card_status.md`
4. 本文件

## 不要做

- 不做 pilot v5；G1 已用四轮数据判失败。
- 不进入原全量校准 S05–S17。
- 不迁移旧数据；不清 IDB；不提交原始 JSON。
- 不加新 card 类型。
- 不在 tracked 文件写绝对路径、Token、个人日程。

## Artifact 版本

| 名称 | 版本 | 说明 |
|---|---|---|
| 历史快照 | 2026-11-24 | `sha256:ab2fb088…6554f9` |
| pilot v1 导出 | 2026-11-25 | `sha256:ce053c71…f99e` |
| pilot v2 导出 | 2026-11-25 | `sha256:e08ade3a…d3586` |
| pilot v3 导出 | 2026-11-26 | `sha256:d1ea3a3b…a33c` |
| pilot v4 导出 | 2026-11-26 | `sha256:67a5281b…694c9` |
| 代码基线 | `develop` @ `619131d` | pilot v4 |

## 本次会话的验证

- 只读分析 + 文档更新；未改代码。
- `pnpm verify` 49 文件 / 471 用例全绿。
- 原始数据本地副本在 `viska/local/calibration/`。
