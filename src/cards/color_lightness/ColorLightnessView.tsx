import { Eye } from 'lucide-preact';

import {
  ColorSwatch,
  QuestionCardShell,
  hsvToHex,
  useCardTranslation,
  useTrackPointer,
} from '@formsight/card-sdk';
import type {
  ColorLightnessHitResult,
  ColorLightnessQuestionData,
  ColorLightnessSettings,
} from './types';

export interface ColorLightnessViewProps {
  question: ColorLightnessQuestionData;
  showAnswer: boolean;
  userAnswer: ColorLightnessHitResult | null;
  onAnswer: (userVal: number) => void;
  disabled?: boolean;
  settings: ColorLightnessSettings;
}

export function ColorLightnessView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  settings,
}: ColorLightnessViewProps) {
  const { t } = useCardTranslation('color_lightness');
  const { targetH, targetS, targetV, truthPercentage, neutralGrayHex, tolerance } = question;

  const targetHex = hsvToHex(targetH, targetS, targetV);
  const hitMargin = settings.sliderHitMargin ?? 12;
  const showToleranceBand = settings.showToleranceBand ?? true;
  const showCanvasHints = (settings.showCanvasHints as boolean) ?? true;

  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    max: 100,
    step: 1,
    disabled: disabled || showAnswer,
    onCommit: (val) => {
      if (!showAnswer && !disabled) {
        onAnswer(val);
      }
    },
  });

  const isAnswerRevealed = showAnswer && userAnswer !== null;
  const userVal = userAnswer?.userValue;
  const isHit = userAnswer?.isHit ?? false;

  const activeVal = hoverVal !== null ? hoverVal : 50;

  const renderLabelText = () => {
    if (isAnswerRevealed && userVal !== undefined) {
      return `${userVal}%`;
    }
    if (!showAnswer) {
      return hoverVal !== null ? `${hoverVal}%` : '?';
    }
    return `${activeVal}%`;
  };

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-md"
      className="gap-6"
    >
      <div className="flex flex-col items-center gap-2 w-full">
        <ColorSwatch
          color={targetHex}
          compareColor={showAnswer ? neutralGrayHex : undefined}
          size="lg"
          compareTooltip="Truth Grayscale (OKLab L)"
        />
      </div>

      <div className="w-full space-y-4 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <div className="flex items-center gap-3 w-full">
          <span className="w-5 font-bold font-mono text-muted-foreground text-sm text-center">
            L
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
              style={{
                background: 'linear-gradient(to right, #000000 0%, #FFFFFF 100%)',
              }}
            >
              {/* 动态容错区间指示线 */}
              {!showAnswer && showToleranceBand && hoverVal !== null && (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                    style={{
                      left: `${Math.max(0, hoverVal - tolerance)}%`,
                    }}
                  />
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                    style={{
                      left: `${Math.min(100, hoverVal + tolerance)}%`,
                    }}
                  />
                </>
              )}

              {/* 悬停准星线 */}
              {!showAnswer && hoverVal !== null && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-indigo-600 dark:bg-indigo-400 shadow-sm pointer-events-none z-30"
                  style={{ left: `${hoverVal}%` }}
                />
              )}

              {/* 答案揭晓标记线 */}
              {isAnswerRevealed && (
                <>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-10 bg-emerald-500 border-x border-white shadow-md z-20"
                    style={{ left: `${truthPercentage}%` }}
                  />
                  {userVal !== undefined && (
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-7 border-x border-white ${
                        isHit ? 'bg-emerald-500' : 'bg-rose-500'
                      } shadow-md z-10`}
                      style={{ left: `${userVal}%` }}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <span
            className={`w-12 text-right font-mono font-bold text-xs ${
              !showAnswer
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
      </div>
    </QuestionCardShell>
  );
}
