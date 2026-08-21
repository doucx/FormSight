好的，我们已经完成了「角度感知」新领域的全部建设，包括夹角估算滑块、角度二分对比以及基于上方基准线匹配的平行线 2AFC 辨识卡片，并且打通了路由、首页、统计与设置的所有挂载。

现在我们将本次所有变更打包为一个完整的 Git 提交。

## [COMMIT] feat(angle): 新增角度感知训练领域及连续滑块与 2AFC 卡片系列

### 用户需求
将新增的「角度感知」训练模块（包括夹角大小估算、角度二分对比、平行线基准辨识 2AFC 卡片及其在系统各处的集成挂载）正式创建 Git 提交。

### 评论
该提交构建了一个完整的认知训练新领域，遵循极简视觉风格与 JND 自适应衰减难度模型，为 FormSight 的空间造型能力训练补齐了关键的角度维度。

### 目标
1. 将所有新增与修改的文件添加至 Git 暂存区。
2. 执行 Git 提交并附带符合 Conventional Commits 规范的结构化提交说明。

### 基本原理
按照系统安全规则，通过独立的 `[COMMIT]` 计划执行版本控制提交，确保所有代码变更在验证无误后原子化入库。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #comp/cli #concept/ui #concept/state #scope/core #scope/ux #ai/instruct #task/domain/geometry #task/object/angle-perception-module #task/action/implementation #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交所有变更

~~~~~act
git_add
src/types/card.ts
src/utils/db/schema.ts
src/utils/angleUtils.ts
src/components/angle/AngleEstimationView.tsx
src/components/angle/AngleComparison2AfcView.tsx
src/components/angle/AngleParallel2AfcView.tsx
src/components/AngleCanvas.tsx
src/components/settings/DynamicDomainSettings.tsx
src/components/GlobalStatsModal.tsx
src/hooks/useHashRoute.ts
src/views/Home.tsx
src/app.tsx
src/config/plugins/anglePlugin.tsx
src/config/plugins/index.ts
src/config/cards.ts
src/config/domains.ts
src/utils/settings.ts
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(angle): add angle perception domain with estimation and 2AFC training cards

- Introduce new 'angle' training domain with minimalist white-background & black-line visual aesthetics
- Implement AngleEstimationView with continuous slider & tolerance band indication
- Implement AngleComparison2AfcView for dual-angle magnitude differentiation
- Implement AngleParallel2AfcView with top reference prompt line & 2AFC parallel alignment matching
- Integrate 'angle' domain into hash routing, dashboard, Home view, global stats modal, and dynamic settings
- Add JND-based exponential decay difficulty algorithms for angle and parallelism discrimination
~~~~~

### 下一步建议
- **弱点热力分析**：后续可为 `angle_estimation` 设计极坐标分扇区（如锐角/直角/钝角）的弱点热力分布分析看板。
- **扩展卡片**：可探索三点夹角起形（基于 3 个离散点判断所构成的夹角）或正多边形外角估算等延伸卡片。
