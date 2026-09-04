import { Sparkles } from 'lucide-preact';
import type { HitResult, QuestionData } from './types';
import {
  CANVAS_THEME,
  CanvasView,
  OPTION_SIZE,
  StandardNafcView,
  drawPaletteTilesCanvas,
  hsvToHex,
  useCardTranslation,
} from '@formsight/card-sdk';

export interface AbsTdPalette2afcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (idx: number) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AbsTdPalette2afcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsTdPalette2afcViewProps) {
  const { t } = useCardTranslation('abs_td_palette_2afc');
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
            width={OPTION_SIZE}
            height={OPTION_SIZE}
            className="w-full aspect-square rounded-lg shadow-sm"
            draw={(canvas) => drawPaletteTilesCanvas(canvas, pat, OPTION_SIZE)}
            deps={[pat]}
          />
        </div>
      ),
    };
  });

  return (
    <StandardNafcView
      questionId={question.id}
      hintText={t('hint')}
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
            {t('promptTitle')}
          </span>
          <div
            className="w-16 h-16 rounded-2xl border-4 border-card dark:border-border shadow-md ring-1 ring-border/60"
            style={{ backgroundColor: promptHex }}
          />
        </div>
      }
    />
  );
}
