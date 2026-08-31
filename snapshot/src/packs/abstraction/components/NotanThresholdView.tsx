import { Eye } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { CanvasView } from '../../../components/common/CanvasView';
import { DualViewportContainer } from '../../../components/common/DualViewportContainer';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import { useTranslation } from '../../../core/i18n';
import { drawNotanNoiseField, drawRawGrayscaleNoiseField } from '../canvas/drawNotanField';
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
  const { t } = useTranslation();
  const [activeVal, setActiveVal] = useState<number>(50);

  const targetVal = question.idealNotanThreshold ?? 50;

  return (
    <StandardSliderView
      questionId={question.id}
      hintText={t('packs.abstraction.cards.abs_notan_threshold.hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      label={t('packs.abstraction.cards.abs_notan_threshold.label')}
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
          leftTitle={t('packs.abstraction.cards.abs_notan_threshold.rawScene')}
          rightTitle={t('packs.abstraction.cards.abs_notan_threshold.notanOutput')}
          leftContent={
            <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-inner">
              <CanvasView
                width={ABSTRACTION_2AFC_SIZE}
                height={ABSTRACTION_2AFC_SIZE}
                className="w-full max-w-[240px] aspect-square rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                draw={(canvas) => {
                  if (question.notanBuffer) {
                    drawRawGrayscaleNoiseField(
                      canvas,
                      question.notanBuffer,
                      question.notanFieldDim ?? 120,
                      ABSTRACTION_2AFC_SIZE,
                    );
                  }
                }}
                deps={[question.notanBuffer, question.notanFieldDim]}
              />
            </div>
          }
          rightContent={
            <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-inner">
              <CanvasView
                width={ABSTRACTION_2AFC_SIZE}
                height={ABSTRACTION_2AFC_SIZE}
                className="w-full max-w-[240px] aspect-square rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                draw={(canvas) => {
                  if (question.notanBuffer) {
                    drawNotanNoiseField(
                      canvas,
                      question.notanBuffer,
                      question.notanFieldDim ?? 120,
                      showAnswer ? targetVal : activeVal,
                      ABSTRACTION_2AFC_SIZE,
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
