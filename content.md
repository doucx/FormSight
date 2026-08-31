这里出现报错的根本原因有两个：
1. `ButtonProps` 继承了 Preact 的通用 `JSX.HTMLAttributes<HTMLButtonElement>`，未显式声明 HTML 按钮所特有的 `disabled?: boolean` 及 `type?: 'button' | 'submit' | 'reset'` 属性，导致下游所有向 `<Button>` 传递 `disabled` 的地方报类型错误。
2. `buttonVariants` 缺少在设计系统中广泛使用的 `accent` 变体 (`bg-accent text-primary`)，导致 `PlanHeroCard.tsx` 传入 `variant="accent"` 时报类型不匹配。

我们直接在 `src/components/ui/button.tsx` 中补齐 `accent` 变体与完整的 Button HTML 属性接口。

## [WIP] fix(ui): 修复 Button 类型的 disabled 属性支持与 accent 变体

### 错误分析
- **类型定义缺失**：`ButtonProps` 仅继承了通用的 `JSX.HTMLAttributes<HTMLButtonElement>`，Preact 的通用 HTMLAttributes 中没有包含按钮专属的 `disabled` 属性类型声明。
- **Variant 不完整**：`badge.tsx` 拥有 `accent` 变体，但 `buttonVariants` 缺少与之对称的 `accent` 变体，导致组件传递 `variant="accent"` 时被 TypeScript 拦截。

### 用户需求
修复 TypeScript 编译阶段报告的 6 处类型错误，保证 `ButtonProps` 正确支持 `disabled`、`type` 及 `accent` variant。

### 评论
完善基础 UI 控件的契约定义，是设计系统落地过程中非常重要的一步，能让下游组件更自然地使用基础控件，避免为了类型妥协而写冗余的样式覆盖。

### 目标
1. 更新 `src/components/ui/button.tsx`：
   - 为 `buttonVariants` 增加 `accent` 变体支持；
   - 为 `ButtonProps` 显式扩展 `disabled?: boolean` 与 `type?: 'button' | 'submit' | 'reset'`；
   - 默认按钮类型置为 `type="button"`，防止表单意外提交。

### 基本原理
通过在原子级 `button.tsx` 中完善接口声明，直接解决所有 4 个报错文件（`PlanHeroCard`、`PlanEditorHeader`、`PlanStageList`、`DataGovernanceSection`）中的类型冲突。

### 标签
#intent/fix #flow/ready #priority/critical #comp/ui #concept/ui #scope/dx #ai/instruct #task/domain/ui #task/object/button-types #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 完善 `src/components/ui/button.tsx`

~~~~~act
write_file
src/components/ui/button.tsx
~~~~~
~~~~~tsx
import { type VariantProps, cva } from 'class-variance-authority';
import type { ComponentChildren, JSX } from 'preact';
import { cn } from '../../utils/cn';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none active:scale-95 cursor-pointer select-none',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-indigo-200 dark:shadow-none',
        secondary: 'bg-muted text-foreground hover:bg-muted/80',
        outline:
          'border border-border bg-card hover:bg-accent hover:text-accent-foreground text-foreground',
        ghost:
          'hover:bg-accent hover:text-accent-foreground text-muted-foreground hover:text-foreground',
        accent:
          'bg-accent text-primary hover:bg-accent/80 border border-indigo-100 dark:border-indigo-900',
        danger:
          'bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-200 dark:shadow-none',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-2.5 text-[11px]',
        lg: 'h-12 px-6 text-sm',
        icon: 'h-8 w-8 p-0',
        iconSm: 'h-7 w-7 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends JSX.HTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  children?: ComponentChildren;
}

export function Button({
  className,
  variant,
  size,
  type = 'button',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {children}
    </button>
  );
}
~~~~~

### 下一步建议
重新执行 `npm run checkf` 校验全量类型检查与 lint 修复结果。
