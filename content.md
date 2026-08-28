我将修复 `src/app.tsx` 中由于移除分析模态框状态后遗留的变量引用问题。

## [WIP] fix: 移除 app.tsx 中残留的 activeAnalyticsCard 引用

### 错误分析
在将 `WeaknessAnalyticsModal` 改造为独立页面并删除 `activeAnalyticsCardId` 状态定义后，`src/app.tsx` 中仍残留了一行 `const activeAnalyticsCard = activeAnalyticsCardId ? registry.getCardById(...) : null;` 计算属性，导致应用在实例化渲染时抛出 `Uncaught ReferenceError: activeAnalyticsCardId is not defined`。

### 用户需求
修复应用启动时的 JavaScript 运行时引用错误，恢复页面正常挂载与路由跳转。

### 评论
这是一个在重构清理无用状态时未完全剔除衍生变量导致的引用错误。移除无用的变量声明即可彻底解决。

### 目标
清理 `src/app.tsx` 中多余的 `activeAnalyticsCard` 变量计算。

### 基本原理
直接删除 `src/app.tsx` 中对已废弃的 `activeAnalyticsCardId` 的三元表达式读取。

### 标签
#intent/fix #flow/ready #priority/critical #comp/cli #concept/ui #scope/core #ai/instruct #task/domain/ui #task/object/app-root #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 清理 app.tsx 中未定义的变量引用

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
  const activeSettingsCard = activeSettingsCardId
    ? registry.getCardById(activeSettingsCardId)
    : null;
  const activeAnalyticsCard = activeAnalyticsCardId
    ? registry.getCardById(activeAnalyticsCardId)
    : null;

  return (
~~~~~
~~~~~typescript
  const activeSettingsCard = activeSettingsCardId
    ? registry.getCardById(activeSettingsCardId)
    : null;

  return (
~~~~~

### 下一步建议
1. 刷新页面，确认控制台错误消失，主页与 `#/analytics/:cardId` 路由均能正常渲染与交互。
