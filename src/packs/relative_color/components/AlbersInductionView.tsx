import { Eye } from 'lucide-preact';
import { HsvTrackSlider } from '../../../components/HsvTrackSlider';
import { DualViewportContainer } from '../../../components/common/DualViewportContainer';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { hsvToHex } from '../../../core/color/colorUtils';
import { useTranslation } from '../../../core/i18n';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../utils/index';

interface AlbersInductionViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
  userRightH: number;
  userRightS: number;
  userRightV: number;
  onUserRightHChange: (val: number) => void;
  onUserRightSChange: (val: number) => void;
  onUserRightVChange: (val: number) => void;
  onSubmit: () => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function AlbersInductionView({
  question,
  showAnswer,
  userAnswer,
  userRightH,
  userRightS,
  userRightV,
  onUserRightHChange,
  onUserRightSChange,
  onUserRightVChange,
  onSubmit,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: AlbersInductionViewProps) {
  const { t } = useTranslation();
  const isLightnessMode = question.mode === 'LIGHTNESS_INDUCTION';

  const bgLeftHex = hsvToHex(...(question.bgLeft ?? [0, 0, 100]));
  const bgRightHex = hsvToHex(...(question.bgRight ?? [0, 0, 0]));
  const centerLeftHex = hsvToHex(...(question.targetLeftCenter ?? [0, 0, 50]));

  const userRightHex = hsvToHex(userRightH, userRightS, userRightV);
  const idealRightHex = hsvToHex(...(question.idealRightCenter ?? question.targetD));

  const rightSatGradient = `linear-gradient(to right, ${hsvToHex(userRightH, 0, userRightV)}, ${hsvToHex(userRightH, 100, userRightV)})`;
  const rightValGradient = `linear-gradient(to right, #000000, ${hsvToHex(userRightH, 100, 100)})`;
  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';

  return (
    <QuestionCardShell
      hintText={
        isLightnessMode
          ? t('packs.relative_color.views.lightnessHint')
          : t('packs.relative_color.views.inductionHint')
      }
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <DualViewportContainer
        leftTitle={t('packs.relative_color.views.leftBase')}
        rightTitle={t('packs.relative_color.views.rightModulate')}
        leftContent={
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
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
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
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

      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        {!isLightnessMode && (
          <HsvTrackSlider
            label="H"
            gradient={hueGradient}
            val={userRightH}
            max={360}
            unit="°"
            targetHSV={question.targetD}
            difficultyLevel={question.difficultyLevel}
            showAnswer={showAnswer}
            targetVal={question.idealRightCenter?.[0] ?? question.targetD[0]}
            userVal={userRightH}
            isHit={userAnswer?.isHit}
            onValChange={onUserRightHChange}
            disabled={disabled}
            hitMargin={hitMargin}
            showToleranceBand={showToleranceBand}
          />
        )}

        {!isLightnessMode && (
          <HsvTrackSlider
            label="S"
            gradient={rightSatGradient}
            val={userRightS}
            max={100}
            unit="%"
            targetHSV={question.targetD}
            difficultyLevel={question.difficultyLevel}
            showAnswer={showAnswer}
            targetVal={question.idealRightCenter?.[1] ?? question.targetD[1]}
            userVal={userRightS}
            isHit={userAnswer?.isHit}
            onValChange={onUserRightSChange}
            disabled={disabled}
            hitMargin={hitMargin}
            showToleranceBand={showToleranceBand}
          />
        )}

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
          onValChange={onUserRightVChange}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
        />
      </div>

      {!showAnswer && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
        >
          {t('common.confirmSpace')}
        </button>
      )}
    </QuestionCardShell>
  );
}
