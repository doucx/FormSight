import { Check, Sparkles } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import {
  Badge,
  CANVAS_THEME,
  CanvasView,
  ChoiceCard,
  QuestionCardShell,
  getChoiceCardState,
  hsvToHex,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
import { OPTION_SIZE, drawPaletteTilesCanvas } from './utils/generator';

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
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsTdPalette2afcViewProps) {
  const { t } = useCardTranslation('abs_td_palette_2afc');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setSelectedIndex(null);
  }, [question.id]);

  const handleSelect = (idx: number) => {
    if (disabled || showAnswer) return;
    setSelectedIndex(idx);
    onAnswer(idx);
  };

  useChoiceShortcuts({
    optionsCount: (question.palettePatternOptions || []).length,
    disabled: disabled || showAnswer,
    onSelect: handleSelect,
  });

  const promptHex = question.promptDominantColor
    ? hsvToHex(...question.promptDominantColor)
    : CANVAS_THEME.status.accentHover;
  const targetIdx = question.correctPatternIndex ?? 0;
  const effectiveIndex =
    selectedIndex ?? (userAnswer?.isHit !== undefined ? userAnswer.userChoiceIndex : null);

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      {/* 题干上方基准主调色块 */}
      <div className="flex flex-col items-center gap-1.5 bg-muted/60 p-3 rounded-2xl border border-border shadow-inner">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {t('promptTitle')}
        </span>
        <div
          className="w-16 h-16 rounded-2xl border-4 border-card dark:border-border shadow-md ring-1 ring-border/60"
          style={{ backgroundColor: promptHex }}
        />
      </div>

      {/* 4AFC 候选图案网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
        {(question.palettePatternOptions || []).map((pat, idx) => {
          const isTarget = idx === targetIdx;
          const isSelected = effectiveIndex === idx;
          const state = getChoiceCardState({ showAnswer, isTarget, isSelected });

          return (
            <ChoiceCard
              key={`td-pattern-${question.id}-${idx}`}
              state={state}
              size="sm"
              disabled={disabled || showAnswer}
              onClick={() => handleSelect(idx)}
            >
              <div className="flex items-center justify-between w-full px-1">
                <span className="flex items-center gap-1.5 text-xs font-black text-foreground">
                  <Badge
                    variant="secondary"
                    size="sm"
                    className="w-5 h-5 p-0 justify-center font-mono text-xs"
                  >
                    {idx + 1}
                  </Badge>
                  {t('common.screenN', { num: idx + 1 })}
                </span>
                {showAnswer && isTarget && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
                )}
              </div>

              <div className="w-full aspect-square bg-white p-1 rounded-xl border border-border shadow-inner flex items-center justify-center">
                <CanvasView
                  width={OPTION_SIZE}
                  height={OPTION_SIZE}
                  className="w-full aspect-square rounded-lg shadow-sm"
                  draw={(canvas) => drawPaletteTilesCanvas(canvas, pat, OPTION_SIZE)}
                  deps={[pat]}
                />
              </div>
            </ChoiceCard>
          );
        })}
      </div>
    </QuestionCardShell>
  );
}
