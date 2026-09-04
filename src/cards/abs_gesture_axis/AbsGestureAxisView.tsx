import { Eye } from 'lucide-preact';
import { useState } from 'preact/hooks';

import {
  CANVAS_THEME,
  CanvasView,
  StandardSliderView,
  useCardTranslation,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE, drawParticlesCanvas } from './utils/generator';

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
  showCanvasHints = true,
}: AbsGestureAxisViewProps) {
  const { t } = useCardTranslation('abs_gesture_axis');
  const [activeSliderVal, setActiveSliderVal] = useState<number>(90);

  const targetVal = question.targetAngleDeg;
  const userVal = userAnswer?.userValue ?? activeSliderVal;
  const isHit = Boolean(userAnswer?.isHit);

  return (
    <StandardSliderView
      questionId={question.id}
      hintText={t('hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label={t('label')}
      max={180}
      step={0.5}
      initialValue={90}
      unit="°"
      targetValue={targetVal}
      showAnswer={showAnswer}
      isHit={isHit}
      userValue={userAnswer?.userValue}
      disabled={disabled}
      hitMargin={hitMargin}
      submitMode="commit_on_release"
      onValueChange={(_val, active) => setActiveSliderVal(active)}
      onAnswer={onAnswer}
      preview={
        <div className="bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex justify-center items-center">
          <CanvasView
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card"
            draw={(canvas) => {
              drawParticlesCanvas(
                canvas,
                question.particles,
                CANVAS_SIZE,
                showAnswer ? targetVal : activeSliderVal,
                showAnswer ? CANVAS_THEME.status.hit : CANVAS_THEME.status.accentHover,
                showAnswer ? userVal : undefined,
                isHit,
              );
            }}
            deps={[question.particles, activeSliderVal, showAnswer, targetVal, userVal, isHit]}
          />
        </div>
      }
    />
  );
}
