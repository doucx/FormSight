import type { AbstractionHitResult, AbstractionQuestionData } from '../utils/abstraction';
import { GestureAxisView } from './abstraction/GestureAxisView';
import { NotanThresholdView } from './abstraction/NotanThresholdView';
import { PaletteClusteringView } from './abstraction/PaletteClusteringView';
import { TopDown2AfcView } from './abstraction/TopDown2AfcView';
import { TopDownPatternView } from './abstraction/TopDownPatternView';

interface AbstractionCanvasProps {
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

  // 默认 Top-Down 2AFC 视图 (TD_GESTURE_2AFC, TD_HULL_2AFC, TD_NOTAN_2AFC, POLYGON_DECIMATION)
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
