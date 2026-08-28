import { Eye } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
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
  const [activeSliderVal, setActiveSliderVal] = useState<number>(90);

  const targetVal = question.targetAngleDeg ?? 0;
  const userVal = userAnswer?.userValue ?? activeSliderVal;
  const isHit = Boolean(userAnswer?.isHit);

  return (
    <StandardSliderView
      questionId={question.id}
      hintText="旋转主轴对齐粒子群动态流向 (0°~180°)"
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label="动态势线角度:"
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
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
          <CanvasView
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm"
            draw={(canvas) => {
              drawParticlesCanvas(
                canvas,
                question.particles,
                ABSTRACTION_CANVAS_SIZE,
                showAnswer ? targetVal : activeSliderVal,
                showAnswer ? '#22C55E' : '#6366F1',
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
