import { Eye } from 'lucide-preact';
import { CanvasView } from '../../components/common/CanvasView';
import { Standard2AfcView } from '../../components/common/Standard2AfcView';
import { useCardTranslation } from '../../core/i18n';
import type { PerspGestaltHitResult, PerspGestaltQuestion } from './types';
import { PERSPECTIVE_2AFC_SIZE, drawGestaltCanvas } from './utils/generator';

export interface PerspGestaltContinuationViewProps {
  question: PerspGestaltQuestion;
  showAnswer: boolean;
  userAnswer: PerspGestaltHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function PerspGestaltContinuationView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: PerspGestaltContinuationViewProps) {
  const { t } = useCardTranslation('persp_gestalt_continuation');
  const isAHit = question.correctChoice === 'A';
  const isBHit = question.correctChoice === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('views.hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      optionA={{
        title: t('views.optionA'),
        isCorrect: isAHit,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={PERSPECTIVE_2AFC_SIZE}
              height={PERSPECTIVE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawGestaltCanvas(
                  canvas,
                  question.obstacle,
                  question.incomingLine,
                  question.lineOptionA,
                  PERSPECTIVE_2AFC_SIZE,
                )
              }
              deps={[question.incomingLine, question.lineOptionA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: t('views.optionB'),
        isCorrect: isBHit,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={PERSPECTIVE_2AFC_SIZE}
              height={PERSPECTIVE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawGestaltCanvas(
                  canvas,
                  question.obstacle,
                  question.incomingLine,
                  question.lineOptionB,
                  PERSPECTIVE_2AFC_SIZE,
                )
              }
              deps={[question.incomingLine, question.lineOptionB]}
            />
          </div>
        ),
      }}
    />
  );
}