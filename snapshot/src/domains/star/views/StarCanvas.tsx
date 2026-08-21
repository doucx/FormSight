import { useEffect, useRef } from 'preact/hooks';
import { PointClickCanvas } from '../../../components/common/PointClickCanvas';
import type { HitResult, Point, QuestionData } from '../../../types';
import { drawDot } from '../../../utils/canvas/drawPointGrid';
import { CANVAS_SIZE, checkHit, getDynamicDotRadius } from '../../../utils/geometry';

export interface StarCanvasProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; hitResult: HitResult } | null;
  onAnswer: (clickPoint: Point, hitResult: HitResult) => void;
  disabled?: boolean;
}

export function StarCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarCanvasProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const dotRadius = getDynamicDotRadius(question.distractorPoints);
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas) {
      const ctx = leftCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        drawDot(ctx, question.anchorA.x, question.anchorA.y, '#000000', dotRadius);

        if (question.anchorC) {
          drawDot(ctx, question.anchorC.x, question.anchorC.y, '#000000', dotRadius);
        }

        drawDot(ctx, question.targetB.x, question.targetB.y, '#000000', dotRadius);
      }
    }
  }, [question]);

  const handleCommitPoint = (clickPoint: Point) => {
    const hitResult = checkHit(clickPoint, question.targetB, question.distractorPoints);
    if (!hitResult.isWithinRange) return;
    onAnswer(clickPoint, hitResult);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-5xl mx-auto">
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner"
        />
      </div>

      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm">
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.hitResult.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.hitResult.isHit}
          disabled={disabled}
          onCommitPoint={handleCommitPoint}
        />
      </div>
    </div>
  );
}