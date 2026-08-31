import { useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../../components/common/PointClickCanvas';
import { drawDot, getDynamicDotRadius } from '../../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../../core/canvas/hidpi';
import { evaluatePointGridHit } from '../../../core/geometry/pointGrid';
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';
import { CANVAS_SIZE, type StarHitResult } from '../_shared/types';
import type { RotatedDoubleQuestion } from './generator';

export interface RotatedDoubleViewProps {
  question: RotatedDoubleQuestion;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; hitResult: StarHitResult } | null;
  onAnswer: (val: { clickPoint: Point; hitResult: StarHitResult }) => void;
  disabled?: boolean;
}

export function RotatedDoubleView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: RotatedDoubleViewProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const dotRadius = getDynamicDotRadius(question.distractorPoints);
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas) {
      const ctx = setupHiDpiCanvas(leftCanvas, CANVAS_SIZE, CANVAS_SIZE);
      if (ctx) {
        ctx.fillStyle = CANVAS_THEME.bg.primary;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        drawDot(
          ctx,
          question.anchorA.x,
          question.anchorA.y,
          CANVAS_THEME.pointGrid.dotAnchor,
          dotRadius,
        );
        drawDot(
          ctx,
          question.anchorC.x,
          question.anchorC.y,
          CANVAS_THEME.pointGrid.dotAnchor,
          dotRadius,
        );
        drawDot(
          ctx,
          question.targetB.x,
          question.targetB.y,
          CANVAS_THEME.pointGrid.dotAnchor,
          dotRadius,
        );
      }
    }
  }, [question]);

  const handleCommitPoint = (clickPoint: Point) => {
    const hitResult = evaluatePointGridHit(clickPoint, question.targetB, question.distractorPoints);
    if (!hitResult.isWithinRange) return;
    onAnswer({ clickPoint, hitResult });
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner block"
        />
      </div>

      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-sm flex items-center justify-center">
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.hitResult.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.hitResult.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          onCommitPoint={handleCommitPoint}
        />
      </div>
    </div>
  );
}
