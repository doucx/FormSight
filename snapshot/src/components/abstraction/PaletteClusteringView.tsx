import { Sparkles } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  ABSTRACTION_CANVAS_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../../utils/abstraction';
import { drawPaletteTilesCanvas } from '../../utils/canvas/drawPaletteTiles';
import { hsvToHex } from '../../utils/colorUtils';
import { ChoiceNafcContainer } from '../common/ChoiceNafcContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection when question changes
  useEffect(() => {
    setSelectedIdx(null);
  }, [question.id]);

  useEffect(() => {
    drawPaletteTilesCanvas(canvasRef.current, question.paletteTiles, ABSTRACTION_CANVAS_SIZE);
  }, [question.paletteTiles]);

  const nafcOptions = (question.paletteOptions || []).map((hsv, idx) => {
    const hex = hsvToHex(...hsv);
    const isTarget = idx === question.correctPaletteIndex;
    return {
      key: `palette-opt-${idx}-${hex}`,
      value: idx,
      isCorrect: isTarget,
      content: (
        <div
          className="w-full aspect-square rounded-xl shadow-inner border border-white/60"
          style={{ backgroundColor: hex }}
        />
      ),
    };
  });

  return (
    <QuestionCardShell
      hintText="选出最能代表全局主调的加权主色 (键 1-4)"
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
    >
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={ABSTRACTION_CANVAS_SIZE}
          height={ABSTRACTION_CANVAS_SIZE}
          className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm"
        />
      </div>

      <ChoiceNafcContainer
        options={nafcOptions}
        selectedIndex={selectedIdx}
        showAnswer={showAnswer}
        disabled={disabled}
        columns={4}
        onSelect={(idx) => {
          setSelectedIdx(idx);
          onAnswer(idx);
        }}
      />
    </QuestionCardShell>
  );
}