import { Eye } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import { useTranslation } from '../../../core/i18n';
import {
  PERSPECTIVE_2AFC_SIZE,
  type PerspectiveHitResult,
  type PerspectiveQuestionData,
  drawGestaltCanvas,
} from '../utils/perspectiveUtils';

interface GestaltContinuation2AfcViewProps {
  question: PerspectiveQuestionData;
  showAnswer: boolean;
  userAnswer: PerspectiveHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function GestaltContinuation2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: GestaltContinuation2AfcViewProps) {
  const { t } = useTranslation();
  const isAHit = question.correctChoice === 'A';
  const isBHit = question.correctChoice === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('packs.perspective.views.gestaltHint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      optionA={{
        title: t('common.optionA'),
        isCorrect: isAHit,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={PERSPECTIVE_2AFC_SIZE}
              height={PERSPECTIVE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white dark:bg-slate-950"
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
        title: t('common.optionB'),
        isCorrect: isBHit,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={PERSPECTIVE_2AFC_SIZE}
              height={PERSPECTIVE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white dark:bg-slate-950"
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
