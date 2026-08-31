这是因为 `JSX.HTMLAttributes<HTMLDivElement>` 原生定义了 `title?: string` 属性，当自定义的 `CalloutProps` 声明 `title?: ComponentChildren` 时，两者的类型发生了冲突。

我们将通过 `Omit<JSX.HTMLAttributes<HTMLDivElement>, 'title'>` 显式排除原生 HTML `title` 属性，与 `InputProps`/`SelectProps` 的做法保持完全一致。

## [WIP] fix: 修复 CalloutProps 继承 HTMLAttributes 时的 title 属性类型冲突

### 错误分析

**错误原因**:
在 Preact JSX 类型定义中，`JSX.HTMLAttributes<HTMLDivElement>` 拥有原生的 `title?: Signalish<string | undefined>` 属性。而在 `CalloutProps` 接口扩展时直接声明了 `title?: ComponentChildren`，两者的类型不兼容（`ComponentChildren` 包含 `VNode`、`null`、数组等复杂类型，无法赋值给 `string`），导致 TypeScript 报 `TS2430` 类型扩展错误。

**解决方案**:
在 `CalloutProps` 继承时使用 `Omit<JSX.HTMLAttributes<HTMLDivElement>, 'title'>` 过滤掉原生的 `title` 属性定义，允许自定义组件的 `title` 接收富文本与 JSX 子元素。

### 用户需求
修复 `src/components/ui/callout.tsx` 中的类型兼容性错误，使项目能够顺利通过 TypeScript 编译检查。

### 评论
这是一个常见的 DOM 属性重名冲突。使用 `Omit` 排除重名原生属性是 TypeScript 设计系统开发中的标准解决范式。

### 目标
在 `src/components/ui/callout.tsx` 中使用 `Omit<JSX.HTMLAttributes<HTMLDivElement>, 'title'>` 消除类型冲突。

### 基本原理
通过 TypeScript 内置的 `Omit<T, K>` 工具类型，从 `JSX.HTMLAttributes<HTMLDivElement>` 中剔除 `title` 键，然后再联合 `title?: ComponentChildren`，即可彻底解除接口继承时的属性类型冲突。

### 标签
#intent/fix #flow/ready #priority/high #comp/ui #concept/ui #scope/core #ai/instruct #task/domain/ui #task/object/cva-design-system #task/action/fix #task/state/continue #task/status/active

---

### Script

#### Acts 1: 修复 `CalloutProps` 接口类型继承

~~~~~act
patch_file
src/components/ui/callout.tsx
~~~~~
~~~~~tsx
export interface CalloutProps
  extends JSX.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof calloutVariants> {
  icon?: (props: { className?: string }) => ComponentChildren;
  title?: ComponentChildren;
  children?: ComponentChildren;
}
~~~~~
~~~~~tsx
export interface CalloutProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof calloutVariants> {
  icon?: (props: { className?: string }) => ComponentChildren;
  title?: ComponentChildren;
  children?: ComponentChildren;
}
~~~~~

### 下一步建议
1. 再次运行类型检查确认类型错误已彻底解决。
2. 确认无其他编译错误后，即可进入最终功能验收或准备提交。
