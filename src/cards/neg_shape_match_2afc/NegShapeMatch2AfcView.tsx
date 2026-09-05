import { Check, Sparkles } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import {
  Badge,
  ChoiceCard,
  QuestionCardShell,
  drawPolygonCanvas,
  getChoiceCardState,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import { type HitResult, NEGATIVE_SPACE_CANVAS_SIZE, type QuestionData } from './types';

export interface NegShapeMatch2AfcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer?: HitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function NegShapeMatch2AfcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: NegShapeMatch2AfcViewProps) {
  const { t } = useCardTranslation('neg_shape_match_2afc');
  const [matchPhase, setMatchPhase] = useState<'stimulus' | 'recall'>('stimulus');
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const matchOptionRefA = useRef<HTMLCanvasElement | null>(null);
  const matchOptionRefB = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (matchPhase === 'stimulus' && !showAnswer) {
      const timer = setTimeout(() => {
        setMatchPhase('recall');
      }, question.displayTimeMs || 1500);
      return () => clearTimeout(timer);
    }
  }, [matchPhase, question.displayTimeMs, showAnswer]);

  useEffect(() => {
    if (matchPhase === 'stimulus' && question.targetPolygon) {
      drawPolygonCanvas({
        canvas: canvasRef.current,
        vertices: question.targetPolygon,
        size: NEGATIVE_SPACE_CANVAS_SIZE,
      });
    }
  }, [matchPhase, question.targetPolygon]);

  useEffect(() => {
    if ((matchPhase === 'recall' || showAnswer) && question.optionsPolygons) {
      drawPolygonCanvas({
        canvas: matchOptionRefA.current,
        vertices: question.optionsPolygons[0],
        size: NEGATIVE_SPACE_CANVAS_SIZE,
      });
      drawPolygonCanvas({
        canvas: matchOptionRefB.current,
        vertices: question.optionsPolygons[1],
        size: NEGATIVE_SPACE_CANVAS_SIZE,
      });
    }
  }, [matchPhase, showAnswer, question.optionsPolygons]);

  const handleSelectChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer || matchPhase !== 'recall') return;
      setSelectedChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, matchPhase, onAnswer],
  );

  useChoiceShortcuts({
    optionsCount: 2,
    disabled: disabled || showAnswer || matchPhase !== 'recall',
    onSelect: (idx) => handleSelectChoice(idx === 0 ? 'A' : 'B'),
  });

  const effectiveChoice = selectedChoice ?? userAnswer?.userChoice ?? null;
  const isTargetA = question.correctOptionIndex === 0;
  const isTargetB = question.correctOptionIndex === 1;

  const stateA = getChoiceCardState({
    showAnswer,
    isTarget: isTargetA,
    isSelected: effectiveChoice === 'A',
  });

  const stateB = getChoiceCardState({
    showAnswer,
    isTarget: isTargetB,
    isSelected: effectiveChoice === 'B',
  });

  return (
    <QuestionCardShell
      hintText={
        matchPhase === 'stimulus' && !showAnswer
          ? t('hint_stimulus', {
              ms: question.displayTimeMs ?? 1500,
            })
          : t('hint_recall')
      }
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      {matchPhase === 'stimulus' && !showAnswer ? (
        <div className="bg-muted/60 p-4 rounded-3xl border border-border shadow-inner flex flex-col items-center gap-3 w-full max-w-sm">
          <canvas
            ref={canvasRef}
            width={NEGATIVE_SPACE_CANVAS_SIZE}
            height={NEGATIVE_SPACE_CANVAS_SIZE}
            className="w-full aspect-square rounded-2xl border border-border shadow-sm bg-card"
          />
          <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
            <div
              key={`${question.id}-${matchPhase}`}
              className="bg-indigo-600 h-full"
              style={{
                width: '100%',
                animation: `shrinkWidth ${question.displayTimeMs}ms linear forwards`,
              }}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          <ChoiceCard
            state={stateA}
            size="lg"
            disabled={disabled || matchPhase !== 'recall' || showAnswer}
            onClick={() => handleSelectChoice('A')}
          >
            <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
              <Badge
                variant="secondary"
                size="sm"
                className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
              >
                1
              </Badge>
              {showAnswer && isTargetA && (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold flex-shrink-0" />
              )}
            </div>

            <canvas
              ref={matchOptionRefA}
              width={NEGATIVE_SPACE_CANVAS_SIZE}
              height={NEGATIVE_SPACE_CANVAS_SIZE}
              className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm bg-card block"
            />
          </ChoiceCard>

          <ChoiceCard
            state={stateB}
            size="lg"
            disabled={disabled || matchPhase !== 'recall' || showAnswer}
            onClick={() => handleSelectChoice('B')}
          >
            <div className="flex items-center justify-between w-full px-1 min-h-[1.5rem]">
              <Badge
                variant="secondary"
                size="sm"
                className="w-5 h-5 p-0 justify-center font-mono text-xs flex-shrink-0"
              >
                2
              </Badge>
              {showAnswer && isTargetB && (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold flex-shrink-0" />
              )}
            </div>

            <canvas
              ref={matchOptionRefB}
              width={NEGATIVE_SPACE_CANVAS_SIZE}
              height={NEGATIVE_SPACE_CANVAS_SIZE}
              className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm bg-card block"
            />
          </ChoiceCard>
        </div>
      )}
    </QuestionCardShell>
  );
}
