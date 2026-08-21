import { Eye } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { DualViewportContainer } from '../../../components/common/DualViewportContainer';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { useTrackPointer } from '../../../hooks/useTrackPointer';
import {
  drawNotanNoiseField,
  drawRawGrayscaleNoiseField,
} from '../../../utils/canvas/drawNotanField';
import {
  ABSTRACTION_2AFC_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';

interface NotanThresholdViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showCanvasHints?: boolean;
}

export function NotanThresholdView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showCanvasHints = true,
}: NotanThresholdViewProps) {
  const [sliderVal, setSliderVal] = useState<number>(50);
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);

  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    max: 100,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: setSliderVal,
    onCommit: (committedVal) => {
      if (!disabled && !showAnswer) onAnswer(committedVal);
    },
  });

  const activeVal = hoverVal !== null ? hoverVal : sliderVal;

  useEffect(() => {
    if (question.notanBuffer) {
      drawRawGrayscaleNoiseField(
        canvasRefA.current,
        question.notanBuffer,
        question.notanFieldDim ?? 120,
        ABSTRACTION_2AFC_SIZE,
      );
      drawNotanNoiseField(
        canvasRefB.current,
        question.notanBuffer,
        question.notanFieldDim ?? 120,
        showAnswer ? question.idealNotanThreshold : activeVal,
        ABSTRACTION_2AFC_SIZE,
      );
    }
  }, [
    question.notanBuffer,
    question.notanFieldDim,
    question.idealNotanThreshold,
    activeVal,
    showAnswer,
  ]);

  return (
    <QuestionCardShell
      hintText="观察左侧灰阶原图，在下方滑块点击/调节右侧最佳黑白二值截断点"
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      <DualViewportContainer
        leftTitle="灰阶原图 (Raw Scene)"
        rightTitle="二值显影 (Notan Output)"
        leftContent={
          <div className="w-full flex justify-center bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
            <canvas
              ref={canvasRefA}
              width={ABSTRACTION_2AFC_SIZE}
              height={ABSTRACTION_2AFC_SIZE}
              className="w-full max-w-[240px] aspect-square rounded-xl shadow-sm border border-slate-200"
            />
          </div>
        }
        rightContent={
          <div className="w-full flex justify-center bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
            <canvas
              ref={canvasRefB}
              width={ABSTRACTION_2AFC_SIZE}
              height={ABSTRACTION_2AFC_SIZE}
              className="w-full max-w-[240px] aspect-square rounded-xl shadow-sm border border-slate-200"
            />
          </div>
        }
      />

      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>二值化截断阈值:</span>
          <span className="font-mono text-base font-black text-indigo-600">
            {showAnswer ? `${userAnswer?.userValue ?? sliderVal}%` : `${activeVal}%`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-slate-400 text-xs">0%</span>

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
                style={{ width: `${activeVal}%` }}
              />

              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                  style={{ left: `${activeVal}%` }}
                />
              )}

              {showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                  style={{ left: `${question.idealNotanThreshold ?? 50}%` }}
                />
              )}
            </div>
          </div>

          <span className="font-bold font-mono text-slate-400 text-xs">100%</span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
