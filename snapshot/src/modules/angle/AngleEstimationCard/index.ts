import { Compass, Eye } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import type { CardManifest } from '../../../core/contracts';
import { useTranslation } from '../../../core/i18n';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { BaseModuleSettings } from '../../../storage/settings';
import type { Point } from '../../../types';
import {
  ANGLE_CANVAS_SIZE,
  createRadialLine,
  drawAngleCanvas,
  type LineSegment,
} from '../_shared/angleCanvas';

export interface AngleEstimationQuestion {
  id: string;
  targetAngleDeg: number;
  startAngleDeg: number;
  lineA: LineSegment;
  lineB: LineSegment;
  difficultyLevel: number;
  tolerance: number;
}

export interface AngleEstimationHit {
  isHit: boolean;
  userValue: number;
  targetValue: number;
  errorValue: number;
  tolerance: number;
}

export function generateAngleEstimationQuestion(level: number): AngleEstimationQuestion {
  const id = `ang_est_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  const targetAngleDeg = Math.floor(Math.random() * 150) + 15;
  const startAngleDeg = Math.floor(Math.random() * 360);
  const endAngleDeg = (startAngleDeg + targetAngleDeg) % 360;

  const center: Point = { x: ANGLE_CANVAS_SIZE / 2, y: ANGLE_CANVAS_SIZE / 2 };
  const armLength = ANGLE_CANVAS_SIZE * 0.38;

  const lineA = createRadialLine(center, startAngleDeg, armLength);
  const lineB = createRadialLine(center, endAngleDeg, armLength);
  const tolerance = Math.round(expDecayInterpolate(12.0, 1.5, clampedLevel) * 10) / 10;

  return {
    id,
    targetAngleDeg,
    startAngleDeg,
    lineA,
    lineB,
    difficultyLevel: clampedLevel,
    tolerance,
  };
}

function AngleEstimationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: {
  question: AngleEstimationQuestion;
  showAnswer: boolean;
  userAnswer: AngleEstimationHit | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}) {
  const { t } = useTranslation();
  const targetVal = question.targetAngleDeg ?? 90;
  const tolerance = question.tolerance;
  const isHit = Boolean(userAnswer?.isHit);
  const userVal = userAnswer?.userValue;

  return (
    <StandardSliderView
      questionId={question.id}
      hintText={t('cards.angle_estimation.instruction')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label={t('packs.angle.views.estimationLabel')}
      max={180}
      step={0.5}
      initialValue={90}
      unit="°"
      targetValue={targetVal}
      tolerance={tolerance}
      showToleranceBand={showToleranceBand}
      showAnswer={showAnswer}
      isHit={isHit}
      userValue={userVal}
      disabled={disabled}
      hitMargin={hitMargin}
      submitMode="commit_on_release"
      onAnswer={onAnswer}
      preview={
        <div className="bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex justify-center items-center">
          <CanvasView
            width={ANGLE_CANVAS_SIZE}
            height={ANGLE_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card"
            draw={(canvas) => {
              if (question.lineA && question.lineB) {
                drawAngleCanvas(canvas, [question.lineA, question.lineB], ANGLE_CANVAS_SIZE);
              }
            }}
            deps={[question.lineA, question.lineB]}
          />
        </div>
      }
      footerDetails={
        showAnswer && userVal !== undefined ? (
          <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">
              {t('packs.angle.views.trueAngle')}{' '}
              <span className="font-bold text-foreground font-mono">{targetVal}°</span>
            </span>
            <span
              className={
                isHit
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-rose-600 dark:text-rose-400 font-bold'
              }
            >
              {t('packs.angle.views.errorInfo', {
                error: Math.round(Math.abs(userVal - targetVal) * 10) / 10,
                tolerance,
              })}
            </span>
          </div>
        ) : null
      }
    />
  );
}

export const AngleEstimationCard: CardManifest<
  AngleEstimationQuestion,
  AngleEstimationHit,
  number,
  BaseModuleSettings
> = {
  id: 'angle_estimation',
  domain: 'form_and_proportion',
  groupId: 'angle',
  icon: Compass,
  tags: {
    domain: ['form_and_proportion'],
    path: ['absolute_estimation'],
    interaction: ['continuous_mod'],
  },
  hasWeaknessAnalytics: false,
  settingSchemas: [
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: 'packs.angle.settings.showToleranceBandTitle',
      description: 'packs.angle.settings.showToleranceBandDesc',
    },
  ],
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
  locales: {
    'zh-CN': {
      title: '夹角大小估算',
      desc: '观察由纯黑线段构成的夹角，使用连续滑块精准评估夹角弧度大小 (0°~180°)',
      instruction: '观察两射线夹角，调制滑块逼近精准度数 (0°~180°)',
    },
    'en-US': {
      title: 'Angle Estimation',
      desc: 'Observe the angle formed by two rays and estimate its degree using a slider (0°~180°).',
      instruction: 'Observe the two rays and adjust the slider to match the true angle (0°~180°).',
    },
  },
  training: {
    generateQuestion: (level) => generateAngleEstimationQuestion(level),
    evaluateAnswer: (userVal, q) => {
      const targetVal = q.targetAngleDeg ?? 90;
      const errorValue = Math.round(Math.abs(userVal - targetVal) * 10) / 10;
      const isHit = errorValue <= q.tolerance;
      return {
        isHit,
        userValue: userVal,
        targetValue: targetVal,
        errorValue,
        tolerance: q.tolerance,
      };
    },
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (_q, hitResult, userVal) => ({
      userAnswer: userVal,
      errorValue: hitResult.errorValue,
      tolerance: hitResult.tolerance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) =>
      AngleEstimationView({
        question,
        showAnswer,
        userAnswer,
        onAnswer,
        disabled,
        hitMargin: (settings.sliderHitMargin as number) ?? 12,
        showToleranceBand: (settings.showToleranceBand as boolean) ?? true,
        showCanvasHints: (settings.showCanvasHints as boolean) ?? true,
      }),
  },
};

export default AngleEstimationCard;