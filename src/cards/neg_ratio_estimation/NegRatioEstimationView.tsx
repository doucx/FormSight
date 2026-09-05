import { Maximize2 } from 'lucide-preact';
import { useState } from 'preact/hooks';

import {
  Button,
  CANVAS_THEME,
  CanvasView,
  QuestionCardShell,
  SliderTrack,
  drawPolygonCanvas,
  useCardTranslation,
  useSubmitShortcut,
  useTrackPointer,
} from '@formsight/card-sdk';
import { type HitResult, NEGATIVE_SPACE_CANVAS_SIZE, type QuestionData } from './types';

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
  const [currentVal, setCurrentVal] = useState<number>(50.0);

  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    max: 100,
    step: 0.1,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
  });

  const handleSubmit = () => {
    if (!disabled && !showAnswer) onAnswer(currentVal);
  };

  useSubmitShortcut({
    disabled: disabled || showAnswer,
    onSubmit: handleSubmit,
  });

  const { targetNegativeRatio, tolerance } = question;
  const isHit = Boolean(userAnswer?.isHit);
  const activeVal = hoverVal !== null ? hoverVal : currentVal;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Maximize2}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
    >
      {/* 负形多边形画布 */}
      <div className="bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex justify-center items-center w-full">
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

      {/* 负形比例估算滑块 */}
      <div className="w-full space-y-3 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>{t('ratioLabel')}</span>
          <span className="font-mono text-base font-black text-primary">
            {showAnswer && userAnswer?.userRatio !== undefined
              ? `${userAnswer.userRatio}%`
              : `${activeVal.toFixed(1)}%`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-muted-foreground text-xs">0%</span>
          <SliderTrack
            trackRef={trackRef}
            pointerProps={pointerProps}
            activeVal={activeVal}
            max={100}
            min={0}
            hitMargin={hitMargin}
            disabled={disabled}
            showAnswer={showAnswer}
            targetValue={targetNegativeRatio}
            userValue={userAnswer?.userRatio}
            tolerance={tolerance}
            showToleranceBand={showToleranceBand}
            isHit={isHit}
          />
          <span className="font-bold font-mono text-muted-foreground text-xs">100%</span>
        </div>
      </div>

      {/* 二段显式确认按钮（支持空格键） */}
      {!showAnswer && (
        <Button
          variant="default"
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full py-3 h-auto rounded-2xl"
        >
          {t('common.confirmSpace')}
        </Button>
      )}
    </QuestionCardShell>
  );
}
