import { Eye } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { DualViewportContainer } from '../../components/common/DualViewportContainer';
import { HsvTrackSlider } from '../../components/common/HsvTrackSlider';
import { QuestionCardShell } from '../../components/common/QuestionCardShell';
import { Button } from '../../components/ui/button';
import { hsvToHex } from '../../core/color/colorUtils';
import type {
  RelativeColorHitResult,
  RelativeColorQuestionData,
} from '../../core/color/relativeColor';
import { useCardTranslation } from '../../core/i18n';
import type { RelativeColorSettings } from '../../storage/settings';
import { PALETTE } from '../../utils/theme';

export interface RelLightnessInductionViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
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

  const [userRightH, setUserRightH] = useState<number>(180);
  const [userRightS, setUserRightS] = useState<number>(50);
  const [userRightV, setUserRightV] = useState<number>(50);

  useEffect(() => {
    if (question.targetLeftCenter) {
      setUserRightH(question.targetLeftCenter[0]);
      setUserRightS(question.targetLeftCenter[1]);
      setUserRightV(question.targetLeftCenter[2]);
    }
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

  const bgLeftHex = hsvToHex(...(question.bgLeft ?? [0, 0, 100]));
  const bgRightHex = hsvToHex(...(question.bgRight ?? [0, 0, 0]));
  const centerLeftHex = hsvToHex(...(question.targetLeftCenter ?? [0, 0, 50]));

  const userRightHex = hsvToHex(userRightH, userRightS, userRightV);
  const idealRightHex = hsvToHex(...(question.idealRightCenter ?? question.targetD));
  const rightValGradient = `linear-gradient(to right, ${PALETTE.black}, ${hsvToHex(userRightH, 100, 100)})`;

  const hitMargin = settings.sliderHitMargin ?? 12;
  const showToleranceBand = settings.showToleranceBand ?? true;
  const showCanvasHints = (settings.showCanvasHints as boolean) ?? true;

  return (
    <QuestionCardShell
      hintText={t('views.hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <DualViewportContainer
        leftTitle={t('views.leftBase')}
        rightTitle={t('views.rightModulate')}
        leftContent={
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-card dark:border-border shadow-md relative"
            style={{ backgroundColor: bgLeftHex }}
          >
            <div
              className="w-16 h-16 rounded-xl transition-all"
              style={{ backgroundColor: centerLeftHex }}
            />
          </div>
        }
        rightContent={
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-card dark:border-border shadow-md relative"
            style={{ backgroundColor: bgRightHex }}
          >
            <div
              className="w-16 h-16 rounded-xl transition-all relative overflow-hidden"
              style={{ backgroundColor: userRightHex }}
            >
              {showAnswer && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1/2"
                  style={{ backgroundColor: idealRightHex }}
                />
              )}
            </div>
          </div>
        }
      />

      <div className="w-full space-y-3 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <HsvTrackSlider
          label="V"
          gradient={rightValGradient}
          val={userRightV}
          max={100}
          unit="%"
          targetHSV={question.targetD}
          difficultyLevel={question.difficultyLevel}
          showAnswer={showAnswer}
          targetVal={question.idealRightCenter?.[2] ?? question.targetD[2]}
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
