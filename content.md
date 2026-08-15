根据 ACA 协议及 Quipu 任务运行规范，在文件系统修改和单元测试验证完成后，我们需要创建一个独立的 Git 提交计划（`[COMMIT]` 状态），将本次基于 OKLCH 均匀色彩空间的色感难度优化成果固化到版本库中。

下面我将生成该提交计划。

---

## [COMMIT] feat(color): 基于 OKLCH 均匀色彩空间实现感知色差判定与题目生成优化

### 错误分析

> 本次操作为用户主动请求的 Git 提交阶段，无错误修复背景，跳过错误分析。

### 用户需求
将用户修改后的代码（包含 `oklchUtils.ts` 均匀色彩空间模块、重构后的 `colorUtils.ts` 判定逻辑以及更新后的 `colorUtils.test.ts` 单元测试）提交到 Git 版本库中。

### 评论
该变更从根本上解决了 FormSight 色感训练在低饱和与低明度区域因 HSV 空间非线性导致的难度倾斜问题。通过引入 OKLab 感知色差（$\Delta E_{OK}$）与彩度过滤机制，确保了不同色彩参数在同一 Level 下人眼视觉主观难度的绝对均衡。

### 目标
1. 将 `src/utils/oklchUtils.ts`、`src/utils/colorUtils.ts` 与 `src/utils/__tests__/colorUtils.test.ts` 的变更添加至 Git 暂存区。
2. 创建符合 Conventional Commits 规范的 Git Commit。

### 基本原理
按照 ACA 协议及 Quipu 任务运行规范，文件系统变更与 Git 提交操作必须严格互斥。在确保代码变更独立且完整的前提下，通过独立的 `[COMMIT]` 计划将工作成果持久化至 Git 历史版本中。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #concept/state #scope/core #scope/ux #ai/instruct #task/domain/color-recognition #task/object/perceptual-uniformity-oklch #task/action/refactor #task/state/end

---

### Script

#### Acts 1: 添加文件至暂存区

~~~~~act
git_add
src/utils/oklchUtils.ts
src/utils/colorUtils.ts
src/utils/__tests__/colorUtils.test.ts
~~~~~

#### Acts 2: 提交更改

~~~~~act
git_commit
~~~~~
~~~~~text
feat(color): implement perceptual-uniform color difficulty & hit detection via OKLCH

- Added 'src/utils/oklchUtils.ts' providing HSV to OKLab/OKLCH conversions, Euclidean color difference (ΔE_OK) calculation, and level-to-threshold mapping functions.
- Refactored 'src/utils/colorUtils.ts' to replace absolute HSV angle/percentage tolerances with perception-based ΔE_OK evaluation in 'checkColorHit'.
- Optimized 'generateColorQuestion' with OKLab Chroma observability filters, preventing the generation of imperceptible/dead color questions in low saturation/value areas.
- Updated 'src/utils/__tests__/colorUtils.test.ts' with comprehensive unit tests for OKLab conversion, perceptual tolerance scaling, and dynamic hit detection.
~~~~~

### 下一步建议
- **构建验证**: 执行 `npm run build` 确保 TypeScript 编译全部通过。
- **运行测试**: 执行 `npm run test` 确保所有色彩感知单元测试绿灯通过。
