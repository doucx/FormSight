好的，我们已经成功为色相、饱和度与明度卡片添加了答案揭晓时的切半分区对比功能。现在我们将这一批改动作为完整的逻辑单元提交到 Git 仓库。

## [COMMIT] feat(cards): 为色相、饱和度与明度卡片接入切半分区对比 (Split Swatch)

### 用户需求
将用户在 `color_hue`、`color_sat`、`color_val` 单项卡片中的作答结果，在答案揭晓时以 1:1 无接缝切半分区（Split Swatch）形式在色块下半区直观呈现。

### 评论
该变更显著增强了单维度色彩训练的视觉直觉反馈。用户在揭晓瞬间即可通过上下色块的硬切分对比，直接评估自身感知误差，极大地提升了练习的趣味性与成长获得感。

### 目标
1. 通过 Git 将修改后的三个 View 文件暂存。
2. 提交一份结构清晰、说明详尽的 Conventional Commit。

### 基本原理
根据 `d3-constraint-quipu-plan-script-rules-D3-P2` 的互斥原则，文件系统变更与 Git 提交已严格隔离在不同的计划中执行。当前计划只包含暂存与提交操作。

### 标签
#intent/tooling #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/color-cards-split-swatch #task/action/integration #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交色块切分对比功能的代码变更

~~~~~act
git_add
src/cards/color_hue/ColorHueView.tsx
src/cards/color_sat/ColorSatView.tsx
src/cards/color_val/ColorValView.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(cards): Enable split swatch comparison for single-dimension color cards

Integrates the `compareColor` capability of `ColorSwatch` into `ColorHueView`, `ColorSatView`, and `ColorValView`.

- When answers are revealed (`showAnswer`), the bottom half of the main color swatch immediately splits to display the exact color formulated from the user's estimated value (Hue, Saturation, or Value respectively) combined with the remaining target channels.
- Provides immediate, intuitive visual feedback on color estimation errors without relying on extra transition delay or dividing borders.
~~~~~

### 下一步建议
- **回归测试**: 可以执行 `npm test` 或启动开发服务器，体验各项单维度卡片的揭晓表现。
- **扩展评估**: 后续如有需要，可为其他卡片引入类似的视觉对比反馈机制。
