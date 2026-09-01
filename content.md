现在生成并执行修复计划。

## [WIP] fix: 为 Input UI 组件添加 forwardRef 转发以修复文件导入弹窗唤起失效

### 错误分析

`src/components/ui/input.tsx` 未使用 `forwardRef` 包装，外部传入的 `ref` 无法绑定到原生 `<input>` DOM 元素，导致通过 `ref.current.click()` 唤起隐藏文件上传控件（如「导入 JSON 备份」和「导入计划」）的操作失效。

### 用户需求

修复点击「导入 JSON 备份」及计划中心的「导入计划」按钮后无法弹出系统本地文件选择窗口的问题。

### 评论

这是一个典型的 React/Preact 组件封装 ref 转发缺失问题。通过 `forwardRef` 规范化 UI 基础组件后，所有基于 ref 的聚焦、点击及流式交互均可恢复正常。

### 目标

1. 在 `src/components/ui/input.tsx` 中引入 `forwardRef`（来自 `preact/compat`），将 `ref` 正确转发给底层的原生 `<input>` 元素。
2. 确保 `DataGovernanceSection.tsx` 与 `PlanEditorHeader.tsx` 的文件导入按钮点击后能够正常调起系统文件选择框。

### 基本原理

使用 `forwardRef<HTMLInputElement, InputProps>` 包装 `Input` 组件，使组件可以接收外部传入的 `ref` 并无缝挂载到底层真实 DOM 节点上。

### 标签

#intent/fix #flow/ready #priority/critical #comp/interfaces #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/file-input-ref #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 升级 `src/components/ui/input.tsx` 支持 `forwardRef`

~~~~~act
patch_file
src/components/ui/input.tsx
~~~~~
~~~~~typescript
import { type VariantProps, cva } from 'class-variance-authority';
import type { JSX } from 'preact';
import { cn } from '../../utils/cn';

export const inputVariants = cva(
  'w-full bg-card hover:bg-muted/50 focus:bg-card text-foreground font-bold border border-border transition-all placeholder:text-muted-foreground placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      inputSize: {
        default: 'px-3.5 py-2.5 text-xs rounded-2xl',
        sm: 'px-2.5 py-1.5 text-xs rounded-xl',
        lg: 'px-4 py-3 text-sm rounded-2xl',
      },
    },
    defaultVariants: {
      inputSize: 'default',
    },
  },
);

export interface InputProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  type?: string;
}

export function Input({ className, inputSize, type = 'text', ...props }: InputProps) {
  return <input type={type} className={cn(inputVariants({ inputSize }), className)} {...props} />;
}
~~~~~
~~~~~typescript
import { type VariantProps, cva } from 'class-variance-authority';
import type { JSX } from 'preact';
import { forwardRef } from 'preact/compat';
import { cn } from '../../utils/cn';

export const inputVariants = cva(
  'w-full bg-card hover:bg-muted/50 focus:bg-card text-foreground font-bold border border-border transition-all placeholder:text-muted-foreground placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      inputSize: {
        default: 'px-3.5 py-2.5 text-xs rounded-2xl',
        sm: 'px-2.5 py-1.5 text-xs rounded-xl',
        lg: 'px-4 py-3 text-sm rounded-2xl',
      },
    },
    defaultVariants: {
      inputSize: 'default',
    },
  },
);

export interface InputProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  type?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(inputVariants({ inputSize }), className)}
        {...props}
      />
    );
  },
);
~~~~~

### 下一步建议

1. 在浏览器中打开全局设置（Global Settings），点击「导入 JSON 备份」按钮，确认系统文件选择窗口正常弹出。
2. 选择之前导出的 `.json` 备份文件，验证数据导入与页面刷新是否顺畅。
3. 打开计划中心（Plan Editor），测试顶部的「导入 JSON 计划」按钮是否同样能正常调起文件选择。
