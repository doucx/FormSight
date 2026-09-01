import { Sparkles } from 'lucide-preact';
import { CanvasView } from '../../components/common/CanvasView';
import { StandardNafcView } from '../../components/common/StandardNafcView';
import { hsvToHex } from '../../core/color/colorUtils';
import { useTranslation } from '../../core/i18n';
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE, drawPaletteTilesCanvas } from './utils/generator';

export interface AbsPaletteClusteringViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (idx: number) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AbsPaletteClusteringView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsPaletteClusteringViewProps) {
  const { t } = useTranslation();

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
      hintText={t('cards.abs_palette_clustering.hint')}
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
        <div className="bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex justify-center items-center">
          <CanvasView
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card"
            draw={(canvas) => drawPaletteTilesCanvas(canvas, question.paletteTiles, CANVAS_SIZE)}
            deps={[question.paletteTiles]}
          />
        </div>
      }
    />
  );
}
