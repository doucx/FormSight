我将为你创建一个描述清晰的 Git Commit，将本次针对界面排版和视觉精简的所有优化提交到代码库。

## [COMMIT] refactor(ui): 优化主页网格布局与相对色感训练界面视觉细节

### 用户需求

用户提出创建 Git Commit，以保存本次关于 UI 排版与布局的改进。

### 评论

本次更新包括：
1. 主页卡片网格布局优化，移除相对色感卡片独占整行的样式，与其他模块统一卡片列宽度。
2. 精简相对色感看板中的干扰性文本，并放大展示色块，使其更清晰易辨。
3. 优化答案揭晓时的真理色彩对比展示，改为无缝上下半区分割。
4. 移除“下一题”底栏不必要的全宽框体，消除多余空白。

### 目标
执行 `git_add` 和 `git_commit` 提交所有更改。

### 基本原理
按照规范，`[COMMIT]` 计划只包含 Git 相关的命令（`git_add` 和 `git_commit`），用于将前面已经修改完成并验证好的改动提交到版本库中。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/ui-refinement #task/action/git-commit #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交变更

~~~~~act
git_add
src/views/Home.tsx
src/views/TrainingView.tsx
src/views/ColorTrainingView.tsx
src/views/RelativeColorTrainingView.tsx
src/components/RelativeColorCanvas.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(ui): refine home layout and relative color perception canvas

- Update Home view grid layout so Relative Color module card takes standard single-column width instead of spanning 2 columns.
- Remove redundant/distracting text labels and indicators in RelativeColorCanvas.
- Increase color block dimensions in RelativeColorCanvas for enhanced visual clarity.
- Refine color comparison display upon answer reveal: split target color block directly into seamless top (user) and bottom (truth) halves without white gap.
- Remove full-width card wrapper from 'Next Question' button bar across all training views to eliminate excessive whitespace.
~~~~~

### 下一步建议
- 所有 UI 改进与提交均已完成。你可以直接启动 `npm run dev` 体验全新的简约排版效果，或运行 `npm test` 确认代码测试通过。
