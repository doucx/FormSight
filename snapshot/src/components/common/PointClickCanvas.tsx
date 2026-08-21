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