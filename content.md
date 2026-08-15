根据 ACA 协议及 Quipu 任务运行规范，在代码修改完成且功能验证无误后，我们需要创建一个独立的 Git 提交计划（`[COMMIT]` 状态），将本次色感训练滑块容错可视化及环形卷叠等优化成果固化到 Git 版本库中。

下面我将生成该提交计划。

---

## [COMMIT] feat(color): 实现色相模式滑块容错感应区可视化及环形卷叠优化

### 错误分析

> 本次操作为用户主动请求的 Git 提交阶段，无错误修复背景，跳过错误分析。

### 用户需求
将近期对色感识别模块所做的所有 UI 与逻辑优化（包括 `UserSettings` 配置扩展、`getToleranceSpan` 算法、无遮挡纯透明卡尺边界线、色相环形卷叠处理以及移除过渡插值拉丝现象）提交到 Git 版本库中。

### 评论
本次迭代将色感训练的交互体验提升到了一个新高度。通过引入 OKLab 感知色差动态容错卡尺线，并针对色相环拓扑特性实现了无过渡延迟的环形卷叠，使FormSight 的色彩感知微调训练变得更加科学、直观且流畅。

### 目标
1. 将 `src/utils/settings.ts`、`src/utils/colorUtils.ts`、`src/components/ColorCanvas.tsx`、`src/views/ColorTrainingView.tsx` 与 `src/components/SettingsModal.tsx` 的变更添加至 Git 暂存区。
2. 创建符合 Conventional Commits 规范的 Git Commit。

### 基本原理
按照 ACA 协议及 Quipu 任务运行规范，文件系统变更与 Git 提交操作必须严格互斥。在确保代码变更独立且完整的前提下，通过独立的 `[COMMIT]` 计划将工作成果持久化至 Git 历史版本中。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #concept/state #scope/core #scope/ux #ai/instruct #task/domain/color-recognition #task/object/slider-tolerance-visualization #task/action/refactor #task/state/end

---

### Script

#### Acts 1: 添加文件至暂存区

~~~~~act
git_add
src/utils/settings.ts
src/utils/colorUtils.ts
src/components/ColorCanvas.tsx
src/views/ColorTrainingView.tsx
src/components/SettingsModal.tsx
~~~~~

#### Acts 2: 提交更改

~~~~~act
git_commit
~~~~~
~~~~~text
feat(color): implement slider tolerance visualization and hue ring wrap-around

- Added 'showToleranceBand' setting to UserSettings and SettingsModal for toggling tolerance visualization.
- Implemented 'getToleranceSpan' in colorUtils to compute level-based perceptual Delta E span on sliders.
- Refactored ColorCanvas to render precise 2px caliper boundary lines (with transparent background) and 4px refined answer markers, avoiding color obstruction.
- Added hue wrap-around logic for the tolerance caliper lines when approaching 0°/360° boundaries.
- Removed CSS transition-all from caliper lines to eliminate interpolation sliding/lag artifacts across track boundaries.
~~~~~

### 下一步建议
- **构建校验**: 执行 `npm run build` 确保 TypeScript 编译通过。
- **单元测试**: 执行 `npm run test` 确保所有测试用例绿灯通过。
