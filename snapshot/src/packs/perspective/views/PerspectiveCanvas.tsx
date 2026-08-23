import type { Point } from '../../../types';
import { GestaltContinuation2AfcView } from '../components/GestaltContinuation2AfcView';
import { PerspectiveVpView } from '../components/PerspectiveVpView';
import { ProportionDivisionView } from '../components/ProportionDivisionView';
import { StructureProjection3DView } from '../components/StructureProjection3DView';
import type { PerspectiveHitResult, PerspectiveQuestionData } from '../utils/perspectiveUtils';

export interface PerspectiveCanvasProps {
  question: PerspectiveQuestionData;
  showAnswer: boolean;
  userAnswer: PerspectiveHitResult | null;
  onAnswer: (val: number | 'A' | 'B' | Point) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function PerspectiveCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: PerspectiveCanvasProps) {
  const { mode } = question;

  if (mode === 'VP_CONVERGENCE') {
    return (
      <PerspectiveVpView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer as (val: number) => void}
        disabled={disabled}
        hitMargin={hitMargin}
        showToleranceBand={showToleranceBand}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'PROPORTION_DIVISION') {
    return (
      <ProportionDivisionView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer as (point: Point) => void}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'GESTALT_CONTINUATION_2AFC') {
    return (
      <GestaltContinuation2AfcView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer as (choice: 'A' | 'B') => void}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  return (
    <StructureProjection3DView
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer as (point: Point) => void}
      disabled={disabled}
      showCanvasHints={showCanvasHints}
    />
  );
}