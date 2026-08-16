## [COMMIT] fix(session): 统一 Esc 键退出行为并修复 Hook 初始化与导出问题

### 用户需求
将本次对“训练界面按 `Esc` 键退出行为与退出按钮保持一致（弹出结算弹窗）”的修复，以及伴随的 Hook 初始化作用域和模块导出问题修复，打包提交至 Git 仓库。

### 评论
此提交彻底解决了用户反馈的按 `Esc` 键直接退出而不弹出结算总结窗口的体验缺陷，同时完善了 `useTrainingSession` Hook 的依赖规范与转译兼容性。

### 目标
1. 将 `src/hooks/useTrainingSession.ts` 添加至 Git 暂存区。
2. 创建内容详尽的 Git Commit。

### 基本原理
按照 Conventional Commits 规范，以清晰的语义记录本次 Bug 修复的内容与背景，保持版本历史清晰可追踪。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/executor #scope/core #ai/instruct #task/domain/ui #task/object/training-session-esc-handler #task/action/implementation #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交代码修改

~~~~~act
git_add
src/hooks/useTrainingSession.ts
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
fix(session): align Esc exit behavior with exit button and fix hook initialization

- Updated the 'Escape' key event listener in `useTrainingSession` to invoke `handleRequestFinish` instead of `handleFinishSession`. This ensures pressing Esc correctly triggers the training summary modal when there are active trial records, perfectly matching the behavior of the "Exit Training" UI button.
- Refactored all internal handlers in `useTrainingSession` to be consistently wrapped with `useCallback` and structured with exhaustive dependencies, resolving both Temporal Dead Zone (TDZ) initialization errors and Vite/esbuild ESModule export resolution issues.
- Verified that all linter checks and training views load and operate without errors.
~~~~~

### 下一步建议
- 提交已完成！您可以继续进行其他功能开发或运行 `npm run test` 执行全套单元测试。
