import { Eye } from 'lucide-preact';
import { useState } from 'preact/hooks';

import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE, drawNotanNoiseField, drawRawGrayscaleNoiseField } from './utils/generator';
import {
  CanvasView,
  DualViewportContainer,
  StandardSliderView,
  useCardTranslation
} from '@formsight/card-sdk';

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
  showCanvasHints = true,
}: AbsNotanThresholdViewProps) {
  const { t } = useCardTranslation('abs_notan_threshold');
  const [activeVal, setActiveVal] = useState<number>(50);

  const targetVal = question.idealNotanThreshold;

  return (
    <StandardSliderView
      questionId={question.id}
      hintText={t('hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      label={t('label')}
      max={100}
      step={0.5}
      initialValue={50}
      unit="%"
      targetValue={targetVal}
      showAnswer={showAnswer}
      isHit={Boolean(userAnswer?.isHit)}
      userValue={userAnswer?.userValue}
      disabled={disabled}
      hitMargin={hitMargin}
      submitMode="commit_on_release"
      onValueChange={(_val, active) => setActiveVal(active)}
      onAnswer={onAnswer}
      preview={
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
      }
    />
  );
}
