好的，我们已经完成了负形轮廓记忆二分判别（2AFC）模式的全部实现与优化。现在将这些变更作为一个完整的逻辑单元提交到 Git 仓库。

## [COMMIT] feat(negative-space): 实现 1:1 等大负形轮廓瞬时记忆匹配 2AFC 模式

### 用户需求
将正负形感知模块中的新特性“负形轮廓记忆匹配 (SHAPE_MATCH_2AFC)”及相关的 1:1 原生尺寸渲染、微扰干扰项算法与倒计时动画提交到版本库。

### 评论
该特性成功补齐了系统在“视觉短期工作记忆”和“瞬时轮廓微差辨识”层面的训练能力，且 1:1 等大双卡片设计保证了绝佳的几何感知保真度。

### 目标
1. 将所有涉及修改的代码文件加入 Git 暂存区。
2. 创建一条规范且详尽的 Conventional Commit。

### 基本原理
- 遵循 Quipu 指令级约束，提交操作与文件修改隔离在独立的 `[COMMIT]` 计划中执行。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/negative-space #task/object/shape-match-2afc #task/action/implementation #task/state/end #task/status/completed

---

### Script

#### Acts 1: 提交代码变更

我们将修改的文件添加到暂存区并创建 Git 提交。

~~~~~act
git_add
src/config/domains.ts
src/utils/negativeSpaceUtils.ts
src/config/trainingPlugins.tsx
src/components/NegativeSpaceCanvas.tsx
src/index.css
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(negative-space): implement 1:1 scale negative space shape memory match (2AFC)

- Add SHAPE_MATCH_2AFC mode under the negative space perception domain.
- Implement delayed match-to-sample (DMTS) stimulus-recall state machine with difficulty-adaptive exposure timer (2400ms -> 450ms).
- Generate high-similarity distractor shapes using level-scaled polygon vertex perturbation.
- Render candidate choices A and B at exact 1:1 native canvas dimensions (400x400) to eliminate mental rescaling bias.
- Support 1 and 2 keyboard shortcuts for rapid intuitive decision making.
- Add shrinkWidth CSS keyframe animation for smooth progress indicator.
~~~~~

### 下一步建议
- **性能与构建检查**：可运行 `npm run check` 或 `npm run build` 进行全量代码格式化与 TypeScript 类型验证。
- **扩展诊断**：后续可考虑在全局弱点分析（Weakness Analytics）中增加形态记忆维度的专项统计面板。
