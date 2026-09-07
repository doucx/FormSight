`TrainingShell` 组件的属性签名中声明了 `currentQuestion?: unknown`，但是在组件函数形参列表中解构时遗漏了解构该参数，导致在 Inspector 面板中序列化时触发了 `ReferenceError: currentQuestion is not defined`。

我将立即修复此解构问题。

## [WIP] fix(training): 修复 TrainingShell 中 currentQuestion 未解构引起的引用错误

### 错误分析
在 `TrainingShell.tsx` 中扩展 `TrainingShellProps` 时引入了 `currentQuestion?: unknown`，但在 `export function TrainingShell({ ... })` 的实参解构列表中未包含 `currentQuestion`，导致在渲染 Inspector 预格式化代码块 `{JSON.stringify(currentQuestion ?? null, null, 2)}` 时抛出 `ReferenceError: currentQuestion is not defined`。

### 用户需求
修复沙盒模式打开或渲染时抛出的 `currentQuestion is not defined` 运行时错误。

### 评论
该问题阻断了沙盒模式的初始化与 Inspector 面板渲染，属于高优先级 Bug 修复。

### 目标
在 `TrainingShell` 函数参数解构列表中补全 `currentQuestion`，确保 Inspector 抽屉能正确获取当前题目并序列化展示。

### 基本原理
将父组件 `GenericTrainingView` 传入的 `currentQuestion` 属性通过形参解构绑定至函数作用域，使 `currentQuestion ?? null` 能正常访问，消除未定义标识符引用异常。

### 标签
#intent/fix #flow/ready #priority/critical #comp/runtime #concept/ui #scope/core #ai/instruct #task/domain/runtime #task/object/training-shell #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 在 `TrainingShell` 解构参数中补齐 `currentQuestion`

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
export function TrainingShell({
  card,
  sessionType,
  currentLevel,
  autoNext,
  session,
  planContext,
  showExitButton = true,
  showTimer = true,
  children,
}: TrainingShellProps) {
~~~~~
~~~~~typescript
export function TrainingShell({
  card,
  sessionType,
  currentLevel,
  autoNext,
  session,
  currentQuestion,
  planContext,
  showExitButton = true,
  showTimer = true,
  children,
}: TrainingShellProps) {
~~~~~

---

### 下一步建议
可在沙盒模式（例如进入任意卡片并在设置弹窗点击“进入沙盒模式”）下按下快捷键 `I` 或点击顶部 `<Code />` 图标，验证 Inspector 抽屉是否能够正常渲染并实时展示当前卡片生成的参数 JSON。
