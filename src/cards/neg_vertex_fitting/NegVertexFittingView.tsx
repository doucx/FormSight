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
