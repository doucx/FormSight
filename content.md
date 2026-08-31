好的，我们将开始实施阶段一与阶段二。我将为您生成计划，安装必需的轻量级工具库，配置语义化 CSS Tokens 与 Tailwind 映射，并在 `src/components/ui/` 中构建第一批 Preact 原生原子组件（Button、Card、Badge）。

## [WIP] feat: 搭建内部设计系统基础设施与核心原子 UI 组件

### 用户需求
1. 安装 `clsx`, `tailwind-merge`, `class-variance-authority`。
2. 建立 `src/utils/cn.ts` 类名合并工具。
3. 在 `src/index.css` 与 `tailwind.config.js` 中配置支持暗色模式的 CSS 变量语义系统（Design Tokens）。
4. 在 `src/components/ui/` 下实现 Preact 原生原子组件（`Button`, `Card`, `Badge`）。

### 评论
通过将颜色和交互变体抽离为语义化 Token 和基础原子组件，将一劳永逸地解决组件中硬编码繁复 `dark:bg-...` 的问题，为后续的自动化清洗和组件精简奠定坚实基础。

### 目标
1. 执行 `npm install clsx tailwind-merge class-variance-authority` 安装必要依赖。
2. 创建 `src/utils/cn.ts`。
3. 重写更新 `src/index.css`，注入 `:root` 与 `.dark` 的 HSL 变量。
4. 更新 `tailwind.config.js`，将 `border`, `card`, `muted`, `accent`, `primary`, `background`, `foreground` 映射至 CSS 变量。
5. 创建 `src/components/ui/button.tsx`、`src/components/ui/card.tsx`、`src/components/ui/badge.tsx` 和 `src/components/ui/index.ts`。

### 基本原理
利用 CSS 自定义属性（Variables）管理明暗主题切换，并在 Tailwind 中声明对应的语义颜色。结合 `cva` (Class Variance Authority) 声明多维度组件变体（如 `variant`, `size`），结合 `clsx` 与 `tailwind-merge` 解决类名优先级冲突，从而实现 Preact 生态下的零运行时开销原子组件库。

### 标签
#intent/build #flow/ready #priority/high #comp/ui #comp/build #concept/theme #scope/core #ai/instruct #task/domain/ui #task/object/design-system #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 安装依赖库

安装 `clsx`, `tailwind-merge` 和 `class-variance-authority`。

#### Acts 2: 创建类名合并工具 `cn.ts`

创建通用的类名合并工具函数。

~~~~~act
write_file
src/utils/cn.ts
~~~~~
~~~~~typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
~~~~~

#### Acts 3: 配置全局 CSS 变量与设计令牌

在 `src/index.css` 中注入 `:root` 和 `.dark` 的语义化 HSL 设计令牌。

~~~~~act
write_file
src/index.css
~~~~~
~~~~~css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 210 40% 98%;
    --foreground: 222 47% 11%;
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;
    --primary: 239 84% 67%;
    --primary-foreground: 210 40% 98%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215 16% 47%;
    --accent: 226 100% 97%;
    --accent-foreground: 239 84% 67%;
    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: 239 84% 67%;
  }

  .dark {
    --background: 222 47% 2%;
    --foreground: 210 40% 98%;
    --card: 222 47% 11%;
    --card-foreground: 210 40% 98%;
    --popover: 222 47% 11%;
    --popover-foreground: 210 40% 98%;
    --primary: 239 84% 67%;
    --primary-foreground: 210 40% 98%;
    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 65%;
    --accent: 237 63% 15%;
    --accent-foreground: 239 84% 67%;
    --border: 217 33% 17%;
    --input: 217 33% 17%;
    --ring: 239 84% 67%;
  }
}

@layer base {
  html {
    color-scheme: light;
  }

  html.dark {
    color-scheme: dark;
  }

  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell,
      "Open Sans", "Helvetica Neue", sans-serif;
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
  }
}

@keyframes shrinkWidth {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
~~~~~

#### Acts 4: 配置 Tailwind 映射

更新 `tailwind.config.js`，将语义变量暴露给 Tailwind 类名。

~~~~~act
write_file
tailwind.config.js
~~~~~
~~~~~javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
      },
    },
  },
  plugins: [],
};
~~~~~

#### Acts 5: 创建基础原子 UI 组件

在 `src/components/ui/` 下创建 `Button`, `Card`, `Badge` 及统一导出文件。

~~~~~act
write_file
src/components/ui/button.tsx
~~~~~
~~~~~typescript
import { cva, type VariantProps } from 'class-variance-authority';
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
        ghost: 'hover:bg-accent hover:text-accent-foreground text-muted-foreground hover:text-foreground',
        danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-200 dark:shadow-none',
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
  children?: ComponentChildren;
}

export function Button({ className, variant, size, children, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size, className }))} {...props}>
      {children}
    </button>
  );
}
~~~~~

~~~~~act
write_file
src/components/ui/card.tsx
~~~~~
~~~~~typescript
import type { ComponentChildren, JSX } from 'preact';
import { cn } from '../../utils/cn';

export interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: ComponentChildren;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-border bg-card text-card-foreground shadow-sm transition-colors',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: JSX.HTMLAttributes<HTMLHeadingElement> & { children?: ComponentChildren }) {
  return (
    <h3 className={cn('text-base font-black tracking-tight text-foreground', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: JSX.HTMLAttributes<HTMLParagraphElement> & { children?: ComponentChildren }) {
  return (
    <p className={cn('text-xs text-muted-foreground leading-relaxed', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('flex items-center p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/ui/badge.tsx
~~~~~
~~~~~typescript
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentChildren, JSX } from 'preact';
import { cn } from '../../utils/cn';

export const badgeVariants = cva(
  'inline-flex items-center gap-1 font-bold rounded-lg transition-colors select-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-muted text-muted-foreground border border-border/60',
        outline: 'border border-border text-foreground',
        accent:
          'bg-accent text-accent-foreground border border-indigo-200 dark:border-indigo-900',
        success:
          'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
        warning:
          'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
        destructive:
          'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-1.5 py-0.2 text-[10px]',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface BadgeProps
  extends JSX.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  children?: ComponentChildren;
}

export function Badge({ className, variant, size, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {children}
    </span>
  );
}
~~~~~

~~~~~act
write_file
src/components/ui/index.ts
~~~~~
~~~~~typescript
export * from './button';
export * from './card';
export * from './badge';
~~~~~

### 下一步建议
1. 执行本计划完成阶段一/二的基础设施部署。
2. 接下来可以编写并运行自动化清洗脚本（阶段三），快速将现存 90+ 文件中的 `dark:bg-slate-...` 和 `dark:text-slate-...` 类名替换为新语义类名（如 `bg-card`, `border-border`, `text-foreground`）。
3. 随后针对 `src/components/common/` 中的核心容器进行原子组件重构（阶段四）。
