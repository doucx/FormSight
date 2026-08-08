## [COMMIT] chore(build): 建立版本号 SSOT 机制并动态注入 UI

### 错误分析
> 本次任务为标准的构建流程优化及版本治理，不涉及错误修复，直接进行版本控制提交。

### 用户需求
用户要求对前面实施的版本号 SSOT 机制变更创建 Git 提交。

### 评论
将版本号的维护收敛到 `package.json` 并通过构建工具注入前端是一个经典的工程化提效方案。当前各项文件修改已完成且结构清晰，非常适合作为独立的逻辑单元进行提交。

### 目标
1. 将修改后的 `package.json`、`vite.config.ts`、`src/vite-env.d.ts` 以及 `src/views/Home.tsx` 添加到 Git 暂存区。
2. 按照 Conventional Commits 规范，创建内容规范详尽的 Git 提交。

### 基本原理
按照 ACA 协议规范，文件系统变更与 Git 提交操作必须在不同的计划（Plan）中隔离执行。本计划作为独立的 `[COMMIT]` 计划，将纯粹执行 `git_add` 和 `git_commit` 动作。

### 标签
#intent/tooling #flow/ready #priority/medium #comp/build #concept/config #scope/dx #ai/instruct #task/domain/config #task/object/version-ssot #task/action/implementation #task/state/end

---

### Script

#### Acts 1: 将变更加入 Git 暂存区并创建提交

~~~~~act
git_add
package.json
vite.config.ts
src/vite-env.d.ts
src/views/Home.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
chore(build): establish app version SSOT and inject via Vite define

- Set package.json version ("0.2.0") as the Single Source of Truth (SSOT) for the app version.
- Configured vite.config.ts to inject packageJson.version into the global compile-time constant `__APP_VERSION__`.
- Added global TypeScript ambient declaration for `__APP_VERSION__` in src/vite-env.d.ts.
- Replaced hardcoded version string in src/views/Home.tsx with dynamic `v{__APP_VERSION__}`.
~~~~~

### 下一步建议
- **执行构建验证**: 建议执行 `npm run build` 确保生产环境打包过程顺利，并检查产物中版本号是否正确渲染。
