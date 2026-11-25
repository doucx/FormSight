# 风险登记

状态：open / mitigated / accepted / closed。每次 gate 评审更新。

| # | 风险 | 概率 | 影响 | 缓解 | 触发/状态 |
|---|---|---|---|---|---|
| R-01 | family transfer 不成立 | 中 | 高 | G1 先测 LOCO；按降级树回退 | G1；open |
| R-02 | 试点/全量校准过拟合 | 中 | 高 | 时间留出 + 新鲜重测 + 敏感性 | G1/G2；open |
| R-03 | 补测疲劳导致数据质量下降 | 高 | 中 | 每次 ≤30 题；分多次；异常记录 | 持续；open |
| R-04 | 现有 benchmark 起始 level 不在先验窗口 | 高 | 中 | 固定序列 + Calibration Runner，起始 level 由协议决定 | S01c；closed |
| R-05 | out-of-range 重设计拖长 | 中 | 中 | 先排除，不阻塞主线；单独 backlog | G3；open |
| R-06 | 跨会话交接漂移 | 中 | 高 | 4 文件协议 + D-xxx + gate tag | 持续；open |
| R-07 | tracked 文档泄露个人信息 | 低 | 高 | `PRIVACY.md` + grep + raw 区 | 每次提交；open |
| R-08 | 本地 raw/artifact 丢失 | 中 | 高 | 每周私有备份 | 持续；open |
| R-09 | 版本漂移污染校准 | 中 | 高 | details 过滤 + codeVersion + hash | G2；open |
| R-10 | 自适应选点导致斜率被低估 | 高 | 中 | slope 只作先验；敏感性分析 | G2；open |
| R-11 | 20 题锚点噪声过大 | 高 | 中 | CI 判定；多跑 2–3 次；未校准卡不承诺 | G5；open |
| R-12 | 范围蔓延（新卡/UI 插队） | 中 | 中 | D-008；gate 只认 artifact | 持续；open |
| R-13 | 生成器重设计作废旧数据 | 中 | 中 | 重设计排在 G2 后；重设计卡单独重标 | G3；open |
| R-14 | 本地 `plan/` 目录被工具误扫 | 低 | 低 | G0 已验证；如变化再加 ignore | 已缓解 |
| R-15 | 单人项目缺少外部评审 | 高 | 中 | gate 自检 + 未来 retrospective | 持续；accepted |
| R-16 | DB v5 迁移失败 | 低 | 高 | 旧库升级测试；只加表/索引 | S01c；mitigated |
| R-17 | 校准数据被 `clearAllData` 清掉 | 中 | 中 | 完成页提示先导出；单独 Clear calibration | 持续；open |
| R-18 | 固定序列顺序/学习效应 | 中 | 中 | block 内随机；记录 trialIndex；S03 检查漂移 | S03；**observed**（star_double 8/10→3/10） |
| R-19 | star 的 R 混淆 | 高 | 高 | 修生成器（角度/R 比例间距）；标 confounded | S03b；mitigated（待 v2 验证） |
| R-20 | 窗口太窄/偏移 | 高 | 高 | pilot v2 用更宽 8 卡窗口；先 bracket 再精测 | S03b；open |
| R-21 | run 跨天/中断 | 中 | 中 | 单 run 一次完成；>2h 标 split 重做 | D-023；open |

## 重点说明

### R-01 family transfer

这是整个“1 全局 + 4 族”方案的前提。如果同族两张卡的 LOCO 误差 >5 级，族偏移就没有可迁移性。不要用“全量拟合更好”来掩盖；G1 必须给出结论。

### R-04 起始 level

当前 benchmark 从 profile 的 `currentLevel` 开始，不是从先验窗口开始。若当前 level 远高于窗口，staircase 细步需要多次 miss 才能下探；20 题可能覆盖不到。处理：

1. 记录实际 level 轨迹；
2. 10 题后仍在窗口外 → `window-missed`，停止；
3. 重排一次；
4. 若反复发生，G1 后加一个测量入口的 `startLevel` 参数（代码改动，单独评审）。

### R-07 隐私

tracked 计划只放聚合；原始 trial、绝对路径、个人日程放 `viska/local/calibration/`。每次提交跑 `PRIVACY.md` 的检查。误提交按 `PRIVACY.md` §6 处理。

### R-08 备份

`docs/plan` 是 tracked，有远端（待推送）；`viska/local/calibration/` 不被 git 保护，必须单独备份。建议每周一次，至少保留最近 4 周。

### R-11 锚点噪声

20 题在 p=0.8 时的 95% CI 约 0.56–0.94；一次锚点不足以判定。至少跑 2–3 次，或用 30 题；G5 的通过线按 CI 写。
