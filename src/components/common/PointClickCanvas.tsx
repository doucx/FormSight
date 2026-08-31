import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { renderInteractivePointGrid } from '../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { useTranslation } from '../../core/i18n';
import { findNearestGridPoint } from '../../packs/star/utils/hitDetection';
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
  customOverlayRender?: (ctx: CanvasRenderingContext2D) => void;
  onCommitPoint: (point: Point) => void;
}

const LOUPE_SIZE = 104; // 放大镜直径 (px)

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
  customOverlayRender,
  onCommitPoint,
}: PointClickCanvasProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
  const [isTouching, setIsTouching] = useState<boolean>(false);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);
  const [currentCanvasPos, setCurrentCanvasPos] = useState<Point | null>(null);

  // 根据当前点阵包围盒跨度动态自适应放大倍率，确保视野至少完整容纳全部点阵
  const dynamicZoomFactor = useMemo(() => {
    if (!gridPoints || gridPoints.length < 2) return 2.2;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const p of gridPoints) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const spanX = maxX - minX;
    const spanY = maxY - minY;
    const maxSpan = Math.max(spanX, spanY);

    // 为点阵边缘保留适当边距
    const requiredCoverage = Math.max(maxSpan * 1.3, 36);
    const calculatedZoom = LOUPE_SIZE / requiredCoverage;
    return Math.max(1.1, Math.min(3.2, calculatedZoom));
  }, [gridPoints]);

  // 1. 渲染主画布内容
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

  // 2. 渲染放大镜画布内容
  const updateLoupeCanvas = useCallback(
    (focusPt: Point) => {
      const mainCanvas = canvasRef.current;
      const loupeCanvas = loupeCanvasRef.current;
      if (!mainCanvas || !loupeCanvas) return;

      const loupeCtx = setupHiDpiCanvas(loupeCanvas, LOUPE_SIZE, LOUPE_SIZE);
      if (!loupeCtx) return;

      loupeCtx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
      loupeCtx.fillStyle = '#FFFFFF';
      loupeCtx.fillRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);

      // 主画布采样的视口区域（直接以触控点为中心，不进行强制边界或网格吸附）
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const sampleSize = LOUPE_SIZE / dynamicZoomFactor;
      const sx = (focusPt.x - sampleSize / 2) * dpr;
      const sy = (focusPt.y - sampleSize / 2) * dpr;
      const sSize = sampleSize * dpr;

      // 绘制放大图像
      loupeCtx.drawImage(mainCanvas, sx, sy, sSize, sSize, 0, 0, LOUPE_SIZE, LOUPE_SIZE);

      // 绘制中心十字准星
      const center = LOUPE_SIZE / 2;
      loupeCtx.strokeStyle = '#4F46E5';
      loupeCtx.lineWidth = 1.5;

      // 环形中心靶心
      loupeCtx.beginPath();
      loupeCtx.arc(center, center, 8, 0, Math.PI * 2);
      loupeCtx.stroke();

      // 十字延伸刻度
      loupeCtx.beginPath();
      loupeCtx.moveTo(center - 14, center);
      loupeCtx.lineTo(center - 4, center);
      loupeCtx.moveTo(center + 4, center);
      loupeCtx.lineTo(center + 14, center);
      loupeCtx.moveTo(center, center - 14);
      loupeCtx.lineTo(center, center - 4);
      loupeCtx.moveTo(center, center + 4);
      loupeCtx.lineTo(center, center + 14);
      loupeCtx.stroke();
    },
    [dynamicZoomFactor],
  );

  // 3. 屏幕坐标换算为画布坐标
  const getCanvasCoordinates = useCallback(
    (
      clientX: number,
      clientY: number,
    ): { canvasPoint: Point; relX: number; relY: number } | null => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return null;

      const rect = canvas.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const scaleX = canvasSize / rect.width;
      const scaleY = canvasSize / rect.height;

      const clickX = Math.round((clientX - rect.left) * scaleX * 100) / 100;
      const clickY = Math.round((clientY - rect.top) * scaleY * 100) / 100;

      const relX = clientX - containerRect.left;
      const relY = clientY - containerRect.top;

      return {
        canvasPoint: { x: clickX, y: clickY },
        relX,
        relY,
      };
    },
    [canvasSize],
  );

  // 鼠标悬停与移动
  const handleMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer || !gridPoints.length || isTouching) return;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const { nearestPoint, isWithinRange } = findNearestGridPoint(coords.canvasPoint, gridPoints);

    if (isWithinRange) {
      setHoverPoint(nearestPoint);
    } else if (hoverPoint) {
      setHoverPoint(null);
    }
  };

  const handleMouseLeave = () => {
    if (!isTouching && hoverPoint) setHoverPoint(null);
  };

  // 鼠标普通点击
  const handleClick = (e: MouseEvent) => {
    if (disabled || showAnswer || !gridPoints.length || isTouching) return;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const { nearestPoint, isWithinRange } = findNearestGridPoint(coords.canvasPoint, gridPoints);
    if (!isWithinRange) return;

    setHoverPoint(null);
    onCommitPoint(nearestPoint);
  };

  // 触控开始
  const handleTouchStart = (e: TouchEvent) => {
    if (disabled || showAnswer || !gridPoints.length || !e.touches[0]) return;
    const touch = e.touches[0];
    const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;

    setIsTouching(true);
    setCurrentCanvasPos(coords.canvasPoint);

    // 放大镜稳定位于手指正上方 75px，不进行翻转
    setLoupePos({
      x: coords.relX,
      y: coords.relY - 75,
    });

    const { nearestPoint, isWithinRange } = findNearestGridPoint(coords.canvasPoint, gridPoints);
    setHoverPoint(isWithinRange ? nearestPoint : null);
    updateLoupeCanvas(coords.canvasPoint);
  };

  // 触控移动
  const handleTouchMove = (e: TouchEvent) => {
    if (disabled || showAnswer || !gridPoints.length || !e.touches[0] || !isTouching) return;
    if (e.cancelable) e.preventDefault();

    const touch = e.touches[0];
    const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;

    setCurrentCanvasPos(coords.canvasPoint);

    // 放大镜稳定位于手指正上方 75px，不进行翻转
    setLoupePos({
      x: coords.relX,
      y: coords.relY - 75,
    });

    const { nearestPoint, isWithinRange } = findNearestGridPoint(coords.canvasPoint, gridPoints);
    setHoverPoint(isWithinRange ? nearestPoint : null);
    updateLoupeCanvas(coords.canvasPoint);
  };

  // 触控松手确认提交
  const handleTouchEnd = () => {
    if (disabled || showAnswer || !isTouching) return;
    setIsTouching(false);
    setLoupePos(null);

    if (hoverPoint) {
      const commitPt = hoverPoint;
      setHoverPoint(null);
      onCommitPoint(commitPt);
    } else if (currentCanvasPos) {
      const { nearestPoint, isWithinRange } = findNearestGridPoint(currentCanvasPos, gridPoints);
      if (isWithinRange) {
        setHoverPoint(null);
        onCommitPoint(nearestPoint);
      }
    }
  };

  const handleTouchCancel = () => {
    setIsTouching(false);
    setLoupePos(null);
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
        className={`w-full h-full aspect-square rounded-xl border border-gray-100 bg-white shadow-inner touch-none transition-all block ${
          disabled || showAnswer
            ? 'cursor-default'
            : hoverPoint
              ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
              : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
        }`}
      />

      {/* 触控浮动放大镜 (Loupe) */}
      {isTouching && loupePos && (
        <div
          className="absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-600 shadow-2xl bg-white ring-4 ring-indigo-500/25 overflow-hidden animate-in zoom-in-75 duration-75"
          style={{
            left: `${loupePos.x}px`,
            top: `${loupePos.y}px`,
            width: `${LOUPE_SIZE}px`,
            height: `${LOUPE_SIZE}px`,
          }}
        >
          <canvas
            ref={loupeCanvasRef}
            width={LOUPE_SIZE}
            height={LOUPE_SIZE}
            className="w-full h-full block"
          />
        </div>
      )}
    </div>
  );
}
