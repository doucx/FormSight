import { Columns } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
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
  const largerSide = question.largerSide;
  const isAHit = largerSide === 'A';
  const isBHit = largerSide === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText="判别哪一侧的白色留白 (负形) 面积更大 (键 1 / 2)"
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      optionA={{
        title: '区域 A',
        isCorrect: isAHit,
        badge: `留白 ${question.negRatioA}%`,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={TWO_AFC_CANVAS_SIZE}
              height={TWO_AFC_CANVAS_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm"
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.verticesA,
                  size: TWO_AFC_CANVAS_SIZE,
                  fillColor: '#0F172A',
                  strokeColor: '#1E293B',
                })
              }
              deps={[question.verticesA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: '区域 B',
        isCorrect: isBHit,
        badge: `留白 ${question.negRatioB}%`,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={TWO_AFC_CANVAS_SIZE}
              height={TWO_AFC_CANVAS_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm"
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.verticesB,
                  size: TWO_AFC_CANVAS_SIZE,
                  fillColor: '#0F172A',
                  strokeColor: '#1E293B',
                })
              }
              deps={[question.verticesB]}
            />
          </div>
        ),
      }}
    />
  );
}