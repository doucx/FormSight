import { Maximize2 } from 'lucide-preact';
import { type HitResult, NEGATIVE_SPACE_CANVAS_SIZE, type QuestionData } from './types';
import {
  CANVAS_THEME,
  CanvasView,
  StandardSliderView,
  drawPolygonCanvas,
  useCardTranslation,
} from '@formsight/card-sdk';

export interface NegRatioEstimationViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function NegRatioEstimationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: NegRatioEstimationViewProps) {
  const { t } = useCardTranslation('neg_ratio_estimation');
  const { targetNegativeRatio, tolerance } = question;
  const isHit = Boolean(userAnswer?.isHit);

  return (
    <StandardSliderView
      questionId={question.id}
      hintText={t('ratioHint')}
      hintIcon={Maximize2}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label={t('ratioLabel')}
      max={100}
      step={0.1}
      initialValue={50.0}
      unit="%"
      targetValue={targetNegativeRatio}
      tolerance={tolerance}
      showToleranceBand={showToleranceBand}
      showAnswer={showAnswer}
      isHit={isHit}
      userValue={userAnswer?.userRatio}
      disabled={disabled}
      hitMargin={hitMargin}
      submitMode="button"
      submitButtonText={t('common.confirmSpace')}
      onAnswer={onAnswer}
      preview={
        <div className="bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex justify-center items-center">
          <CanvasView
            width={NEGATIVE_SPACE_CANVAS_SIZE}
            height={NEGATIVE_SPACE_CANVAS_SIZE}
            className="w-full max-w-[340px] aspect-square rounded-xl border border-border shadow-sm bg-card"
            draw={(canvas) => {
              if (question.vertices) {
                drawPolygonCanvas({
                  canvas,
                  vertices: question.vertices,
                  size: NEGATIVE_SPACE_CANVAS_SIZE,
                  fillColor: CANVAS_THEME.shape.fill,
                  strokeColor: CANVAS_THEME.shape.stroke,
                  isHighlighted: showAnswer && isHit,
                });
              }
            }}
            deps={[question.vertices, showAnswer, isHit]}
          />
        </div>
      }
    />
  );
}
