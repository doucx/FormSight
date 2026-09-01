import { Columns } from 'lucide-preact';
import { CanvasView } from '../../components/common/CanvasView';
import { Standard2AfcView } from '../../components/common/Standard2AfcView';
import { useTranslation } from '../../core/i18n';
import type { HitResult, QuestionData } from './types';
import {
  OPTION_SIZE,
  THUMB_SIZE,
  drawRawGrayscaleNoiseField,
} from './utils/generator';

const CANVAS_OPTION_CLASS =
  'w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block';

export interface AbsTdNotan2afcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AbsTdNotan2afcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsTdNotan2afcViewProps) {
  const { t } = useTranslation();

  const isTargetA = question.correctNotanChoice === 'A';
  const isTargetB = !isTargetA;

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('cards.abs_td_notan_2afc.hint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      prompt={
        <div className="flex flex-col items-center gap-2 bg-muted/60 p-3 rounded-2xl border border-border shadow-inner w-full max-w-[250px] sm:max-w-[270px] mx-auto">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t('cards.abs_td_notan_2afc.promptTitle')}
          </span>
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={THUMB_SIZE}
              height={THUMB_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawRawGrayscaleNoiseField(
                  canvas,
                  question.promptNotanBuffer,
                  question.notanFieldDim ?? 120,
                  THUMB_SIZE,
                )
              }
              deps={[question.promptNotanBuffer, question.notanFieldDim]}
            />
          </div>
        </div>
      }
      optionA={{
        title: `${t('common.areaA')} (${t('common.optionA')})`,
        isCorrect: isTargetA,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawRawGrayscaleNoiseField(
                  canvas,
                  question.notanSceneBufferA,
                  question.notanFieldDim ?? 120,
                  OPTION_SIZE,
                )
              }
              deps={[question.notanSceneBufferA, question.notanFieldDim]}
            />
          </div>
        ),
      }}
      optionB={{
        title: `${t('common.areaB')} (${t('common.optionB')})`,
        isCorrect: isTargetB,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawRawGrayscaleNoiseField(
                  canvas,
                  question.notanSceneBufferB,
                  question.notanFieldDim ?? 120,
                  OPTION_SIZE,
                )
              }
              deps={[question.notanSceneBufferB, question.notanFieldDim]}
            />
          </div>
        ),
      }}
    />
  );
}