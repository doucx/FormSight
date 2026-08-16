import { useRef, useState } from 'preact/hooks';
import { getToleranceSpan } from '../utils/colorUtils';

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
  onValChange: (newVal: number) => void;
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
  onValChange,
  allUserHSV,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  onHoverStateChange,
  onDraggingStateChange,
}: HsvTrackSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [hoverVal, setHoverVal] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const calcValFromClientX = (clientX: number): number | null => {
    if (!trackRef.current) return null;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    return Math.round(ratio * max);
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (disabled || showAnswer) return;
    setIsDragging(true);
    if (onDraggingStateChange) onDraggingStateChange(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const calculated = calcValFromClientX(e.clientX);
    if (calculated !== null) {
      onValChange(calculated);
      setHoverVal(calculated);
      if (onHoverStateChange) onHoverStateChange(calculated);
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (disabled || showAnswer) return;
    const calculated = calcValFromClientX(e.clientX);
    if (calculated !== null) {
      if (isDragging) {
        onValChange(calculated);
      }
      setHoverVal(calculated);
      if (onHoverStateChange) onHoverStateChange(calculated);
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (disabled || showAnswer) return;
    if (isDragging) {
      setIsDragging(false);
      if (onDraggingStateChange) onDraggingStateChange(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      const calculated = calcValFromClientX(e.clientX);
      if (calculated !== null) {
        onValChange(calculated);
      }
    }
  };

  const handleMouseLeave = () => {
    if (!isDragging) {
      setHoverVal(null);
      if (onHoverStateChange) onHoverStateChange(null);
    }
  };

  const activeVal = hoverVal !== null ? hoverVal : val;
  const actualTargetVal =
    targetVal ?? (label === 'H' ? targetHSV[0] : label === 'S' ? targetHSV[1] : targetHSV[2]);

  return (
    <div className="flex items-center gap-3 w-full">
      <span className="w-5 font-bold font-mono text-slate-400 text-sm text-center">{label}</span>

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseLeave={handleMouseLeave}
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
          className="relative w-full h-7 rounded-xl border border-slate-200/80 shadow-inner flex items-center"
          style={{ background: gradient }}
        >
          {/* 当前设定值标记线 */}
          {!showAnswer && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 pointer-events-none shadow-sm z-20"
              style={{ left: getPercent(val, max) }}
            />
          )}

          {/* 动态 ΔE 容错感应指示线 */}
          {!showAnswer &&
            showToleranceBand &&
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
          {!showAnswer && hoverVal !== null && hoverVal !== val && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 shadow-sm pointer-events-none z-30 opacity-75"
              style={{ left: getPercent(hoverVal, max) }}
            />
          )}

          {/* 揭晓答案之后的真理位与提交位 */}
          {showAnswer && (
            <>
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-8 bg-emerald-500 border-x border-white shadow-md z-10"
                style={{ left: getPercent(actualTargetVal, max) }}
              />
              {userVal !== undefined && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-8 border-x border-white ${
                    isHit ? 'bg-emerald-500' : 'bg-rose-500'
                  } shadow-md z-20`}
                  style={{ left: getPercent(userVal, max) }}
                />
              )}
              {userVal !== undefined && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-25 overflow-visible">
                  <defs>
                    <marker
                      id={`arrow-${label}-${isHit ? 'hit' : 'miss'}`}
                      viewBox="0 0 6 6"
                      refX="5"
                      refY="3"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 0 0 L 6 3 L 0 6 z" fill={isHit ? '#00AA00' : '#FF0000'} />
                    </marker>
                  </defs>
                  <line
                    x1={getPercent(userVal, max)}
                    y1="50%"
                    x2={getPercent(actualTargetVal, max)}
                    y2="50%"
                    stroke={isHit ? '#00AA00' : '#FF0000'}
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    markerEnd={`url(#arrow-${label}-${isHit ? 'hit' : 'miss'})`}
                  />
                </svg>
              )}
            </>
          )}
        </div>
      </div>

      <span
        className={`w-12 text-right font-mono font-bold text-xs ${
          !showAnswer ? 'text-amber-500' : isHit ? 'text-emerald-600' : 'text-rose-600'
        }`}
      >
        {`${activeVal}${unit}`}
      </span>
    </div>
  );
}
