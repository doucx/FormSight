好的，既然你明确要求创建提交，我们将把之前的改动作为一个完整的逻辑单元提交到 Git 仓库中。

按照 D3 协议的约束，Git 提交操作 (`git_add`, `git_commit`) 必须独立于任何文件修改操作，并且只能在 `[COMMIT]` 计划中执行。

## [COMMIT] feat(settings): 支持自定义网格大小与清空本地数据功能

### 用户需求
将“自定义网格大小（2x2~5x5，默认3x3）”以及“清空所有本地存储的训练会话、记录与能力看板”这两项已开发并验证完毕的新功能作为完整的逻辑单元进行 Git 提交。

### 评论
该改动不仅丰富了寻星练习（Star-Hopping）的参数自定义能力，还完善了用户的数据自主管理体验。代码已经过结构完整性验证。

### 目标
1. 将所有相关修改添加到 Git 暂存区。
2. 创建内容详尽的 Conventional Commits 规范提交。

### 基本原理
通过隔离的 `[COMMIT]` 计划执行 Git 暂存与提交，确保版本历史清晰且可追溯。

### 标签
#intent/build #flow/ready #priority/high #comp/ui #concept/config #scope/dx #ai/instruct #task/domain/settings #task/object/git-commit #task/action/version-control #task/state/end

---

### Script

#### Acts 1: 添加变动文件到暂存区

将本次开发涉及的所有修改过或新增的文件加入 Git 暂存区。

~~~~~act
git_add
src/utils/settings.ts
src/utils/db.ts
src/utils/geometry.ts
src/components/SettingsModal.tsx
src/views/TrainingView.tsx
src/app.tsx
~~~~~

#### Acts 2: 提交代码变更

执行 Git 提交，记录详细的变更说明。

~~~~~act
git_commit
~~~~~
~~~~~text
feat(settings): support custom grid size and local data cleanup

- Add 'gridSize' setting (2x2, 3x3, 4x4, 5x5, default 3x3) to UserSettings and default config.
- Refactor polar and bipolar grid generators in geometry.ts to fully support dynamic grid dimensions (gridDim).
- Add clearAllData() API in db.ts backed by IndexedDB transactions to clear sessions, records, and user profiles atomically.
- Integrate grid size option and a data deletion zone with confirmation prompt into SettingsModal.tsx.
- Wire TrainingView and App to dynamically respect gridSize and refresh profiles upon data reset.
~~~~~

### 下一步建议
- **打包构建**: 可以在终端运行 `npm run build` 确保生产环境 TypeScript 编译与 Vite 打包通过。
- **发布预览**: 运行 `npm run preview` 启动本地预览服务器，完整体验各项新功能。
