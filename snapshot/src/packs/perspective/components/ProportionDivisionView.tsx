import { Disc } from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import type { Point } from '../../../types';
import {
  PERSPECTIVE_CANVAS_SIZE,
  type PerspectiveHitResult,
  type PerspectiveQuestionData,
  drawProportionCanvas,
} from '../utils/perspectiveUtils';

interface ProportionDivisionViewProps {
  question: PerspectiveQuestionData;
  showAnswer: boolean;
  userAnswer: PerspectiveHitResult | null;
  onAnswer: (point: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function ProportionDivisionView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: ProportionDivisionViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [userClickedPoint, setUserClickedPoint] = useState<Point | null>(null);

  const handleClick = (e: MouseEvent) => {
    if (disabled || showAnswer) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scale = PERSPECTIVE_CANVAS_SIZE / rect.width;
    const clickX = Math.round((e.clientX - rect.left) * scale);
    const clickY = Math.round((e.clientY - rect.top) * scale);

    const pt: Point = { x: clickX, y: clickY };
    setUserClickedPoint(pt);
    onAnswer(pt);
  };

  const isHit = Boolean(userAnswer?.isHit);

  return (
    <QuestionCardShell
      hintText={`在线段上直接点击标出：【${question.targetRatioName ?? ''}】`}
      hintIcon={Disc}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      footer={
        showAnswer ? (
          <div className="w-full pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              目标比例:{' '}
              <span className="font-bold text-slate-800 font-mono">
                {((question.targetRatio ?? 0) * 100).toFixed(1)}%
              </span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              作答位置: {((userAnswer?.ratioProgress ?? 0) * 100).toFixed(1)}% (误差: ±
              {((userAnswer?.errorValue ?? 0) * 100).toFixed(1)}%)
            </span>
          </div>
        ) : null
      }
    >
      <div className="w-full bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={PERSPECTIVE_CANVAS_SIZE}
          height={PERSPECTIVE_CANVAS_SIZE}
          onClick={handleClick}
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white transition-all ${
            disabled || showAnswer ? 'cursor-default' : 'cursor-crosshair hover:border-indigo-300'
          }`}
          ref={(el) => {
            canvasRef.current = el;
            if (el) {
              drawProportionCanvas(
                el,
                question.divisionLine,
                question.targetDivisionPoint,
                userClickedPoint,
                showAnswer,
                PERSPECTIVE_CANVAS_SIZE,
              );
            }
          }}
        />
      </div>
    </QuestionCardShell>
  );
}
