import { Sparkles } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardNafcView } from '../../../components/common/StandardNafcView';
import { hsvToHex } from '../../../core/color/colorUtils';
import { useTranslation } from '../../../core/i18n';
import { CANVAS_THEME } from '../../../utils/theme';
import { drawPaletteTilesCanvas } from '../canvas/drawPaletteTiles';
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
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: TopDownPatternViewProps) {
  const { t } = useTranslation();
  const promptHex = question.promptDominantColor
    ? hsvToHex(...question.promptDominantColor)
    : CANVAS_THEME.status.accentHover;
  const targetIdx = question.correctPatternIndex ?? 0;

  const nafcOptions = (question.palettePatternOptions || []).map((pat, idx) => {
    const isTarget = idx === targetIdx;
    return {
      key: `td-pattern-${question.id}-${idx}`,
      title: t('common.screenN', { num: idx + 1 }),
      value: idx,
      isCorrect: isTarget,
      content: (
        <div className="w-full aspect-square bg-white p-1 rounded-xl border border-border shadow-inner flex items-center justify-center">
          <CanvasView
            width={ABSTRACTION_2AFC_SIZE}
            height={ABSTRACTION_2AFC_SIZE}
            className="w-full aspect-square rounded-lg shadow-sm"
            draw={(canvas) => drawPaletteTilesCanvas(canvas, pat, ABSTRACTION_2AFC_SIZE)}
            deps={[pat]}
          />
        </div>
      ),
    };
  });

  return (
    <StandardNafcView
      questionId={question.id}
      hintText={t('packs.abstraction.cards.abs_td_palette_2afc.hint')}
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
      columns={4}
      options={nafcOptions}
      showAnswer={showAnswer}
      disabled={disabled}
      submitMode="immediate"
      onAnswer={(idx) => onAnswer(idx)}
      preview={
        <div className="flex flex-col items-center gap-1.5 bg-muted/60 p-3 rounded-2xl border border-border shadow-inner">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_td_palette_2afc.promptTitle')}
          </span>
          <div
            className="w-16 h-16 rounded-2xl border-4 border-card dark:border-border shadow-md shadow-md ring-1 ring-border/60"
            style={{ backgroundColor: promptHex }}
          />
        </div>
      }
    />
  );
}
