import { Eye } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import { useTranslation } from '../../../core/i18n';
import { CANVAS_THEME } from '../../../utils/theme';
import { drawParticlesCanvas } from '../canvas/drawParticles';
import {
  ABSTRACTION_CANVAS_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';

interface GestureAxisViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showCanvasHints?: boolean;
}

export function GestureAxisView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showCanvasHints = true,
}: GestureAxisViewProps) {
  const { t } = useTranslation();
  const [activeSliderVal, setActiveSliderVal] = useState<number>(90);

  const targetVal = question.targetAngleDeg ?? 0;
  const userVal = userAnswer?.userValue ?? activeSliderVal;
  const isHit = Boolean(userAnswer?.isHit);

  return (
    <StandardSliderView
      questionId={question.id}
      hintText={t('packs.abstraction.cards.abs_gesture_axis.hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label={t('packs.abstraction.cards.abs_gesture_axis.label')}
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
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card"
            draw={(canvas) => {
              drawParticlesCanvas(
                canvas,
                question.particles,
                ABSTRACTION_CANVAS_SIZE,
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
