import { Split } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import {
  ANGLE_2AFC_SIZE,
  ANGLE_PROMPT_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawSingleLineCanvas,
} from '../utils/angleUtils';

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
  const isAHit = question.parallelSide === 'A';
  const isBHit = question.parallelSide === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText="观察上方基准线，选出下方与它严格平行的线 (键 1 / 2)"
      hintIcon={Split}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      prompt={
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            平行基准线 (Prompt)
          </span>
          <CanvasView
            width={ANGLE_PROMPT_SIZE}
            height={ANGLE_PROMPT_SIZE}
            className="w-28 h-28 rounded-xl border border-slate-200 shadow-sm bg-white"
            draw={(canvas) =>
              drawSingleLineCanvas(canvas, question.promptLine, ANGLE_PROMPT_SIZE, '#4F46E5', 3.0)
            }
            deps={[question.promptLine]}
          />
        </div>
      }
      optionA={{
        title: '选项 A',
        isCorrect: isAHit,
        badge: showAnswer
          ? isAHit
            ? '绝对平行'
            : `偏转 ${question.angularDeviation}°`
          : undefined,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              draw={(canvas) =>
                drawSingleLineCanvas(canvas, question.lineOptionA, ANGLE_2AFC_SIZE, '#0F172A', 2.5)
              }
              deps={[question.lineOptionA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: '选项 B',
        isCorrect: isBHit,
        badge: showAnswer
          ? isBHit
            ? '绝对平行'
            : `偏转 ${question.angularDeviation}°`
          : undefined,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              draw={(canvas) =>
                drawSingleLineCanvas(canvas, question.lineOptionB, ANGLE_2AFC_SIZE, '#0F172A', 2.5)
              }
              deps={[question.lineOptionB]}
            />
          </div>
        ),
      }}
    />
  );
}