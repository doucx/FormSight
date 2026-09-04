import { Columns } from 'lucide-preact';
import { type HitResult, type QuestionData, TWO_AFC_CANVAS_SIZE } from './types';
import {
  CANVAS_THEME,
  CanvasView,
  Standard2AfcView,
  drawPolygonCanvas,
  useCardTranslation,
} from '@formsight/card-sdk';

export interface NegAreaComparison2AfcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer?: HitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function NegAreaComparison2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: NegAreaComparison2AfcViewProps) {
  const { t } = useCardTranslation('neg_area_comparison_2afc');
  const largerSide = question.largerSide;
  const isAHit = largerSide === 'A';
  const isBHit = largerSide === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('areaHint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      optionA={{
        title: t('common.areaA'),
        isCorrect: isAHit,
        badge: t('whiteSpace', {
          ratio: question.negRatioA ?? 50,
        }),
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={TWO_AFC_CANVAS_SIZE}
              height={TWO_AFC_CANVAS_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.verticesA,
                  size: TWO_AFC_CANVAS_SIZE,
                  fillColor: CANVAS_THEME.shape.fill,
                  strokeColor: CANVAS_THEME.shape.stroke,
                })
              }
              deps={[question.verticesA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: t('common.areaB'),
        isCorrect: isBHit,
        badge: t('whiteSpace', {
          ratio: question.negRatioB ?? 50,
        }),
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={TWO_AFC_CANVAS_SIZE}
              height={TWO_AFC_CANVAS_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.verticesB,
                  size: TWO_AFC_CANVAS_SIZE,
                  fillColor: CANVAS_THEME.shape.fill,
                  strokeColor: CANVAS_THEME.shape.stroke,
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
