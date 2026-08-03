## [COMMIT] fix(ui): 修复 Tailwind 指令语法并升级主页与训练区 UI 样式

### 错误分析

无（本阶段为确认无误后的提交操作）。

### 用户需求

用户确认之前的修复与 UI 优化方案，并指示“创建提交”。

### 评论

我们已经成功修复了 `index.css` 中 Tailwind 的编译指令、纠正了 `StarCanvas` 的横向响应式布局，并通过 `lucide-preact` 图标和高颜值渐变圆角卡片对主页及训练视图进行了全方位的 UI 升级。现在创建 Git 提交。

### 目标

1. 将所有修改后的文件添加到 Git 暂存区。
2. 生成符合 Conventional Commits 规范的 Git Commit。

### 基本原理

通过标准的 `git add` 和 `git commit` 操作，将历时修改打包为一次高质量的代码变更提交。

### 标签

#intent/tooling #flow/ready #priority/high #comp/ui #scope/ux #ai/instruct #task/domain/ui #task/object/git-commit #task/action/git-commit #task/state/end

---

### Script

#### Acts 1: 添加文件到暂存区并进行 Git 提交

~~~~~act
git_add
src/index.css
src/components/StarCanvas.tsx
src/views/Dashboard.tsx
src/views/TrainingView.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
fix(ui): fix Tailwind directive syntax and upgrade dashboard & training UI

- Fixed '@tailwindcss' to '@tailwind' in src/index.css to properly enable Tailwind CSS v3 compilation.
- Adjusted StarCanvas flex layout breakpoints to ensure reference and interactive canvases are side-by-side (left-to-right) on desktop screens.
- Refactored Dashboard and TrainingView with lucide-preact icons, refined cards, gradients, and modern shadow styling for an enhanced spatial training UX.
~~~~~

### 下一步建议

- 启动开发服务器（`npm run dev`）或构建生产版本（`npm run build`）以验证最终效果。
