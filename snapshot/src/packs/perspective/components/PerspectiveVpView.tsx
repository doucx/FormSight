import { Sliders } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import { useTranslation } from '../../../core/i18n';
import {
  PERSPECTIVE_CANVAS_SIZE,
  type PerspectiveHitResult,
  type PerspectiveQuestionData,
  drawVpConvergenceCanvas,
} from '../utils/perspectiveUtils';

interface PerspectiveVpViewProps {
  question: PerspectiveQuestionData;
  showAnswer: boolean;
  userAnswer: PerspectiveHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function PerspectiveVpView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: PerspectiveVpViewProps) {
  const { t } = useTranslation();
  const targetVal = question.targetAngleDeg ?? 0;
  const tolerance = question.tolerance;
  const isHit = Boolean(userAnswer?.isHit);
  const userVal = userAnswer?.userValue as number | undefined;

  const [liveAngle, setLiveAngle] = useState<number>(180);

  // 当题目切换时重置当前调制角度为 180°
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset liveAngle on new question
  useEffect(() => {
    setLiveAngle(180);
  }, [question.id]);

  const currentActiveAngle = showAnswer && userVal !== undefined ? userVal : liveAngle;

  return (
    <StandardSliderView
      questionId={question.id}
      hintText={t('packs.perspective.views.vpHint')}
      hintIcon={Sliders}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label={t('packs.perspective.views.rayAngle')}
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
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-950"
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
              {t('packs.perspective.views.vpTrueAngle')}{' '}
              <span className="font-bold text-foreground font-mono">{targetVal}°</span>
            </span>
            <span className={isHit ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
              {t('packs.perspective.views.vpErrorInfo', {
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
