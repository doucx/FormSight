import { Check, Columns, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Point } from '../../types';
import { drawPolygonCanvas } from '../../utils/canvas/drawPolygon';
import {
  findNearestGridPoint,
  getDynamicCrosshairMetrics,
  getDynamicDotRadius,
} from '../../utils/geometry';
import {
  FITTING_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../../utils/negativeSpace';

interface VertexFittingViewProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (clickPoint: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  radius: number,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
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
  const rightFittingRef = useRef<HTMLCanvasElement | null>(null);
  const [fittingHoverPoint, setFittingHoverPoint] = useState<Point | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset hover point when question changes
  useEffect(() => {
    setFittingHoverPoint(null);
  }, [question.id]);

  useEffect(() => {
    if (!question.vertices) return;

    drawPolygonCanvas({
      canvas: leftFittingRef.current,
      vertices: question.vertices,
      size: FITTING_CANVAS_SIZE,
      fillColor: '#0F172A',
      strokeColor: '#1E293B',
    });

    const rightCanvas = rightFittingRef.current;
    if (rightCanvas) {
      const ctx = rightCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, FITTING_CANVAS_SIZE, FITTING_CANVAS_SIZE);

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

        const distractorPoints = question.distractorPoints || [];
        const dotRadius = getDynamicDotRadius(distractorPoints);
        const hoverRadius = Math.max(2.5, dotRadius * 1.6);

        for (const p of distractorPoints) {
          drawDot(ctx, p.x, p.y, '#888888', dotRadius);
        }

        if (!disabled && !showAnswer && fittingHoverPoint) {
          drawDot(ctx, fittingHoverPoint.x, fittingHoverPoint.y, '#4F46E5', hoverRadius);
        }

        if (showAnswer && question.targetPoint) {
          const { x: tx, y: ty } = question.targetPoint;
          const { size: chSize, lineWidth: chLineWidth } =
            getDynamicCrosshairMetrics(distractorPoints);

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

          ctx.strokeStyle = '#00AA00';
          ctx.lineWidth = chLineWidth;
          ctx.beginPath();
          ctx.moveTo(tx - chSize, ty);
          ctx.lineTo(tx + chSize, ty);
          ctx.moveTo(tx, ty - chSize);
          ctx.lineTo(tx, ty + chSize);
          ctx.stroke();
          drawDot(ctx, tx, ty, '#000000', dotRadius);

          if (userAnswer?.nearestGridPoint && !userAnswer.isHit) {
            const chosen = userAnswer.nearestGridPoint;
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = Math.max(1, chLineWidth * 0.85);
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(chosen.x, chosen.y);
            ctx.lineTo(tx, ty);
            ctx.stroke();
            ctx.setLineDash([]);
            drawDot(ctx, chosen.x, chosen.y, '#FF0000', dotRadius);
          }
        }
      }
    }
  }, [question, showAnswer, userAnswer, fittingHoverPoint, disabled]);

  const handleFittingMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer || !question.distractorPoints) {
      if (fittingHoverPoint) setFittingHoverPoint(null);
      return;
    }

    const canvas = rightFittingRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = FITTING_CANVAS_SIZE / rect.width;
    const scaleY = FITTING_CANVAS_SIZE / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX * 100) / 100;
    const clickY = Math.round((e.clientY - rect.top) * scaleY * 100) / 100;

    const { nearestPoint, isWithinRange } = findNearestGridPoint(
      { x: clickX, y: clickY },
      question.distractorPoints,
    );

    if (isWithinRange) {
      setFittingHoverPoint(nearestPoint);
    } else if (fittingHoverPoint) {
      setFittingHoverPoint(null);
    }
  };

  const handleFittingClick = (e: MouseEvent) => {
    if (disabled || showAnswer || !question.distractorPoints) return;

    const canvas = rightFittingRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = FITTING_CANVAS_SIZE / rect.width;
    const scaleY = FITTING_CANVAS_SIZE / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX * 100) / 100;
    const clickY = Math.round((e.clientY - rect.top) * scaleY * 100) / 100;

    const clickPoint: Point = { x: clickX, y: clickY };
    const { isWithinRange } = findNearestGridPoint(clickPoint, question.distractorPoints);

    if (!isWithinRange) return;

    setFittingHoverPoint(null);
    onAnswer(clickPoint);
  };

  return (
    <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          <Columns className="w-3.5 h-3.5 text-indigo-600" />
          对比左侧负形空间，在右侧点阵中点击定位被截断的顶点
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            完整剪影参考
          </span>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner">
            <canvas
              ref={leftFittingRef}
              width={FITTING_CANVAS_SIZE}
              height={FITTING_CANVAS_SIZE}
              className="w-full max-w-[300px] aspect-square rounded-xl border border-slate-100 shadow-sm"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
            交互定点画布 (点击定位)
          </span>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner">
            <canvas
              ref={rightFittingRef}
              width={FITTING_CANVAS_SIZE}
              height={FITTING_CANVAS_SIZE}
              onClick={handleFittingClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
              }}
              tabIndex={0}
              role="button"
              aria-label="右侧定点做答画布"
              onMouseMove={handleFittingMouseMove}
              onMouseLeave={() => setFittingHoverPoint(null)}
              className={`w-full max-w-[300px] aspect-square rounded-xl border border-slate-100 shadow-sm transition-all ${
                disabled || showAnswer
                  ? 'cursor-default'
                  : fittingHoverPoint
                    ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
                    : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
              }`}
            />
          </div>
        </div>
      </div>

    </div>
  );
}
