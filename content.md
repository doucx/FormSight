现在开始实施二次组件化抽象重构。我们将创建 4 个通用的基础交互容器组件（`QuestionCardShell`、`ChoiceNafcContainer`、`DualViewportContainer`、`PointClickCanvas`），并将所有相关的视图组件迁移到这套统一的基础组件上。

## [WIP] refactor(components): 提取通用交互容器组件并重构全部卡片视图

### 用户需求
在 FormSight 系统中，由于各卡片分散实现了重复的卡片外壳包裹、键盘监听（1~N 键）、N-AFC 多选一选项卡片、双视口对比以及点阵点击捕获逻辑，导致代码冗余、维护成本高。需要对这些公共交互范式进行二次组件化抽象。

### 评论
该重构将消除 `AbstractionCanvas`、`RelativeColorCanvas`、`NegativeSpaceCanvas` 和 `StarCanvas` 各个视图组件中的重复脚手架代码，统一键盘事件拦截、容错准心渲染与响应式网格布局，大幅提高组件的可维护性与后续新卡片的扩展速度。

### 目标
1. 在 `src/components/common/` 下新建 4 个通用交互与布局组件：
   - `QuestionCardShell.tsx`：统一样式卡片外壳与顶部说明气泡。
   - `ChoiceNafcContainer.tsx`：统一 N-AFC 多选一容器、自动绑定键盘 1~N 快捷键与选项高亮反馈。
   - `DualViewportContainer.tsx`：统一左侧参考原图与右侧交互/调制的双栏网格布局。
   - `PointClickCanvas.tsx`：统一处理坐标缩放换算、最近点吸附、悬停高亮与做答提交。
2. 重构 `StarCanvas.tsx`、`Abstraction` 系列视图、`NegativeSpace` 系列视图、`RelativeColor` 系列视图，全部改用新抽象的通用容器。

### 基本原理
通过将“布局外壳”、“N选1交互网格”、“双视口对比容器”与“点阵交互画布”提升为纯展现与交互代理组件（Interaction Containers），各卡片视图仅需关注自身特定的 Canvas 绘图算法和数据转换，从而实现职责单一与高内聚低耦合。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #scope/dx #ai/delegate #task/domain/ui #task/object/interaction-containers #task/action/refactor #task/state/begin #task/status/active

---

### Script

#### Acts 1: 创建 4 个通用交互容器组件

创建 `QuestionCardShell.tsx`、`ChoiceNafcContainer.tsx`、`DualViewportContainer.tsx` 和 `PointClickCanvas.tsx`。

~~~~~act
write_file
src/components/common/QuestionCardShell.tsx
~~~~~
~~~~~tsx
import type { ComponentChildren } from 'preact';

interface QuestionCardShellProps {
  hintText?: string;
  hintIcon?: (props: { className?: string }) => ComponentChildren;
  showCanvasHints?: boolean;
  maxWidth?: string;
  className?: string;
  footer?: ComponentChildren;
  children: ComponentChildren;
}

export function QuestionCardShell({
  hintText,
  hintIcon: HintIcon,
  showCanvasHints = true,
  maxWidth = 'max-w-lg',
  className = '',
  footer,
  children,
}: QuestionCardShellProps) {
  return (
    <div
      className={`w-full ${maxWidth} bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto ${className}`}
    >
      {showCanvasHints && hintText && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60 text-center">
          {HintIcon && <HintIcon className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />}
          <span>{hintText}</span>
        </div>
      )}

      {children}

      {footer}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/common/ChoiceNafcContainer.tsx
~~~~~
~~~~~tsx
import { Check } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';

export interface ChoiceNafcOption<T = unknown> {
  key?: string | number;
  keyLabel?: string;
  title?: string;
  value?: T;
  isCorrect: boolean;
  content: ComponentChildren;
}

interface ChoiceNafcContainerProps<T = unknown> {
  options: ChoiceNafcOption<T>[];
  selectedIndex: number | null;
  showAnswer: boolean;
  disabled?: boolean;
  columns?: 2 | 3 | 4;
  gridClassName?: string;
  enableKeyboardShortcuts?: boolean;
  onSelect: (index: number, option: ChoiceNafcOption<T>) => void;
}

export function ChoiceNafcContainer<T = unknown>({
  options,
  selectedIndex,
  showAnswer,
  disabled = false,
  columns = 4,
  gridClassName,
  enableKeyboardShortcuts = true,
  onSelect,
}: ChoiceNafcContainerProps<T>) {
  useEffect(() => {
    if (!enableKeyboardShortcuts || disabled || showAnswer) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const num = Number.parseInt(e.key, 10);
      if (!Number.isNaN(num) && num >= 1 && num <= options.length) {
        e.preventDefault();
        const idx = num - 1;
        onSelect(idx, options[idx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, disabled, showAnswer, options, onSelect]);

  const defaultGrid =
    columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 3
        ? 'grid-cols-1 sm:grid-cols-3'
        : 'grid-cols-2 sm:grid-cols-4';

  return (
    <div className={`grid ${gridClassName || defaultGrid} gap-3 w-full`}>
      {options.map((opt, idx) => {
        const isSelected = selectedIndex === idx;
        const isTarget = opt.isCorrect;
        const keyLabel = opt.keyLabel || (idx + 1).toString();

        let border = 'border-slate-200 hover:border-indigo-300 hover:shadow-md bg-slate-50';
        if (showAnswer) {
          if (isTarget) {
            border = 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md';
          } else if (isSelected) {
            border = 'bg-rose-50/50 border-rose-400 shadow-sm';
          } else {
            border = 'bg-slate-50/60 border-slate-200 opacity-50';
          }
        } else if (isSelected) {
          border = 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md';
        }

        return (
          <button
            key={opt.key ?? `nafc-opt-${idx}`}
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => onSelect(idx, opt)}
            className={`group flex flex-col items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 text-left active:scale-[0.98] cursor-pointer ${border}`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                  {keyLabel}
                </span>
                {opt.title || `选项 ${keyLabel}`}
              </span>
              {showAnswer && isTarget && (
                <Check className="w-4 h-4 text-emerald-600 font-extrabold" />
              )}
            </div>

            {opt.content}
          </button>
        );
      })}
    </div>
  );
}
~~~~~

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
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 w-full ${className}`}>
      <div className="flex flex-col items-center gap-2">
        <span className={`text-[11px] font-bold ${leftTitleColor} uppercase tracking-wider`}>
          {leftTitle}
        </span>
        {leftContent}
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className={`text-[11px] font-bold ${rightTitleColor} uppercase tracking-wider`}>
          {rightTitle}
        </span>
        {rightContent}
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~tsx
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Point } from '../../types';
import { renderInteractivePointGrid } from '../../utils/canvas/drawPointGrid';
import { findNearestGridPoint } from '../../utils/geometry';

export interface PointClickCanvasProps {
  canvasSize: number;
  gridPoints: Point[];
  targetPoint?: Point;
  userNearestPoint?: Point;
  anchors?: (Point | null | undefined)[];
  showAnswer: boolean;
  isHit?: boolean;
  disabled?: boolean;
  maxDisplayWidth?: string;
  customOverlayRender?: (ctx: CanvasRenderingContext2D) => void;
  onCommitPoint: (point: Point) => void;
}

export function PointClickCanvas({
  canvasSize,
  gridPoints,
  targetPoint,
  userNearestPoint,
  anchors = [],
  showAnswer,
  isHit = false,
  disabled = false,
  maxDisplayWidth = 'max-w-[380px] lg:max-w-[420px]',
  customOverlayRender,
  onCommitPoint,
}: PointClickCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  useEffect(() => {
    setHoverPoint(null);
  }, [gridPoints]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderInteractivePointGrid({
      ctx,
      canvasSize,
      gridPoints,
      targetPoint,
      userNearestPoint,
      hoverPoint,
      anchors,
      showAnswer,
      isHit,
      disabled,
    });

    customOverlayRender?.(ctx);
  }, [
    canvasSize,
    gridPoints,
    targetPoint,
    userNearestPoint,
    hoverPoint,
    anchors,
    showAnswer,
    isHit,
    disabled,
    customOverlayRender,
  ]);

  const handleMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer || !gridPoints.length) {
      if (hoverPoint) setHoverPoint(null);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasSize / rect.width;
    const scaleY = canvasSize / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX * 100) / 100;
    const clickY = Math.round((e.clientY - rect.top) * scaleY * 100) / 100;

    const currentPoint: Point = { x: clickX, y: clickY };
    const { nearestPoint, isWithinRange } = findNearestGridPoint(currentPoint, gridPoints);

    if (isWithinRange) {
      setHoverPoint(nearestPoint);
    } else if (hoverPoint) {
      setHoverPoint(null);
    }
  };

  const handleMouseLeave = () => {
    if (hoverPoint) setHoverPoint(null);
  };

  const handleClick = (e: MouseEvent) => {
    if (disabled || showAnswer || !gridPoints.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasSize / rect.width;
    const scaleY = canvasSize / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX * 100) / 100;
    const clickY = Math.round((e.clientY - rect.top) * scaleY * 100) / 100;

    const clickPoint: Point = { x: clickX, y: clickY };
    const { isWithinRange } = findNearestGridPoint(clickPoint, gridPoints);

    if (!isWithinRange) return;

    setHoverPoint(null);
    onCommitPoint(clickPoint);
  };

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize}
      height={canvasSize}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
      }}
      tabIndex={0}
      role="button"
      aria-label="点阵做答画布"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`w-full ${maxDisplayWidth} aspect-square rounded-xl border border-gray-100 bg-white shadow-inner transition-all ${
        disabled || showAnswer
          ? 'cursor-default'
          : hoverPoint
            ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
            : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
      }`}
    />
  );
}
~~~~~

#### Acts 2: 重构 `StarCanvas` 与 `Abstraction` 视图组件

使用通用容器替换重复的代码逻辑。

~~~~~act
write_file
src/components/StarCanvas.tsx
~~~~~
~~~~~tsx
import { useEffect, useRef } from 'preact/hooks';
import type { HitResult, Point, QuestionData } from '../types';
import { drawDot } from '../utils/canvas/drawPointGrid';
import { CANVAS_SIZE, checkHit, getDynamicDotRadius } from '../utils/geometry';
import { PointClickCanvas } from './common/PointClickCanvas';

interface StarCanvasProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; hitResult: HitResult } | null;
  onAnswer: (clickPoint: Point, hitResult: HitResult) => void;
  disabled?: boolean;
}

export function StarCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarCanvasProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 渲染左侧参考图
  useEffect(() => {
    const dotRadius = getDynamicDotRadius(question.distractorPoints);
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas) {
      const ctx = leftCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        drawDot(ctx, question.anchorA.x, question.anchorA.y, '#000000', dotRadius);

        if (question.anchorC) {
          drawDot(ctx, question.anchorC.x, question.anchorC.y, '#000000', dotRadius);
        }

        drawDot(ctx, question.targetB.x, question.targetB.y, '#000000', dotRadius);
      }
    }
  }, [question]);

  const handleCommitPoint = (clickPoint: Point) => {
    const hitResult = checkHit(clickPoint, question.targetB, question.distractorPoints);
    if (!hitResult.isWithinRange) return;
    onAnswer(clickPoint, hitResult);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-5xl mx-auto">
      {/* 左侧参考 Canvas */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner"
        />
      </div>

      {/* 右侧交互 Canvas */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm">
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.hitResult.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.hitResult.isHit}
          disabled={disabled}
          onCommitPoint={handleCommitPoint}
        />
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/abstraction/GestureAxisView.tsx
~~~~~
~~~~~tsx
import { Eye } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../../hooks/useTrackPointer';
import {
  ABSTRACTION_CANVAS_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../../utils/abstraction';
import { drawParticlesCanvas } from '../../utils/canvas/drawParticles';
import { QuestionCardShell } from '../common/QuestionCardShell';

interface GestureAxisViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showCanvasHints?: boolean;
}

export function GestureAxisView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showCanvasHints = true,
}: GestureAxisViewProps) {
  const [sliderVal, setSliderVal] = useState<number>(90);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    max: 180,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: setSliderVal,
    onCommit: (committedVal) => {
      if (!disabled && !showAnswer) onAnswer(committedVal);
    },
  });

  const activeVal = hoverVal !== null ? hoverVal : sliderVal;
  const userVal = userAnswer?.userValue ?? sliderVal;
  const targetVal = question.targetAngleDeg ?? 0;
  const isHit = Boolean(userAnswer?.isHit);

  useEffect(() => {
    drawParticlesCanvas(
      canvasRef.current,
      question.particles,
      ABSTRACTION_CANVAS_SIZE,
      showAnswer ? targetVal : activeVal,
      showAnswer ? '#22C55E' : '#6366F1',
      showAnswer ? userVal : undefined,
      isHit,
    );
  }, [question.particles, activeVal, showAnswer, targetVal, userVal, isHit]);

  const unit = '°';

  return (
    <QuestionCardShell
      hintText="旋转主轴对齐粒子群动态流向 (0°~180°)"
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
    >
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={ABSTRACTION_CANVAS_SIZE}
          height={ABSTRACTION_CANVAS_SIZE}
          className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm"
        />
      </div>

      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>动态势线角度:</span>
          <span className="font-mono text-base font-black text-indigo-600">
            {showAnswer ? `${userAnswer?.userValue ?? sliderVal}${unit}` : `${activeVal}${unit}`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-slate-400 text-xs">0{unit}</span>

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
            }`}
          >
            <div
              ref={trackRef}
              className="relative w-full h-7 rounded-xl bg-slate-200 border border-slate-300/80 shadow-inner flex items-center overflow-hidden"
            >
              <div
                className="absolute top-0 bottom-0 left-0 bg-indigo-500/20"
                style={{ width: `${(activeVal / 180) * 100}%` }}
              />

              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                  style={{ left: `${(activeVal / 180) * 100}%` }}
                />
              )}

              {showAnswer && (
                <>
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                    style={{ left: `${(targetVal / 180) * 100}%` }}
                  />
                  <div
                    className={`absolute top-0 bottom-0 w-1 -translate-x-1/2 z-10 border-x border-white shadow-md ${
                      isHit ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{ left: `${(userVal / 180) * 100}%` }}
                  />
                </>
              )}
            </div>
          </div>

          <span className="font-bold font-mono text-slate-400 text-xs">180{unit}</span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/components/abstraction/NotanThresholdView.tsx
~~~~~
~~~~~tsx
import { Eye } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../../hooks/useTrackPointer';
import {
  ABSTRACTION_2AFC_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../../utils/abstraction';
import { drawNotanNoiseField, drawRawGrayscaleNoiseField } from '../../utils/canvas/drawNotanField';
import { DualViewportContainer } from '../common/DualViewportContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';

interface NotanThresholdViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showCanvasHints?: boolean;
}

export function NotanThresholdView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showCanvasHints = true,
}: NotanThresholdViewProps) {
  const [sliderVal, setSliderVal] = useState<number>(50);
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);

  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    max: 100,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: setSliderVal,
    onCommit: (committedVal) => {
      if (!disabled && !showAnswer) onAnswer(committedVal);
    },
  });

  const activeVal = hoverVal !== null ? hoverVal : sliderVal;

  useEffect(() => {
    if (question.notanBuffer) {
      drawRawGrayscaleNoiseField(
        canvasRefA.current,
        question.notanBuffer,
        question.notanFieldDim ?? 120,
        ABSTRACTION_2AFC_SIZE,
      );
      drawNotanNoiseField(
        canvasRefB.current,
        question.notanBuffer,
        question.notanFieldDim ?? 120,
        showAnswer ? question.idealNotanThreshold : activeVal,
        ABSTRACTION_2AFC_SIZE,
      );
    }
  }, [
    question.notanBuffer,
    question.notanFieldDim,
    question.idealNotanThreshold,
    activeVal,
    showAnswer,
  ]);

  return (
    <QuestionCardShell
      hintText="观察左侧灰阶原图，在下方滑块点击/调节右侧最佳黑白二值截断点"
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      <DualViewportContainer
        leftTitle="灰阶原图 (Raw Scene)"
        rightTitle="二值显影 (Notan Output)"
        leftContent={
          <div className="w-full flex justify-center bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
            <canvas
              ref={canvasRefA}
              width={ABSTRACTION_2AFC_SIZE}
              height={ABSTRACTION_2AFC_SIZE}
              className="w-full max-w-[240px] aspect-square rounded-xl shadow-sm border border-slate-200"
            />
          </div>
        }
        rightContent={
          <div className="w-full flex justify-center bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
            <canvas
              ref={canvasRefB}
              width={ABSTRACTION_2AFC_SIZE}
              height={ABSTRACTION_2AFC_SIZE}
              className="w-full max-w-[240px] aspect-square rounded-xl shadow-sm border border-slate-200"
            />
          </div>
        }
      />

      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>二值化截断阈值:</span>
          <span className="font-mono text-base font-black text-indigo-600">
            {showAnswer ? `${userAnswer?.userValue ?? sliderVal}%` : `${activeVal}%`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-slate-400 text-xs">0%</span>

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
            }`}
          >
            <div
              ref={trackRef}
              className="relative w-full h-7 rounded-xl bg-slate-200 border border-slate-300/80 shadow-inner flex items-center overflow-hidden"
            >
              <div
                className="absolute top-0 bottom-0 left-0 bg-indigo-500/20"
                style={{ width: `${activeVal}%` }}
              />

              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                  style={{ left: `${activeVal}%` }}
                />
              )}

              {showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                  style={{ left: `${question.idealNotanThreshold ?? 50}%` }}
                />
              )}
            </div>
          </div>

          <span className="font-bold font-mono text-slate-400 text-xs">100%</span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/components/abstraction/PaletteClusteringView.tsx
~~~~~
~~~~~tsx
import { Sparkles } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  ABSTRACTION_CANVAS_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../../utils/abstraction';
import { drawPaletteTilesCanvas } from '../../utils/canvas/drawPaletteTiles';
import { hsvToHex } from '../../utils/colorUtils';
import { ChoiceNafcContainer } from '../common/ChoiceNafcContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';

interface PaletteClusteringViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (idx: number) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function PaletteClusteringView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: PaletteClusteringViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection when question changes
  useEffect(() => {
    setSelectedIdx(null);
  }, [question.id]);

  useEffect(() => {
    drawPaletteTilesCanvas(canvasRef.current, question.paletteTiles, ABSTRACTION_CANVAS_SIZE);
  }, [question.paletteTiles]);

  const nafcOptions = (question.paletteOptions || []).map((hsv, idx) => {
    const hex = hsvToHex(...hsv);
    const isTarget = idx === question.correctPaletteIndex;
    return {
      key: `palette-opt-${idx}-${hex}`,
      value: idx,
      isCorrect: isTarget,
      content: (
        <div
          className="w-full aspect-square rounded-xl shadow-inner border border-white/60"
          style={{ backgroundColor: hex }}
        />
      ),
    };
  });

  return (
    <QuestionCardShell
      hintText="选出最能代表全局主调的加权主色 (键 1-4)"
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
    >
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={ABSTRACTION_CANVAS_SIZE}
          height={ABSTRACTION_CANVAS_SIZE}
          className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm"
        />
      </div>

      <ChoiceNafcContainer
        options={nafcOptions}
        selectedIndex={selectedIdx}
        showAnswer={showAnswer}
        disabled={disabled}
        columns={4}
        onSelect={(idx) => {
          setSelectedIdx(idx);
          onAnswer(idx);
        }}
      />
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/components/abstraction/TopDownPatternView.tsx
~~~~~
~~~~~tsx
import { Sparkles } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  ABSTRACTION_2AFC_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../../utils/abstraction';
import { drawPaletteTilesCanvas } from '../../utils/canvas/drawPaletteTiles';
import { hsvToHex } from '../../utils/colorUtils';
import { ChoiceNafcContainer } from '../common/ChoiceNafcContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';

interface TopDownPatternViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (idx: number) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function TopDownPatternView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: TopDownPatternViewProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const patternCanvasRef0 = useRef<HTMLCanvasElement | null>(null);
  const patternCanvasRef1 = useRef<HTMLCanvasElement | null>(null);
  const patternCanvasRef2 = useRef<HTMLCanvasElement | null>(null);
  const patternCanvasRef3 = useRef<HTMLCanvasElement | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection when question changes
  useEffect(() => {
    setSelectedIdx(null);
  }, [question.id]);

  useEffect(() => {
    if (question.palettePatternOptions) {
      const refs = [patternCanvasRef0, patternCanvasRef1, patternCanvasRef2, patternCanvasRef3];
      question.palettePatternOptions.forEach((pat, i) => {
        const canvas = refs[i]?.current;
        if (canvas) {
          drawPaletteTilesCanvas(canvas, pat, ABSTRACTION_2AFC_SIZE);
        }
      });
    }
  }, [question.palettePatternOptions]);

  const promptHex = question.promptDominantColor
    ? hsvToHex(...question.promptDominantColor)
    : '#6366F1';
  const targetIdx = question.correctPatternIndex ?? 0;
  const chosenIdx = userAnswer?.userChoiceIndex ?? selectedIdx;

  const refs = [patternCanvasRef0, patternCanvasRef1, patternCanvasRef2, patternCanvasRef3];

  const nafcOptions = (question.palettePatternOptions || []).map((pat, idx) => {
    const isTarget = idx === targetIdx;
    return {
      key: `td-pattern-${question.id}-${idx}`,
      title: `画面 ${idx + 1}`,
      value: idx,
      isCorrect: isTarget,
      content: (
        <div className="w-full aspect-square bg-white p-1 rounded-xl border border-slate-200 shadow-inner flex items-center justify-center">
          <canvas
            ref={refs[idx]}
            width={ABSTRACTION_2AFC_SIZE}
            height={ABSTRACTION_2AFC_SIZE}
            className="w-full aspect-square rounded-lg shadow-sm"
          />
        </div>
      ),
    };
  });

  return (
    <QuestionCardShell
      hintText="观察上方基准主色，选出以此为基调的拼贴画面 (键 1-4)"
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          基准主调色
        </span>
        <div
          className="w-16 h-16 rounded-2xl border-4 border-white shadow-md ring-1 ring-slate-200"
          style={{ backgroundColor: promptHex }}
        />
      </div>

      <ChoiceNafcContainer
        options={nafcOptions}
        selectedIndex={chosenIdx}
        showAnswer={showAnswer}
        disabled={disabled}
        columns={4}
        onSelect={(idx) => {
          setSelectedIdx(idx);
          onAnswer(idx);
        }}
      />
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/components/abstraction/TopDown2AfcView.tsx
~~~~~
~~~~~tsx
import { Columns } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  ABSTRACTION_2AFC_SIZE,
  ABSTRACTION_CANVAS_SIZE,
  ABSTRACTION_THUMB_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../../utils/abstraction';
import { drawRawGrayscaleNoiseField } from '../../utils/canvas/drawNotanField';
import { drawParticlesCanvas, drawSpinePromptCanvas } from '../../utils/canvas/drawParticles';
import { drawPolygonCanvas } from '../../utils/canvas/drawPolygon';
import { Choice2AfcContainer } from '../common/Choice2AfcContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';

interface TopDown2AfcViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function TopDown2AfcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: TopDown2AfcViewProps) {
  const { mode } = question;
  const isPoly = mode === 'POLYGON_DECIMATION';

  const canvasMainRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const canvasThumbRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection when question changes
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  useEffect(() => {
    if (isPoly && question.detailedPolygon) {
      drawPolygonCanvas({
        canvas: canvasMainRef.current,
        vertices: question.detailedPolygon,
        size: ABSTRACTION_CANVAS_SIZE,
      });
      drawPolygonCanvas({
        canvas: canvasRefA.current,
        vertices: question.simplifiedOptions?.[0],
        size: ABSTRACTION_2AFC_SIZE,
        fillColor: '#4F46E5',
      });
      drawPolygonCanvas({
        canvas: canvasRefB.current,
        vertices: question.simplifiedOptions?.[1],
        size: ABSTRACTION_2AFC_SIZE,
        fillColor: '#4F46E5',
      });
    } else if (mode === 'TD_GESTURE_2AFC') {
      drawSpinePromptCanvas(canvasThumbRef.current, question.promptSpine, ABSTRACTION_THUMB_SIZE);
      drawParticlesCanvas(canvasRefA.current, question.particlesA, ABSTRACTION_2AFC_SIZE);
      drawParticlesCanvas(canvasRefB.current, question.particlesB, ABSTRACTION_2AFC_SIZE);
    } else if (mode === 'TD_HULL_2AFC') {
      drawPolygonCanvas({
        canvas: canvasThumbRef.current,
        vertices: question.promptHull,
        size: ABSTRACTION_THUMB_SIZE,
        fillColor: '#4F46E5',
        strokeColor: '#3730A3',
      });
      drawPolygonCanvas({
        canvas: canvasRefA.current,
        vertices: question.hullDetailedA,
        size: ABSTRACTION_2AFC_SIZE,
      });
      drawPolygonCanvas({
        canvas: canvasRefB.current,
        vertices: question.hullDetailedB,
        size: ABSTRACTION_2AFC_SIZE,
      });
    } else if (mode === 'TD_NOTAN_2AFC') {
      if (question.promptNotanBuffer && question.notanSceneBufferA && question.notanSceneBufferB) {
        drawRawGrayscaleNoiseField(
          canvasThumbRef.current,
          question.promptNotanBuffer,
          question.notanFieldDim ?? 120,
          ABSTRACTION_THUMB_SIZE,
        );
        drawRawGrayscaleNoiseField(
          canvasRefA.current,
          question.notanSceneBufferA,
          question.notanFieldDim ?? 120,
          ABSTRACTION_2AFC_SIZE,
        );
        drawRawGrayscaleNoiseField(
          canvasRefB.current,
          question.notanSceneBufferB,
          question.notanFieldDim ?? 120,
          ABSTRACTION_2AFC_SIZE,
        );
      }
    }
  }, [mode, isPoly, question]);

  const handleSelectChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelectedChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );

  const isTargetA = isPoly
    ? question.correctPolyChoice === 'A'
    : userAnswer?.correctChoice === 'A' ||
      question.correctParticleChoice === 'A' ||
      question.correctHullChoice === 'A' ||
      question.correctNotanChoice === 'A';
  const isTargetB = !isTargetA;

  return (
    <QuestionCardShell
      hintText={isPoly ? '选择保留了主要转折大形的精简项' : '判别哪一侧具象细节符合上方骨架'}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      {!isPoly && (
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            概括基准 (Prompt)
          </span>
          <canvas
            ref={canvasThumbRef}
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className="w-24 h-24 rounded-xl border border-slate-200 shadow-sm"
          />
        </div>
      )}

      {isPoly && (
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            多边形原图
          </span>
          <canvas
            ref={canvasMainRef}
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-40 h-40 rounded-xl border border-slate-200 shadow-sm"
          />
        </div>
      )}

      <Choice2AfcContainer
        optionA={{
          key: 'A',
          title: '区域 A (键 1)',
          isCorrect: isTargetA,
          content: (
            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefA}
                width={ABSTRACTION_2AFC_SIZE}
                height={ABSTRACTION_2AFC_SIZE}
                className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
              />
            </div>
          ),
        }}
        optionB={{
          key: 'B',
          title: '区域 B (键 2)',
          isCorrect: isTargetB,
          content: (
            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefB}
                width={ABSTRACTION_2AFC_SIZE}
                height={ABSTRACTION_2AFC_SIZE}
                className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
              />
            </div>
          ),
        }}
        selectedChoice={selectedChoice}
        showAnswer={showAnswer}
        disabled={disabled}
        enableKeyboardShortcuts={true}
        onSelect={handleSelectChoice}
      />
    </QuestionCardShell>
  );
}
~~~~~

#### Acts 3: 重构 `NegativeSpace` 系列视图组件

~~~~~act
write_file
src/components/negativeSpace/AreaComparison2AfcView.tsx
~~~~~
~~~~~tsx
import { Columns } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { drawPolygonCanvas } from '../../utils/canvas/drawPolygon';
import {
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
  TWO_AFC_CANVAS_SIZE,
} from '../../utils/negativeSpace';
import { Choice2AfcContainer } from '../common/Choice2AfcContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';

interface AreaComparison2AfcViewProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer?: NegativeSpaceHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AreaComparison2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AreaComparison2AfcViewProps) {
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection when question changes
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  useEffect(() => {
    drawPolygonCanvas({
      canvas: canvasRefA.current,
      vertices: question.verticesA,
      size: TWO_AFC_CANVAS_SIZE,
      fillColor: '#0F172A',
      strokeColor: '#1E293B',
    });
    drawPolygonCanvas({
      canvas: canvasRefB.current,
      vertices: question.verticesB,
      size: TWO_AFC_CANVAS_SIZE,
      fillColor: '#0F172A',
      strokeColor: '#1E293B',
    });
  }, [question.verticesA, question.verticesB]);

  const handleSelectChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelectedChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );

  const largerSide = question.largerSide;
  const isAHit = largerSide === 'A';
  const isBHit = largerSide === 'B';

  return (
    <QuestionCardShell
      hintText="判别哪一侧的白色留白 (负形) 面积更大 (键 1 / 2)"
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      <Choice2AfcContainer
        optionA={{
          key: 'A',
          title: '区域 A',
          isCorrect: isAHit,
          badge: `留白 ${question.negRatioA}%`,
          content: (
            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefA}
                width={TWO_AFC_CANVAS_SIZE}
                height={TWO_AFC_CANVAS_SIZE}
                className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm"
              />
            </div>
          ),
        }}
        optionB={{
          key: 'B',
          title: '区域 B',
          isCorrect: isBHit,
          badge: `留白 ${question.negRatioB}%`,
          content: (
            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefB}
                width={TWO_AFC_CANVAS_SIZE}
                height={TWO_AFC_CANVAS_SIZE}
                className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm"
              />
            </div>
          ),
        }}
        selectedChoice={selectedChoice}
        showAnswer={showAnswer}
        disabled={disabled}
        enableKeyboardShortcuts={true}
        onSelect={handleSelectChoice}
      />
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/components/negativeSpace/RatioEstimationView.tsx
~~~~~
~~~~~tsx
import { Maximize2 } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../../hooks/useTrackPointer';
import { drawPolygonCanvas } from '../../utils/canvas/drawPolygon';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../../utils/negativeSpace';
import { QuestionCardShell } from '../common/QuestionCardShell';

interface RatioEstimationViewProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function RatioEstimationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: RatioEstimationViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentVal, setCurrentVal] = useState<number>(50.0);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 100,
    step: 0.1,
    disabled: disabled || showAnswer,
    onValChange: setCurrentVal,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset slider values when question changes
  useEffect(() => {
    setCurrentVal(50.0);
    setHoverVal(null);
  }, [question.id, setHoverVal]);

  useEffect(() => {
    if (question.vertices) {
      drawPolygonCanvas({
        canvas: canvasRef.current,
        vertices: question.vertices,
        size: NEGATIVE_SPACE_CANVAS_SIZE,
        fillColor: '#0F172A',
        strokeColor: '#1E293B',
        isHighlighted: showAnswer && userAnswer?.isHit,
      });
    }
  }, [question.vertices, showAnswer, userAnswer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || showAnswer) return;
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        onAnswer(currentVal);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, showAnswer, currentVal, onAnswer]);

  const { targetNegativeRatio, tolerance } = question;
  const activeVal = hoverVal !== null ? hoverVal : currentVal;

  return (
    <QuestionCardShell
      hintText="估计白色留白 (负形) 占整幅画面的面积百分比"
      hintIcon={Maximize2}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
    >
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={NEGATIVE_SPACE_CANVAS_SIZE}
          height={NEGATIVE_SPACE_CANVAS_SIZE}
          className="w-full max-w-[340px] aspect-square rounded-xl border border-slate-300 shadow-sm"
        />
      </div>

      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>负形空间占比估计:</span>
          <span className="font-mono text-base font-black text-indigo-600">
            {showAnswer ? `${userAnswer?.userRatio ?? currentVal}%` : `${activeVal}%`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-slate-400 text-xs">0%</span>

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
            }`}
          >
            <div
              ref={trackRef}
              className="relative w-full h-7 rounded-xl bg-slate-200 border border-slate-300/80 shadow-inner flex items-center overflow-hidden"
            >
              <div
                className="absolute top-0 bottom-0 left-0 bg-indigo-500/20"
                style={{ width: `${activeVal}%` }}
              />

              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                  style={{ left: `${currentVal}%` }}
                />
              )}

              {!showAnswer && showToleranceBand && (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: `${Math.max(0, activeVal - tolerance)}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: `${Math.min(100, activeVal + tolerance)}%` }}
                  />
                </>
              )}

              {showAnswer && (
                <>
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                    style={{ left: `${targetNegativeRatio}%` }}
                  />
                  {userAnswer && (
                    <div
                      className={`absolute top-0 bottom-0 w-1 -translate-x-1/2 z-10 border-x border-white shadow-md ${
                        userAnswer.isHit ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ left: `${userAnswer.userRatio}%` }}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <span className="font-bold font-mono text-slate-400 text-xs">100%</span>
        </div>
      </div>

      {!showAnswer && (
        <button
          type="button"
          onClick={() => {
            if (!disabled && !showAnswer) onAnswer(currentVal);
          }}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
        >
          确认提交 (Space)
        </button>
      )}
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/components/negativeSpace/ShapeMemory2AfcView.tsx
~~~~~
~~~~~tsx
import { Sparkles } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { drawPolygonCanvas } from '../../utils/canvas/drawPolygon';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../../utils/negativeSpace';
import { Choice2AfcContainer } from '../common/Choice2AfcContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';

interface ShapeMemory2AfcViewProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (choice: 0 | 1) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function ShapeMemory2AfcView({
  question,
  showAnswer,
  userAnswer: _userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: ShapeMemory2AfcViewProps) {
  const [matchPhase, setMatchPhase] = useState<'stimulus' | 'recall'>('stimulus');
  const [selectedMatchChoice, setSelectedMatchChoice] = useState<'A' | 'B' | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const matchOptionRefA = useRef<HTMLCanvasElement | null>(null);
  const matchOptionRefB = useRef<HTMLCanvasElement | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset phase and selection when question changes
  useEffect(() => {
    setMatchPhase('stimulus');
    setSelectedMatchChoice(null);
  }, [question.id]);

  useEffect(() => {
    if (matchPhase === 'stimulus' && !showAnswer) {
      const timer = setTimeout(() => {
        setMatchPhase('recall');
      }, question.displayTimeMs || 1500);
      return () => clearTimeout(timer);
    }
  }, [matchPhase, question.displayTimeMs, showAnswer]);

  useEffect(() => {
    if (matchPhase === 'stimulus' && question.targetPolygon) {
      drawPolygonCanvas({
        canvas: canvasRef.current,
        vertices: question.targetPolygon,
        size: NEGATIVE_SPACE_CANVAS_SIZE,
      });
    }
  }, [matchPhase, question.targetPolygon]);

  useEffect(() => {
    if ((matchPhase === 'recall' || showAnswer) && question.optionsPolygons) {
      drawPolygonCanvas({
        canvas: matchOptionRefA.current,
        vertices: question.optionsPolygons[0],
        size: NEGATIVE_SPACE_CANVAS_SIZE,
      });
      drawPolygonCanvas({
        canvas: matchOptionRefB.current,
        vertices: question.optionsPolygons[1],
        size: NEGATIVE_SPACE_CANVAS_SIZE,
      });
    }
  }, [matchPhase, showAnswer, question.optionsPolygons]);

  const handleSelectMatchChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer || matchPhase !== 'recall') return;
      setSelectedMatchChoice(choice);
      onAnswer(choice === 'A' ? 0 : 1);
    },
    [disabled, showAnswer, matchPhase, onAnswer],
  );

  const isRevealed = showAnswer;
  const isTargetA = question.correctOptionIndex === 0;
  const isTargetB = question.correctOptionIndex === 1;

  return (
    <QuestionCardShell
      hintText={
        matchPhase === 'stimulus' && !isRevealed
          ? `瞬时记忆负形轮廓特征 (${question.displayTimeMs}ms)`
          : '匹配回忆：哪一侧与刚才展示完全相同？(键 1 / 2)'
      }
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      {matchPhase === 'stimulus' && !isRevealed ? (
        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 shadow-inner flex flex-col items-center gap-3 w-full max-w-sm">
          <canvas
            ref={canvasRef}
            width={NEGATIVE_SPACE_CANVAS_SIZE}
            height={NEGATIVE_SPACE_CANVAS_SIZE}
            className="w-full aspect-square rounded-2xl border border-slate-200 shadow-sm"
          />
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              key={`${question.id}-${matchPhase}`}
              className="bg-indigo-600 h-full"
              style={{
                width: '100%',
                animation: `shrinkWidth ${question.displayTimeMs}ms linear forwards`,
              }}
            />
          </div>
        </div>
      ) : (
        <Choice2AfcContainer
          optionA={{
            key: 'A',
            title: '区域 A',
            isCorrect: isTargetA,
            content: (
              <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
                <canvas
                  ref={matchOptionRefA}
                  width={NEGATIVE_SPACE_CANVAS_SIZE}
                  height={NEGATIVE_SPACE_CANVAS_SIZE}
                  className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm"
                />
              </div>
            ),
          }}
          optionB={{
            key: 'B',
            title: '区域 B',
            isCorrect: isTargetB,
            content: (
              <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
                <canvas
                  ref={matchOptionRefB}
                  width={NEGATIVE_SPACE_CANVAS_SIZE}
                  height={NEGATIVE_SPACE_CANVAS_SIZE}
                  className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm"
                />
              </div>
            ),
          }}
          selectedChoice={selectedMatchChoice}
          showAnswer={showAnswer}
          disabled={disabled || matchPhase !== 'recall'}
          enableKeyboardShortcuts={true}
          onSelect={handleSelectMatchChoice}
        />
      )}
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/components/negativeSpace/VertexFittingView.tsx
~~~~~
~~~~~tsx
import { Columns } from 'lucide-preact';
import { useCallback, useEffect, useRef } from 'preact/hooks';
import type { Point } from '../../types';
import { drawPolygonCanvas } from '../../utils/canvas/drawPolygon';
import {
  FITTING_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../../utils/negativeSpace';
import { DualViewportContainer } from '../common/DualViewportContainer';
import { PointClickCanvas } from '../common/PointClickCanvas';
import { QuestionCardShell } from '../common/QuestionCardShell';

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
  const leftFittingRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!question.vertices) return;
    drawPolygonCanvas({
      canvas: leftFittingRef.current,
      vertices: question.vertices,
      size: FITTING_CANVAS_SIZE,
      fillColor: '#0F172A',
      strokeColor: '#1E293B',
    });
  }, [question.vertices]);

  // 自定义绘制截断正形与参考边框
  const handleCustomOverlayRender = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (question.truncatedVertices && question.truncatedVertices.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(question.truncatedVertices[0].x, question.truncatedVertices[0].y);
        for (let i = 1; i < question.truncatedVertices.length; i++) {
          ctx.lineTo(question.truncatedVertices[i].x, question.truncatedVertices[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = '#0F172A';
        ctx.fill();
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (showAnswer && question.vertices) {
        ctx.beginPath();
        ctx.moveTo(question.vertices[0].x, question.vertices[0].y);
        for (let i = 1; i < question.vertices.length; i++) {
          ctx.lineTo(question.vertices[i].x, question.vertices[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    },
    [question.truncatedVertices, question.vertices, showAnswer],
  );

  return (
    <QuestionCardShell
      hintText="对比左侧负形空间，在右侧点阵中点击定位被截断的顶点"
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-4xl"
    >
      <DualViewportContainer
        leftTitle="完整剪影参考"
        rightTitle="交互定点画布 (点击定位)"
        leftContent={
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner">
            <canvas
              ref={leftFittingRef}
              width={FITTING_CANVAS_SIZE}
              height={FITTING_CANVAS_SIZE}
              className="w-full max-w-[300px] aspect-square rounded-xl border border-slate-100 shadow-sm"
            />
          </div>
        }
        rightContent={
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner">
            <PointClickCanvas
              canvasSize={FITTING_CANVAS_SIZE}
              gridPoints={question.distractorPoints || []}
              targetPoint={question.targetPoint}
              userNearestPoint={userAnswer?.nearestGridPoint}
              showAnswer={showAnswer}
              isHit={userAnswer?.isHit}
              disabled={disabled}
              maxDisplayWidth="max-w-[300px]"
              customOverlayRender={handleCustomOverlayRender}
              onCommitPoint={onAnswer}
            />
          </div>
        }
      />
    </QuestionCardShell>
  );
}
~~~~~

#### Acts 4: 重构 `RelativeColor` 系列视图组件

~~~~~act
write_file
src/components/relativeColor/AlbersInductionView.tsx
~~~~~
~~~~~tsx
import { Eye } from 'lucide-preact';
import { hsvToHex } from '../../utils/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../../utils/relativeColor';
import { HsvTrackSlider } from '../HsvTrackSlider';
import { DualViewportContainer } from '../common/DualViewportContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';

interface AlbersInductionViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
  userRightH: number;
  userRightS: number;
  userRightV: number;
  onUserRightHChange: (val: number) => void;
  onUserRightSChange: (val: number) => void;
  onUserRightVChange: (val: number) => void;
  onSubmit: () => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function AlbersInductionView({
  question,
  showAnswer,
  userAnswer,
  userRightH,
  userRightS,
  userRightV,
  onUserRightHChange,
  onUserRightSChange,
  onUserRightVChange,
  onSubmit,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: AlbersInductionViewProps) {
  const isLightnessMode = question.mode === 'LIGHTNESS_INDUCTION';

  const bgLeftHex = hsvToHex(...(question.bgLeft ?? [0, 0, 100]));
  const bgRightHex = hsvToHex(...(question.bgRight ?? [0, 0, 0]));
  const centerLeftHex = hsvToHex(...(question.targetLeftCenter ?? [0, 0, 50]));

  const userRightHex = hsvToHex(userRightH, userRightS, userRightV);
  const idealRightHex = hsvToHex(...(question.idealRightCenter ?? question.targetD));

  const rightSatGradient = `linear-gradient(to right, ${hsvToHex(userRightH, 0, userRightV)}, ${hsvToHex(userRightH, 100, userRightV)})`;
  const rightValGradient = `linear-gradient(to right, #000000, ${hsvToHex(userRightH, 100, 100)})`;
  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';

  return (
    <QuestionCardShell
      hintText={
        isLightnessMode
          ? '调节右侧中心明度，使左右两块视觉感知看起来完全一致'
          : '调节右侧中心色彩，反向补偿背景诱导达成视觉感知一致'
      }
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <DualViewportContainer
        leftTitle="左侧固定基准"
        rightTitle="右侧调制区 (达成感知一致)"
        leftContent={
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
            style={{ backgroundColor: bgLeftHex }}
          >
            <div
              className="w-16 h-16 rounded-xl transition-all"
              style={{ backgroundColor: centerLeftHex }}
            />
          </div>
        }
        rightContent={
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
            style={{ backgroundColor: bgRightHex }}
          >
            <div
              className="w-16 h-16 rounded-xl transition-all relative overflow-hidden"
              style={{ backgroundColor: userRightHex }}
            >
              {showAnswer && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1/2"
                  style={{ backgroundColor: idealRightHex }}
                />
              )}
            </div>
          </div>
        }
      />

      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        {!isLightnessMode && (
          <HsvTrackSlider
            label="H"
            gradient={hueGradient}
            val={userRightH}
            max={360}
            unit="°"
            targetHSV={question.targetD}
            difficultyLevel={question.difficultyLevel}
            showAnswer={showAnswer}
            targetVal={question.idealRightCenter?.[0] ?? question.targetD[0]}
            userVal={userRightH}
            isHit={userAnswer?.isHit}
            onValChange={onUserRightHChange}
            disabled={disabled}
            hitMargin={hitMargin}
            showToleranceBand={showToleranceBand}
          />
        )}

        {!isLightnessMode && (
          <HsvTrackSlider
            label="S"
            gradient={rightSatGradient}
            val={userRightS}
            max={100}
            unit="%"
            targetHSV={question.targetD}
            difficultyLevel={question.difficultyLevel}
            showAnswer={showAnswer}
            targetVal={question.idealRightCenter?.[1] ?? question.targetD[1]}
            userVal={userRightS}
            isHit={userAnswer?.isHit}
            onValChange={onUserRightSChange}
            disabled={disabled}
            hitMargin={hitMargin}
            showToleranceBand={showToleranceBand}
          />
        )}

        <HsvTrackSlider
          label="V"
          gradient={rightValGradient}
          val={userRightV}
          max={100}
          unit="%"
          targetHSV={question.targetD}
          difficultyLevel={question.difficultyLevel}
          showAnswer={showAnswer}
          targetVal={question.idealRightCenter?.[2] ?? question.targetD[2]}
          userVal={userRightV}
          isHit={userAnswer?.isHit}
          onValChange={onUserRightVChange}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
        />
      </div>

      {!showAnswer && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
        >
          确认提交 (Space)
        </button>
      )}
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/components/relativeColor/Decontextual2AfcView.tsx
~~~~~
~~~~~tsx
import { Eye } from 'lucide-preact';
import { hsvToHex } from '../../utils/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../../utils/relativeColor';
import { Choice2AfcContainer } from '../common/Choice2AfcContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';

interface Decontextual2AfcViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer?: RelativeColorHitResult | null;
  selectedChoice: 'A' | 'B' | null;
  onSelectChoice: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function Decontextual2AfcView({
  question,
  showAnswer,
  selectedChoice,
  onSelectChoice,
  disabled = false,
  showCanvasHints = true,
}: Decontextual2AfcViewProps) {
  const isAHit = question.largerPhysicalSide === 'A';
  const isBHit = question.largerPhysicalSide === 'B';

  const hexBgA = hsvToHex(...(question.bgLeft ?? [0, 0, 90]));
  const hexBgB = hsvToHex(...(question.bgRight ?? [0, 0, 10]));
  const hexCenterA = hsvToHex(...(question.centerColorA ?? [0, 0, 50]));
  const hexCenterB = hsvToHex(...(question.centerColorB ?? [0, 0, 50]));

  return (
    <QuestionCardShell
      hintText="穿透背景视错觉，判别哪一侧中心色块「客观物理明度更高」"
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      <Choice2AfcContainer
        optionA={{
          key: 'A',
          title: '区域 A',
          isCorrect: isAHit,
          badge: isAHit
            ? `物理明度更高 (V: ${question.centerColorA?.[2]}%)`
            : `物理更暗 (V: ${question.centerColorA?.[2]}%)`,
          content: (
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
              style={{ backgroundColor: showAnswer ? '#808080' : hexBgA }}
            >
              <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterA }} />
            </div>
          ),
        }}
        optionB={{
          key: 'B',
          title: '区域 B',
          isCorrect: isBHit,
          badge: isBHit
            ? `物理明度更高 (V: ${question.centerColorB?.[2]}%)`
            : `物理更暗 (V: ${question.centerColorB?.[2]}%)`,
          content: (
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
              style={{ backgroundColor: showAnswer ? '#808080' : hexBgB }}
            >
              <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterB }} />
            </div>
          ),
        }}
        selectedChoice={selectedChoice}
        showAnswer={showAnswer}
        disabled={disabled}
        onSelect={onSelectChoice}
      />
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/components/relativeColor/HueInductionView.tsx
~~~~~
~~~~~tsx
import { Sparkles } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { hsvToHex } from '../../utils/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../../utils/relativeColor';
import { ChoiceNafcContainer } from '../common/ChoiceNafcContainer';
import { DualViewportContainer } from '../common/DualViewportContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';

interface HueInductionViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer?: RelativeColorHitResult | null;
  onAnswer: (chosenColor: [number, number, number]) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function HueInductionView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: HueInductionViewProps) {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const { bgLeft, bgRight, targetLeftCenter, idealRightCenter, options, correctIndex } = question;

  const bgLeftHex = hsvToHex(...(bgLeft ?? [0, 0, 90]));
  const bgRightHex = hsvToHex(...(bgRight ?? [0, 0, 20]));
  const centerLeftHex = hsvToHex(...(targetLeftCenter ?? [0, 0, 50]));
  const idealRightHex = hsvToHex(...(idealRightCenter ?? [0, 0, 50]));

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection when question changes
  useEffect(() => {
    setSelectedIdx(0);
  }, [question.id]);

  const targetIdx = correctIndex ?? 0;
  const activeColor = options?.[selectedIdx] ?? idealRightCenter ?? [0, 0, 50];
  const activeRightHex = hsvToHex(...activeColor);

  const handleSubmit = useCallback(() => {
    if (disabled || showAnswer || !options) return;
    const chosen = options[selectedIdx] ?? idealRightCenter ?? [0, 0, 50];
    onAnswer(chosen);
  }, [disabled, showAnswer, options, selectedIdx, idealRightCenter, onAnswer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (disabled || showAnswer || !options) return;

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, showAnswer, options, handleSubmit]);

  const nafcOptions = (options || []).map((opt, idx) => {
    const isTarget = idx === targetIdx;
    const hexVal = hsvToHex(...opt);
    return {
      key: `hue-opt-${idx}-${hexVal}`,
      title: `候选 ${idx + 1}`,
      value: opt,
      isCorrect: isTarget,
      content: (
        <div className="w-full aspect-[4/3] rounded-xl shadow-inner border border-white/60 p-1 flex items-center justify-center bg-white">
          <div
            className="w-full h-full rounded-lg shadow-sm border border-slate-200/50"
            style={{ backgroundColor: hexVal }}
          />
        </div>
      ),
    };
  });

  return (
    <QuestionCardShell
      hintText="观察左侧基准，在下方切换选项预览并确认提交 (键 1-4 切换，Space 提交)"
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <DualViewportContainer
        leftTitle="左侧固定基准"
        rightTitle="右侧环境补偿区 (实时预览)"
        leftContent={
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
            style={{ backgroundColor: bgLeftHex }}
          >
            <div
              className="w-16 h-16 rounded-xl transition-all"
              style={{ backgroundColor: centerLeftHex }}
            />
          </div>
        }
        rightContent={
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
            style={{ backgroundColor: bgRightHex }}
          >
            <div
              className="w-16 h-16 rounded-xl transition-all relative overflow-hidden"
              style={{ backgroundColor: activeRightHex }}
            >
              {showAnswer && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1/2"
                  style={{ backgroundColor: idealRightHex }}
                  title="上半部为您的选择，下半部为理论真理色"
                />
              )}
            </div>
          </div>
        }
      />

      <ChoiceNafcContainer
        options={nafcOptions}
        selectedIndex={selectedIdx}
        showAnswer={showAnswer}
        disabled={disabled}
        columns={4}
        onSelect={(idx) => setSelectedIdx(idx)}
      />

      {!showAnswer && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all cursor-pointer"
        >
          确认提交 (Space)
        </button>
      )}
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/components/relativeColor/VectorShiftView.tsx
~~~~~
~~~~~tsx
import { ArrowRight, Shuffle } from 'lucide-preact';
import { useEffect } from 'preact/hooks';
import { hsvToHex } from '../../utils/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../../utils/relativeColor';
import { HsvTrackSlider } from '../HsvTrackSlider';
import { ChoiceNafcContainer } from '../common/ChoiceNafcContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';

interface VectorShiftViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
  selectedIndex: number;
  onSelectIndex: (idx: number) => void;
  onSubmit: () => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function VectorShiftView({
  question,
  showAnswer,
  userAnswer,
  selectedIndex,
  onSelectIndex,
  onSubmit,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: VectorShiftViewProps) {
  const { colorA, colorB, colorC, targetD, options, correctIndex, difficultyLevel } = question;
  const activeColor = options?.[selectedIndex] ?? targetD;
  const userH = activeColor[0];
  const userS = activeColor[1];
  const userV = activeColor[2];

  const hexA = hsvToHex(...colorA);
  const hexB = hsvToHex(...colorB);
  const hexC = hsvToHex(...colorC);

  const hexSelectedD = hsvToHex(userH, userS, userV);
  const hexTargetD = hsvToHex(...targetD);

  const cH = colorC[0];
  const cS = colorC[1];
  const cV = colorC[2];

  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
  const satGradient = `linear-gradient(to right, ${hsvToHex(userH, 0, userV)}, ${hsvToHex(userH, 100, userV)})`;
  const valGradient = `linear-gradient(to right, #000000, ${hsvToHex(userH, 100, 100)})`;

  const cSatGradient = `linear-gradient(to right, ${hsvToHex(cH, 0, cV)}, ${hsvToHex(cH, 100, cV)})`;
  const cValGradient = `linear-gradient(to right, #000000, ${hsvToHex(cH, 100, 100)})`;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (disabled || showAnswer) return;
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        onSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, showAnswer, onSubmit]);

  const nafcOptions = (options || []).map((opt, idx) => {
    const isTarget = idx === correctIndex;
    const hexVal = hsvToHex(...opt);
    return {
      key: `vector-shift-opt-${idx}-${hexVal}`,
      title: `候选 ${idx + 1}`,
      value: opt,
      isCorrect: isTarget,
      content: (
        <div
          className="w-full aspect-[4/3] rounded-xl shadow-inner border border-white/60"
          style={{ backgroundColor: hexVal }}
        />
      ),
    };
  });

  return (
    <QuestionCardShell
      hintText="观察上方 A➔B 色彩推移，在候选区选出符合 C➔D 的同向推移色"
      hintIcon={Shuffle}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 w-full flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexA }}
          />
          <ArrowRight className="w-4 h-4 text-indigo-400" />
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexB }}
          />
        </div>

        <div className="flex items-center justify-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexC }}
          />
          <ArrowRight className="w-4 h-4 text-indigo-400" />
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md transition-all duration-150 relative overflow-hidden"
            style={{ backgroundColor: hexSelectedD }}
          >
            {showAnswer && (
              <div
                className="absolute bottom-0 left-0 right-0 h-1/2"
                style={{ backgroundColor: hexTargetD }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="w-full space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3 md:pr-4 md:border-r border-slate-200/60">
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={cH}
              max={360}
              unit="°"
              targetHSV={colorC}
              difficultyLevel={difficultyLevel}
              showAnswer={false}
              targetVal={cH}
              userVal={cH}
              allUserHSV={colorC}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={false}
              onValChange={() => {}}
            />
            <HsvTrackSlider
              label="S"
              gradient={cSatGradient}
              val={cS}
              max={100}
              unit="%"
              targetHSV={colorC}
              difficultyLevel={difficultyLevel}
              showAnswer={false}
              targetVal={cS}
              userVal={cS}
              allUserHSV={colorC}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={false}
              onValChange={() => {}}
            />
            <HsvTrackSlider
              label="V"
              gradient={cValGradient}
              val={cV}
              max={100}
              unit="%"
              targetHSV={colorC}
              difficultyLevel={difficultyLevel}
              showAnswer={false}
              targetVal={cV}
              userVal={cV}
              allUserHSV={colorC}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={false}
              onValChange={() => {}}
            />
          </div>

          <div className="space-y-3">
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={userH}
              max={360}
              unit="°"
              targetHSV={targetD}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetD[0]}
              userVal={userAnswer?.userD?.[0] ?? userH}
              isHit={userAnswer?.isHit}
              onValChange={() => {}}
              allUserHSV={[userH, userS, userV]}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
            />
            <HsvTrackSlider
              label="S"
              gradient={satGradient}
              val={userS}
              max={100}
              unit="%"
              targetHSV={targetD}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetD[1]}
              userVal={userAnswer?.userD?.[1] ?? userS}
              isHit={userAnswer?.isHit}
              onValChange={() => {}}
              allUserHSV={[userH, userS, userV]}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
            />
            <HsvTrackSlider
              label="V"
              gradient={valGradient}
              val={userV}
              max={100}
              unit="%"
              targetHSV={targetD}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetD[2]}
              userVal={userAnswer?.userD?.[2] ?? userV}
              isHit={userAnswer?.isHit}
              onValChange={() => {}}
              allUserHSV={[userH, userS, userV]}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
            />
          </div>
        </div>
      </div>

      <ChoiceNafcContainer
        options={nafcOptions}
        selectedIndex={selectedIndex}
        showAnswer={showAnswer}
        disabled={disabled}
        columns={4}
        onSelect={(idx) => onSelectIndex(idx)}
      />

      {!showAnswer && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
        >
          确认提交 (Space)
        </button>
      )}
    </QuestionCardShell>
  );
}
~~~~~

### 下一步建议
1. 运行 `npm run check` 与 `npm test` 验证 TypeScript 编译与 Vitest 测试。
2. 验证所有界面的键盘快捷键（1~4 键、Space 确认提交）是否在各种题型中都能顺畅工作。
3. 若测试全部通过，可生成 commit 计划并提交本次变更。
