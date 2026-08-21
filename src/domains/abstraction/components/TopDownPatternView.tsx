import { Sparkles } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ChoiceNafcContainer } from '../../../components/common/ChoiceNafcContainer';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { hsvToHex } from '../../../core/color/colorUtils';
import { drawPaletteTilesCanvas } from '../../../utils/canvas/drawPaletteTiles';
import {
  ABSTRACTION_2AFC_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection when question changes
  useEffect(() => {
    setSelectedIdx(null);
  }, [question.id]);

  useEffect(() => {
    if (question.palettePatternOptions) {
      const refs = [patternCanvasRef0, patternCanvasRef1, patternCanvasRef2, patternCanvasRef3];
      question.palettePatternOptions.forEach((pat, i) => {
        const canvas = refs[i]?.current;
        if (canvas) {
          drawPaletteTilesCanvas(canvas, pat, ABSTRACTION_2AFC_SIZE);
        }
      });
    }
  }, [question.palettePatternOptions]);

  const promptHex = question.promptDominantColor
    ? hsvToHex(...question.promptDominantColor)
    : '#6366F1';
  const targetIdx = question.correctPatternIndex ?? 0;
  const chosenIdx = userAnswer?.userChoiceIndex ?? selectedIdx;

  const refs = [patternCanvasRef0, patternCanvasRef1, patternCanvasRef2, patternCanvasRef3];

  const nafcOptions = (question.palettePatternOptions || []).map((_pat, idx) => {
    const isTarget = idx === targetIdx;
    return {
      key: `td-pattern-${question.id}-${idx}`,
      title: `画面 ${idx + 1}`,
      value: idx,
      isCorrect: isTarget,
      content: (
        <div className="w-full aspect-square bg-white p-1 rounded-xl border border-slate-200 shadow-inner flex items-center justify-center">
          <canvas
            ref={refs[idx]}
            width={ABSTRACTION_2AFC_SIZE}
            height={ABSTRACTION_2AFC_SIZE}
            className="w-full aspect-square rounded-lg shadow-sm"
          />
        </div>
      ),
    };
  });

  return (
    <QuestionCardShell
      hintText="观察上方基准主色，选出以此为基调的拼贴画面 (键 1-4)"
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          基准主调色
        </span>
        <div
          className="w-16 h-16 rounded-2xl border-4 border-white shadow-md ring-1 ring-slate-200"
          style={{ backgroundColor: promptHex }}
        />
      </div>

      <ChoiceNafcContainer
        options={nafcOptions}
        selectedIndex={chosenIdx}
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
