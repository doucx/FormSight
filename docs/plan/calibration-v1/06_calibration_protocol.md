# QA 校准协议（卡片健康诊断）

## 1. 目的

用固定 levels 的短 run 判断一张卡的难度轴是否可用：是否有 floor/ceiling、单调性、T80 位置、invalid。

不产出训练 Level。

## 2. 入口

- `#/calibrate` → **New QA run**；
- 选卡；
- 填 levels（2–8 个，1–35）；
- 每级 1–12 题；总 20–48；
- Start。

## 3. 选题

### 3.1 已有历史

- 取历史 T80 ±5 级；
- 4–6 个 levels ×5–6 题。

### 3.2 没有先验

先 bracket：

```
1 / 9 / 17 / 25 / 35，各 2–3 题
```

再围绕穿越点做 4–5 级 ×5–6 题。

## 4. 执行

- 一次坐下完成；中断 >2h 标 split 重做；
- 中位 RT <300ms 判 invalid；
- 不手改 level；level 由序列决定；
- star 卡放在精神好的时候。

## 5. 读 health

- `healthy`：T80 8–28，L1≥.85，last≤.3，单调；
- `too-easy`：最高 level 仍 ≥80%；
- `too-hard`：最低 level 已 ≤80%；
- `flat`：各 level 正确率差 <0.12；
- `noisy`：violations>1 或 noiseRms>0.22；
- `invalid`：未完成/RT<300ms。

## 6. 记录

- 导出 JSON（含 `health`）放 `viska/local/calibration/`；
- `11_experiment_log` 记一行（卡、levels、n、hits、health）；
- `02_card_status` 记审计结论与下一步；
- 问题卡进 P2。

## 7. 修卡复验

- 修完用同一 levels/题数重跑；
- health 变 healthy 才算通过；
- 若改生成器，补测试并 `pnpm verify`。

## 8. 数据卫生

- 不写训练统计；
- tracked 不写绝对路径/个人日程；
- 原始数据只放本地。
