import { Sparkles } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import {
  Choice2AfcContainer,
  QuestionCardShell,
  drawPolygonCanvas,
  useCardTranslation,
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
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: NegShapeMatch2AfcViewProps) {
  const { t } = useCardTranslation('neg_shape_match_2afc');
  const [matchPhase, setMatchPhase] = useState<'stimulus' | 'recall'>('stimulus');
  const [selectedMatchChoice, setSelectedMatchChoice] = useState<'A' | 'B' | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const matchOptionRefA = useRef<HTMLCanvasElement | null>(null);
  const matchOptionRefB = useRef<HTMLCanvasElement | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset phase and selection when question changes
  useEffect(() => {
    setMatchPhase('stimulus');
    setSelectedMatchChoice(null);
  }, [question.id]);

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

  const handleSelectMatchChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer || matchPhase !== 'recall') return;
      setSelectedMatchChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, matchPhase, onAnswer],
  );

  const isRevealed = showAnswer;
  const isTargetA = question.correctOptionIndex === 0;
  const isTargetB = question.correctOptionIndex === 1;

  return (
    <QuestionCardShell
      hintText={
        matchPhase === 'stimulus' && !isRevealed
          ? t('memoryStimulusHint', {
              ms: question.displayTimeMs ?? 1500,
            })
          : t('memoryRecallHint')
      }
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      {matchPhase === 'stimulus' && !isRevealed ? (
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
        <Choice2AfcContainer
          optionA={{
            key: 'A',
            title: t('common.areaA'),
            isCorrect: isTargetA,
            content: (
              <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
                <canvas
                  ref={matchOptionRefA}
                  width={NEGATIVE_SPACE_CANVAS_SIZE}
                  height={NEGATIVE_SPACE_CANVAS_SIZE}
                  className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm bg-card"
                />
              </div>
            ),
          }}
          optionB={{
            key: 'B',
            title: t('common.areaB'),
            isCorrect: isTargetB,
            content: (
              <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
                <canvas
                  ref={matchOptionRefB}
                  width={NEGATIVE_SPACE_CANVAS_SIZE}
                  height={NEGATIVE_SPACE_CANVAS_SIZE}
                  className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm bg-card"
                />
              </div>
            ),
          }}
          selectedChoice={selectedMatchChoice}
          showAnswer={showAnswer}
          disabled={disabled || matchPhase !== 'recall'}
          enableKeyboardShortcuts={true}
          onSelect={handleSelectMatchChoice}
        />
      )}
    </QuestionCardShell>
  );
}
