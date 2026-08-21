import { Split } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  ANGLE_2AFC_SIZE,
  ANGLE_PROMPT_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawSingleLineCanvas,
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
  const canvasPromptRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection on question change
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  useEffect(() => {
    drawSingleLineCanvas(
      canvasPromptRef.current,
      question.promptLine,
      ANGLE_PROMPT_SIZE,
      '#4F46E5', // 基准线用 Indigo 突出
      3.0,
    );
    drawSingleLineCanvas(canvasRefA.current, question.lineOptionA, ANGLE_2AFC_SIZE, '#0F172A', 2.5);
    drawSingleLineCanvas(canvasRefB.current, question.lineOptionB, ANGLE_2AFC_SIZE, '#0F172A', 2.5);
  }, [question.promptLine, question.lineOptionA, question.lineOptionB]);

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
      hintText="观察上方基准线，选出下方与它严格平行的线 (键 1 / 2)"
      hintIcon={Split}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      {/* 上方基准线 Prompt 卡片 */}
      <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          平行基准线 (Prompt)
        </span>
        <canvas
          ref={canvasPromptRef}
          width={ANGLE_PROMPT_SIZE}
          height={ANGLE_PROMPT_SIZE}
          className="w-28 h-28 rounded-xl border border-slate-200 shadow-sm bg-white"
        />
      </div>

      {/* 下方 2AFC 选项区 */}
      <Choice2AfcContainer
        optionA={{
          key: 'A',
          title: '选项 A',
          isCorrect: isAHit,
          badge: showAnswer
            ? isAHit
              ? '绝对平行'
              : `偏转 ${question.angularDeviation}°`
            : undefined,
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
          title: '选项 B',
          isCorrect: isBHit,
          badge: showAnswer
            ? isBHit
              ? '绝对平行'
              : `偏转 ${question.angularDeviation}°`
            : undefined,
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
