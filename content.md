已经定位到问题原因。在暗色模式下导航切换时出现白色边框闪烁，是由于两个原因协同导致的：

1. **`border` 属性缺失与 `currentColor` 回退**：`Button` 组件在 `accent` 变体中声明了 `border border-border/60`，而在 `ghost` 变体中未声明 `border` 类。当导航选项从未激活（`ghost`）与激活（`accent`）状态切换时，由于基础类使用了 `transition-all`，在边框样式剥离的过渡期间，浏览器会将未显式定义边框颜色的默认值回退为文本前景色 `currentColor`（在暗色模式下为纯白/浅灰亮色），导致边框以亮白色闪烁过渡。
2. **焦点外轮廓（Outline）未完全清除**：基础类缺少 `focus:outline-none` 与统一的基础 `border border-transparent` 盒模型占位。

我们将为 `Button` 组件统一设置 `border border-transparent` 基础盒模型并切换为受控的 `transition-colors`，同时完善 `focus:outline-none`。

## [WIP] fix: 修复暗色模式下按钮变体切换时的白色边框闪烁问题

### 错误分析
1. **原因定位**：`buttonVariants` 的 `ghost` 变体缺少 `border-transparent` 声明，而 `accent` 变体包含 `border border-border/60 dark:border-indigo-900`。
2. **过渡异常**：在 `transition-all` 作用下，当按钮从 `accent` 切换至 `ghost` 时，缺失边框颜色声明的属性会被浏览器插值为 `currentColor`（暗色下的亮色前景色），从而在 150~200ms 的过渡期产生白色边框闪烁。

### 用户需求
彻底消除在暗色模式下点击切换导航菜单或按钮状态时出现的瞬间白色边框闪烁现象，确保视觉过渡平滑、干净。

### 评论
该改动规范了设计系统基础按钮组件的盒模型一致性，通过将边框统一为 1px（默认 `border-transparent`），避免状态切换时发生布局抖动或过渡颜色异常回退。

### 目标
1. 在 `button.tsx` 的基础类中统一加入 `border border-transparent` 与 `focus:outline-none`。
2. 将无限制的 `transition-all` 优化为 `transition-colors`。
3. 规范各变体的边框颜色声明，确保状态切换时平滑淡入淡出。

### 基本原理
通过在基础组件类中预先固定 `border border-transparent`，所有按钮变体在 DOM 中始终保持相同的盒模型厚度。当状态在不同变体之间切换时，CSS 过渡仅在具体的色值与 `border-transparent` 之间平滑渐变，阻止了浏览器退回到 `currentColor` 引起的白色边框闪动。

### 标签
#intent/fix #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/refine #task/domain/ui #task/object/button-component #task/action/fix-dark-mode-border-flash #task/state/begin

---

### Script

#### Acts 1: 修复 `src/components/ui/button.tsx` 中的按钮边框过渡与焦点轮廓

~~~~~act
patch_file
src/components/ui/button.tsx
~~~~~
~~~~~typescript.old
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
          'bg-accent text-primary hover:bg-accent/80 border border-border/60 dark:border-indigo-900',
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
~~~~~
~~~~~typescript.new
export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-xs font-bold transition-colors border border-transparent focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none active:scale-95 cursor-pointer select-none',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-indigo-200 dark:shadow-none border-transparent',
        secondary: 'bg-muted text-foreground hover:bg-muted/80 border-transparent',
        outline:
          'border-border bg-card hover:bg-accent hover:text-accent-foreground text-foreground',
        ghost:
          'hover:bg-accent hover:text-accent-foreground text-muted-foreground hover:text-foreground border-transparent',
        accent:
          'bg-accent text-primary hover:bg-accent/80 border-border/60 dark:border-indigo-900',
        danger:
          'bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-200 dark:shadow-none border-transparent',
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
~~~~~

### 下一步建议
1. 在暗色模式下重新测试侧边栏在“今日工作台”、“探索大盘”、“计划中心”与“认知档案”之间切换，验证边框闪烁是否已彻底消除。
2. 确认键盘 Tab 导航时焦点环 `focus-visible:ring-2` 是否依然正常工作。
