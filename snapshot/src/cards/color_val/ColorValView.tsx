import { Sun } from 'lucide-preact';

import {
  type ColorHitResult,
  type ColorQuestionData,
  type ColorSenseSettings,
  HUE_SPECTRUM_GRADIENT,
  HsvTrackSlider,
  PALETTE,
  QuestionCardShell,
  hsvToHex,
  useCardTranslation,
} from '@formsight/card-sdk';

export interface ColorValViewProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number) => void;
  disabled?: boolean;
  settings: ColorSenseSettings;
}

export function ColorValView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  settings,
}: ColorValViewProps) {
  const { t } = useCardTranslation('color_val');
  const { targetH, targetS, targetV, difficultyLevel } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);
  const targetHSV: [number, number, number] = [targetH, targetS, targetV];

  const hitMargin = settings.sliderHitMargin ?? 12;
  const showToleranceBand = settings.showToleranceBand ?? true;
  const showCanvasHints = (settings.showCanvasHints as boolean) ?? true;

  const hueGradient = HUE_SPECTRUM_GRADIENT;
  const valGradient = `linear-gradient(to right, ${PALETTE.black}, ${hsvToHex(targetH, 100, 100)})`;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Sun}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-md"
      className="gap-6"
    >
      <div className="flex flex-col items-center gap-2 w-full">
        <div
          className="w-32 h-32 rounded-2xl shadow-inner border-4 border-white shadow-md ring-1 ring-black/10 transition-all duration-300"
          style={{ backgroundColor: targetHex }}
        />
      </div>

      <div className="w-full space-y-4 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <HsvTrackSlider
          label="H"
          gradient={hueGradient}
          val={targetH}
          max={360}
          unit="°"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetH}
          disabled={true}
          hitMargin={hitMargin}
          showToleranceBand={false}
        />

        <HsvTrackSlider
          label="V"
          gradient={valGradient}
          val={targetV}
          max={100}
          unit="%"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetV}
          userVal={userAnswer?.userValue}
          isHit={userAnswer?.isHit}
          isInteractiveTarget={true}
          onCommit={(v) => {
            if (!showAnswer && !disabled) onAnswer(v);
          }}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
        />
      </div>
    </QuestionCardShell>
  );
}
