# 路线图（QA-only）

## 已结束

- calibration-v1 的 G0–G1：Calibration Runner、四轮 pilot、per-card 阈值、G1 失败。
- 方案 B 的产品化：**取消**。校准不再产出训练用 Level（D-036）。

## 现行目标

**把校准作为卡片质量诊断工具：发现难度轴问题 → 修卡 → 用同一工具复验。**

```
P0 工具与定调（done）
  ↓
P1 卡片健康审计（下一会话执行）
  ↓
P2 修卡 + 复验
  ↓
P3 训练侧回归
```

### P0 — 工具与定调

- Calibration 页面：任意卡 + 自定义 levels + 每级题数；
- summary 自动出 health：T80、90% CI、单调性、L1/last、invalid；
- 校准数据独立于训练统计；
- 文档：D-036/D-037，路线图/验收/贴手改写。
- 验收：`pnpm verify` 通过；任意卡能创建 20–48 题 run。

### P1 — 卡片健康审计

- 用 QA Runner 对每张疑点卡跑 20–30 题；
- 读 summary 的 health：
  - `healthy`：曲线单调、T80 在 8–28、L1≥.85、last≤.3；
  - `too-easy`：最高 level 仍 ≥80%；
  - `too-hard`：最低 level 已 ≤80%；
  - `flat`：各 level 正确率几乎不变；
  - `noisy`：非单调/残差大；
  - `invalid`：RT <300ms 或未完成。
- 写入 `02_card_status.md` 的审计列/备注；问题卡进 P2。
- 优先顺序：
  1. `star_single` / `star_double_r`（点击精度/边界）；
  2. `color_val`（低 V）；
  3. `angle_parallel_2afc` / `persp_prop_division`（窗口/映射）；
  4. 当前 Level 接近 1 或 35 的卡。

### P2 — 修卡 + 复验

- 一次只修一张卡；先写清“预期改什么”；
- star：格子尺寸/容差与点击精度匹配；
- color_val：约束低 V 或改按 ΔE；
- angle/persp：调 level→tolerance，让 T80 落在 15–25；
- 修完用同一 QA 窗口复验；health 从 floor/ceiling 变 healthy；
- 更新 `viska/ledger.md`（若新增守护检查）与 `02`。

### P3 — 训练侧回归

- 自适应引擎不变；
- Level 只作趋势指标，不再宣称 80% JND；
- 不加 per-card 校准 Level 的产品 UI；
- 可以加“难度健康”内部标记，但不影响训练。

## 明确不做

- family transfer / LOCO / 4 族；
- 20 题给所有卡基线；
- 全量 33 卡校准；
- 面向用户的 calibratedLevel；
- pilot v5。

## 验收“卡修好了”

1. L1 ≥0.9，L35 ≤0.2；
2. T80 落在 8–28；
3. 正确率随 level 单调（允许 1 个小反转）；
4. 同 level 内不同刺激的正确率差 ≤0.15（如可测）；
5. 隔天重测 Δ≤5；
6. health ≠ too-easy / too-hard / flat / noisy / invalid。
