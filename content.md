收到，已确认所有改动。本轮提交将卡片核心逻辑解耦为各卡片独立自治的生成器与类型系统，提取统一的触控放大镜 Hook (`usePointLoupe`)，并清理废弃的聚合工具文件。

我将生成执行 Git 暂存与提交的计划。

## [COMMIT] refactor(cards): 解耦卡片模块自治逻辑并提取触控放大镜统一Hook

### 用户需求

将当前工作树中的代码重构更改作为完整的逻辑单元提交到版本控制系统中。

### 评论

这次重构显著增强了项目的模块内聚性与低耦合度：
1. **模块自治**：各卡片（如 `color_all`、`rel_*` 系列、`star_*` 系列）不再依赖全局膨胀的 `relativeColor.ts`，而是拥有各自专属的 `types.ts` 和 `generator.ts`，降低了卡片间的隐式耦合。
2. **交互抽象**：提取了通用的 `usePointLoupe` Hook，消除了在 `PointClickCanvas`、`NegVertexFittingView` 和 `PerspStructure3DView` 中重复的移动端触控放大逻辑。
3. **数据安全性**：在分析统计与设置解析中添加了严格的类型校验与降级保护，避免空值或非法格式引发运行时崩溃。

### 目标

1. 将所有已修改、新增与删除的文件加入 Git 暂存区。
2. 创建符合 Conventional Commits 规范的提交信息，详述重构范畴与优化点。

### 基本原理

本次变更涉及卡片架构重构、组件抽取与工具链清理。遵循单一职责原则，将改动划分为逻辑明确的提交，确保历史记录可追溯且各卡片生命周期独立。

### 标签

#intent/refine #flow/ready #priority/medium #comp/interfaces #concept/ui #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/card-autonomy #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 暂存并提交代码变更

将所有相关修改加入暂存区，并生成结构完整的提交记录。

~~~~~act
git_add
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(cards): decouple card generation logic and unify point loupe hook

- Decouple relative color cards (rel_vector_shift, rel_lightness_induction, rel_hue_induction, rel_decontextual_2afc) and color_all into autonomous modules with dedicated types and generators.
- Remove redundant centralized core/color/relativeColor.ts.
- Extract touch loupe logic into reusable usePointLoupe hook and integrate into PointClickCanvas, NegVertexFittingView, and PerspStructure3DView.
- Normalize answer signatures to discrete Point or color values across spatial and color cards.
- Add runtime defensive validation guards for trial analytics and dynamic domain settings.
- Migrate and update unit tests corresponding to new card generators and OKLab utilities.
~~~~~

### 下一步建议

- **测试套件验证**: 运行 `pnpm test` 或 `npm run test`，确保所有独立迁移后的生成器测试及组件行为完全通过。
- **构建与类型检查**: 执行 `pnpm build` 或 `tsc --noEmit`，验证所有卡片与视图签名改造后的类型健全性。
