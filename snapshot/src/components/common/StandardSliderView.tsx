import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';
import { useTrackPointer } from '../../hooks/useTrackPointer';
import { QuestionCardShell } from './QuestionCardShell';

export interface StandardSliderViewProps {
  questionId: string;
  hintText?: string;
  hintIcon?: (props: { className?: string }) => ComponentChildren;
  showCanvasHints?: boolean;
  maxWidth?: string;
  preview: ComponentChildren;

  // 滑块基本属性
  label: string;
  min?: number;
  max: number;
  step?: number;
  initialValue?: number;
  unit?: string;
  formatValue?: (val: number) => string;

  // 答案揭晓与容错评估
  targetValue?: number;
  tolerance?: number;
  showToleranceBand?: boolean;
  showAnswer: boolean;
  isHit?: boolean;
  userValue?: number;

  // 交互控制
  disabled?: boolean;
  hitMargin?: number;
  submitMode?: 'commit_on_release' | 'button' | 'both';
  submitButtonText?: string;
  onValueChange?: (currentVal: number, activeVal: number) => void;
  onAnswer: (val: number) => void;

  // 底部附加卡片槽位
  footerDetails?: ComponentChildren;
}

export function StandardSliderView({
  questionId,
  hintText,
  hintIcon,
  showCanvasHints = true,
  maxWidth = 'max-w-lg',
  preview,
  label,
  min = 0,
  max,
  step = 0.5,
  initialValue,
  unit = '',
  formatValue,
  targetValue,
  tolerance,
  showToleranceBand = true,
  showAnswer,
  isHit = false,
  userValue,
  disabled = false,
  hitMargin = 12,
  submitMode = 'commit_on_release',
  submitButtonText,
  onValueChange,
  onAnswer,
  footerDetails,
}: StandardSliderViewProps) {
  const { t } = useTranslation();
  const defaultVal = initialValue ?? (max - min) / 2;
  const [currentVal, setCurrentVal] = useState<number>(defaultVal);

  const effectiveSubmitButtonText = submitButtonText || t('common.submitSpace');

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max,
    step,
    disabled: disabled || showAnswer,
    onValChange: (val) => {
      setCurrentVal(val);
      onValueChange?.(val, val);
    },
    onHoverStateChange: (hVal) => {
      onValueChange?.(currentVal, hVal !== null ? hVal : currentVal);
    },
    onCommit: (val) => {
      if (submitMode === 'commit_on_release' || submitMode === 'both') {
        if (!disabled && !showAnswer) {
          onAnswer(val);
        }
      }
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset slider when questionId changes
  useEffect(() => {
    setCurrentVal(defaultVal);
    setHoverVal(null);
    onValueChange?.(defaultVal, defaultVal);
  }, [questionId, defaultVal, setHoverVal]);

  // 支持键盘 Space 键提交（在显式按钮提交模式下）
  useEffect(() => {
    if (submitMode !== 'button' && submitMode !== 'both') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (disabled || showAnswer) return;
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        onAnswer(currentVal);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitMode, disabled, showAnswer, currentVal, onAnswer]);

  const activeVal = hoverVal !== null ? hoverVal : currentVal;
  const displayVal = showAnswer && userValue !== undefined ? userValue : activeVal;
  const formattedDisplay = formatValue ? formatValue(displayVal) : `${displayVal}${unit}`;

  const valToPercent = (val: number) => {
    const clamped = Math.max(0, Math.min(max, val));
    return `${(clamped / max) * 100}%`;
  };

  const isButtonSubmit = submitMode === 'button' || submitMode === 'both';

  return (
    <QuestionCardShell
      hintText={hintText}
      hintIcon={hintIcon}
      showCanvasHints={showCanvasHints}
      maxWidth={maxWidth}
    >
      {preview}

      <div className="w-full space-y-3 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>{label}</span>
          <span className="font-mono text-base font-black text-primary">{formattedDisplay}</span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-muted-foreground text-xs">
            {min}
            {unit}
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
              !showAnswer && !disabled ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <div
              ref={trackRef}
              className="relative w-full h-7 rounded-xl bg-border border border-border/60 dark:border-border/60 shadow-inner flex items-center overflow-hidden"
            >
              {/* 当前激活进度条 */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-indigo-500/20 dark:bg-indigo-400/20"
                style={{ width: valToPercent(activeVal) }}
              />

              {/* 未揭晓状态下的指针 */}
              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-primary dark:bg-indigo-400 -translate-x-1/2 z-20 shadow-sm"
                  style={{ left: valToPercent(activeVal) }}
                />
              )}

              {/* 动态容错感应区间 */}
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

              {/* 答案揭晓：真理线与用户作答线 */}
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

          <span className="font-bold font-mono text-muted-foreground text-xs">
            {max}
            {unit}
          </span>
        </div>

        {footerDetails}
      </div>

      {isButtonSubmit && !showAnswer && (
        <button
          type="button"
          onClick={() => {
            if (!disabled && !showAnswer) onAnswer(currentVal);
          }}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-primary hover:bg-primary/90 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 dark:shadow-none transition-all cursor-pointer"
        >
          {effectiveSubmitButtonText}
        </button>
      )}
    </QuestionCardShell>
  );
}
