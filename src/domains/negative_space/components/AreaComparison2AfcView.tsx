import { Columns } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Choice2AfcContainer } from '../../../components/common/Choice2AfcContainer';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import {
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
  TWO_AFC_CANVAS_SIZE,
} from '../utils/index';

interface AreaComparison2AfcViewProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer?: NegativeSpaceHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AreaComparison2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AreaComparison2AfcViewProps) {
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection when question changes
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  useEffect(() => {
    drawPolygonCanvas({
      canvas: canvasRefA.current,
      vertices: question.verticesA,
      size: TWO_AFC_CANVAS_SIZE,
      fillColor: '#0F172A',
      strokeColor: '#1E293B',
    });
    drawPolygonCanvas({
      canvas: canvasRefB.current,
      vertices: question.verticesB,
      size: TWO_AFC_CANVAS_SIZE,
      fillColor: '#0F172A',
      strokeColor: '#1E293B',
    });
  }, [question.verticesA, question.verticesB]);

  const handleSelectChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelectedChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );

  const largerSide = question.largerSide;
  const isAHit = largerSide === 'A';
  const isBHit = largerSide === 'B';

  return (
    <QuestionCardShell
      hintText="判别哪一侧的白色留白 (负形) 面积更大 (键 1 / 2)"
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      <Choice2AfcContainer
        optionA={{
          key: 'A',
          title: '区域 A',
          isCorrect: isAHit,
          badge: `留白 ${question.negRatioA}%`,
          content: (
            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefA}
                width={TWO_AFC_CANVAS_SIZE}
                height={TWO_AFC_CANVAS_SIZE}
                className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm"
              />
            </div>
          ),
        }}
        optionB={{
          key: 'B',
          title: '区域 B',
          isCorrect: isBHit,
          badge: `留白 ${question.negRatioB}%`,
          content: (
            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefB}
                width={TWO_AFC_CANVAS_SIZE}
                height={TWO_AFC_CANVAS_SIZE}
                className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm"
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
