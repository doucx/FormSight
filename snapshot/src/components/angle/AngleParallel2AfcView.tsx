import { Split } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  ANGLE_2AFC_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawParallelLinesCanvas,
} from '../../utils/angleUtils';
import { Choice2AfcContainer } from '../common/Choice2AfcContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';

interface AngleParallel2AfcViewProps {
  question: AngleQuestionData;
  showAnswer: boolean;
  userAnswer: AngleHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AngleParallel2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AngleParallel2AfcViewProps) {
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection on question change
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  useEffect(() => {
    drawParallelLinesCanvas(canvasRefA.current, question.parallelLinesA, ANGLE_2AFC_SIZE);
    drawParallelLinesCanvas(canvasRefB.current, question.parallelLinesB, ANGLE_2AFC_SIZE);
  }, [question.parallelLinesA, question.parallelLinesB]);

  const handleSelectChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelectedChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );

  const isAHit = question.parallelSide === 'A';
  const isBHit = question.parallelSide === 'B';

  return (
    <QuestionCardShell
      hintText="二选一判别哪一侧线对严格平行 (键 1 / 2)"
      hintIcon={Split}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      <Choice2AfcContainer
        optionA={{
          key: 'A',
          title: '线组 A',
          isCorrect: isAHit,
          badge: showAnswer ? (isAHit ? '绝对平行' : `偏转 ${question.angularDeviation}°`) : undefined,
          content: (
            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefA}
                width={ANGLE_2AFC_SIZE}
                height={ANGLE_2AFC_SIZE}
                className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              />
            </div>
          ),
        }}
        optionB={{
          key: 'B',
          title: '线组 B',
          isCorrect: isBHit,
          badge: showAnswer ? (isBHit ? '绝对平行' : `偏转 ${question.angularDeviation}°`) : undefined,
          content: (
            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefB}
                width={ANGLE_2AFC_SIZE}
                height={ANGLE_2AFC_SIZE}
                className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              />
            </div>
          ),
        }}
        selectedChoice={selectedChoice}
        showAnswer={showAnswer}
        disabled={disabled}
        enableKeyboardShortcuts={true}
        onSelect={handleSelectChoice}
      />
    </QuestionCardShell>
  );
}