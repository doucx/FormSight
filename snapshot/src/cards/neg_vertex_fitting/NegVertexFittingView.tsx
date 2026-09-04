import { useEffect, useRef, useState } from 'preact/hooks';

import { FITTING_CANVAS_SIZE, type HitResult, type QuestionData } from './types';
import {
  CANVAS_THEME,
  drawDot,
  drawPolygonCanvas,
  findNearestPointInGrid,
  getDynamicDotRadius,
  hexToRgba,
  LOUPE_DIAMETER,
  Point,
  setupHiDpiCanvas,
  useCardTranslation,
  usePointLoupe
} from '@formsight/card-sdk';

export interface NegVertexFittingViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userPoint: Point) => void;
  disabled?: boolean;
}

export function NegVertexFittingView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: NegVertexFittingViewProps) {
  const { t } = useCardTranslation('neg_vertex_fitting');
  const leftFittingRef = useRef<HTMLCanvasElement | null>(null);
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
    canvasSize: FITTING_CANVAS_SIZE,
    gridPoints: question.distractorPoints || [],
    disabled: disabled || showAnswer,
  });

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

  // 2. 渲染右侧交互画布 (背景截断多边形 + 点阵 + 辅助线 + 答案揭晓)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = setupHiDpiCanvas(canvas, FITTING_CANVAS_SIZE, FITTING_CANVAS_SIZE);
    if (!ctx) return;

    ctx.fillStyle = CANVAS_THEME.bg.primary;
    ctx.fillRect(0, 0, FITTING_CANVAS_SIZE, FITTING_CANVAS_SIZE);

    // 绘制截断多边形主体
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

    // 答案揭晓时绘制理论完整多边形轮廓虚线
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

    // 绘制离散候选点阵
    const dotRadius = getDynamicDotRadius(question.distractorPoints || []);
    const hoverRadius = Math.max(2.5, dotRadius * 1.6);

    for (const p of question.distractorPoints || []) {
      drawDot(ctx, p.x, p.y, CANVAS_THEME.pointGrid.dotDefault, dotRadius);
    }

    // 悬停指示
    if (!disabled && !showAnswer && hoverPoint) {
      drawDot(ctx, hoverPoint.x, hoverPoint.y, CANVAS_THEME.pointGrid.dotHover, hoverRadius);
    }

    // 答案揭晓标记
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
  }, [
    question.truncatedVertices,
    question.vertices,
    question.distractorPoints,
    question.targetPoint,
    hoverPoint,
    showAnswer,
    userAnswer,
    disabled,
    canvasRef,
  ]);

  const handleMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer || isTouching) return;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(
      coords.canvasPoint,
      question.distractorPoints,
    );
    setHoverPoint(isWithinRange ? nearestPoint : null);
  };

  const handleMouseLeave = () => {
    if (!isTouching && hoverPoint) setHoverPoint(null);
  };

  const handleClick = (e: MouseEvent) => {
    if (disabled || showAnswer || isTouching) return;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(
      coords.canvasPoint,
      question.distractorPoints,
    );
    if (!isWithinRange) return;

    setHoverPoint(null);
    onAnswer(nearestPoint);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (!e.touches[0]) return;
    const pt = startTouch(e.touches[0].clientX, e.touches[0].clientY);
    if (!pt) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(pt, question.distractorPoints);
    setHoverPoint(isWithinRange ? nearestPoint : null);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!e.touches[0]) return;
    if (e.cancelable) e.preventDefault();

    const pt = moveTouch(e.touches[0].clientX, e.touches[0].clientY);
    if (!pt) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(pt, question.distractorPoints);
    setHoverPoint(isWithinRange ? nearestPoint : null);
  };

  const handleTouchEnd = () => {
    if (disabled || showAnswer || !isTouching) return;
    endTouch();

    if (hoverPoint) {
      const commitPt = hoverPoint;
      setHoverPoint(null);
      onAnswer(commitPt);
    } else if (currentCanvasPos) {
      const { nearestPoint, isWithinRange } = findNearestPointInGrid(
        currentCanvasPos,
        question.distractorPoints,
      );
      if (isWithinRange) {
        setHoverPoint(null);
        onAnswer(nearestPoint);
      }
    }
  };

  const handleTouchCancel = () => {
    endTouch();
    setHoverPoint(null);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <canvas
          ref={leftFittingRef}
          width={FITTING_CANVAS_SIZE}
          height={FITTING_CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
        />
      </div>

      <div
        ref={containerRef}
        className="relative flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center select-none"
      >
        <canvas
          ref={canvasRef}
          width={FITTING_CANVAS_SIZE}
          height={FITTING_CANVAS_SIZE}
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
          aria-label={t('vertexHint')}
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
    </div>
  );
}
