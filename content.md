类型检查报错的根本原因在于：UI 基础原语组件（`Input`、`Select`、`Switch`）在扩展属性类型时使用了通用的 `JSX.HTMLAttributes`，而不是对应的元素专用属性类型（`JSX.InputHTMLAttributes`、`JSX.SelectHTMLAttributes`、`JSX.ButtonHTMLAttributes`），导致 input 专有的 `min`、`max`、`step`、`accept`、`value` 属性以及 select 的 `value`、switch 的 `disabled` 属性在类型系统中未被识别。

我将生成一个修复计划，修正基础 UI 组件的 Preact JSX 属性继承类型。

## [WIP] fix: 修复 UI 原语组件的 Preact HTML 属性类型定义

### 错误分析
1. **Input 专用属性缺失**: `InputProps` 继承了 `JSX.HTMLAttributes<HTMLInputElement>`，缺乏 `accept`、`min`、`max`、`step`、`value` 等 input 专用特性的类型声明，导致在 `SettingsModal.tsx`（range 属性）、`PlanEditorHeader.tsx` 和 `DataGovernanceSection.tsx`（file accept / text value）中报 TS2322 错误。
2. **Select 专用属性缺失**: `SelectProps` 继承了 `JSX.HTMLAttributes<HTMLSelectElement>`，缺乏 `value` 属性类型声明，导致在 `GlobalStatsView.tsx` 中绑定 `value={selectedFilter}` 时报 TS2322 错误。
3. **Switch 禁用态属性缺失**: `SwitchProps` 缺乏 `disabled` 属性，导致组件实现中解构 `disabled` 报 TS2339 错误。

### 用户需求
修复 `Input`、`Select`、`Switch` 组件的接口类型定义，使其完整继承 Preact 的 HTML 专用属性集，消除 `tsc --noEmit` 类型检查中的 7 处报错。

### 评论
UI 原语组件应完整暴露底层 HTML 元素的标准原生属性，确保在任何表单或配置场景下都能保持严格类型安全，无需使用类型断言或绕弯写法。

### 目标
1. 将 `InputProps` 升级为继承 `Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'size'>`。
2. 将 `SelectProps` 升级为继承 `Omit<JSX.SelectHTMLAttributes<HTMLSelectElement>, 'size'>`。
3. 将 `SwitchProps` 升级为继承 `Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'size'>` 并显式补齐 `disabled?: boolean`。

### 基本原理
Preact 的 `JSX.InputHTMLAttributes` 与 `JSX.SelectHTMLAttributes` 完整包含了表单输入控件的标准属性（如 `value`, `min`, `max`, `step`, `accept` 等），替代宽泛的 `JSX.HTMLAttributes` 可以一劳永逸解决所有表单原语的属性继承问题。

### 标签
#intent/fix #flow/ready #priority/high #comp/ui #concept/parser #scope/dx #ai/instruct #task/domain/ui #task/object/ui-primitives-types #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 修复 `src/components/ui/input.tsx` 的类型定义

~~~~~act
patch_file
src/components/ui/input.tsx
~~~~~
~~~~~typescript.old
export interface InputProps
  extends Omit<JSX.HTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  type?: string;
}
~~~~~
~~~~~typescript.new
export interface InputProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  type?: string;
}
~~~~~

#### Acts 2: 修复 `src/components/ui/select.tsx` 的类型定义

~~~~~act
patch_file
src/components/ui/select.tsx
~~~~~
~~~~~typescript.old
export interface SelectProps
  extends Omit<JSX.HTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof selectVariants> {
  children?: ComponentChildren;
}
~~~~~
~~~~~typescript.new
export interface SelectProps
  extends Omit<JSX.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof selectVariants> {
  children?: ComponentChildren;
}
~~~~~

#### Acts 3: 修复 `src/components/ui/switch.tsx` 的类型定义

~~~~~act
patch_file
src/components/ui/switch.tsx
~~~~~
~~~~~typescript.old
export interface SwitchProps
  extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'size'>,
    VariantProps<typeof switchVariants> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}
~~~~~
~~~~~typescript.new
export interface SwitchProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'size'>,
    VariantProps<typeof switchVariants> {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}
~~~~~

### 下一步建议
1. 再次执行 `biome check --fix --unsafe . && tsc --noEmit` 验证类型检查与代码风格 100% 通过。
2. 运行 `pnpm test` 确认全套测试用例依然绿灯。
