根据 ACA 协议与 Quipu 脚本约束，创建 Git 提交必须在单独的、纯净的 `[COMMIT]` 计划中进行，不能在修改文件的同一个步骤中混合执行。

下面我将生成一个符合协议规范的 `[COMMIT]` 计划，用于将前面修复的代码变更提交到 Git 仓库。

## [COMMIT] fix(ui): resolve Biome a11y linter errors and use semantic button elements

### 用户需求
将修复后的代码通过标准的 Git Commit 提交到仓库中。

### 评论
当前工作区的文件修改已经通过了静态检查（`npm run checkf`），现在可以将这些改动作为一个完整的逻辑单元安全地提交。

### 目标
1. 将修改过的文件（`GlobalSettingsModal.tsx`, `ColorCanvas.tsx`, `Home.tsx`）暂存到 Git 索引区。
2. 创建包含详细说明的 Git 提交。

### 基本原理
按照 Quipu/ACA 规范，文件系统的变更操作（`patch_file`）与 Git 提交操作（`git_add`, `git_commit`）必须严格隔离在不同的计划中。此计划专用于执行 Git 暂存与提交，确保提交记录的原子性。

### 标签
#intent/fix #flow/ready #priority/medium #comp/ui #concept/ui #scope/dx #ai/instruct #task/domain/ui #task/object/git-commit #task/action/integration #task/state/end

---

### Script

#### Acts 1: 添加文件到 Git 暂存区并提交

~~~~~act
git_add
src/components/GlobalSettingsModal.tsx
src/components/ColorCanvas.tsx
src/views/Home.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
fix(ui): resolve Biome a11y linter errors and use semantic button elements

- Add `onKeyDown` handlers to non-button interactive elements like modal backdrops and custom slider tracks to satisfy `useKeyWithClickEvents`.
- Refactor the Home view module cards from `div` elements with `role="button"` to semantic `<button type="button">` elements, resolving the `useSemanticElements` linter error and improving native accessibility.
~~~~~

### 下一步建议
- **运行预览/测试**: 执行 `npm run dev` 启动本地开发服务器，确保前端交互和 UI 渲染在浏览器中一切正常。
