问题的确定位到了！在 `ColorDashboard.tsx` 中，组件入参接口 `ColorDashboardProps` 包含了 `onOpenAnalytics`，但在组件函数头的参数解构中漏掉掉了 `onOpenAnalytics`，导致点击按钮触发 `onClick={onOpenAnalytics}` 时抛出 `ReferenceError: onOpenAnalytics is not defined`。

我将立即修复 `ColorDashboard.tsx` 中组件参数解构的问题。

## [WIP] fix(color): 修复 ColorDashboard 组件解构参数中缺失 onOpenAnalytics 的问题

### 错误分析
在 `src/views/ColorDashboard.tsx` 的 `ColorDashboardProps` 接口定义中，包含了新增的 `onOpenAnalytics: () => void` 属性；但在定义 `function ColorDashboard({ ... })` 时，未能从 `props` 对象中解构出 `onOpenAnalytics`。

这导致运行时中函数作用域内不存在 `onOpenAnalytics` 变量，点击“弱点分析”按钮时抛出 `ReferenceError: onOpenAnalytics is not defined`。

### 用户需求
在 `ColorDashboard` 的参数解构列表中补全 `onOpenAnalytics`，以便成功触发 `app.tsx` 中注册的 `setIsColorAnalyticsOpen(true)` 回调。

### 评论
这是一个简单的解构缺失错误，补全后“色感弱点分析”弹窗即可顺畅打开。

### 目标
修复 `src/views/ColorDashboard.tsx`，在 `ColorDashboard` 函数参数解构中增加 `onOpenAnalytics`。

### 基本原理
补全组件 Props 的解构语法，确保变量与点击事件句柄绑定正常。

### 标签
#intent/fix #flow/ready #priority/critical #comp/ui #scope/ux #ai/instruct #task/domain/color-training #task/object/dashboard-component #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 `ColorDashboard.tsx` 中的参数解构

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~typescript
export function ColorDashboard({
  profiles,
  onStart,
  onBackToHome,
  onOpenSettings,
}: ColorDashboardProps) {
~~~~~
~~~~~typescript
export function ColorDashboard({
  profiles,
  onStart,
  onBackToHome,
  onOpenSettings,
  onOpenAnalytics,
}: ColorDashboardProps) {
~~~~~

### 下一步建议
修复后在浏览器中重新点击 **色感训练看板 $\rightarrow$ 弱点分析** 按钮，验证 12 色相环弱点分析弹窗（`ColorAnalyticsModal`）是否能正常弹出与展现图表。
