import { getToleranceSpan } from '../core/color/colorUtils';
import { useTrackPointer } from '../hooks/useTrackPointer';

const getPercent = (val: number, max: number) => `${(val / max) * 100}%`;

export interface HsvTrackSliderProps {
  label: 'H' | 'S' | 'V';
  gradient: string;
  val: number;
  max: number;
  unit: string;
  targetHSV: [number, number, number];
  difficultyLevel: number;
  showAnswer: boolean;
  targetVal?: number;
  userVal?: number;
  isHit?: boolean;
  isInteractiveTarget?: boolean;
  onValChange?: (newVal: number) => void;
  onCommit?: (committedVal: number) => void;
  allUserHSV?: [number, number, number];
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  onHoverStateChange?: (hoverVal: number | null) => void;
  onDraggingStateChange?: (isDragging: boolean) => void;
}

export function HsvTrackSlider({
  label,
  gradient,
  val,
  max,
  unit,
  targetHSV,
  difficultyLevel,
  showAnswer,
  targetVal,
  userVal,
  isHit = false,
  isInteractiveTarget = false,
  onValChange,
  onCommit,
  allUserHSV,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  onHoverStateChange,
  onDraggingStateChange,
}: HsvTrackSliderProps) {
  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    max,
    step: 1,
    disabled: disabled || showAnswer,
    onValChange,
    onCommit,
    onHoverStateChange,
    onDraggingStateChange,
  });

  const activeVal = hoverVal !== null ? hoverVal : val;
  const actualTargetVal =
    targetVal ?? (label === 'H' ? targetHSV[0] : label === 'S' ? targetHSV[1] : targetHSV[2]);

  const isAnswerRevealed = showAnswer && userVal !== undefined;

  const renderLabelText = () => {
    if (isAnswerRevealed) {
      return `${userVal}${unit}`;
    }
    if (isInteractiveTarget && !showAnswer) {
      return hoverVal !== null ? `${hoverVal}${unit}` : '?';
    }
    return `${activeVal}${unit}`;
  };

  return (
    <div className="flex items-center gap-3 w-full">
      <span className="w-5 font-bold font-mono text-muted-foreground text-sm text-center">
        {label}
      </span>

      <div
        {...pointerProps}
        style={
          hitMargin > 0
            ? {
                paddingLeft: `${hitMargin}px`,
                paddingRight: `${hitMargin}px`,
                marginLeft: `-${hitMargin}px`,
                marginRight: `-${hitMargin}px`,
                paddingTop: '6px',
                paddingBottom: '6px',
                marginTop: '-6px',
                marginBottom: '-6px',
              }
            : undefined
        }
        className={`relative flex-1 flex items-center select-none touch-none ${
          !showAnswer && !disabled ? 'cursor-none' : 'cursor-default'
        }`}
      >
        <div
          ref={trackRef}
          className="relative w-full h-7 rounded-xl border border-border shadow-inner flex items-center"
          style={{ background: gradient }}
        >
          {/* 当前设定值标记线：在非目标盲测轨道、或非揭晓状态的参考轨道上显示 */}
          {(!showAnswer && !isInteractiveTarget) || (showAnswer && userVal === undefined) ? (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-card pointer-events-none shadow-sm z-20"
              style={{ left: getPercent(val, max) }}
            />
          ) : null}

          {/* 动态 ΔE 容错感应指示线 */}
          {!showAnswer &&
            showToleranceBand &&
            (hoverVal !== null || !isInteractiveTarget) &&
            (() => {
              const currentTuple: [number, number, number] = allUserHSV
                ? [
                    label === 'H' ? activeVal : allUserHSV[0],
                    label === 'S' ? activeVal : allUserHSV[1],
                    label === 'V' ? activeVal : allUserHSV[2],
                  ]
                : [
                    label === 'H' ? activeVal : targetHSV[0],
                    label === 'S' ? activeVal : targetHSV[1],
                    label === 'V' ? activeVal : targetHSV[2],
                  ];

              const span = getToleranceSpan(
                label,
                activeVal,
                targetHSV,
                difficultyLevel,
                currentTuple,
              );
              const isWrapMode = label === 'H';
              const leftVal = isWrapMode
                ? (activeVal - span.halfSpan + max) % max
                : Math.max(0, activeVal - span.halfSpan);
              const rightVal = isWrapMode
                ? (activeVal + span.halfSpan + max) % max
                : Math.min(max, activeVal + span.halfSpan);

              return (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                    style={{ left: `${(leftVal / max) * 100}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                    style={{ left: `${(rightVal / max) * 100}%` }}
                  />
                </>
              );
            })()}

          {/* 鼠标悬停准心线 */}
          {!showAnswer && hoverVal !== null && (isInteractiveTarget || hoverVal !== val) && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-card shadow-sm pointer-events-none z-30 opacity-75"
              style={{ left: getPercent(hoverVal, max) }}
            />
          )}

          {/* 揭晓答案之后的真理位与提交位（仅当本轨道有提交值时呈现） */}
          {isAnswerRevealed && (
            <>
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-10 bg-emerald-500 border-x border-white shadow-md z-20"
                style={{ left: getPercent(actualTargetVal, max) }}
              />
              <div
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-7 border-x border-white ${
                  isHit ? 'bg-emerald-500' : 'bg-rose-500'
                } shadow-md z-10`}
                style={{ left: getPercent(userVal, max) }}
              />
            </>
          )}
        </div>
      </div>

      <span
        className={`w-12 text-right font-mono font-bold text-xs ${
          isInteractiveTarget && !showAnswer
            ? 'text-amber-500'
            : isAnswerRevealed && isHit
              ? 'text-emerald-600'
              : isAnswerRevealed
                ? 'text-rose-600'
                : 'text-foreground'
        }`}
      >
        {renderLabelText()}
      </span>
    </div>
  );
}
