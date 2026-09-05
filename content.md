好的，我们将根据之前的架构分析开始执行重构。我们将把放大镜抽离为独立的视觉基元 `LoupeOverlay`，并构建基于“组合优于继承”的通用交互式画布 `InteractivePointCanvas`，随后改造 `PointClickCanvas` 与 `NegVertexFittingView`，消除两处重复的代码与手势逻辑。

## [WIP] refactor(canvas): 将放大镜与交互画布解耦为组合式架构

### 用户需求
针对 `star` 系列卡片与 `neg_vertex_fitting`（负形边界反切定点）中重复实现的触控放大镜与拾点逻辑进行重构。抽离放大镜独立组件，重构 `PointClickCanvas` 为职责单一、支持图层组合注入的模块，消除冗余代码。

### 评论
这是一次关键的架构提炼。将原先僵化的 `PointClickCanvas` 解构为“输入/手势/放大镜容器 (`InteractivePointCanvas`)”与“纯视觉浮层 (`LoupeOverlay`)”，不仅让 `NegVertexFittingView` 摆脱了 130 余行重复手势与 DOM 样板代码，更为后续所有需要自定义几何底图、引导线或多边形点阵的认知卡片提供了统一、高内聚的交互底座。

### 目标
1. 新建 `src/components/common/LoupeOverlay.tsx`，将放大镜浮层 DOM、主题样式与边界渲染隔离为独立的原子组件。
2. 新建 `src/components/common/InteractivePointCanvas.tsx`，集中托管 HiDPI 调度、触控放大镜联动、离散邻近点吸附计算，并通过 `onDraw` 暴露 Render Props 组合插槽。
3. 重构 `src/components/common/PointClickCanvas.tsx`，将其改造为基于 `InteractivePointCanvas` 的轻量组合封装，维持 100% 向后兼容。
4. 在 `src/card-sdk/index.ts` 中导出新增的 `LoupeOverlay` 与 `InteractivePointCanvas`。
5. 重构 `src/cards/neg_vertex_fitting/NegVertexFittingView.tsx`，移除冗余手势与放大镜代码，接入 `InteractivePointCanvas`。

### 基本原理
- **单一职责原则 (SRP)**：放大镜浮层只关心浮动位置与渲染画布；交互容器只关心输入事件到网格坐标的映射与状态流转；业务卡片只关心各自特定图层的绘制顺序。
- **组合优于继承 (Composition over Inheritance)**：不再通过在单个大组件中硬编码绘制逻辑来应对多样化需求，而是通过 `onDraw(drawContext)` 注入图层渲染回调，使得多边形、虚线轮廓与标准点阵可以自由排列堆叠。

### 标签
#intent/refine #flow/ready #priority/high #comp/interfaces #concept/ui #scope/core #scope/dx #ai/instruct #task/domain/ui #task/object/interactive-point-canvas #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 创建独立的放大镜浮层原子组件 LoupeOverlay

创建纯视觉组件 `LoupeOverlay.tsx`，负责承载放大镜的绝对定位、光标居中位移以及主题光环样式。

~~~~~act
write_file
src/components/common/LoupeOverlay.tsx
~~~~~
~~~~~tsx
import type { Ref } from 'preact';
import { LOUPE_DIAMETER } from '../../hooks/usePointLoupe';

export interface LoupeOverlayProps {
  visible: boolean;
  position: { x: number; y: number } | null;
  loupeCanvasRef: Ref<HTMLCanvasElement>;
  diameter?: number;
  className?: string;
}

/**
 * 纯视觉放大镜浮层基元组件
 * 独立托管悬浮定位、放大镜边界阴影及放大画布挂载，与具体业务画布绘制解耦
 */
export function LoupeOverlay({
  visible,
  position,
  loupeCanvasRef,
  diameter = LOUPE_DIAMETER,
  className = '',
}: LoupeOverlayProps) {
  if (!visible || !position) return null;

  return (
    <div
      className={`absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-600 dark:border-indigo-500 shadow-2xl bg-card ring-4 ring-indigo-500/25 overflow-hidden animate-in zoom-in-75 duration-75 ${className}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${diameter}px`,
        height: `${diameter}px`,
      }}
    >
      <canvas
        ref={loupeCanvasRef}
        width={diameter}
        height={diameter}
        className="w-full h-full block"
      />
    </div>
  );
}
~~~~~

#### Acts 2: 创建通用交互画布容器 InteractivePointCanvas

创建 `InteractivePointCanvas.tsx`，集中处理 Canvas 初始化、鼠标/触摸手势捕获、邻近网格点吸附及放大镜组装，通过 `onDraw` 向上提供纯粹的渲染插槽。

~~~~~act
write_file
src/components/common/InteractivePointCanvas.tsx
~~~~~
~~~~~tsx
import { useEffect, useState } from 'preact/hooks';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { findNearestPointInGrid } from '../../core/geometry/pointGrid';
import { useTranslation } from '../../core/i18n';
import { usePointLoupe } from '../../hooks/usePointLoupe';
import type { Point } from '../../types';
import { LoupeOverlay } from './LoupeOverlay';

export interface CanvasDrawContext {
  ctx: CanvasRenderingContext2D;
  canvasSize: number;
  hoverPoint: Point | null;
  isAnswerRevealed: boolean;
  disabled: boolean;
}

export interface InteractivePointCanvasProps {
  canvasSize: number;
  gridPoints: Point[];
  disabled?: boolean;
  showAnswer?: boolean;
  maxDisplayWidth?: string;
  ariaLabel?: string;
  onCommitPoint: (point: Point) => void;
  onDraw: (context: CanvasDrawContext) => void;
}

/**
 * 通用交互式点阵画布基元
 * 托管 HiDPI 初始化、鼠标吸附/悬停、Touch/Loupe 触控放大手势，并通过 onDraw 回调暴露多层绘制插槽
 */
export function InteractivePointCanvas({
  canvasSize,
  gridPoints,
  disabled = false,
  showAnswer = false,
  maxDisplayWidth = 'w-full h-full aspect-square',
  ariaLabel,
  onCommitPoint,
  onDraw,
}: InteractivePointCanvasProps) {
  const { t } = useTranslation();
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  const {
    containerRef,
    canvasRef,
    loupeCanvasRef,
    isTouching,
    loupePos,
    currentCanvasPos,
    startTouch,
    moveTouch,
    endTouch,
    getCanvasCoordinates,
  } = usePointLoupe({
    canvasSize,
    gridPoints,
    disabled: disabled || showAnswer || !gridPoints.length,
  });

  // 统一的 HiDPI 渲染调度
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = setupHiDpiCanvas(canvas, canvasSize, canvasSize);
    if (!ctx) return;

    onDraw({
      ctx,
      canvasSize,
      hoverPoint,
      isAnswerRevealed: showAnswer,
      disabled,
    });
  }, [canvasSize, hoverPoint, showAnswer, disabled, onDraw, canvasRef]);

  const handleMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer || !gridPoints.length || isTouching) return;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(coords.canvasPoint, gridPoints);
    if (isWithinRange) {
      setHoverPoint(nearestPoint);
    } else if (hoverPoint) {
      setHoverPoint(null);
    }
  };

  const handleMouseLeave = () => {
    if (!isTouching && hoverPoint) setHoverPoint(null);
  };

  const handleClick = (e: MouseEvent) => {
    if (disabled || showAnswer || !gridPoints.length || isTouching) return;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(coords.canvasPoint, gridPoints);
    if (!isWithinRange) return;

    setHoverPoint(null);
    onCommitPoint(nearestPoint);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (!e.touches[0]) return;
    const pt = startTouch(e.touches[0].clientX, e.touches[0].clientY);
    if (!pt) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(pt, gridPoints);
    setHoverPoint(isWithinRange ? nearestPoint : null);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!e.touches[0]) return;
    if (e.cancelable) e.preventDefault();

    const pt = moveTouch(e.touches[0].clientX, e.touches[0].clientY);
    if (!pt) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(pt, gridPoints);
    setHoverPoint(isWithinRange ? nearestPoint : null);
  };

  const handleTouchEnd = () => {
    if (disabled || showAnswer || !isTouching) return;
    endTouch();

    if (hoverPoint) {
      const commitPt = hoverPoint;
      setHoverPoint(null);
      onCommitPoint(commitPt);
    } else if (currentCanvasPos) {
      const { nearestPoint, isWithinRange } = findNearestPointInGrid(currentCanvasPos, gridPoints);
      if (isWithinRange) {
        setHoverPoint(null);
        onCommitPoint(nearestPoint);
      }
    }
  };

  const handleTouchCancel = () => {
    endTouch();
    setHoverPoint(null);
  };

  return (
    <div ref={containerRef} className={`relative block ${maxDisplayWidth} select-none`}>
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
        }}
        tabIndex={0}
        role="button"
        aria-label={ariaLabel || t('shell.pointGridAria')}
        className={`w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner touch-none transition-all block ${
          disabled || showAnswer
            ? 'cursor-default'
            : hoverPoint
              ? 'cursor-none hover:border-primary/60 hover:shadow-indigo-50/50'
              : 'cursor-crosshair hover:border-primary/60 hover:shadow-indigo-50/50'
        }`}
      />

      <LoupeOverlay
        visible={isTouching}
        position={loupePos}
        loupeCanvasRef={loupeCanvasRef}
      />
    </div>
  );
}
~~~~~

#### Acts 3: 重构 PointClickCanvas 为基于 InteractivePointCanvas 的轻量组合封装

将 `PointClickCanvas.tsx` 中的手势和 DOM 逻辑全部剥离，转为直接使用 `InteractivePointCanvas` 结合 `renderInteractivePointGrid` 进行图层组合，保持现有入参 API 100% 不变。

~~~~~act
write_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~tsx
import { useCallback } from 'preact/hooks';
import { renderInteractivePointGrid } from '../../core/canvas/drawPointGrid';
import type { Point } from '../../types';
import {
  type CanvasDrawContext,
  InteractivePointCanvas,
} from './InteractivePointCanvas';

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
  onCommitPoint: (point: Point) => void;
}

/**
 * 经典标准点阵交互画布
 * 内部基于组合式 InteractivePointCanvas 实现，维持对外 API 100% 稳定向后兼容
 */
export function PointClickCanvas({
  canvasSize,
  gridPoints,
  targetPoint,
  userNearestPoint,
  anchors = [],
  showAnswer,
  isHit = false,
  disabled = false,
  maxDisplayWidth = 'w-full h-full aspect-square',
  onCommitPoint,
}: PointClickCanvasProps) {
  const handleDraw = useCallback(
    ({ ctx, hoverPoint }: CanvasDrawContext) => {
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
    },
    [
      canvasSize,
      gridPoints,
      targetPoint,
      userNearestPoint,
      anchors,
      showAnswer,
      isHit,
      disabled,
    ],
  );

  return (
    <InteractivePointCanvas
      canvasSize={canvasSize}
      gridPoints={gridPoints}
      disabled={disabled}
      showAnswer={showAnswer}
      maxDisplayWidth={maxDisplayWidth}
      onCommitPoint={onCommitPoint}
      onDraw={handleDraw}
    />
  );
}
~~~~~

#### Acts 4: 在 Card SDK 中导出新增的原子与容器组件

在 `src/card-sdk/index.ts` 中导出 `InteractivePointCanvas`、`LoupeOverlay` 以及对应的类型定义，供所有卡片统一引用。

~~~~~act
patch_file
src/card-sdk/index.ts
~~~~~
~~~~~typescript
export {
  PointClickCanvas,
  type PointClickCanvasProps,
} from '../components/common/PointClickCanvas';
export { HsvTrackSlider, type HsvTrackSliderProps } from '../components/common/HsvTrackSlider';
~~~~~
~~~~~typescript
export {
  PointClickCanvas,
  type PointClickCanvasProps,
} from '../components/common/PointClickCanvas';
export {
  InteractivePointCanvas,
  type InteractivePointCanvasProps,
  type CanvasDrawContext,
} from '../components/common/InteractivePointCanvas';
export {
  LoupeOverlay,
  type LoupeOverlayProps,
} from '../components/common/LoupeOverlay';
export { HsvTrackSlider, type HsvTrackSliderProps } from '../components/common/HsvTrackSlider';
~~~~~

#### Acts 5: 重构 NegVertexFittingView 接入 InteractivePointCanvas

全面移除 `NegVertexFittingView.tsx` 中重复手写的 `usePointLoupe`、手势事件监听与放大镜 DOM，改用 `InteractivePointCanvas` 的 `onDraw` 注入截断多边形与点阵绘制。

~~~~~act
write_file
src/cards/neg_vertex_fitting/NegVertexFittingView.tsx
~~~~~
~~~~~tsx
import { Crosshair } from 'lucide-preact';
import { useCallback, useEffect, useRef } from 'preact/hooks';

import {
  CANVAS_THEME,
  type CanvasDrawContext,
  InteractivePointCanvas,
  type Point,
  QuestionCardShell,
  drawDot,
  drawPolygonCanvas,
  getDynamicDotRadius,
  hexToRgba,
  useCardTranslation,
} from '@formsight/card-sdk';
import { FITTING_CANVAS_SIZE, type HitResult, type QuestionData } from './types';

export interface NegVertexFittingViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userPoint: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function NegVertexFittingView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: NegVertexFittingViewProps) {
  const { t } = useCardTranslation('neg_vertex_fitting');
  const leftFittingRef = useRef<HTMLCanvasElement | null>(null);

  // 1. 渲染左侧参考多边形
  useEffect(() => {
    if (!question.vertices) return;
    drawPolygonCanvas({
      canvas: leftFittingRef.current,
      vertices: question.vertices,
      size: FITTING_CANVAS_SIZE,
      fillColor: CANVAS_THEME.shape.fill,
      strokeColor: CANVAS_THEME.shape.stroke,
    });
  }, [question.vertices]);

  // 2. 自定义右侧交互画布的多图层绘制
  const handleDraw = useCallback(
    ({ ctx, canvasSize, hoverPoint }: CanvasDrawContext) => {
      ctx.fillStyle = CANVAS_THEME.bg.primary;
      ctx.fillRect(0, 0, canvasSize, canvasSize);

      // 图层 1: 绘制截断多边形主体
      if (question.truncatedVertices && question.truncatedVertices.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(question.truncatedVertices[0].x, question.truncatedVertices[0].y);
        for (let i = 1; i < question.truncatedVertices.length; i++) {
          ctx.lineTo(question.truncatedVertices[i].x, question.truncatedVertices[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = CANVAS_THEME.shape.fill;
        ctx.fill();
        ctx.strokeStyle = CANVAS_THEME.shape.stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 图层 2: 答案揭晓时绘制理论完整多边形轮廓虚线
      if (showAnswer && question.vertices) {
        ctx.beginPath();
        ctx.moveTo(question.vertices[0].x, question.vertices[0].y);
        for (let i = 1; i < question.vertices.length; i++) {
          ctx.lineTo(question.vertices[i].x, question.vertices[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = hexToRgba(CANVAS_THEME.status.hit, 0.7);
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 图层 3: 绘制离散候选点阵
      const dotRadius = getDynamicDotRadius(question.distractorPoints || []);
      const hoverRadius = Math.max(2.5, dotRadius * 1.6);

      for (const p of question.distractorPoints || []) {
        drawDot(ctx, p.x, p.y, CANVAS_THEME.pointGrid.dotDefault, dotRadius);
      }

      // 图层 4: 悬停吸附指示
      if (!disabled && !showAnswer && hoverPoint) {
        drawDot(ctx, hoverPoint.x, hoverPoint.y, CANVAS_THEME.pointGrid.dotHover, hoverRadius);
      }

      // 图层 5: 答案揭晓标记 (目标位置与用户错选点)
      if (showAnswer && question.targetPoint) {
        drawDot(
          ctx,
          question.targetPoint.x,
          question.targetPoint.y,
          CANVAS_THEME.pointGrid.crosshairTarget,
          dotRadius * 1.4,
        );

        if (userAnswer?.nearestGridPoint && !userAnswer.isHit) {
          drawDot(
            ctx,
            userAnswer.nearestGridPoint.x,
            userAnswer.nearestGridPoint.y,
            CANVAS_THEME.pointGrid.dotMiss,
            dotRadius * 1.3,
          );
        }
      }
    },
    [
      question.truncatedVertices,
      question.vertices,
      question.distractorPoints,
      question.targetPoint,
      showAnswer,
      userAnswer,
      disabled,
    ],
  );

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Crosshair}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-5xl"
    >
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full mx-auto">
        <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
          <canvas
            ref={leftFittingRef}
            width={FITTING_CANVAS_SIZE}
            height={FITTING_CANVAS_SIZE}
            className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
          />
        </div>

        <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
          <InteractivePointCanvas
            canvasSize={FITTING_CANVAS_SIZE}
            gridPoints={question.distractorPoints || []}
            disabled={disabled}
            showAnswer={showAnswer}
            ariaLabel={t('hint')}
            onCommitPoint={onAnswer}
            onDraw={handleDraw}
          />
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

### 下一步建议
1. **构建验证**：运行 `npm run build` 或 `npm run test` 确保所有 TypeScript 类型定义与卡片组件均正常通过检查。
2. **交互体验测试**：启动本地开发环境，测试 `star_single`、`star_double_h`、`star_double_r` 以及 `neg_vertex_fitting` 在移动端与桌面端的触摸放大镜及点击响应，确保吸附与视觉行为与原先完全一致。
3. **提交与归档**：在完成验证后，可执行独立的 Git 提交计划。
