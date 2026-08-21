修复剩余的 3 个 `userAnswer` 未使用参数导致的 TypeScript 编译错误。

## [WIP] fix(components): 彻底移除剩余 3 个组件中的未引用 `userAnswer` 参数

### 错误分析

虽然在上一个计划中将 `userAnswer` 改为了可选属性（`userAnswer?: ...`），但在 Preact/TypeScript 组件函数体中，如果该参数在解构时被显式声明但未在组件内部使用，仍然会被 TypeScript 的 `noUnusedParameters` 规则报错 (TS6133)。

### 用户需求

彻底从组件参数解构中移除 `userAnswer`，彻底解决剩余的 3 个 TS6133 编译错误。

### 评论

清除组件入参中未被引用的 `userAnswer`。

### 目标
1. 从 `AreaComparison2AfcViewProps` 解构中移除 `userAnswer`。
2. 从 `Decontextual2AfcViewProps` 解构中移除 `userAnswer`。
3. 从 `HueInductionViewProps` 解构中移除 `userAnswer`。

### 基本原理
修改这三个组件的函数签名，不再解构出 `userAnswer`。

### 标签
#intent/fix #flow/ready #priority/high #comp/tests #scope/core #ai/instruct #task/domain/testing #task/object/typescript-errors #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 移除三个组件中未使用的 userAnswer 解构参数

~~~~~act
patch_file
src/components/negativeSpace/AreaComparison2AfcView.tsx
~~~~~
~~~~~typescript.old
export function AreaComparison2AfcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AreaComparison2AfcViewProps) {
~~~~~
~~~~~typescript.new
export function AreaComparison2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AreaComparison2AfcViewProps) {
~~~~~

~~~~~act
patch_file
src/components/relativeColor/Decontextual2AfcView.tsx
~~~~~
~~~~~typescript.old
export function Decontextual2AfcView({
  question,
  showAnswer,
  userAnswer,
  selectedChoice,
  onSelectChoice,
  disabled = false,
  showCanvasHints = true,
}: Decontextual2AfcViewProps) {
~~~~~
~~~~~typescript.new
export function Decontextual2AfcView({
  question,
  showAnswer,
  selectedChoice,
  onSelectChoice,
  disabled = false,
  showCanvasHints = true,
}: Decontextual2AfcViewProps) {
~~~~~

~~~~~act
patch_file
src/components/relativeColor/HueInductionView.tsx
~~~~~
~~~~~typescript.old
export function HueInductionView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: HueInductionViewProps) {
~~~~~
~~~~~typescript.new
export function HueInductionView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: HueInductionViewProps) {
~~~~~

### 下一步建议

- 再次运行 `npm run build` 验证构建。
