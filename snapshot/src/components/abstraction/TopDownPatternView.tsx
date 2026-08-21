import { Check, Sparkles, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  ABSTRACTION_2AFC_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../../utils/abstraction';
import { drawPaletteTilesCanvas } from '../../utils/canvas/drawPaletteTiles';
import { hsvToHex } from '../../utils/colorUtils';

interface TopDownPatternViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (idx: number) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function TopDownPatternView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: TopDownPatternViewProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const patternCanvasRef0 = useRef<HTMLCanvasElement | null>(null);
  const patternCanvasRef1 = useRef<HTMLCanvasElement | null>(null);
  const patternCanvasRef2 = useRef<HTMLCanvasElement | null>(null);
  const patternCanvasRef3 = useRef<HTMLCanvasElement | null>(null);

  const patternRefs = [patternCanvasRef0, patternCanvasRef1, patternCanvasRef2, patternCanvasRef3];

  useEffect(() => {
    setSelectedIdx(null);
  }, [question.id]);

  useEffect(() => {
    if (question.palettePatternOptions) {
      question.palettePatternOptions.forEach((pat, i) => {
        if (patternRefs[i].current) {
          drawPaletteTilesCanvas(patternRefs[i].current, pat, ABSTRACTION_2AFC_SIZE);
        }
      });
    }
  }, [question.palettePatternOptions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || showAnswer) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const idx = Number.parseInt(e.key, 10) - 1;
        setSelectedIdx(idx);
        onAnswer(idx);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, showAnswer, onAnswer]);

  const promptHex = question.promptDominantColor
    ? hsvToHex(...question.promptDominantColor)
    : '#6366F1';
  const targetIdx = question.correctPatternIndex ?? 0;
  const chosenIdx = userAnswer?.userChoiceIndex ?? selectedIdx;

  return (
    <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          观察上方基准主色，选出以此为基调的拼贴画面 (键 1-4)
        </div>
      )}

      <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          基准主调色
        </span>
        <div
          className="w-16 h-16 rounded-2xl border-4 border-white shadow-md ring-1 ring-slate-200"
          style={{ backgroundColor: promptHex }}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
        {question.palettePatternOptions?.map((pat, idx) => {
          const isSelected = chosenIdx === idx;
          const isTarget = idx === targetIdx;
          const keyLabel = (idx + 1).toString();
          const patternKey = `td-pattern-card-${question.id}-${pat.map((t) => `${t.x}_${t.y}_${t.hsv.join('_')}`).join('-')}`;

          let border = 'border-slate-200/90 hover:border-indigo-300 hover:shadow-md bg-slate-50';
          if (showAnswer) {
            if (isTarget) {
              border = 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md';
            } else if (isSelected) {
              border = 'bg-rose-50/50 border-rose-400 shadow-sm';
            } else {
              border = 'bg-slate-50/60 border-slate-200 opacity-50';
            }
          } else if (isSelected) {
            border = 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md';
          }

          return (
            <button
              key={patternKey}
              type="button"
              disabled={disabled || showAnswer}
              onClick={() => {
                setSelectedIdx(idx);
                onAnswer(idx);
              }}
              className={`group flex flex-col items-center gap-2.5 p-3 rounded-2xl border transition-all duration-200 text-left active:scale-[0.98] ${border}`}
            >
              <div className="flex items-center justify-between w-full px-1">
                <span className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                  <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                    {keyLabel}
                  </span>
                  画面 {keyLabel}
                </span>
                {showAnswer && isTarget && (
                  <Check className="w-4 h-4 text-emerald-600 font-extrabold" />
                )}
              </div>

              <div className="w-full aspect-square bg-white p-1 rounded-xl border border-slate-200 shadow-inner flex items-center justify-center">
                <canvas
                  ref={patternRefs[idx]}
                  width={ABSTRACTION_2AFC_SIZE}
                  height={ABSTRACTION_2AFC_SIZE}
                  className="w-full aspect-square rounded-lg shadow-sm"
                />
              </div>
            </button>
          );
        })}
      </div>

      {showAnswer && (
        <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-xl ${
                userAnswer?.isHit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {userAnswer?.isHit ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </div>
            <div className="text-xs">
              <span className="font-bold text-slate-800">
                {userAnswer?.isHit ? '调性基底寻源匹配完全正确！' : '色彩调性感知出现偏差'}
              </span>
              <span className="text-slate-400 ml-2">(正确匹配为: 画面 {targetIdx + 1})</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
