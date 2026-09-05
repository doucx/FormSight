import { Palette } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';

import {
  Button,
  type ColorSenseSettings,
  ColorSwatch,
  HUE_SPECTRUM_GRADIENT,
  HsvTrackSlider,
  PALETTE,
  QuestionCardShell,
  hsvToHex,
  useCardTranslation,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';

export interface ColorAllViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: [number, number, number]) => void;
  disabled?: boolean;
  settings: ColorSenseSettings;
}

export function ColorAllView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  settings,
}: ColorAllViewProps) {
  const { t } = useCardTranslation('color_all');
  const { targetH, targetS, targetV, difficultyLevel } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);
  const targetHSV: [number, number, number] = [targetH, targetS, targetV];

  const hitMargin = settings.sliderHitMargin ?? 12;
  const showToleranceBand = settings.showToleranceBand ?? true;
  const enableHoverColorPreview = settings.enableHoverColorPreview ?? true;
  const showCanvasHints = (settings.showCanvasHints as boolean) ?? true;

  const [userH, setUserH] = useState<number>(180);
  const [userS, setUserS] = useState<number>(50);
  const [userV, setUserV] = useState<number>(50);

  const [allHoverVals, setAllHoverVals] = useState<Record<'H' | 'S' | 'V', number | null>>({
    H: null,
    S: null,
    V: null,
  });
  const [draggingLabel, setDraggingLabel] = useState<'H' | 'S' | 'V' | null>(null);

  const handleHoverH = useCallback(
    (hVal: number | null) =>
      setAllHoverVals((prev) => (prev.H === hVal ? prev : { ...prev, H: hVal })),
    [],
  );
  const handleHoverS = useCallback(
    (sVal: number | null) =>
      setAllHoverVals((prev) => (prev.S === sVal ? prev : { ...prev, S: sVal })),
    [],
  );
  const handleHoverV = useCallback(
    (vVal: number | null) =>
      setAllHoverVals((prev) => (prev.V === vVal ? prev : { ...prev, V: vVal })),
    [],
  );

  const handleDragH = useCallback((isDrag: boolean) => setDraggingLabel(isDrag ? 'H' : null), []);
  const handleDragS = useCallback((isDrag: boolean) => setDraggingLabel(isDrag ? 'S' : null), []);
  const handleDragV = useCallback((isDrag: boolean) => setDraggingLabel(isDrag ? 'V' : null), []);

  useEffect(() => {
    if (question.id) {
      setUserH(180);
      setUserS(50);
      setUserV(50);
      setAllHoverVals({ H: null, S: null, V: null });
      setDraggingLabel(null);
    }
  }, [question.id]);

  const handleSubmitAll = () => {
    if (disabled || showAnswer) return;
    onAnswer([userH, userS, userV]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !showAnswer && !disabled) {
        e.preventDefault();
        onAnswer([userH, userS, userV]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, disabled, userH, userS, userV, onAnswer]);

  const currentH = userH;
  const currentV = userV;

  const hueGradient = HUE_SPECTRUM_GRADIENT;
  const satGradient = `linear-gradient(to right, ${hsvToHex(currentH, 0, currentV)}, ${hsvToHex(currentH, 100, currentV)})`;
  const valGradient = `linear-gradient(to right, ${PALETTE.black}, ${hsvToHex(currentH, 100, 100)})`;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Palette}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-md"
      className="gap-6"
    >
      <div className="flex flex-col items-center gap-2 w-full">
        <div className="flex items-center justify-center gap-4 w-full">
          <ColorSwatch color={targetHex} className="flex-1 h-28" transition="smooth" />
          <ColorSwatch
            color={hsvToHex(
              draggingLabel === 'H' || (enableHoverColorPreview && allHoverVals.H !== null)
                ? (allHoverVals.H ?? userH)
                : userH,
              draggingLabel === 'S' || (enableHoverColorPreview && allHoverVals.S !== null)
                ? (allHoverVals.S ?? userS)
                : userS,
              draggingLabel === 'V' || (enableHoverColorPreview && allHoverVals.V !== null)
                ? (allHoverVals.V ?? userV)
                : userV,
            )}
            className="flex-1 h-28"
            transition="realtime"
          />
        </div>
      </div>

      <div className="w-full space-y-4 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <HsvTrackSlider
          label="H"
          gradient={hueGradient}
          val={userH}
          max={360}
          unit="°"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetH}
          userVal={userAnswer?.userHSV?.[0] ?? userH}
          isHit={userAnswer?.isHit}
          onValChange={setUserH}
          allUserHSV={[userH, userS, userV]}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
          onHoverStateChange={handleHoverH}
          onDraggingStateChange={handleDragH}
        />
        <HsvTrackSlider
          label="S"
          gradient={satGradient}
          val={userS}
          max={100}
          unit="%"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetS}
          userVal={userAnswer?.userHSV?.[1] ?? userS}
          isHit={userAnswer?.isHit}
          onValChange={setUserS}
          allUserHSV={[userH, userS, userV]}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
          onHoverStateChange={handleHoverS}
          onDraggingStateChange={handleDragS}
        />
        <HsvTrackSlider
          label="V"
          gradient={valGradient}
          val={userV}
          max={100}
          unit="%"
          targetHSV={targetHSV}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetV}
          userVal={userAnswer?.userHSV?.[2] ?? userV}
          isHit={userAnswer?.isHit}
          onValChange={setUserV}
          allUserHSV={[userH, userS, userV]}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
          onHoverStateChange={handleHoverV}
          onDraggingStateChange={handleDragV}
        />
      </div>

      <Button
        variant="default"
        onClick={handleSubmitAll}
        disabled={disabled || showAnswer}
        className="w-full py-3 text-xs font-bold rounded-2xl"
      >
        {t('common.confirmSpace')}
      </Button>
    </QuestionCardShell>
  );
}
