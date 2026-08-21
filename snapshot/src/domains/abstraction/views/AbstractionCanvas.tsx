import { GestureAxisView } from '../../../components/abstraction/GestureAxisView';
import { NotanThresholdView } from '../../../components/abstraction/NotanThresholdView';
import { PaletteClusteringView } from '../../../components/abstraction/PaletteClusteringView';
import { TopDown2AfcView } from '../../../components/abstraction/TopDown2AfcView';
import { TopDownPatternView } from '../../../components/abstraction/TopDownPatternView';
import type {
  AbstractionHitResult,
  AbstractionQuestionData,
} from '../../../utils/abstraction';

export interface AbstractionCanvasProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (val: number | 'A' | 'B') => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function AbstractionCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showCanvasHints = true,
}: AbstractionCanvasProps) {
  const { mode } = question;

  if (mode === 'GESTURE_AXIS') {
    return (
      <GestureAxisView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(val) => onAnswer(val)}
        disabled={disabled}
        hitMargin={hitMargin}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'NOTAN_THRESHOLD') {
    return (
      <NotanThresholdView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(val) => onAnswer(val)}
        disabled={disabled}
        hitMargin={hitMargin}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'PALETTE_CLUSTERING') {
    return (
      <PaletteClusteringView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(idx) => onAnswer(idx)}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'TD_PALETTE_2AFC') {
    return (
      <TopDownPatternView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(idx) => onAnswer(idx)}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  return (
    <TopDown2AfcView
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={(choice) => onAnswer(choice)}
      disabled={disabled}
      showCanvasHints={showCanvasHints}
    />
  );
}