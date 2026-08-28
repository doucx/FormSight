已定位问题。代码分析与 Lint 规则要求：当为非原生按钮元素（如绑定了 `onClick` 的 `div`）添加鼠标点击事件时，必须同时配对键盘事件（如 `onKeyDown`），以确保无障碍访问（a11y）和纯键盘用户的可用性。

## [WIP] fix(accessibility): 为 ModeCard 添加 onKeyDown 键盘事件以满足 a11y 规范

### 错误分析

Linter（如 Biome / ESLint a11y 规则）检测到 `src/components/common/ModeCard.tsx` 中具有点击事件的卡片容器 `div`（`onClick={handleCardClick}`）缺少键盘事件监听器（`onKeyDown` / `onKeyUp`），违反了可访问性规范。键盘导航用户无法通过回车键或空格键触发卡片点击动作。

### 用户需求

修复 `ModeCard.tsx` 中缺少键盘事件处理的问题，使卡片在支持鼠标点击的同时也支持键盘交互（`Enter` 或 `Space` 键），消除 Linter 报错。

### 评论

这是一个标准的 Web 无障碍（a11y）与用户体验（UX）改进。为交互式卡片补充键盘支持，不仅能满足自动化静态检查规则，还能提升全键盘用户的操作体验。

### 目标

1. 在 `ModeCard.tsx` 的卡片根元素 `div` 上添加 `onKeyDown` 处理函数。
2. 响应 `Enter` 和 `Space`（空格）按键，触发默认动作（`handleCardClick`），并阻止空格键默认的页面滚动行为。

### 基本原理

在卡片根节点上绑定 `onKeyDown` 事件处理器，当用户在卡片聚焦时按下 `Enter` 或 ` ` (Space) 时，执行 `e.preventDefault()` 阻止默认滚动并调用 `handleCardClick()`，使其行为与鼠标 `onClick` 保持一致，从而消除无障碍检查警告。

### 标签

#intent/fix #flow/ready #priority/medium #comp/common #concept/ui #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/mode-card #task/action/accessibility-fix #task/state/begin

---

### Script

#### Acts 1: 为 ModeCard 根容器添加 onKeyDown 处理

~~~~~act
patch_file
src/components/common/ModeCard.tsx
~~~~~
~~~~~typescript
  return (
    <div
      role="presentation"
      onClick={handleCardClick}
      className="group bg-white border border-slate-200/90 hover:border-indigo-500 rounded-3xl p-6 shadow-xs hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative cursor-pointer select-none"
    >
~~~~~
~~~~~typescript
  return (
    <div
      role="presentation"
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className="group bg-white border border-slate-200/90 hover:border-indigo-500 rounded-3xl p-6 shadow-xs hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative cursor-pointer select-none"
    >
~~~~~

### 下一步建议

- 运行 linter 或类型检查（如 `npm run check` 或 `npx biome check`）验证是否还有其他组件存在类似的 a11y 告警。
- 确认验证通过后，可生成独立的 `[COMMIT]` 计划以提交变更。
