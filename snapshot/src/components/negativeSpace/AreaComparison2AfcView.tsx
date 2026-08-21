import { Check, Columns, X } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  TWO_AFC_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../../utils/negativeSpace';
import { drawPolygonCanvas } from '../../utils/canvas/drawPolygon';

interface AreaComparison2AfcViewProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AreaComparison2AfcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AreaComparison2AfcViewProps) {
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  useEffect(() => {
    drawPolygonCanvas({
      canvas: canvasRefA.current,
      vertices: question.verticesA,
      size: TWO_AFC_CANVAS_SIZE,
      fillColor: '#0F172A',
      strokeColor: '#1E293B',
    });
    drawPolygonCanvas({
      canvas: canvasRefB.current,
      vertices: question.verticesB,
      size: TWO_AFC_CANVAS_SIZE,
      fillColor: '#0F172A',
      strokeColor: '#1E293B',
    });
  }, [question.verticesA, question.verticesB]);

  const handleSelectChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelectedChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || showAnswer) return;
      if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
        e.preventDefault();
        handleSelectChoice('A');
      } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
        e.preventDefault();
        handleSelectChoice('B');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, showAnswer, handleSelectChoice]);

  const largerSide = question.largerSide;
  const isAHit = largerSide === 'A';
  const isBHit = largerSide === 'B';

  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          <Columns className="w-3.5 h-3.5 text-indigo-600" />
          判别哪一侧的白色留白 (负形) 面积更大 (键 1 / 2)
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
        {/* 卡片 A */}
        <button
          type="button"
          disabled={disabled || showAnswer}
          onClick={() => handleSelectChoice('A')}
          className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
            showAnswer
              ? isAHit
                ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                : selectedChoice === 'A'
                  ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                  : 'bg-slate-50/60 border-slate-200 opacity-60'
              : selectedChoice === 'A'
                ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
          }`}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
              <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                1
              </span>
              区域 A
            </span>

            {showAnswer && (
              <span
                className={`text-xs font-extrabold flex items-center gap-1 ${
                  isAHit ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {isAHit ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    留白更大 ({question.negRatioA}%)
                  </>
                ) : (
                  `留白 (${question.negRatioA}%)`
                )}
              </span>
            )}
          </div>

          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <canvas
              ref={canvasRefA}
              width={TWO_AFC_CANVAS_SIZE}
              height={TWO_AFC_CANVAS_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm"
            />
          </div>
        </button>

        {/* 卡片 B */}
        <button
          type="button"
          disabled={disabled || showAnswer}
          onClick={() => handleSelectChoice('B')}
          className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
            showAnswer
              ? isBHit
                ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                : selectedChoice === 'B'
                  ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                  : 'bg-slate-50/60 border-slate-200 opacity-60'
              : selectedChoice === 'B'
                ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
          }`}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
              <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                2
              </span>
              区域 B
            </span>

            {showAnswer && (
              <span
                className={`text-xs font-extrabold flex items-center gap-1 ${
                  isBHit ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {isBHit ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    留白更大 ({question.negRatioB}%)
                  </>
                ) : (
                  `留白 (${question.negRatioB}%)`
                )}
              </span>
            )}
          </div>

          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <canvas
              ref={canvasRefB}
              width={TWO_AFC_CANVAS_SIZE}
              height={TWO_AFC_CANVAS_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm"
            />
          </div>
        </button>
      </div>

      {showAnswer && (
        <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-xl ${
                userAnswer?.isHit
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {userAnswer?.isHit ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </div>
            <div className="text-xs">
              <span className="font-bold text-slate-800">
                {userAnswer?.isHit ? '瞬时直觉判断正确！' : '直觉判断出现偏差'}
              </span>
              <span className="text-slate-400 ml-2">
                (留白实际差异率 Δ ={' '}
                <strong className="font-mono text-slate-700">{question.areaDeltaPercent}%</strong>)
              </span>
            </div>
          </div>

          <div className="text-xs font-mono font-bold text-slate-600">
            A: {question.negRatioA}% vs B: {question.negRatioB}%
          </div>
        </div>
      )}
    </div>
  );
}