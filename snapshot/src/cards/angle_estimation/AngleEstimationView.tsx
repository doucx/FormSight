import { Eye } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import {
  CanvasView,
  QuestionCardShell,
  SliderTrack,
  useCardTranslation,
  useTrackPointer,
} from '@formsight/card-sdk';
import type { AngleEstimationHitResult, AngleEstimationQuestion } from './types';
import { ANGLE_CANVAS_SIZE, drawAngleCanvas } from './utils/generator';

export interface AngleEstimationViewProps {
  question: AngleEstimationQuestion;
  showAnswer: boolean;
  userAnswer: AngleEstimationHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function AngleEstimationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: AngleEstimationViewProps) {
  const { t } = useCardTranslation('angle_estimation');
  const [currentVal, setCurrentVal] = useState<number>(90);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 180,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setCurrentVal(90);
    setHoverVal(null);
  }, [question.id, setHoverVal]);

  const targetVal = question.targetAngleDeg ?? 90;
  const tolerance = question.tolerance;
  const isHit = Boolean(userAnswer?.isHit);
  const activeVal = hoverVal !== null ? hoverVal : currentVal;
  const userVal = userAnswer?.userValue;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
    >
      {/* 夹角展示画布 */}
      <div className="bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex justify-center items-center w-full">
        <CanvasView
          width={ANGLE_CANVAS_SIZE}
          height={ANGLE_CANVAS_SIZE}
          className="w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card"
          draw={(canvas) => {
            if (question.lineA && question.lineB) {
              drawAngleCanvas(canvas, [question.lineA, question.lineB], ANGLE_CANVAS_SIZE);
            }
          }}
          deps={[question.lineA, question.lineB]}
        />
      </div>

      {/* 夹角角度滑块与真理比对 */}
      <div className="w-full space-y-3 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>{t('label')}</span>
          <span className="font-mono text-base font-black text-primary">
            {showAnswer && userVal !== undefined ? `${userVal}°` : `${activeVal}°`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-muted-foreground text-xs">0°</span>
          <SliderTrack
            trackRef={trackRef}
            pointerProps={pointerProps}
            activeVal={activeVal}
            max={180}
            min={0}
            hitMargin={hitMargin}
            disabled={disabled}
            showAnswer={showAnswer}
            targetValue={targetVal}
            userValue={userVal}
            tolerance={tolerance}
            showToleranceBand={showToleranceBand}
            isHit={isHit}
          />
          <span className="font-bold font-mono text-muted-foreground text-xs">180°</span>
        </div>

        {showAnswer && userVal !== undefined && (
          <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">
              {t('trueAngle')}{' '}
              <span className="font-bold text-foreground font-mono">{targetVal}°</span>
            </span>
            <span
              className={
                isHit
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-rose-600 dark:text-rose-400 font-bold'
              }
            >
              {t('errorInfo', {
                error: Math.round(Math.abs(userVal - targetVal) * 10) / 10,
                tolerance,
              })}
            </span>
          </div>
        )}
      </div>
    </QuestionCardShell>
  );
}
