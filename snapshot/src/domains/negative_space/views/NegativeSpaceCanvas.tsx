import type { Point } from '../../../types';
import { AreaComparison2AfcView } from '../components/AreaComparison2AfcView';
import { RatioEstimationView } from '../components/RatioEstimationView';
import { ShapeMemory2AfcView } from '../components/ShapeMemory2AfcView';
import { VertexFittingView } from '../components/VertexFittingView';
import type { NegativeSpaceHitResult, NegativeSpaceQuestionData } from '../utils/index';

export interface NegativeSpaceCanvasProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (val: number | 'A' | 'B' | Point) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function NegativeSpaceCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: NegativeSpaceCanvasProps) {
  const { mode } = question;

  if (mode === 'AREA_COMPARISON_2AFC') {
    return (
      <AreaComparison2AfcView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(choice) => onAnswer(choice)}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'NEGATIVE_VERTEX_FITTING') {
    return (
      <VertexFittingView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(point) => onAnswer(point)}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'SHAPE_MATCH_2AFC') {
    return (
      <ShapeMemory2AfcView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(choiceIdx) => onAnswer(choiceIdx)}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  return (
    <RatioEstimationView
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={(ratio) => onAnswer(ratio)}
      disabled={disabled}
      hitMargin={hitMargin}
      showToleranceBand={showToleranceBand}
      showCanvasHints={showCanvasHints}
    />
  );
}
