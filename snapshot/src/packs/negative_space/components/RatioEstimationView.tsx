import { Maximize2 } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import { useTranslation } from '../../../core/i18n';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../utils/index';

interface RatioEstimationViewProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function RatioEstimationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: RatioEstimationViewProps) {
  const { t } = useTranslation();
  const { targetNegativeRatio, tolerance } = question;
  const isHit = Boolean(userAnswer?.isHit);

  return (
    <StandardSliderView
      questionId={question.id}
      hintText={t('packs.negative_space.views.ratioHint')}
      hintIcon={Maximize2}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label={t('packs.negative_space.views.ratioLabel')}
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
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
          <CanvasView
            width={NEGATIVE_SPACE_CANVAS_SIZE}
            height={NEGATIVE_SPACE_CANVAS_SIZE}
            className="w-full max-w-[340px] aspect-square rounded-xl border border-slate-300 shadow-sm"
            draw={(canvas) => {
              if (question.vertices) {
                drawPolygonCanvas({
                  canvas,
                  vertices: question.vertices,
                  size: NEGATIVE_SPACE_CANVAS_SIZE,
                  fillColor: '#0F172A',
                  strokeColor: '#1E293B',
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
