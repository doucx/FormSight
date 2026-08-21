import { Columns } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  ANGLE_2AFC_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawAngleCanvas,
} from '../../utils/angleUtils';
import { Choice2AfcContainer } from '../common/Choice2AfcContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';

interface AngleComparison2AfcViewProps {
  question: AngleQuestionData;
  showAnswer: boolean;
  userAnswer: AngleHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AngleComparison2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AngleComparison2AfcViewProps) {
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection on question change
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  useEffect(() => {
    drawAngleCanvas(canvasRefA.current, question.linesA, ANGLE_2AFC_SIZE);
    drawAngleCanvas(canvasRefB.current, question.linesB, ANGLE_2AFC_SIZE);
  }, [question.linesA, question.linesB]);

  const handleSelectChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelectedChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );

  const isAHit = question.largerSide === 'A';
  const isBHit = question.largerSide === 'B';

  return (
    <QuestionCardShell
      hintText="二选一辨识哪一侧的两射线夹角更大 (键 1 / 2)"
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      <Choice2AfcContainer
        optionA={{
          key: 'A',
          title: '区域 A',
          isCorrect: isAHit,
          badge: showAnswer ? `${question.angleA}°` : undefined,
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
          title: '区域 B',
          isCorrect: isBHit,
          badge: showAnswer ? `${question.angleB}°` : undefined,
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