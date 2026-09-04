import { Check, Eye } from 'lucide-preact';
import { useState } from 'preact/hooks';

import {
  Badge,
  CanvasView,
  ChoiceCard,
  QuestionCardShell,
  getChoiceCardState,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import type { PerspGestaltHitResult, PerspGestaltQuestion } from './types';
import { PERSPECTIVE_2AFC_SIZE, drawGestaltCanvas } from './utils/generator';

export interface PerspGestaltContinuationViewProps {
  question: PerspGestaltQuestion;
  showAnswer: boolean;
  userAnswer: PerspGestaltHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function PerspGestaltContinuationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: PerspGestaltContinuationViewProps) {
  const { t } = useCardTranslation('persp_gestalt_continuation');
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  const handleSelect = (choice: 'A' | 'B') => {
    if (disabled || showAnswer) return;
    setSelectedChoice(choice);
    onAnswer(choice);
  };

  useChoiceShortcuts({
    optionsCount: 2,
    disabled: disabled || showAnswer,
    onSelect: (idx) => handleSelect(idx === 0 ? 'A' : 'B'),
  });

  const effectiveChoice = selectedChoice ?? userAnswer?.userChoice ?? null;
  const isAHit = question.correctChoice === 'A';
  const isBHit = question.correctChoice === 'B';

  const stateA = getChoiceCardState({
    showAnswer,
    isTarget: isAHit,
    isSelected: effectiveChoice === 'A',
  });

  const stateB = getChoiceCardState({
    showAnswer,
    isTarget: isBHit,
    isSelected: effectiveChoice === 'B',
  });

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
        <ChoiceCard
          state={stateA}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('A')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge
                variant="secondary"
                size="sm"
                className="w-5 h-5 p-0 justify-center font-mono text-xs"
              >
                1
              </Badge>
              {t('optionA')}
            </span>

            {showAnswer && isAHit && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={PERSPECTIVE_2AFC_SIZE}
              height={PERSPECTIVE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawGestaltCanvas(
                  canvas,
                  question.obstacle,
                  question.incomingLine,
                  question.lineOptionA,
                  PERSPECTIVE_2AFC_SIZE,
                )
              }
              deps={[question.incomingLine, question.lineOptionA]}
            />
          </div>
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge
                variant="secondary"
                size="sm"
                className="w-5 h-5 p-0 justify-center font-mono text-xs"
              >
                2
              </Badge>
              {t('optionB')}
            </span>

            {showAnswer && isBHit && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={PERSPECTIVE_2AFC_SIZE}
              height={PERSPECTIVE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawGestaltCanvas(
                  canvas,
                  question.obstacle,
                  question.incomingLine,
                  question.lineOptionB,
                  PERSPECTIVE_2AFC_SIZE,
                )
              }
              deps={[question.incomingLine, question.lineOptionB]}
            />
          </div>
        </ChoiceCard>
      </div>
    </QuestionCardShell>
  );
}
