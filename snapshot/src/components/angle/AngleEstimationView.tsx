import { Eye } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../../hooks/useTrackPointer';
import {
  ANGLE_CANVAS_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawAngleCanvas,
} from '../../utils/angleUtils';
import { QuestionCardShell } from '../common/QuestionCardShell';

interface AngleEstimationViewProps {
  question: AngleQuestionData;
  showAnswer: boolean;
  userAnswer: AngleHitResult | null;
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
  const [sliderVal, setSliderVal] = useState<number>(90);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    max: 180,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: setSliderVal,
    onCommit: (committedVal) => {
      if (!disabled && !showAnswer) onAnswer(committedVal);
    },
  });

  const activeVal = hoverVal !== null ? hoverVal : sliderVal;
  const userVal = userAnswer?.userValue ?? sliderVal;
  const targetVal = question.targetAngleDeg ?? 90;
  const isHit = Boolean(userAnswer?.isHit);
  const tolerance = question.tolerance;

  useEffect(() => {
    if (question.lineA && question.lineB) {
      drawAngleCanvas(canvasRef.current, [question.lineA, question.lineB], ANGLE_CANVAS_SIZE);
    }
  }, [question.lineA, question.lineB]);

  const unit = '°';

  return (
    <QuestionCardShell
      hintText="观察两射线夹角，调制滑块逼近精准度数 (0°~180°)"
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
    >
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={ANGLE_CANVAS_SIZE}
          height={ANGLE_CANVAS_SIZE}
          className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white"
        />
      </div>

      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>夹角估算值:</span>
          <span className="font-mono text-base font-black text-indigo-600">
            {showAnswer ? `${userVal}${unit}` : `${activeVal}${unit}`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-slate-400 text-xs">0{unit}</span>

          <div
            {...pointerProps}
            style={
              hitMargin > 0
                ? {
                    paddingLeft: `${hitMargin}px`,
                    paddingRight: `${hitMargin}px`,
                    marginLeft: `-${hitMargin}px`,
                    marginRight: `-${hitMargin}px`,
                    paddingTop: '6px',
                    paddingBottom: '6px',
                    marginTop: '-6px',
                    marginBottom: '-6px',
                  }
                : undefined
            }
            className={`relative flex-1 flex items-center select-none touch-none ${
              !showAnswer && !disabled ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <div
              ref={trackRef}
              className="relative w-full h-7 rounded-xl bg-slate-200 border border-slate-300/80 shadow-inner flex items-center overflow-hidden"
            >
              <div
                className="absolute top-0 bottom-0 left-0 bg-indigo-500/20"
                style={{ width: `${(activeVal / 180) * 100}%` }}
              />

              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                  style={{ left: `${(activeVal / 180) * 100}%` }}
                />
              )}

              {!showAnswer && showToleranceBand && (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: `${(Math.max(0, activeVal - tolerance) / 180) * 100}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: `${(Math.min(180, activeVal + tolerance) / 180) * 100}%` }}
                  />
                </>
              )}

              {showAnswer && (
                <>
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                    style={{ left: `${(targetVal / 180) * 100}%` }}
                  />
                  <div
                    className={`absolute top-0 bottom-0 w-1 -translate-x-1/2 z-10 border-x border-white shadow-md ${
                      isHit ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{ left: `${(userVal / 180) * 100}%` }}
                  />
                </>
              )}
            </div>
          </div>

          <span className="font-bold font-mono text-slate-400 text-xs">180{unit}</span>
        </div>

        {showAnswer && (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              绝对真理值:{' '}
              <span className="font-bold text-slate-800 font-mono">
                {targetVal}
                {unit}
              </span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              误差: {Math.round(Math.abs(userVal - targetVal) * 10) / 10}
              {unit} (容错: ±{tolerance}
              {unit})
            </span>
          </div>
        )}
      </div>
    </QuestionCardShell>
  );
}