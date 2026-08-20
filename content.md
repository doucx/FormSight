好的，所有代码修改均已完成。现在将生成包含 `git add` 和 `git commit` 的提交计划。

## [COMMIT] feat(domain): 新增概括感知与细化感知双领域及八张核心训练卡片

### 用户需求
将新增的“概括感知”（自底向上本质提炼）与“细化感知”（自顶向下结构透视）以及 8 张全新卡片的完整实现提交到 Git 仓库。

### 评论
该提交构成了 FormSight 知觉训练体系的重要升级，完整覆盖了“势线、大形、黑白灰大关系、色彩调性”在正向概括与逆向透视两个认知维度的全流程闭环。

### 目标
将所有相关的新建文件与修改加入暂存区，并生成符合 Conventional Commits 规范的提交记录。

### 基本原理
按照 Quipu 协议规范，将所有工程变更原子化打包提交。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #comp/cli #concept/history #scope/core #scope/ux #ai/delegate #task/domain/ui #task/object/abstraction-and-concretization #task/action/implementation #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交所有变更

~~~~~act
git_add
src/types/card.ts
src/utils/db/schema.ts
src/utils/settings.ts
src/utils/abstractionUtils.ts
src/components/AbstractionCanvas.tsx
src/config/cards.ts
src/config/domains.ts
src/config/trainingPlugins.tsx
src/app.tsx
src/components/GlobalStatsModal.tsx
src/hooks/useHashRoute.ts
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(domain): add visual abstraction and concretization domains with 8 training cards

- Introduce 'abstraction' (bottom-up visual simplification) and 'concretization' (top-down structural matching) domains.
- Implement 4 bottom-up abstraction cards:
  - Gesture Axis (PCA-based dominant flow extraction)
  - Polygon Decimation (RDP key vertex decimation 2AFC)
  - Notan Threshold (Binary value grouping slider)
  - Palette Clustering (OKLab area-weighted dominant color 4AFC)
- Implement 4 top-down concretization matching cards:
  - Gesture Spine (Spine to particle flow 2AFC)
  - Bounding Hull (Low-poly hull to detailed contour 2AFC)
  - Notan Key (Notan mask to grayscale scene 2AFC)
  - Palette Chord (3-color palette to textured pattern 2AFC)
- Add deterministic procedural generation and evaluation in `src/utils/abstractionUtils.ts`.
- Add dedicated `AbstractionCanvas` with interactive continuous slider and 2AFC comparison view.
- Update routes, global statistics, domain cards, and user settings.
~~~~~

### 下一步建议
- **单元测试补充**：为 `src/utils/abstractionUtils.ts` 中的 PCA 主轴计算与 RDP 折线简化算法编写针对性测试用例（`test/abstractionUtils.test.ts`）。
- **弱点分析接入**：后续可为概括领域配置专用的弱点诊断视图（如 PCA 偏角倾向图、Notan 阈值过度偏亮/偏暗倾向分析）。
