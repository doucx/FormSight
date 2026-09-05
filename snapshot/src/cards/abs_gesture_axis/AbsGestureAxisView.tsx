import { Eye } from 'lucide-preact';
import { useState } from 'preact/hooks';

import {
  CANVAS_THEME,
  CanvasView,
  QuestionCardShell,
  SliderTrack,
  useCardTranslation,
  useTrackPointer,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
import {
  CANVAS_SIZE,
  drawAxisSpineCanvas,
  drawParticlesOnlyCanvas,
} from './utils/generator';

const CANVAS_VIEW_CLASS =
  'w-full max-w-[260px] aspect-square rounded-xl border border-border shadow-sm bg-card block';

export interface AbsGestureAxisViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function AbsGestureAxisView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: AbsGestureAxisViewProps) {
  const { t } = useCardTranslation('abs_gesture_axis');
  const [currentVal, setCurrentVal] = useState<number>(90);

  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    max: 180,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });

  const targetVal = question.targetAngleDeg;
  const isHit = Boolean(userAnswer?.isHit);
  const activeSliderVal = hoverVal !== null ? hoverVal : currentVal;
  const userVal = userAnswer?.userValue ?? activeSliderVal;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      {/* 双视窗对称呈现：观察源（粒子群）与提取骨架（势线） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {/* 视窗 1: 粒子流向 */}
        <div className="flex flex-col items-center gap-2 bg-muted/60 p-3 rounded-2xl border border-border shadow-inner">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t('sourceTitle')}
          </span>
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className={CANVAS_VIEW_CLASS}
              draw={(canvas) => {
                drawParticlesOnlyCanvas(canvas, question.particles, CANVAS_SIZE);
              }}
              deps={[question.particles]}
            />
          </div>
        </div>

        {/* 视窗 2: 提取势线 */}
        <div className="flex flex-col items-center gap-2 bg-muted/60 p-3 rounded-2xl border border-border shadow-inner">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t('axisTitle')}
          </span>
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className={CANVAS_VIEW_CLASS}
              draw={(canvas) => {
                drawAxisSpineCanvas(
                  canvas,
                  CANVAS_SIZE,
                  showAnswer ? targetVal : activeSliderVal,
                  showAnswer ? CANVAS_THEME.status.hit : CANVAS_THEME.status.accentHover,
                  showAnswer ? userVal : undefined,
                  isHit,
                );
              }}
              deps={[activeSliderVal, showAnswer, targetVal, userVal, isHit]}
            />
          </div>
        </div>
      </div>

      {/* 势线角度连续调节滑块 */}
      <div className="w-full space-y-3 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>{t('label')}</span>
          <span className="font-mono text-base font-black text-primary">
            {showAnswer && userAnswer?.userValue !== undefined
              ? `${userAnswer.userValue}°`
              : `${activeSliderVal}°`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-muted-foreground text-xs">0°</span>
          <SliderTrack
            trackRef={trackRef}
            pointerProps={pointerProps}
            activeVal={activeSliderVal}
            max={180}
            min={0}
            hitMargin={hitMargin}
            disabled={disabled}
            showAnswer={showAnswer}
            targetValue={targetVal}
            userValue={userAnswer?.userValue}
            tolerance={question.tolerance}
            showToleranceBand={showToleranceBand}
            isHit={isHit}
          />
          <span className="font-bold font-mono text-muted-foreground text-xs">180°</span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
