根据 ACA / Quipu 协议的要求，文件修改和 Git 提交必须严格遵守**操作隔离原则**（即造成文件系统变更的指令与 Git 提交指令必须在不同的计划中执行）。

当前我们已经完成了前端色感靶向训练、色感 12 扇区弱点分析弹窗、构建报错修复以及弹窗背景点击退出的实现。现在进入最后的 **Git 提交计划**。

## [COMMIT] feat(color): 实现纯前端 12 色相弱点分析与靶向强化训练

### 用户需求
将近期实现的纯前端 12 色相弱点分析、靶向发题加权算法、构建错误修复及弹窗遮罩点击关闭交互统一提交到 Git 仓库中。

### 评论
本次迭代圆满完成了从 Python 离线数据分析到 Web 前端可视化盲点洞察与专项攻坚的闭环体验。

### 目标
1. 使用 `git_add` 将修改过的前端组件与工具文件添加至暂存区。
2. 使用 `git_commit` 创建规范的 Git 提交记录。

### 基本原理
遵循 Quipu 架构的“操作隔离”原则，文件系统变更与 Git 提交分离。在确保所有功能点落定且无 TS 编译错误后，通过 `[COMMIT]` 计划完成本次软件升级的版本沉淀。

### 标签
#intent/build #flow/ready #priority/high #comp/ui #scope/ux #ai/instruct #task/domain/color-training #task/object/git-commit #task/action/integration #task/state/end

---

### Script

#### Acts 1: 添加修改过的前端文件至 Git 暂存区

~~~~~act
git_add
src/utils/settings.ts
src/utils/colorUtils.ts
src/utils/db.ts
src/components/SettingsModal.tsx
src/components/ColorAnalyticsModal.tsx
src/components/AnalyticsModal.tsx
src/views/ColorDashboard.tsx
src/views/ColorTrainingView.tsx
src/views/TrainingView.tsx
src/app.tsx
~~~~~

#### Acts 2: 提交更改

~~~~~act
git_commit
~~~~~
~~~~~text
feat(color): Implement frontend hue weakness analysis and targeted training

- Added ColorAnalyticsModal for visualizing 12-sector hue accuracy rings and error metrics.
- Upgraded colorUtils and SettingsModal to support 12-sector manual and intelligent automatic targeting modes (70% weighted question generation).
- Updated exportAllData / importAllData in db.ts to correctly back up and restore color training records.
- Added backdrop click-to-dismiss behavior for analysis modals for improved UX.
- Resolved TypeScript compilation errors and unused variable warnings.
~~~~~

### 下一步建议
- 整个色感弱点分析与靶向训练闭环已成功合入版本库！你可以执行 `npm run dev` 运行或打包项目进行愉快的刷题训练。
