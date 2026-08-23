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
      hintText="在倾斜线段上单次点击盲切估测指定比例位置"
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
      {/* 醒目的核心目标指引面板 */}
      <div className="w-full bg-indigo-50/70 border border-indigo-100/90 rounded-2xl p-3.5 flex flex-col items-center gap-1.5 text-center">
        <div className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">
          作答目标 (从紫环起点端起算)
        </div>
        <div className="text-base font-black text-indigo-900 tracking-tight">
          标出【{question.targetRatioName ?? '指定比例'}】
        </div>
      </div>

      <div className="w-full bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex flex-col items-center gap-2">
        <canvas
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
          width={PERSPECTIVE_CANVAS_SIZE}
          height={PERSPECTIVE_CANVAS_SIZE}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          tabIndex={0}
          role="button"
          aria-label="比例盲切答题画布"
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white transition-all ${
            disabled || showAnswer ? 'cursor-default' : 'cursor-crosshair hover:border-indigo-300'
          }`}
        />
        <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-indigo-600 bg-indigo-600 inline-block" />
            <span>起点 (0%)</span>
          </span>
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
            <span>终点 (100%)</span>
          </span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
