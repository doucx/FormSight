import { Eye } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import {
  CanvasView,
  DualViewportContainer,
  QuestionCardShell,
  SliderTrack,
  useCardTranslation,
  useTrackPointer,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE, drawNotanNoiseField, drawRawGrayscaleNoiseField } from './utils/generator';

export interface AbsNotanThresholdViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function AbsNotanThresholdView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: AbsNotanThresholdViewProps) {
  const { t } = useCardTranslation('abs_notan_threshold');
  const [currentVal, setCurrentVal] = useState<number>(50);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 100,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });

  useEffect(() => {
    setCurrentVal(50);
    setHoverVal(null);
  }, [question.id, setHoverVal]);

  const targetVal = question.idealNotanThreshold;
  const isHit = Boolean(userAnswer?.isHit);
  const activeVal = hoverVal !== null ? hoverVal : currentVal;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      {/* 灰阶原图与二值显影双视口 */}
      <DualViewportContainer
        leftTitle={t('rawScene')}
        rightTitle={t('notanOutput')}
        leftContent={
          <div className="w-full flex justify-center bg-muted/60 p-2.5 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="w-full max-w-[240px] aspect-square rounded-xl shadow-sm border border-border bg-card"
              draw={(canvas) => {
                if (question.notanBuffer) {
                  drawRawGrayscaleNoiseField(
                    canvas,
                    question.notanBuffer,
                    question.notanFieldDim ?? 120,
                    CANVAS_SIZE,
                  );
                }
              }}
              deps={[question.notanBuffer, question.notanFieldDim]}
            />
          </div>
        }
        rightContent={
          <div className="w-full flex justify-center bg-muted/60 p-2.5 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="w-full max-w-[240px] aspect-square rounded-xl shadow-sm border border-border bg-card"
              draw={(canvas) => {
                if (question.notanBuffer) {
                  drawNotanNoiseField(
                    canvas,
                    question.notanBuffer,
                    question.notanFieldDim ?? 120,
                    showAnswer ? targetVal : activeVal,
                    CANVAS_SIZE,
                  );
                }
              }}
              deps={[
                question.notanBuffer,
                question.notanFieldDim,
                targetVal,
                activeVal,
                showAnswer,
              ]}
            />
          </div>
        }
      />

      {/* 二值化截断阈值滑块 */}
      <div className="w-full space-y-3 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>{t('label')}</span>
          <span className="font-mono text-base font-black text-primary">
            {showAnswer && userAnswer?.userValue !== undefined
              ? `${userAnswer.userValue}%`
              : `${activeVal}%`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-muted-foreground text-xs">0%</span>
          <SliderTrack
            trackRef={trackRef}
            pointerProps={pointerProps}
            activeVal={activeVal}
            max={100}
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
          <span className="font-bold font-mono text-muted-foreground text-xs">100%</span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
