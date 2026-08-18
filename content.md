## [COMMIT] feat(negative-space): 实现正负形空间面积判断训练模块

### 用户需求
用户确认了当前的修改方案与执行结果，并要求对所有已完成的文件变更创建 Git 提交。

### 评论
本提交将 FormSight 视觉训练系统的功能矩阵进一步拓展，引入了传统美术与造型核心的“正负形观察法（Negative Space Perception）”。通过鞋带公式、动态容差和自适应引擎的深度结合，使用户能够系统性地强化对空间留白比例的敏锐直觉。

### 目标
1. 新增 `negativeSpaceUtils.ts` 及其单元测试，实现不规则多边形生成、鞋带面积计算与自适应判定。
2. 扩充 IndexedDB Schema、偏好设置和全局统计分析对 `negative_space` 领域的多维支持。
3. 实现 `NegativeSpaceCanvas`、`NegativeSpaceDashboard` 与 `NegativeSpaceTrainingView`。
4. 打通首页路由导航、时间统计闭环与 TS 类型修复。

### 基本原理
通过严格遵循 ACA 运行协议和 Quipu 协议规范，将新功能拆分为隔离的开发计划（WIP）并经过验证后，在独立的提交计划中完成 Git 暂存与结构化提交。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #comp/ui #concept/state #scope/core #scope/ux #ai/instruct #task/domain/feature #task/object/negative-space-module #task/action/build #task/state/end #task/status/completed

---

### Script

#### Acts 1: 添加文件到暂存区并创建提交

~~~~~act
git_add .
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(negative-space): add negative space perception training module

Introduces the "Negative Space Area Ratio Estimation" module to FormSight, reinforcing professional drawing and observation skills focused on balancing positive objects and negative surrounding areas.

- Added negativeSpaceUtils.ts with Shoelace formula polygon area calculation, adaptive tolerance decay (Level 1~35), and randomized concave/convex polygon generation.
- Expanded IndexedDB schema and queries to support the new 'negative_space' training domain.
- Implemented NegativeSpaceCanvas with percentage slider, live tolerance bands, and target comparison feedback.
- Created NegativeSpaceDashboard and NegativeSpaceTrainingView, seamlessly integrated with useTrainingSession and AdaptiveEngine.
- Integrated negative space routing in Home.tsx, app.tsx, and GlobalStatsModal.tsx with robust NaN-safe time formatting.
- Added comprehensive unit tests in negativeSpaceUtils.test.ts.
~~~~~

### 下一步建议
- **多边形渲染精炼**: 后续可考虑为多边形加入渐变阴影或多洞孔洞（Holes）支持，进一步提升视觉张力。
- **弱点分析增强**: 可针对用户在不同正形占比区间（如低留白 vs 高留白）的偏置表现增加专项弱点雷达图。
