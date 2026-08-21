import { Sparkles } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  ABSTRACTION_CANVAS_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../../utils/abstraction';
import { drawPaletteTilesCanvas } from '../../utils/canvas/drawPaletteTiles';
import { hsvToHex } from '../../utils/colorUtils';

interface PaletteClusteringViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (idx: number) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function PaletteClusteringView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: PaletteClusteringViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    setSelectedIdx(null);
  }, [question.id]);

  useEffect(() => {
    drawPaletteTilesCanvas(canvasRef.current, question.paletteTiles, ABSTRACTION_CANVAS_SIZE);
  }, [question.paletteTiles]);

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

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          选出最能代表全局主调的加权主色 (键 1-4)
        </div>
      )}

      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={ABSTRACTION_CANVAS_SIZE}
          height={ABSTRACTION_CANVAS_SIZE}
          className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm"
        />
      </div>

      <div className="grid grid-cols-4 gap-3 w-full">
        {question.paletteOptions?.map((hsv, idx) => {
          const isSelected = selectedIdx === idx;
          const isTarget = idx === question.correctPaletteIndex;
          const hex = hsvToHex(...hsv);

          let border = 'border-slate-200';
          if (showAnswer) {
            border = isTarget
              ? 'border-emerald-500 ring-2 ring-emerald-500/40'
              : isSelected
                ? 'border-rose-400 opacity-60'
                : 'border-slate-200 opacity-40';
          } else if (isSelected) {
            border = 'border-indigo-600 ring-2 ring-indigo-500/30';
          }

          return (
            <button
              key={`palette-option-${idx}-${hex}`}
              type="button"
              disabled={disabled || showAnswer}
              onClick={() => {
                setSelectedIdx(idx);
                onAnswer(idx);
              }}
              className={`p-1.5 rounded-2xl border bg-white transition-all duration-150 active:scale-95 cursor-pointer ${border}`}
            >
              <div
                className="w-full aspect-square rounded-xl shadow-inner border border-white/60"
                style={{ backgroundColor: hex }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
