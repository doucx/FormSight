import { Columns } from 'lucide-preact';
import { CanvasView } from '../../components/common/CanvasView';
import { Standard2AfcView } from '../../components/common/Standard2AfcView';
import { useCardTranslation } from '../../core/i18n';
import type { AngleComparisonHitResult, AngleComparisonQuestion } from './types';
import { ANGLE_2AFC_SIZE, drawAngleCanvas } from './utils/generator';

export interface AngleComparison2AfcViewProps {
  question: AngleComparisonQuestion;
  showAnswer: boolean;
  userAnswer: AngleComparisonHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AngleComparison2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AngleComparison2AfcViewProps) {
  const { t } = useCardTranslation('angle_comparison_2afc');
  const isAHit = question.largerSide === 'A';
  const isBHit = question.largerSide === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('hint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      optionA={{
        title: t('areaA'),
        isCorrect: isAHit,
        badge: showAnswer ? `${question.angleA}°` : undefined,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) => drawAngleCanvas(canvas, question.linesA, ANGLE_2AFC_SIZE)}
              deps={[question.linesA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: t('areaB'),
        isCorrect: isBHit,
        badge: showAnswer ? `${question.angleB}°` : undefined,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) => drawAngleCanvas(canvas, question.linesB, ANGLE_2AFC_SIZE)}
              deps={[question.linesB]}
            />
          </div>
        ),
      }}
    />
  );
}
