好的，我们已经完成了 FormSight 架构向“垂直切片 + 纯算法 Core + 零中心注册（Modular Monolith）”的全部重构工作。

现在我将生成 `[COMMIT]` 计划，将这些架构变更完整提交到 Git 仓库。

## [COMMIT] refactor(arch): 重构为垂直切片模块化单体架构 (Modular Monolith)

### 用户需求
完成 FormSight 架构向垂直切片（Vertical Slicing）与零中心化注册（Zero-Central Registration）的重构，将所有相关文件暂存并创建 Git 提交。

### 评论
本次架构升级从根本上解决了卡片与领域增多带来的代码膨胀和 AI 维护成本递增的问题。通过建立 `src/core/` 基础算法库与各个 `src/domains/<domain>/` 垂直切片包，不仅大幅降低了各组件间的耦合，而且使未来的领域扩展变得极其轻量与安全。

### 目标
1. 将所有新建立的 `src/core/` 核心算法与基建文件加入 Git 暂存区。
2. 将所有重构后的 `src/domains/` 垂直切片包加入 Git 暂存区。
3. 将解耦后的上层视图与兼容代理文件加入 Git 暂存区。
4. 创建规范的 Conventional Commit 提交信息。

### 基本原理
按照标准版本控制实践，将一个逻辑自洽、完整的架构重构单元打包为一个清晰的 Git 提交，便于追溯与回滚。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #comp/runtime #concept/executor #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/modular-monolith #task/action/refactor #task/state/end

---

### Script

#### Acts 1: 提交架构重构变更

~~~~~act
git_add
src/core/
src/domains/
src/app.tsx
src/views/PlanTrainingView.tsx
src/views/Home.tsx
src/components/GlobalStatsModal.tsx
src/components/AngleCanvas.tsx
src/components/StarCanvas.tsx
src/components/ColorCanvas.tsx
src/components/RelativeColorCanvas.tsx
src/components/NegativeSpaceCanvas.tsx
src/components/AbstractionCanvas.tsx
src/components/plan/PlanEditorModal.tsx
src/components/plan/editor/CardPickerPanel.tsx
src/components/plan/editor/PlanStageList.tsx
src/components/plan/PlanHeroCard.tsx
src/config/registry.ts
src/utils/mathUtils.ts
src/utils/noiseUtils.ts
src/utils/oklchUtils.ts
src/utils/adaptiveEngine.ts
src/utils/angleUtils.ts
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(arch): migrate architecture to modular monolith with vertical slicing

- Introduce `src/core/` foundation:
  - Add `contracts.ts` defining standard `DomainManifest` contract
  - Add `registry.ts` featuring zero-centralized auto-discovery via `import.meta.glob`
  - Consolidate pure math, OKLab/OKLCH color models, canvas drawing, and adaptive engine
- Slices domains into self-contained packages under `src/domains/`:
  - `angle`, `star`, `color`, `relative_color`, `negative_space`, `abstraction`, `concretization`
  - Each domain encapsulates its views, generation algorithms, hit detection, and plugin manifest
- Decouple top-level shell and views (App, Home, PlanTrainingView, Modals) to consume `registry` dynamically
- Retain backward-compatible proxies for legacy imports
~~~~~

### 下一步建议
- **执行端到端演练**：在浏览器中启动应用（`npm run dev`），体验训练流与各看板，验证动态注册工作正常。
- **新增模块尝试**：可以尝试让 AI 基于 `src/domains/angle/` 模版直接创建一个全新的感知训练领域（如 `perspective` 透视感知），验证单上下文低开销的代码生成体验。
