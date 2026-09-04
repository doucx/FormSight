import { Columns } from 'lucide-preact';
import type { HitResult, QuestionData } from './types';
import {
  CANVAS_SIZE,
  CANVAS_THEME,
  CanvasView,
  OPTION_SIZE,
  Standard2AfcView,
  drawPolygonCanvas,
  useCardTranslation,
} from '@formsight/card-sdk';

const CANVAS_OPTION_CLASS =
  'w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block';

export interface AbsPolygonDecimationViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AbsPolygonDecimationView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsPolygonDecimationViewProps) {
  const { t } = useCardTranslation('abs_polygon_decimation');

  const isTargetA = question.correctPolyChoice === 'A';
  const isTargetB = !isTargetA;

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('hint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      prompt={
        <div className="flex flex-col items-center gap-2 bg-muted/60 p-3 rounded-2xl border border-border shadow-inner w-full max-w-[250px] sm:max-w-[270px] mx-auto">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t('promptTitle')}
          </span>
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.detailedPolygon,
                  size: CANVAS_SIZE,
                })
              }
              deps={[question.detailedPolygon]}
            />
          </div>
        </div>
      }
      optionA={{
        title: `${t('common.areaA')} (${t('common.optionA')})`,
        isCorrect: isTargetA,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.simplifiedOptions[0],
                  size: OPTION_SIZE,
                  fillColor: CANVAS_THEME.status.accent,
                })
              }
              deps={[question.simplifiedOptions]}
            />
          </div>
        ),
      }}
      optionB={{
        title: `${t('common.areaB')} (${t('common.optionB')})`,
        isCorrect: isTargetB,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.simplifiedOptions[1],
                  size: OPTION_SIZE,
                  fillColor: CANVAS_THEME.status.accent,
                })
              }
              deps={[question.simplifiedOptions]}
            />
          </div>
        ),
      }}
    />
  );
}
