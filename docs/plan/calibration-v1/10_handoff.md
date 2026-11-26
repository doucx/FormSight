# 交接（QA-only）

> 下一次会话从这里接。校准已降级为卡片质量诊断，不再产出训练 Level（D-036）。

## 当前状态

| 项 | 值 |
|---|---|
| 日期 | 2026-11-26 |
| Gate | **P0 完成；P1 审计待执行** |
| 工具 | `#/calibrate` — New QA run / Recent runs / health summary |
| 下一步 | P1a：审计 star_single / star_double_r |
| Blocker | 无 |

## 工具怎么用

1. 打开 `#/calibrate`（或设置 → Data Governance → Calibration runs）。
2. **New QA run**：
   - 选卡；
   - levels 逗号分隔（2–8 个，1–35）；
   - 每级题数 1–12，总题数 ≤48；
   - Start。
3. 做完自动进 summary，**Card health** 显示：
   - `status`：healthy / too-easy / too-hard / flat / noisy / review / invalid / insufficient；
   - T80、90% CI、L1/last、violations、noise、Median RT；
   - 每级 n/hits/accuracy。
4. Export run / Export all；JSON 放 `viska/local/calibration/`。
5. 旧 run 在 Recent runs 里；`resolveProtocol` 会从 sequence 还原 levels。

数据仍写 `calibration_runs` / `calibration_trials`，**不写训练统计**。

## P1 审计顺序

| 优先级 | 卡 | 建议 levels | 每级 | 备注 |
|---:|---|---|---:|---|
| 1 | star_single | 12 / 14 / 16 / 18 / 20 | 6 | 已知 T~16；看是否单调、floor/ceiling |
| 1 | star_double_r | 19 / 21 / 23 / 25 / 27 | 6 | 已知 T~23.6；尾部噪声 |
| 2 | color_val | 1 / 3 / 5 / 7 / 9 | 6 | 已知 T~5.1；低 V 异常 |
| 2 | color_hue | 11 / 13 / 15 / 17 | 6 | 已知 T~13.6；确认单调 |
| 3 | angle_parallel_2afc | 20 / 22 / 24 / 26 / 28 | 6 | 已知 T~23 |
| 3 | angle_comparison_2afc | 22 / 24 / 26 / 28 / 30 | 6 | 历史不稳定 |
| 3 | persp_prop_division | 17 / 19 / 21 / 23 / 25 | 6 | 已知 T~21 |
| 3 | persp_prop_migration | 15 / 17 / 19 / 21 / 23 | 6 | 已知 T~19 |
| 4 | Level≈1/35 的卡 | 先用 1/9/17/25/35 ×2 bracket | 2 | 找 floor/ceiling |

每次只跑 2–3 个 run；star 放最前；中位 RT <300ms 判 invalid。

## 读 health 后的动作

- `healthy`：记 `02` 为“健康”；不需要修。
- `too-easy`：提高 levels，或改生成器让最高级更难。
- `too-hard`：降低 levels，或让最低级更简单。
- `flat`：难度轴可能失效；检查 level→stimulus 映射。
- `noisy`：增加每级题数（8–10）或查刺激方差（R、V、角度等）。
- `invalid`：重跑；不要分析。
- `review`：人工看曲线；可能是边界。

## P2 修卡流程

1. 在 `02_card_status.md` 写：卡、问题、证据、预期修改。
2. 先写/更新**确定性生成器测试**（例如相邻 level 的刺激参数必须单调、范围不越界）。
3. 改生成器/参数；
4. 用同一 QA levels 复验 20–30 题；
5. health 从 too-easy/too-hard/flat/noisy 变 healthy；
6. `pnpm verify`；
7. 更新 `02`、`11`、`13`；必要时 `viska/ledger.md`。

注意：不要为了让 health 变绿而改 health 规则或测试断言；health 只是报告。

## 已知问题

- star 卡：点击精度/边界噪声；角间距已修，但径向间距仍随 R 缩放。
- color_val：低 V 目标不稳；可能需约束 `targetV` 或按 ΔE。
- angle/persp：level→tolerance 窗口可能仍偏；先审计再改。
- 现 Level 1–35 不代表同一能力；不要追求“所有卡同一个数字”。

## 代码地图

- `src/calibration/CalibrationView.tsx`：New QA run + Recent runs；
- `CalibrationRunner.tsx`：任意 protocol 运行；
- `CalibrationSummary.tsx`：health 面板；
- `health.ts`：T80/CI/单调性/noise/status；
- `protocols.ts`：buildCustomProtocol / resolveProtocol；
- `repository.ts` / `schema.ts`：独立校准 stores；
- `export.ts`：JSON。

## 命令

```bash
pnpm dev          # 打开 app；#/calibrate
pnpm verify       # 提交前
pnpm build        # 可选
```

原始导出：`viska/local/calibration/`（gitignored）。tracked 只写聚合/状态。

## 不要做

- 不做 family/LOCO/全量/20 题映射；
- 不产出用户 per-card Level；
- 不把 QA 结果写进训练统计；
- 不在 tracked 文件写绝对路径/Token/个人日程；
- 不用 pilot v5。

## 下一次会话的第一个动作

P1a：打开 `#/calibrate`，为 `star_single` 建 `12/14/16/18/20 ×6`，跑完读 health；再跑 `star_double_r` `19/21/23/25/27 ×6`。把结果写进 `02_card_status.md` 和 `11_experiment_log.md`。
