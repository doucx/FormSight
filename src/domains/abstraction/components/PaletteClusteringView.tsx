import { Sparkles } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardNafcView } from '../../../components/common/StandardNafcView';
import { hsvToHex } from '../../../core/color/colorUtils';
import { drawPaletteTilesCanvas } from '../../../utils/canvas/drawPaletteTiles';
import {
  ABSTRACTION_CANVAS_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';

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
    <StandardNafcView
      questionId={question.id}
      hintText="选出最能代表全局主调的加权主色 (键 1-4)"
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      columns={4}
      options={nafcOptions}
      showAnswer={showAnswer}
      disabled={disabled}
      submitMode="immediate"
      onAnswer={(idx) => onAnswer(idx)}
      preview={
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
          <CanvasView
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm"
            draw={(canvas) =>
              drawPaletteTilesCanvas(canvas, question.paletteTiles, ABSTRACTION_CANVAS_SIZE)
            }
            deps={[question.paletteTiles]}
          />
        </div>
      }
    />
  );
}
