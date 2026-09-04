import { Box } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import type { PerspStructure3DHitResult, PerspStructure3DQuestion } from './types';
import {
  CANVAS_THEME,
  LOUPE_DIAMETER,
  PERSPECTIVE_CANVAS_SIZE,
  QuestionCardShell,
  draw3DCubeWireframe,
  drawDot,
  findNearestPointInGrid,
  getDynamicDotRadius,
  setupHiDpiCanvas,
  useCardTranslation,
  usePointLoupe,
} from '@formsight/card-sdk';
import type { Point } from '@formsight/card-sdk';

export interface PerspStructure3DViewProps {
  question: PerspStructure3DQuestion;
  showAnswer: boolean;
  userAnswer: PerspStructure3DHitResult | null;
  onAnswer: (point: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function PerspStructure3DView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: PerspStructure3DViewProps) {
  const { t } = useCardTranslation('persp_structure_3d');
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  const targetPt3D = question.targetPoint3D;
  const dim = question.gridDim3D ?? 3;

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
    canvasSize: PERSPECTIVE_CANVAS_SIZE,
    gridPoints: question.projectedGridPoints || [],
    disabled: disabled || showAnswer,
  });

  // 自治渲染 3D 轴测网格与点阵
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = setupHiDpiCanvas(canvas, PERSPECTIVE_CANVAS_SIZE, PERSPECTIVE_CANVAS_SIZE);
    if (!ctx) return;

    ctx.fillStyle = CANVAS_THEME.bg.primary;
    ctx.fillRect(0, 0, PERSPECTIVE_CANVAS_SIZE, PERSPECTIVE_CANVAS_SIZE);

    // 绘制 3D 轴测立方体线框
    const center = {
      x: PERSPECTIVE_CANVAS_SIZE / 2,
      y: PERSPECTIVE_CANVAS_SIZE / 2 + 10,
    };
    const scale = dim === 4 ? 42 : 55;
    draw3DCubeWireframe(ctx, center, scale, dim);

    // 绘制轴测点阵
    const dotRadius = getDynamicDotRadius(question.projectedGridPoints || []);
    const hoverRadius = Math.max(2.5, dotRadius * 1.6);

    for (const p of question.projectedGridPoints || []) {
      drawDot(ctx, p.x, p.y, CANVAS_THEME.pointGrid.dotDefault, dotRadius);
    }

    if (!disabled && !showAnswer && hoverPoint) {
      drawDot(ctx, hoverPoint.x, hoverPoint.y, CANVAS_THEME.pointGrid.dotHover, hoverRadius);
    }

    if (showAnswer && question.targetProjectedPoint) {
      drawDot(
        ctx,
        question.targetProjectedPoint.x,
        question.targetProjectedPoint.y,
        CANVAS_THEME.pointGrid.crosshairTarget,
        dotRadius * 1.5,
      );

      if (userAnswer?.userValue && !userAnswer.isHit) {
        drawDot(
          ctx,
          userAnswer.userValue.x,
          userAnswer.userValue.y,
          CANVAS_THEME.pointGrid.dotMiss,
          dotRadius * 1.4,
        );
      }
    }
  }, [
    question.projectedGridPoints,
    question.targetProjectedPoint,
    dim,
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
      question.projectedGridPoints,
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
      question.projectedGridPoints,
    );
    if (!isWithinRange) return;

    setHoverPoint(null);
    onAnswer(nearestPoint);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (!e.touches[0]) return;
    const pt = startTouch(e.touches[0].clientX, e.touches[0].clientY);
    if (!pt) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(
      pt,
      question.projectedGridPoints,
    );
    setHoverPoint(isWithinRange ? nearestPoint : null);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!e.touches[0]) return;
    if (e.cancelable) e.preventDefault();

    const pt = moveTouch(e.touches[0].clientX, e.touches[0].clientY);
    if (!pt) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(
      pt,
      question.projectedGridPoints,
    );
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
        question.projectedGridPoints,
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
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Box}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full items-center">
        {/* 左侧三视图正交切面预览 */}
        <div className="bg-muted/60 p-4 rounded-2xl border border-border flex flex-col gap-3">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">
            {t('common.viewTriAxis')}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-muted-foreground">
            {/* 顶视图 (X-Z) */}
            <div className="flex flex-col items-center gap-1 bg-card p-2 rounded-xl border border-border">
              <span className="text-muted-foreground font-bold">{t('common.topView')}</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 dark:border-indigo-900 rounded grid relative bg-muted/40"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.x + 0.5) / dim) * 100}%`,
                      top: `${((targetPt3D.z + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* 正视图 (X-Y) */}
            <div className="flex flex-col items-center gap-1 bg-card p-2 rounded-xl border border-border">
              <span className="text-muted-foreground font-bold">{t('common.frontView')}</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 dark:border-indigo-900 rounded grid relative bg-muted/40"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.x + 0.5) / dim) * 100}%`,
                      top: `${((dim - 1 - targetPt3D.y + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* 侧视图 (Z-Y) */}
            <div className="flex flex-col items-center gap-1 bg-card p-2 rounded-xl border border-border">
              <span className="text-muted-foreground font-bold">{t('common.sideView')}</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 dark:border-indigo-900 rounded grid relative bg-muted/40"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.z + 0.5) / dim) * 100}%`,
                      top: `${((dim - 1 - targetPt3D.y + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧 3D 立方体透视交互点阵 */}
        <div
          ref={containerRef}
          className="relative flex justify-center w-full max-w-[340px] aspect-square mx-auto select-none"
        >
          <canvas
            ref={canvasRef}
            width={PERSPECTIVE_CANVAS_SIZE}
            height={PERSPECTIVE_CANVAS_SIZE}
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
            aria-label={t('hint')}
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
    </QuestionCardShell>
  );
}
