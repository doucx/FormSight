import { AngleComparison2AfcView } from '../../../components/angle/AngleComparison2AfcView';
import { AngleEstimationView } from '../../../components/angle/AngleEstimationView';
import { AngleParallel2AfcView } from '../../../components/angle/AngleParallel2AfcView';
import type { AngleHitResult, AngleQuestionData } from '../utils/angleUtils';

export interface AngleCanvasProps {
  question: AngleQuestionData;
  showAnswer: boolean;
  userAnswer: AngleHitResult | null;
  onAnswer: (val: number | 'A' | 'B') => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function AngleCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: AngleCanvasProps) {
  const { mode } = question;

  if (mode === 'ANGLE_ESTIMATION') {
    return (
      <AngleEstimationView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        hitMargin={hitMargin}
        showToleranceBand={showToleranceBand}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'ANGLE_COMPARISON_2AFC') {
    return (
      <AngleComparison2AfcView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  return (
    <AngleParallel2AfcView
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      showCanvasHints={showCanvasHints}
    />
  );
}
