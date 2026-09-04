好的，我们已经完成了阻塞式初始化与主题防闪烁逻辑的改造。现在生成一个 `[COMMIT]` 计划，将修改添加到暂存区并创建规范的 Git 提交。

## [COMMIT] fix(theme): 实现阻塞式初始化与防闪烁加载

### 用户需求

将实现阻塞式初始化与首屏防闪烁、杜绝变色动画的全部代码修改正式提交到 Git 仓库。

### 评论

此次提交彻底消除了 SPA 在系统深色模式下打开浅色主题时的闪现与变色动画问题，提升了系统的首屏渲染确定性与视觉体验。

### 目标

1. 将涉及改动的 `index.html`、`src/main.tsx`、`src/hooks/useAppBootstrap.ts` 以及 `src/app.tsx` 添加到 Git 暂存区。
2. 创建符合 Conventional Commits 规范的语义化 Git 提交。

### 基本原理

通过 Git 提交将当前的修复作为一个完整的原子工作单元固化，标记本次主题初始化时序缺陷修复任务的正式结束。

### 标签

#intent/fix #flow/ready #priority/medium
#comp/runtime #concept/state #concept/ui #scope/ux
#ai/instruct
#task/domain/ui #task/object/bootstrap-theme #task/action/bug-fix #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交代码修改

将修改文件加入暂存区并提交。

~~~~~act
git_add
index.html
src/main.tsx
src/hooks/useAppBootstrap.ts
src/app.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
fix(theme): implement blocking bootstrap and eliminate initial theme flicker

- Inject synchronous anti-flicker script in index.html head to set html dark class and color-scheme from cache before DOM parsing.
- Remove hardcoded bg-gray-50 from index.html body.
- Refactor main.tsx bootstrap to block on initSettingsStore, initPlanStore, and refreshAppData before rendering Preact App.
- Remove redundant deferred store initialization from useAppBootstrap useEffect.
- Remove transition-colors duration-200 from app root container to prevent color shift animations on page load.
~~~~~

### 下一步建议

- **跨浏览器验证**：在不同内核浏览器（如 Chromium、WebKit / Safari、Firefox）及移动端 PWA 环境中验证系统深色/浅色模式切换与首屏刷新效果。
- **系统级测试**：可运行项目自动化测试套件（如 `npm run test`）确保各模块单元测试与集成测试通过。
