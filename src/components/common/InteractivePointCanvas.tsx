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