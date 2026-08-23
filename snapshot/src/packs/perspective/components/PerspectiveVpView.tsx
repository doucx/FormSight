import { Sliders } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
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
  const targetVal = question.targetAngleDeg ?? 0;
  const tolerance = question.tolerance;
  const isHit = Boolean(userAnswer?.isHit);
  const userVal = userAnswer?.userValue as number | undefined;

  return (
    <StandardSliderView
      questionId={question.id}
      hintText="观察已有透视基准线，调制滑块旋转第三条射线使其交汇于同一灭点 (0°~360°)"
      hintIcon={Sliders}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label="射线倾角:"
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
      onAnswer={onAnswer}
      preview={
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
          <CanvasView
            width={PERSPECTIVE_CANVAS_SIZE}
            height={PERSPECTIVE_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white"
            draw={(canvas) => {
              drawVpConvergenceCanvas(
                canvas,
                question.referenceLines,
                question.testLineAnchor,
                userVal ?? 180,
                question.testLineLength ?? 95,
                PERSPECTIVE_CANVAS_SIZE,
                showAnswer,
                targetVal,
              );
            }}
            deps={[question.referenceLines, userVal, showAnswer]}
          />
        </div>
      }
      footerDetails={
        showAnswer && userVal !== undefined ? (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              精准交汇角: <span className="font-bold text-slate-800 font-mono">{targetVal}°</span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              误差: {userAnswer?.errorValue}° (容错: ±{tolerance}°)
            </span>
          </div>
        ) : null
      }
    />
  );
}
