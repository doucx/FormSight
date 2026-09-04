import { Check, Columns } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import {
  Badge,
  CanvasView,
  ChoiceCard,
  QuestionCardShell,
  getChoiceCardState,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import type { AngleComparisonHitResult, AngleComparisonQuestion } from './types';
import { ANGLE_2AFC_SIZE, drawAngleCanvas } from './utils/generator';

export interface AngleComparison2AfcViewProps {
  question: AngleComparisonQuestion;
  showAnswer: boolean;
  userAnswer: AngleComparisonHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AngleComparison2AfcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AngleComparison2AfcViewProps) {
  const { t } = useCardTranslation('angle_comparison_2afc');
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

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
  const isAHit = question.largerSide === 'A';
  const isBHit = question.largerSide === 'B';

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
      hintIcon={Columns}
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
              {t('areaA')}
            </span>

            {showAnswer && isAHit && (
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {`${question.angleA}°`}
              </span>
            )}
            {showAnswer && !isAHit && (
              <span className="text-xs font-semibold text-muted-foreground">{`${question.angleA}°`}</span>
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) => drawAngleCanvas(canvas, question.linesA, ANGLE_2AFC_SIZE)}
              deps={[question.linesA]}
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
              {t('areaB')}
            </span>

            {showAnswer && isBHit && (
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {`${question.angleB}°`}
              </span>
            )}
            {showAnswer && !isBHit && (
              <span className="text-xs font-semibold text-muted-foreground">{`${question.angleB}°`}</span>
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) => drawAngleCanvas(canvas, question.linesB, ANGLE_2AFC_SIZE)}
              deps={[question.linesB]}
            />
          </div>
        </ChoiceCard>
      </div>
    </QuestionCardShell>
  );
}
