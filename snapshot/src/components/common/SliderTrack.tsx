import type { JSX, RefObject } from 'preact';

export interface SliderTrackProps {
  trackRef?: RefObject<HTMLDivElement | null>;
  pointerProps?: JSX.HTMLAttributes<HTMLDivElement>;
  activeVal: number;
  max: number;
  min?: number;
  hitMargin?: number;
  disabled?: boolean;
  showAnswer?: boolean;
  targetValue?: number;
  userValue?: number;
  tolerance?: number;
  showToleranceBand?: boolean;
  isHit?: boolean;
  className?: string;
  trackClassName?: string;
}

/**
 * 连续滑块轨道纯视觉原子基元
 * 承载：当前位置指示、动态容错区间、真理线/作答线展示，以及 HitMargin 点击外延包络
 */
export function SliderTrack({
  trackRef,
  pointerProps,
  activeVal,
  max,
  min = 0,
  hitMargin = 12,
  disabled = false,
  showAnswer = false,
  targetValue,
  userValue,
  tolerance,
  showToleranceBand = true,
  isHit = false,
  className = '',
  trackClassName = '',
}: SliderTrackProps) {
  const valToPercent = (val: number) => {
    const clamped = Math.max(min, Math.min(max, val));
    return `${((clamped - min) / (max - min)) * 100}%`;
  };

  return (
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
      } ${className}`}
    >
      <div
        ref={trackRef}
        className={`relative w-full h-7 rounded-xl bg-border border border-border/60 shadow-inner flex items-center overflow-hidden ${trackClassName}`}
      >
        {/* 当前激活填充条 */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-indigo-500/20 dark:bg-indigo-400/20"
          style={{ width: valToPercent(activeVal) }}
        />

        {/* 未揭晓状态下的活动光标线 */}
        {!showAnswer && (
          <div
            className="absolute top-0 bottom-0 w-1 bg-primary dark:bg-indigo-400 -translate-x-1/2 z-20 shadow-sm"
            style={{ left: valToPercent(activeVal) }}
          />
        )}

        {/* 动态容错区间感应指示带 */}
        {!showAnswer && showToleranceBand && tolerance !== undefined && tolerance > 0 && (
          <>
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 dark:bg-indigo-300/80 -translate-x-1/2"
              style={{ left: valToPercent(activeVal - tolerance) }}
            />
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 dark:bg-indigo-300/80 -translate-x-1/2"
              style={{ left: valToPercent(activeVal + tolerance) }}
            />
          </>
        )}

        {/* 答案揭晓：绝对真理线与用户作答线 */}
        {showAnswer && targetValue !== undefined && (
          <>
            <div
              className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white dark:border-border shadow-md"
              style={{ left: valToPercent(targetValue) }}
            />
            {userValue !== undefined && (
              <div
                className={`absolute top-0 bottom-0 w-1 -translate-x-1/2 z-10 border-x border-white dark:border-border shadow-md ${
                  isHit ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ left: valToPercent(userValue) }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
