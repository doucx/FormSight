import { Sparkles } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Choice2AfcContainer } from '../../../components/common/Choice2AfcContainer';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../utils/index';

interface ShapeMemory2AfcViewProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  onAnswer: (choice: 0 | 1) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function ShapeMemory2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: ShapeMemory2AfcViewProps) {
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
      onAnswer(choice === 'A' ? 0 : 1);
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
          ? `瞬时记忆负形轮廓特征 (${question.displayTimeMs}ms)`
          : '匹配回忆：哪一侧与刚才展示完全相同？(键 1 / 2)'
      }
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      {matchPhase === 'stimulus' && !isRevealed ? (
        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 shadow-inner flex flex-col items-center gap-3 w-full max-w-sm">
          <canvas
            ref={canvasRef}
            width={NEGATIVE_SPACE_CANVAS_SIZE}
            height={NEGATIVE_SPACE_CANVAS_SIZE}
            className="w-full aspect-square rounded-2xl border border-slate-200 shadow-sm"
          />
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
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
            title: '区域 A',
            isCorrect: isTargetA,
            content: (
              <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
                <canvas
                  ref={matchOptionRefA}
                  width={NEGATIVE_SPACE_CANVAS_SIZE}
                  height={NEGATIVE_SPACE_CANVAS_SIZE}
                  className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm"
                />
              </div>
            ),
          }}
          optionB={{
            key: 'B',
            title: '区域 B',
            isCorrect: isTargetB,
            content: (
              <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
                <canvas
                  ref={matchOptionRefB}
                  width={NEGATIVE_SPACE_CANVAS_SIZE}
                  height={NEGATIVE_SPACE_CANVAS_SIZE}
                  className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm"
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
