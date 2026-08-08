好的，现在我们已经完成了“为色感识别模块添加偏好设置”以及“删除所有卡片右上角的英文标签”两个功能，并且所有的修改已经通过本地验证。

现在是时候将这些改进作为一个完整的逻辑单元提交了。

我将生成一个 `[COMMIT]` 计划，包含 `git add` 和 `git commit` 指令。

## ## [COMMIT] feat(ui): 为色感识别添加偏好设置并清理卡片右上角英文标签

### 用户需求

用户确认之前的修改无误，并要求创建 Git 提交。

### 评论

这是一个逻辑完整的版本迭代。它不仅补齐了色感识别模块的偏好设置与自适应算子调度，还精简了所有训练卡片的顶栏视觉。通过生成标准的 Commit 记录，确保版本演进清晰、可追溯。

### 目标

1. 将变动文件加入 Git 暂存区。
2. 生成符合 Conventional Commits 规范的结构化提交信息。

### 基本原理

遵循 ACA 运行时与 Git 提交规范，将变动安全地固化在代码版本库中。

### 标签

#intent/build #flow/ready #priority/high #comp/cli #comp/ui #scope/dx #ai/instruct #task/domain/ui #task/object/git-commit #task/action/integration #task/state/end

---

### Script

#### Acts 1: 添加变动文件并创建 Git 提交

~~~~~act
git_add
src/components/SettingsModal.tsx
src/views/ColorDashboard.tsx
src/views/Dashboard.tsx
src/app.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(ui): add color recognition preferences & clean card headers

- Add `appContext` support to `SettingsModal` so that Color Training can access Auto-Next and Adaptive Engine preferences.
- Add preference settings button to `ColorDashboard` header.
- Remove English subtitle badges (e.g. "Hue Sensing", "Single Anchor") from all training mode cards in both ColorDashboard and StarHopping Dashboard for a cleaner visual style.
~~~~~

### 下一步建议

- **版本发布**: 可以运行 `npm run build` 进行生产构建检查，或直接部署到线上环境。
