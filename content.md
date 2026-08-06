已接收到您的请求。根据规则，文件系统变更与 Git 提交指令必须在不同的计划（Plan）中执行。由于上一步的修改已完成，现在我们创建一个独立的 `[COMMIT]` 计划来完成 Git 提交。

## [COMMIT] chore(ui): 清理 UI 中残留的 px 文本并完善层阶表述

### 用户需求
将之前对 UI 中 `px` 文本清理及层阶表述完善的改动进行一次完整的 Git 提交，以便将变更持久化到仓库中。

### 评论
该改动属于纯粹的界面文案润色与统一，不影响任何底层核心逻辑。将其作为一个独立的提交记录，可以保持 Git 提交历史的清晰。

### 目标
1. 将修改的文件（`SettingsModal.tsx`, `AnalyticsModal.tsx`, `settings.ts`）添加到暂存区。
2. 创建符合 Conventional Commits 规范的 Git 提交。

### 基本原理
按照 ACA 协议与 Quipu 脚本约束，文件修改与 Git 提交必须在不同的计划中隔离执行，确保每一步的稳定性。

### 标签
#intent/tooling #flow/ready #priority/low #comp/ui #concept/ui #scope/dx #ai/instruct #task/domain/ui #task/object/level-step-granularity #task/action/refactor #task/state/end

---

### Script

#### Acts 1: 添加修改到暂存区并进行 Git 提交

~~~~~act
git_add
src/components/SettingsModal.tsx
src/components/AnalyticsModal.tsx
src/utils/settings.ts
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
chore(ui): cleanup residual px text and refine step granularity descriptions

Replaced explicit 'px' references in UI labels, diagnostics metrics, and canvas coordinate rings with cleaner, level-aligned terminology (e.g. updating '标准阶梯 (5px梯度)' to '标准阶梯 (12级)'). This aligns the interface better with the adaptive level-based architecture.
~~~~~

### 下一步建议
- **回归验证**: 可以运行 `pnpm build` 或 `pnpm check` 确认代码完整性与类型检查通过。
- **功能体验**: 启动 `pnpm dev` 并在浏览器中亲自检查各个弹窗的文字展示。
