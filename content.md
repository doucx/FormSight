好的！我们将本次重构、UI 改进与 Bug 修复打包为一个完整的 Git 提交。

下面为您生成 `[COMMIT]` 计划：

## [COMMIT] refactor(color): 优化综合拾色模式交互体验、UI 统一与 Bug 修复

### 用户需求
用户要求创建 Git 提交，持久化记录本次对色彩训练模块交互、样式统一、偏好设置以及若干 Bug 修复的最终成果。

### 评论
本次工作彻底解决了 `ColorCanvas` 组件上帝化带来的状态越权问题，优化了导出文件名的时间精度，统一了拾色游标外观，完善了综合拾色（ALL）模式下的拖拽与悬停体验，并修复了临界边界 Bug，整体代码与交互质量得到了提升。

### 目标
1. 暂存所有已修改的相关源文件。
2. 创建内容结构详尽的 Git Commit 记录。

### 基本原理
按照 ACA 规范与 Quipu 操作隔离公理，`[COMMIT]` 计划仅包含 `git_add` 和 `git_commit` 指令，保证代码仓库变动的安全与原子性。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/color-recognition #task/object/git-commit #task/action/commit-changes #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交代码更改

~~~~~act
git_add
src/components/ColorCanvas.tsx
src/components/GlobalSettingsModal.tsx
src/components/SettingsModal.tsx
src/utils/colorUtils.ts
src/utils/oklchUtils.ts
src/utils/settings.ts
src/utils/__tests__/colorUtils.test.ts
src/views/ColorTrainingView.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(color): 优化综合拾色模式交互体验、UI 统一与 Bug 修复

- 解耦 ColorCanvas 为 SingleDimensionSlider 与 AllMatchSlider 两个专用子组件。
- 修复单维度模式下答案数值提前泄露以及非活跃轨道异常可拖拽的问题。
- 统一滑块游标为无外边框的双像素纯黑竖条（w-0.5 h-8 bg-slate-900）。
- 为综合拾色（ALL）模式增加 OKLab ΔE 动态容错区间、鼠标悬停准心及拖拽实时颜色预览联动。
- 增加“综合拾色悬停颜色实时联动”偏好设置开关。
- 修复 360° 色相界限色彩退化为纯黑的 Bug。
- 修复 ALL 模式按 Space 键无法自动提交答案的问题。
- 优化导出 JSON 备份文件名为 formsight_data_YYYY-MM-DD_HH-mm-ss.json。
~~~~~

### 下一步建议
- **打包部署测试**: 随时可以运行 `npm run build` 和 `npm run preview` 验证生产打包结果。
- **扩展建议**: 后续可以考虑在“分析”模块中为综合拾色（Match）增加三维 OKLab 色差散点图。
