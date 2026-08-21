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
