import { RotateCw } from 'lucide-preact';

import {
  type ColorHitResult,
  type ColorQuestionData,
  type ColorSenseSettings,
  ColorSwatch,
  HUE_SPECTRUM_GRADIENT,
  HsvTrackSlider,
  QuestionCardShell,
  hsvToHex,
  useCardTranslation,
} from '@formsight/card-sdk';

export interface ColorHueViewProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number) => void;
  disabled?: boolean;
  settings: ColorSenseSettings;
}

export function ColorHueView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  settings,
}: ColorHueViewProps) {
  const { t } = useCardTranslation('color_hue');
  const { targetH, targetS, targetV, difficultyLevel } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);
  const targetHSV: [number, number, number] = [targetH, targetS, targetV];

  const hitMargin = settings.sliderHitMargin ?? 12;
  const showToleranceBand = settings.showToleranceBand ?? true;
  const showCanvasHints = (settings.showCanvasHints as boolean) ?? true;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={RotateCw}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-md"
      className="gap-6"
    >
      <div className="flex flex-col items-center gap-2 w-full">
        <ColorSwatch color={targetHex} size="lg" />
      </div>

      <div className="w-full space-y-4 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <HsvTrackSlider
          label="H"
          gradient={HUE_SPECTRUM_GRADIENT}
          val={targetH}
          max={360}
          unit="°"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetH}
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
