import { Sliders } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import {
  CanvasView,
  QuestionCardShell,
  SliderTrack,
  useCardTranslation,
  useTrackPointer,
} from '@formsight/card-sdk';
import type { PerspVpHitResult, PerspVpQuestion } from './types';
import { PERSPECTIVE_CANVAS_SIZE, drawVpConvergenceCanvas } from './utils/generator';

export interface PerspVpConvergenceViewProps {
  question: PerspVpQuestion;
  showAnswer: boolean;
  userAnswer: PerspVpHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function PerspVpConvergenceView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: PerspVpConvergenceViewProps) {
  const { t } = useCardTranslation('persp_vp_convergence');
  const [currentVal, setCurrentVal] = useState<number>(180);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 360,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });

  useEffect(() => {
    setCurrentVal(180);
    setHoverVal(null);
  }, [question.id, setHoverVal]);

  const targetVal = question.targetAngleDeg ?? 0;
  const tolerance = question.tolerance;
  const isHit = Boolean(userAnswer?.isHit);
  const userVal = userAnswer?.userValue;
  const activeVal = hoverVal !== null ? hoverVal : currentVal;
  const currentActiveAngle = showAnswer && userVal !== undefined ? userVal : activeVal;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Sliders}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
    >
      {/* 透视线灭点汇聚画布 */}
      <div className="bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex justify-center items-center w-full">
        <CanvasView
          width={PERSPECTIVE_CANVAS_SIZE}
          height={PERSPECTIVE_CANVAS_SIZE}
          className="w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card"
          draw={(canvas) => {
            drawVpConvergenceCanvas(
              canvas,
              question.referenceLines,
              question.testLineAnchor,
              currentActiveAngle,
              question.testLineLength ?? 95,
              PERSPECTIVE_CANVAS_SIZE,
              showAnswer,
              targetVal,
            );
          }}
          deps={[
            question.referenceLines,
            question.testLineAnchor,
            question.testLineLength,
            currentActiveAngle,
            showAnswer,
            targetVal,
          ]}
        />
      </div>

      {/* 射线倾角滑块与误差反馈 */}
      <div className="w-full space-y-3 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>{t('rayAngle')}</span>
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
            max={360}
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
          <span className="font-bold font-mono text-muted-foreground text-xs">360°</span>
        </div>

        {showAnswer && userVal !== undefined && (
          <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">
              {t('vpTrueAngle')}{' '}
              <span className="font-bold text-foreground font-mono">{targetVal}°</span>
            </span>
            <span
              className={
                isHit
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-rose-600 dark:text-rose-400 font-bold'
              }
            >
              {t('vpErrorInfo', {
                error: userAnswer?.errorValue ?? 0,
                tolerance,
              })}
            </span>
          </div>
        )}
      </div>
    </QuestionCardShell>
  );
}