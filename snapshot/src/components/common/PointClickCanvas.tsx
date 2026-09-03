import { useEffect, useState } from 'preact/hooks';
import { renderInteractivePointGrid } from '../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { findNearestPointInGrid } from '../../core/geometry/pointGrid';
import { useTranslation } from '../../core/i18n';
import { LOUPE_DIAMETER, usePointLoupe } from '../../hooks/usePointLoupe';
import type { Point } from '../../types';

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

  // 渲染主画布内容
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = setupHiDpiCanvas(canvas, canvasSize, canvasSize);
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
    canvasRef,
  ]);

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
        aria-label={t('shell.pointGridAria')}
        className={`w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner touch-none transition-all block ${
          disabled || showAnswer
            ? 'cursor-default'
            : hoverPoint
              ? 'cursor-none hover:border-primary/60 hover:shadow-indigo-50/50'
              : 'cursor-crosshair hover:border-primary/60 hover:shadow-indigo-50/50'
        }`}
      />

      {isTouching && loupePos && (
        <div
          className="absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-600 dark:border-indigo-500 shadow-2xl bg-card ring-4 ring-indigo-500/25 overflow-hidden animate-in zoom-in-75 duration-75"
          style={{
            left: `${loupePos.x}px`,
            top: `${loupePos.y}px`,
            width: `${LOUPE_DIAMETER}px`,
            height: `${LOUPE_DIAMETER}px`,
          }}
        >
          <canvas
            ref={loupeCanvasRef}
            width={LOUPE_DIAMETER}
            height={LOUPE_DIAMETER}
            className="w-full h-full block"
          />
        </div>
      )}
    </div>
  );
}