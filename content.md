这是一个针对 `VertexFittingViewProps` 属性类型缺失导致的 TypeScript 类型检查错误修复。

## [WIP] fix: 修复 VertexFittingViewProps 缺少 showCanvasHints 导致的类型错误

### 错误分析
在 `NegativeSpaceCanvas.tsx` 中渲染 `VertexFittingView` 时传入了 `showCanvasHints={showCanvasHints}`，但在 `VertexFittingView.tsx` 的接口定义 `VertexFittingViewProps` 中未声明 `showCanvasHints?: boolean` 属性，导致 TypeScript 报出 `TS2322: Property 'showCanvasHints' does not exist on type 'IntrinsicAttributes & VertexFittingViewProps'` 编译错误。

### 用户需求
修复 `src/packs/negative_space/views/NegativeSpaceCanvas.tsx` 及其子组件的 TypeScript 类型定义错误，保证项目通过类型检查。

### 评论
该问题属于重构引入的组件 Props 接口对齐疏漏。在 negative_space 包的各个子视图组件中，统一规范化透传 `showCanvasHints` 属性，不仅能立刻解决类型报错，还能保证子视图 Props 接口的一致性。

### 目标
1. 在 `src/packs/negative_space/components/VertexFittingView.tsx` 中为 `VertexFittingViewProps` 增加 `showCanvasHints?: boolean` 可选属性。
2. 在 `VertexFittingView` 组件函数参数中解构并提供默认值 `showCanvasHints = true`。

### 基本原理
通过在 `VertexFittingViewProps` 接口中显式声明 `showCanvasHints?: boolean`，使上层容器组件 `NegativeSpaceCanvas` 能够无障碍传递全局提示开关配置，对齐负空间模块内所有子视图组件的调用约定，消除 TypeScript 类型检查错误。

### 标签
#intent/fix #flow/ready #priority/high #comp/interfaces #scope/core #ai/instruct #task/domain/testing #task/object/type-check #task/action/bug-fix #task/state/begin #task/status/active

---

### Script

#### Acts 1: 为 VertexFittingView 增加 showCanvasHints 属性声明

~~~~~act
patch_file
src/packs/negative_space/components/VertexFittingView.tsx
~~~~~
~~~~~typescript.old
interface VertexFittingViewProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (clickPoint: Point) => void;
  disabled?: boolean;
}

export function VertexFittingView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: VertexFittingViewProps) {
~~~~~
~~~~~typescript.new
interface VertexFittingViewProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (clickPoint: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function VertexFittingView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: VertexFittingViewProps) {
~~~~~

### 下一步建议
1. 运行 `pnpm check` 或 `npm run check` 校验整体项目类型和格式规范。
2. 若类型检查无误，可生成 Git Commit 计划提交本次修复。
