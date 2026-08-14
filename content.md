根据您的要求，我们需要将当前所有修改（包括 `.gitignore` 更新、`src/utils/db.ts` 的导出修复、以及新引入的 `analysis/` 目录与脚本）提交到 Git 仓库中。

根据 ACA / Quipu 协议的要求：
1. **操作隔离约束**：任何造成文件系统变更的指令 (`write_file`, `patch_file`, 等) **必须**与 Git 提交相关指令 (`git_add`, `git_commit`) 在**不同的计划 (plan)** 中执行。
2. 前面几个步骤中我们已经完成了文件系统的变更（编写了 Python 脚本、修改了 `db.ts` 并更新了 `.gitignore`），因此当前是一个纯粹的 **Git 提交计划**，必须使用 `[COMMIT]` 状态标记。

以下是提交计划：

## [COMMIT] feat(analysis): 添加 Python 数据分析工具链并修复数据库全量导出

### 用户需求
将之前创建的 Python 数据分析脚本 (`analysis/`)、修复后的数据库全量导出函数 (`src/utils/db.ts`) 以及更新后的 `.gitignore` 规则统一提交到 Git 仓库中。

### 评论
这次提交完善了项目的离线数据分析能力，使得色彩感知训练数据能够被完整导出并使用随机森林模型进行特征重要性归因。

### 目标
1. 使用 `git_add` 将修改过和新增的文件（`.gitignore`, `src/utils/db.ts`, `analysis/`）添加至暂存区。
2. 使用 `git_commit` 创建规范的 Git 提交记录。

### 基本原理
遵循 Quipu 架构的“操作隔离”原则，文件系统变更与 Git 提交分离。在确保所有文件变动已落地且测试通过后，通过 `[COMMIT]` 计划完成版本沉淀。

### 标签
#intent/build #flow/ready #priority/medium #comp/build #scope/dx #ai/instruct #task/domain/analytics #task/object/git-commit #task/action/integration #task/state/end

---

### Script

#### Acts 1: 添加文件至 Git 暂存区

~~~~~act
git_add
.gitignore
src/utils/db.ts
analysis/analyze_color.py
analysis/requirements.txt
analysis/README.md
~~~~~

#### Acts 2: 提交更改

~~~~~act
git_commit
~~~~~
~~~~~text
feat(analysis): Add python data analysis pipeline and fix db export bug

- Added 'analysis/' folder with Python script (analyze_color.py), requirements.txt, and README.md for Hue accuracy binning and Random Forest feature importance analysis.
- Fixed 'exportAllData' and 'importAllData' in src/utils/db.ts to correctly include color training tables (color_sessions, color_records, color_profiles).
- Updated .gitignore to exclude Python cache, virtual environments, and local data export files.
~~~~~

### 下一步建议
- 运行 `python analysis/analyze_color.py` 验证完整的离线分析流程。
- 如果需要，后续可以在前端开发 `ColorAnalyticsModal.tsx` 以在网页中直观展示色相正确率曲线。
