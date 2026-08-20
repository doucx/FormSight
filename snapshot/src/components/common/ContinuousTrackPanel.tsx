import { useTrackPointer } from '../../hooks/useTrackPointer';

interface ContinuousTrackPanelProps {
  label: string;
  unit: string;
  val: number;
  max: number;
  step?: number;
  showAnswer: boolean;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  tolerance?: number;
  targetVal?: number;
  userVal?: number;
  isHit?: boolean;
  onValChange: (val: number) => void;
  onCommit?: (val: number) => void;
}

export function ContinuousTrackPanel({
  label,
  unit,
  val,
  max,
  step = 0.5,
  showAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  tolerance = 5,
  targetVal,
  userVal,
  isHit,
  onValChange,
  onCommit,
}: ContinuousTrackPanelProps) {
  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    max,
    step,
    disabled: disabled || showAnswer,
    onValChange,
    onCommit,
  });

  const activeVal = hoverVal !== null ? hoverVal : val;
  const displayVal = showAnswer && userVal !== undefined ? userVal : activeVal;

  return (
    <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
        <span>{label}:</span>
        <span className="font-mono text-base font-black text-indigo-600">
          {displayVal}
          {unit}
        </span>
      </div>

      <div className="flex items-center gap-3 w-full">
        <span className="font-bold font-mono text-slate-400 text-xs">0{unit}</span>

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
            !showAnswer && !disabled ? 'cursor-pointer' : 'cursor-default'
          }`}
        >
          <div
            ref={trackRef}
            className="relative w-full h-7 rounded-xl bg-slate-200 border border-slate-300/80 shadow-inner flex items-center overflow-hidden"
          >
            {/* 进度底色 */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-indigo-500/20"
              style={{ width: `${(activeVal / max) * 100}%` }}
            />

            {/* 游标指示线 */}
            {!showAnswer && (
              <div
                className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                style={{ left: `${(activeVal / max) * 100}%` }}
              />
            )}

            {/* 容错区间指示 */}
            {!showAnswer && showToleranceBand && (
              <>
                <div
                  className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                  style={{ left: `${(Math.max(0, activeVal - tolerance) / max) * 100}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                  style={{ left: `${(Math.min(max, activeVal + tolerance) / max) * 100}%` }}
                />
              </>
            )}

            {/* 揭晓答案指示 */}
            {showAnswer && targetVal !== undefined && (
              <>
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                  style={{ left: `${(targetVal / max) * 100}%` }}
                />
                {userVal !== undefined && (
                  <div
                    className={`absolute top-0 bottom-0 w-1 -translate-x-1/2 z-10 border-x border-white shadow-md ${
                      isHit ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{ left: `${(userVal / max) * 100}%` }}
                  />
                )}
              </>
            )}
          </div>
        </div>

        <span className="font-bold font-mono text-slate-400 text-xs">
          {max}
          {unit}
        </span>
      </div>

      {showAnswer && targetVal !== undefined && (
        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-500">
            绝对真理值:{' '}
            <span className="font-bold text-slate-800 font-mono">
              {targetVal}
              {unit}
            </span>
          </span>
          <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
            误差: {userVal !== undefined ? Math.round(Math.abs(userVal - targetVal) * 10) / 10 : 0}
            {unit} (容错: ±{tolerance}
            {unit})
          </span>
        </div>
      )}
    </div>
  );
}
