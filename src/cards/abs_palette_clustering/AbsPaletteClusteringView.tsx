import { Check, Sparkles } from 'lucide-preact';
import { useState } from 'preact/hooks';

import {
  Badge,
  CanvasView,
  ChoiceCard,
  ColorSwatch,
  QuestionCardShell,
  getChoiceCardState,
  hsvToHex,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
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
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsPaletteClusteringViewProps) {
  const { t } = useCardTranslation('abs_palette_clustering');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSelect = (idx: number) => {
    if (disabled || showAnswer) return;
    setSelectedIndex(idx);
    onAnswer(idx);
  };

  useChoiceShortcuts({
    optionsCount: (question.paletteOptions || []).length,
    disabled: disabled || showAnswer,
    onSelect: handleSelect,
  });

  const effectiveIndex =
    selectedIndex ?? (userAnswer?.isHit !== undefined ? userAnswer.userChoiceIndex : null);

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
    >
      {/* 调色板马赛克原图 */}
      <div className="bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex justify-center items-center w-full">
        <CanvasView
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card"
          draw={(canvas) => drawPaletteTilesCanvas(canvas, question.paletteTiles, CANVAS_SIZE)}
          deps={[question.paletteTiles]}
        />
      </div>

      {/* 4AFC 候选色块网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
        {(question.paletteOptions || []).map((hsv, idx) => {
          const hex = hsvToHex(...hsv);
          const isTarget = idx === question.correctPaletteIndex;
          const isSelected = effectiveIndex === idx;
          const state = getChoiceCardState({ showAnswer, isTarget, isSelected });

          return (
            <ChoiceCard
              key={`palette-opt-${idx}-${hex}`}
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
                  {t('common.optionN', { num: idx + 1 })}
                </span>
                {showAnswer && isTarget && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
                )}
              </div>
              <ColorSwatch color={hex} variant="option" className="w-full aspect-square" />
            </ChoiceCard>
          );
        })}
      </div>
    </QuestionCardShell>
  );
}
