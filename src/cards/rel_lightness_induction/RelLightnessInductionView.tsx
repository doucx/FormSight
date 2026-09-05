import { Eye } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';

import {
  Button,
  ColorSwatch,
  DualViewportContainer,
  HsvTrackSlider,
  PALETTE,
  QuestionCardShell,
  type RelativeColorSettings,
  hsvToHex,
  useCardTranslation,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';

export interface RelLightnessInductionViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: [number, number, number]) => void;
  disabled?: boolean;
  settings: RelativeColorSettings;
}

export function RelLightnessInductionView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  settings,
}: RelLightnessInductionViewProps) {
  const { t } = useCardTranslation('rel_lightness_induction');

  const [userRightH, setUserRightH] = useState<number>(question.targetLeftCenter[0]);
  const [userRightS, setUserRightS] = useState<number>(question.targetLeftCenter[1]);
  const [userRightV, setUserRightV] = useState<number>(question.targetLeftCenter[2]);

  useEffect(() => {
    setUserRightH(question.targetLeftCenter[0]);
    setUserRightS(question.targetLeftCenter[1]);
    setUserRightV(question.targetLeftCenter[2]);
  }, [question.targetLeftCenter]);

  const handleSubmit = useCallback(() => {
    if (disabled || showAnswer) return;
    onAnswer([userRightH, userRightS, userRightV]);
  }, [disabled, showAnswer, userRightH, userRightS, userRightV, onAnswer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !showAnswer && !disabled) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, disabled, handleSubmit]);

  const bgLeftHex = hsvToHex(...question.bgLeft);
  const bgRightHex = hsvToHex(...question.bgRight);
  const centerLeftHex = hsvToHex(...question.targetLeftCenter);

  const userRightHex = hsvToHex(userRightH, userRightS, userRightV);
  const idealRightHex = hsvToHex(...question.idealRightCenter);
  const rightValGradient = `linear-gradient(to right, ${PALETTE.black}, ${hsvToHex(userRightH, 100, 100)})`;

  const hitMargin = settings.sliderHitMargin ?? 12;
  const showToleranceBand = settings.showToleranceBand ?? true;
  const showCanvasHints = (settings.showCanvasHints as boolean) ?? true;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <DualViewportContainer
        leftTitle={t('leftBase')}
        rightTitle={t('rightModulate')}
        leftContent={
          <ColorSwatch color={bgLeftHex} variant="container" className="w-full h-44">
            <ColorSwatch color={centerLeftHex} variant="embedded" size="sm" />
          </ColorSwatch>
        }
        rightContent={
          <ColorSwatch color={bgRightHex} variant="container" className="w-full h-44">
            <ColorSwatch
              color={userRightHex}
              compareColor={showAnswer ? idealRightHex : undefined}
              variant="embedded"
              size="sm"
            />
          </ColorSwatch>
        }
      />

      <div className="w-full space-y-3 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <HsvTrackSlider
          label="V"
          gradient={rightValGradient}
          val={userRightV}
          max={100}
          unit="%"
          targetHSV={question.idealRightCenter}
          difficultyLevel={question.difficultyLevel}
          showAnswer={showAnswer}
          targetVal={question.idealRightCenter[2]}
          userVal={userRightV}
          isHit={userAnswer?.isHit}
          onValChange={setUserRightV}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
        />
      </div>

      {!showAnswer && (
        <Button
          variant="default"
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold rounded-2xl"
        >
          {t('common.confirmSpace')}
        </Button>
      )}
    </QuestionCardShell>
  );
}
