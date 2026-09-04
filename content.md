现在开始执行**阶段零：基础能力下沉与 SDK 契约准备**。

我们将提炼无头键盘交互 Hook（`useChoiceShortcuts` 与 `useSubmitShortcut`），并将 `StandardSliderView` 中耦合的轨道渲染逻辑下沉为纯粹的原子视觉基元 `SliderTrack`，最后在 `@formsight/card-sdk` 中统一导出。

## [WIP] feat: 沉淀无头交互 Hooks 与滑块轨道原子基元并接入 Card SDK

### 用户需求
落实重构路线图的“阶段零”：沉淀可复用的无头交互 Hooks（包括选择快捷键与确认快捷键），提炼通用滑块轨道视觉原子基元 `SliderTrack`，并扩展 Card SDK 对外契约，为后续所有业务卡片的解耦重构提供底层支持。

### 评论
这是架构解耦的关键地基。将原本隐藏在“巨石 Wrapper”内部的键盘事件与轨道状态呈现剥离为无状态/轻状态的原子能力，可以在不破坏现有卡片功能的前提下，实现平滑的双轨过渡。

### 目标
1. 新建 `src/hooks/useChoiceShortcuts.ts`：处理数字键（1~N）选项切换与可选空格提交。
2. 新建 `src/hooks/useSubmitShortcut.ts`：处理独立的空格键提交防误触逻辑。
3. 新建 `src/components/common/SliderTrack.tsx`：提炼通用的滑块轨道视觉原子组件，支持容错区间、真理线、作答线与外延命中边距。
4. 更新 `src/card-sdk/index.ts`：将上述 Hooks 与组件通过 SDK 标准化暴露。

### 基本原理
采用 Headless UI 与组合优于继承的设计原则，把事件监听（快捷键）和指针追踪计算通过 Hook 注入，把轨道渲染变成只接受纯粹参数的展示型组件，彻底摆脱旧包装层由于插槽泛滥带来的层级黑盒。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/ui #scope/dx #scope/ux #ai/instruct #task/domain/ui #task/object/headless-hooks #task/action/build #task/state/begin #task/status/active

---

### Script

#### Acts 1: 创建无头选择快捷键 Hook

~~~~~act
write_file
src/hooks/useChoiceShortcuts.ts
~~~~~
~~~~~typescript
import { useEffect } from 'preact/hooks';

export interface UseChoiceShortcutsOptions {
  optionsCount: number;
  disabled?: boolean;
  onSelect: (index: number) => void;
  onSubmit?: () => void;
  enableKeyboardShortcuts?: boolean;
}

/**
 * N-AFC (包含 2AFC) 专用键盘快捷键 Hook
 * - 数字键 1-N：选择对应序号选项 (转换为 0-based index)
 * - 空格键：在提供 onSubmit 时确认提交
 * - 自动忽略 input / textarea 等输入控件的冒泡
 */
export function useChoiceShortcuts({
  optionsCount,
  disabled = false,
  onSelect,
  onSubmit,
  enableKeyboardShortcuts = true,
}: UseChoiceShortcutsOptions) {
  useEffect(() => {
    if (!enableKeyboardShortcuts || disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // 1. 处理数字键快速选定 (兼容主键盘与小键盘)
      const num = Number.parseInt(e.key, 10);
      if (!Number.isNaN(num) && num >= 1 && num <= optionsCount) {
        e.preventDefault();
        onSelect(num - 1);
        return;
      }

      // 2. 处理空格确认提交
      if (onSubmit && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        onSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [optionsCount, disabled, onSelect, onSubmit, enableKeyboardShortcuts]);
}
~~~~~

#### Acts 2: 创建无头确认快捷键 Hook

~~~~~act
write_file
src/hooks/useSubmitShortcut.ts
~~~~~
~~~~~typescript
import { useEffect } from 'preact/hooks';

export interface UseSubmitShortcutOptions {
  disabled?: boolean;
  onSubmit: () => void;
  enableKeyboardShortcuts?: boolean;
}

/**
 * 空格键提交监听 Hook
 * - 过滤输入框冒泡
 * - 阻止空格键页面滚动默认行为并触发提交
 */
export function useSubmitShortcut({
  disabled = false,
  onSubmit,
  enableKeyboardShortcuts = true,
}: UseSubmitShortcutOptions) {
  useEffect(() => {
    if (!enableKeyboardShortcuts || disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        onSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, onSubmit, enableKeyboardShortcuts]);
}
~~~~~

#### Acts 3: 创建滑块轨道纯视觉原子组件 `SliderTrack`

~~~~~act
write_file
src/components/common/SliderTrack.tsx
~~~~~
~~~~~typescript
import type { JSX, RefObject } from 'preact';

export interface SliderTrackProps {
  trackRef?: RefObject<HTMLDivElement | null>;
  pointerProps?: JSX.HTMLAttributes<HTMLDivElement>;
  activeVal: number;
  max: number;
  min?: number;
  hitMargin?: number;
  disabled?: boolean;
  showAnswer?: boolean;
  targetValue?: number;
  userValue?: number;
  tolerance?: number;
  showToleranceBand?: boolean;
  isHit?: boolean;
  className?: string;
  trackClassName?: string;
}

/**
 * 连续滑块轨道纯视觉原子基元
 * 承载：当前位置指示、动态容错区间、真理线/作答线展示，以及 HitMargin 点击外延包络
 */
export function SliderTrack({
  trackRef,
  pointerProps,
  activeVal,
  max,
  min = 0,
  hitMargin = 12,
  disabled = false,
  showAnswer = false,
  targetValue,
  userValue,
  tolerance,
  showToleranceBand = true,
  isHit = false,
  className = '',
  trackClassName = '',
}: SliderTrackProps) {
  const valToPercent = (val: number) => {
    const clamped = Math.max(min, Math.min(max, val));
    return `${((clamped - min) / (max - min)) * 100}%`;
  };

  return (
    <div
      {...pointerProps}
      style={
        hitMargin > 0
          ? {
              paddingLeft: `${hitMargin}px`,
              paddingRight: `${hitMargin}px`,
              marginLeft: `-${hitMargin}px`,
              marginRight: `-${hitMargin}px`,
              paddingTop: '6px',
              paddingBottom: '6px',
              marginTop: '-6px',
              marginBottom: '-6px',
            }
          : undefined
      }
      className={`relative flex-1 flex items-center select-none touch-none ${
        !showAnswer && !disabled ? 'cursor-pointer' : 'cursor-default'
      } ${className}`}
    >
      <div
        ref={trackRef}
        className={`relative w-full h-7 rounded-xl bg-border border border-border/60 shadow-inner flex items-center overflow-hidden ${trackClassName}`}
      >
        {/* 当前激活填充条 */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-indigo-500/20 dark:bg-indigo-400/20"
          style={{ width: valToPercent(activeVal) }}
        />

        {/* 未揭晓状态下的活动光标线 */}
        {!showAnswer && (
          <div
            className="absolute top-0 bottom-0 w-1 bg-primary dark:bg-indigo-400 -translate-x-1/2 z-20 shadow-sm"
            style={{ left: valToPercent(activeVal) }}
          />
        )}

        {/* 动态容错区间感应指示带 */}
        {!showAnswer && showToleranceBand && tolerance !== undefined && tolerance > 0 && (
          <>
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 dark:bg-indigo-300/80 -translate-x-1/2"
              style={{ left: valToPercent(activeVal - tolerance) }}
            />
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 dark:bg-indigo-300/80 -translate-x-1/2"
              style={{ left: valToPercent(activeVal + tolerance) }}
            />
          </>
        )}

        {/* 答案揭晓：绝对真理线与用户作答线 */}
        {showAnswer && targetValue !== undefined && (
          <>
            <div
              className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white dark:border-border shadow-md"
              style={{ left: valToPercent(targetValue) }}
            />
            {userValue !== undefined && (
              <div
                className={`absolute top-0 bottom-0 w-1 -translate-x-1/2 z-10 border-x border-white dark:border-border shadow-md ${
                  isHit ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ left: valToPercent(userValue) }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
~~~~~

#### Acts 4: 在 Card SDK 统一暴露新基元

~~~~~act
patch_file
src/card-sdk/index.ts
~~~~~
~~~~~typescript
// ----------------------------------------------------------------------------
// 6. 交互 Hook 与触控手势 (Interactive Hooks & Point Loupe)
// ----------------------------------------------------------------------------
export {
  usePointLoupe,
  LOUPE_DIAMETER,
  type UsePointLoupeOptions,
} from '../hooks/usePointLoupe';
export {
  useTrackPointer,
  type UseTrackPointerOptions,
} from '../hooks/useTrackPointer';
~~~~~
~~~~~typescript
// ----------------------------------------------------------------------------
// 6. 交互 Hook 与触控手势 (Interactive Hooks & Point Loupe)
// ----------------------------------------------------------------------------
export {
  usePointLoupe,
  LOUPE_DIAMETER,
  type UsePointLoupeOptions,
} from '../hooks/usePointLoupe';
export {
  useTrackPointer,
  type UseTrackPointerOptions,
} from '../hooks/useTrackPointer';
export {
  useChoiceShortcuts,
  type UseChoiceShortcutsOptions,
} from '../hooks/useChoiceShortcuts';
export {
  useSubmitShortcut,
  type UseSubmitShortcutOptions,
} from '../hooks/useSubmitShortcut';
~~~~~

~~~~~act
patch_file
src/card-sdk/index.ts
~~~~~
~~~~~typescript
// ----------------------------------------------------------------------------
// 10. 通用 UI 组件 (UI Primitives & Diagnostic Components)
// ----------------------------------------------------------------------------
export { CanvasView, type CanvasViewProps } from '../components/common/CanvasView';
export { DualViewportContainer } from '../components/common/DualViewportContainer';
export {
  PointClickCanvas,
  type PointClickCanvasProps,
} from '../components/common/PointClickCanvas';
~~~~~
~~~~~typescript
// ----------------------------------------------------------------------------
// 10. 通用 UI 组件 (UI Primitives & Diagnostic Components)
// ----------------------------------------------------------------------------
export { CanvasView, type CanvasViewProps } from '../components/common/CanvasView';
export { DualViewportContainer } from '../components/common/DualViewportContainer';
export { SliderTrack, type SliderTrackProps } from '../components/common/SliderTrack';
export {
  PointClickCanvas,
  type PointClickCanvasProps,
} from '../components/common/PointClickCanvas';
~~~~~

---

### 下一步建议

基础能力下沉和 SDK 契约扩充已就绪。下一步建议推进**阶段一·批次 A**：
重构所有 2AFC 二选一卡片（如 `rel_decontextual_2afc`、`angle_comparison_2afc` 等），直接使用 `QuestionCardShell` + `ChoiceCard` + `useChoiceShortcuts` 替换原有的 `Standard2AfcView`，全面展开业务组件的原生排版。
