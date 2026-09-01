import { Sliders } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { CanvasView } from '../../components/common/CanvasView';
import { StandardSliderView } from '../../components/common/StandardSliderView';
import { useCardTranslation } from '../../core/i18n';
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
  const targetVal = question.targetAngleDeg ?? 0;
  const tolerance = question.tolerance;
  const isHit = Boolean(userAnswer?.isHit);
  const userVal = userAnswer?.userValue;

  const [liveAngle, setLiveAngle] = useState<number>(180);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset liveAngle on new question
  useEffect(() => {
    setLiveAngle(180);
  }, [question.id]);

  const currentActiveAngle = showAnswer && userVal !== undefined ? userVal : liveAngle;

  return (
    <StandardSliderView
      questionId={question.id}
      hintText={t('views.hint')}
      hintIcon={Sliders}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label={t('views.rayAngle')}
      max={360}
      step={0.5}
      initialValue={180}
      unit="°"
      targetValue={targetVal}
      tolerance={tolerance}
      showToleranceBand={showToleranceBand}
      showAnswer={showAnswer}
      isHit={isHit}
      userValue={userVal}
      disabled={disabled}
      hitMargin={hitMargin}
      submitMode="commit_on_release"
      onValueChange={(_cur, active) => setLiveAngle(active)}
      onAnswer={onAnswer}
      preview={
        <div className="bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex justify-center items-center">
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
      }
      footerDetails={
        showAnswer && userVal !== undefined ? (
          <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">
              {t('views.vpTrueAngle')}{' '}
              <span className="font-bold text-foreground font-mono">{targetVal}°</span>
            </span>
            <span
              className={
                isHit
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-rose-600 dark:text-rose-400 font-bold'
              }
            >
              {t('views.vpErrorInfo', {
                error: userAnswer?.errorValue ?? 0,
                tolerance,
              })}
            </span>
          </div>
        ) : null
      }
    />
  );
}