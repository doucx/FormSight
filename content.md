我们已经完成了所有历史兼容性代码与旧版映射层的清理，并通过了单元测试。现在将这些修改暂存并提交到 Git 仓库。

## [COMMIT] refactor(core): 清理过时兼容性代码与历史版本映射层

### 用户需求
将本次清理历史兼容性代码、移除旧版映射表及更新对应单元测试的工作单元提交至版本库。

### 评论
本次提交移除了历史架构遗留的平铺数据映射逻辑和多重降级判断，将数据模型统一收敛到以 `cardId` 为主键的标准化架构上，使代码库更加简洁健康。

### 目标
1. 将所有被修改的文件加入 Git 暂存区。
2. 创建符合 Conventional Commits 规范的提交记录。

### 基本原理
按照版本控制最佳实践，将逻辑完整的重构作为一个原子 Commit 提交，确保 Git 历史记录干净清晰。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #comp/runtime #concept/state #scope/core #scope/dx #ai/instruct #task/domain/core #task/object/legacy-cleanup #task/action/refactor #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交所有重构与测试修改

我们将修改的文件添加到 Git 暂存区并创建提交。

~~~~~act
git_add
src/types/card.ts
src/config/cards.ts
src/utils/sound.ts
src/utils/canvas/drawHueBiasChart.ts
src/utils/db/queries.ts
src/utils/db/importExport.ts
src/hooks/useTodayStats.ts
src/components/dashboard/GenericDashboard.tsx
src/utils/abstractionUtils.ts
src/components/AbstractionCanvas.tsx
src/views/GenericTrainingView.tsx
src/components/GlobalStatsModal.tsx
src/app.tsx
src/utils/__tests__/db.test.ts
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(core): remove obsolete compatibility layers and legacy mappings

- Remove webkitAudioContext and roundRect fallbacks for modern standard Web APIs
- Normalize legacyDomain / legacyMode to domain / mode across card definitions and components
- Remove resolveLegacyCardId, LEGACY_MAP, and MODE_MAP lookup tables
- Remove legacy vector Notan shape rendering and data definitions in visual abstraction
- Simplify db queries and import/export by standardizing on cardId primary key
- Update database layer unit tests to use standardized cardId
~~~~~

### 下一步建议
- **构建测试**: 运行 `npm run build` 确保生产环境打包顺利通过。
- **功能验收**: 启动本地开发服务 `npm run dev`，快速浏览概括感知、色感训练等主要模块，验证功能交互完好。
