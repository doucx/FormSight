已定位到左右双视口窗格尺寸不一致的问题根源：

在点阵类训练（如单锚点寻星、双锚点寻星等）中，右侧交互视口使用了 `PointClickCanvas` 组件（内置了响应式宽度容器 `w-full max-w-[380px] lg:max-w-[420px]` 与 `w-full aspect-square` 样式），而左侧参考视口使用的是基础 `CanvasView` 组件，其直接渲染裸 `<canvas>` 且缺少外层对齐容器与自适应样式，导致左视口按固定像素尺寸渲染，无法与右侧交互视口保持 1:1 等宽等高响应式对齐。

## [WIP] fix: 统一双视口点阵训练中参考视口与交互视口的尺寸与自适应布局

### 错误分析
1. **视口容器封装不一致**：`PointClickCanvas` 拥有响应式包裹容器（`inline-block w-full max-w-[380px] lg:max-w-[420px]`）并将 `<canvas>` 设为 `w-full aspect-square`；而 `CanvasView` 直接输出裸 `<canvas width={width} height={height} />`，在 CSS 网格中无法自适应列宽拉伸，产生尺寸错位。
2. **双视口网格列约束缺失**：`DualViewportContainer` 的左右两个子容器未设置 `w-full min-w-0` 与居中包裹层，当左右内容样式不一致时容易触发弹性盒或网格列的不等宽坍缩。

### 用户需求
确保所有双视口点阵训练模块（如单锚点寻星等）中，左侧参考画框与右侧作答画框保持严格一致的外观比例、最大尺寸限制与响应式布局表现。

### 评论
该修复强化了界面几何对齐的严谨性，消除视觉上的尺寸错觉干扰，有助于提升用户的视知觉训练体验与专注度。

### 目标
1. 升级 `CanvasView` 组件，赋予其与 `PointClickCanvas` 一致的外层容器包裹（支持 `maxDisplayWidth`）及 `w-full aspect-square` 自适应特性。
2. 优化 `DualViewportContainer` 的列容器约束，确保左右子视口在各断点下严格均分且居中对齐。

### 基本原理
通过在 `CanvasView` 中统一注入 `w-full` 与 `aspect-square`，并应用与 `PointClickCanvas` 相同的 `max-w-[380px] lg:max-w-[420px]` 限制，使两个视口在 `grid-cols-2` 容器中拥有完全对等的几何约束与响应式缩放行为。

### 标签
#intent/fix #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/dual-viewport #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 升级 `CanvasView` 支持响应式对齐容器与等比尺寸

~~~~~act
write_file
src/components/common/CanvasView.tsx
~~~~~
~~~~~tsx
import { useEffect, useRef } from 'preact/hooks';

export interface CanvasViewProps {
  width: number;
  height: number;
  className?: string;
  maxDisplayWidth?: string;
  draw: (canvas: HTMLCanvasElement) => void;
  deps?: unknown[];
}

export function CanvasView({
  width,
  height,
  className = '',
  maxDisplayWidth = 'max-w-[380px] lg:max-w-[420px]',
  draw,
  deps = [],
}: CanvasViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: dynamic dependencies passed by parent
  useEffect(() => {
    if (canvasRef.current) {
      draw(canvasRef.current);
    }
  }, deps);

  const canvasAspectClass = width === height ? 'aspect-square' : '';
  const canvasClasses = className
    ? `${className} w-full ${canvasAspectClass}`
    : `w-full ${canvasAspectClass} rounded-xl border border-gray-100 bg-white shadow-inner block`;

  return (
    <div className={`relative inline-block w-full ${maxDisplayWidth} select-none`}>
      <canvas ref={canvasRef} width={width} height={height} className={canvasClasses} />
    </div>
  );
}
~~~~~

#### Acts 2: 增强 `DualViewportContainer` 的左右视口等宽对齐与容器约束

~~~~~act
write_file
src/components/common/DualViewportContainer.tsx
~~~~~
~~~~~tsx
import type { ComponentChildren } from 'preact';

interface DualViewportContainerProps {
  leftTitle: string;
  rightTitle: string;
  leftTitleColor?: string;
  rightTitleColor?: string;
  leftContent: ComponentChildren;
  rightContent: ComponentChildren;
  className?: string;
}

export function DualViewportContainer({
  leftTitle,
  rightTitle,
  leftTitleColor = 'text-slate-400',
  rightTitleColor = 'text-indigo-600',
  leftContent,
  rightContent,
  className = '',
}: DualViewportContainerProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 w-full items-start ${className}`}>
      <div className="flex flex-col items-center gap-2 w-full min-w-0">
        <span className={`text-[11px] font-bold ${leftTitleColor} uppercase tracking-wider`}>
          {leftTitle}
        </span>
        <div className="w-full flex justify-center items-center min-w-0">{leftContent}</div>
      </div>

      <div className="flex flex-col items-center gap-2 w-full min-w-0">
        <span className={`text-[11px] font-bold ${rightTitleColor} uppercase tracking-wider`}>
          {rightTitle}
        </span>
        <div className="w-full flex justify-center items-center min-w-0">{rightContent}</div>
      </div>
    </div>
  );
}
~~~~~

### 下一步建议
1. 启动本地开发服务验证单锚点寻星、双锚点寻星、三视图等双视口题型在桌面端与移动端的视觉对齐效果。
2. 运行 `npm run check` 确保代码格式与 TypeScript 类型检查全部通过。
