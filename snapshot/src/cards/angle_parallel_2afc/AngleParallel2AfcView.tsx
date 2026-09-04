import { Check, Split } from 'lucide-preact';
import { useState } from 'preact/hooks';

import {
  Badge,
  CANVAS_THEME,
  CanvasView,
  ChoiceCard,
  QuestionCardShell,
  getChoiceCardState,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import type { AngleParallelHitResult, AngleParallelQuestion } from './types';
import { ANGLE_2AFC_SIZE, ANGLE_PROMPT_SIZE, drawSingleLineCanvas } from './utils/generator';

export interface AngleParallel2AfcViewProps {
  question: AngleParallelQuestion;
  showAnswer: boolean;
  userAnswer: AngleParallelHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AngleParallel2AfcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AngleParallel2AfcViewProps) {
  const { t } = useCardTranslation('angle_parallel_2afc');
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
  const isAHit = question.parallelSide === 'A';
  const isBHit = question.parallelSide === 'B';

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
      hintIcon={Split}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      {/* 题干上方平行基准线 */}
      <div className="flex flex-col items-center gap-1.5 bg-muted/60 p-2.5 rounded-2xl border border-border shadow-inner">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {t('promptTitle')}
        </span>
        <CanvasView
          width={ANGLE_PROMPT_SIZE}
          height={ANGLE_PROMPT_SIZE}
          className="w-28 h-28 rounded-xl border border-border shadow-sm bg-card"
          draw={(canvas) =>
            drawSingleLineCanvas(
              canvas,
              question.promptLine,
              ANGLE_PROMPT_SIZE,
              CANVAS_THEME.status.accent,
              3.0,
            )
          }
          deps={[question.promptLine]}
        />
      </div>

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

            {showAnswer && (
              <span
                className={`text-xs font-semibold flex items-center gap-1 ${
                  isAHit
                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'text-muted-foreground'
                }`}
              >
                {isAHit && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                {isAHit
                  ? t('absoluteParallel')
                  : t('deviationBadge', { deg: question.angularDeviation ?? 0 })}
              </span>
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawSingleLineCanvas(
                  canvas,
                  question.lineOptionA,
                  ANGLE_2AFC_SIZE,
                  CANVAS_THEME.shape.fill,
                  2.5,
                )
              }
              deps={[question.lineOptionA]}
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

            {showAnswer && (
              <span
                className={`text-xs font-semibold flex items-center gap-1 ${
                  isBHit
                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'text-muted-foreground'
                }`}
              >
                {isBHit && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                {isBHit
                  ? t('absoluteParallel')
                  : t('deviationBadge', { deg: question.angularDeviation ?? 0 })}
              </span>
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawSingleLineCanvas(
                  canvas,
                  question.lineOptionB,
                  ANGLE_2AFC_SIZE,
                  CANVAS_THEME.shape.fill,
                  2.5,
                )
              }
              deps={[question.lineOptionB]}
            />
          </div>
        </ChoiceCard>
      </div>
    </QuestionCardShell>
  );
}
