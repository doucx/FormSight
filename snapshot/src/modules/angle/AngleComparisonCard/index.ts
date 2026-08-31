import { Columns } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import type { CardManifest } from '../../../core/contracts';
import { useTranslation } from '../../../core/i18n';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { BaseModuleSettings } from '../../../storage/settings';
import type { Point } from '../../../types';
import {
  ANGLE_2AFC_SIZE,
  createRadialLine,
  drawAngleCanvas,
  type LineSegment,
} from '../_shared/angleCanvas';

export interface AngleComparisonQuestion {
  id: string;
  angleA: number;
  angleB: number;
  linesA: [LineSegment, LineSegment];
  linesB: [LineSegment, LineSegment];
  largerSide: 'A' | 'B';
  difficultyLevel: number;
  tolerance: number;
}

export interface AngleComparisonHit {
  isHit: boolean;
  userChoice: 'A' | 'B';
  correctChoice: 'A' | 'B';
  errorValue: number;
  tolerance: number;
}

export function generateAngleComparisonQuestion(level: number): AngleComparisonQuestion {
  const id = `ang_cmp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  const baseAngle = Math.floor(Math.random() * 110) + 30;
  const deltaAngle = Math.round(expDecayInterpolate(25.0, 1.2, clampedLevel) * 10) / 10;
  const largerAngle = Math.min(170, baseAngle + deltaAngle);
  const smallerAngle = Math.max(10, baseAngle);

  const isALarger = Math.random() < 0.5;
  const angleA = isALarger ? largerAngle : smallerAngle;
  const angleB = isALarger ? smallerAngle : largerAngle;

  const center: Point = { x: ANGLE_2AFC_SIZE / 2, y: ANGLE_2AFC_SIZE / 2 };
  const armLength = ANGLE_2AFC_SIZE * 0.38;

  const startA = Math.floor(Math.random() * 360);
  const startB = Math.floor(Math.random() * 360);

  const linesA: [LineSegment, LineSegment] = [
    createRadialLine(center, startA, armLength),
    createRadialLine(center, (startA + angleA) % 360, armLength),
  ];
  const linesB: [LineSegment, LineSegment] = [
    createRadialLine(center, startB, armLength),
    createRadialLine(center, (startB + angleB) % 360, armLength),
  ];

  return {
    id,
    angleA,
    angleB,
    linesA,
    linesB,
    largerSide: isALarger ? 'A' : 'B',
    difficultyLevel: clampedLevel,
    tolerance: deltaAngle,
  };
}

function AngleComparisonView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: {
  question: AngleComparisonQuestion;
  showAnswer: boolean;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}) {
  const { t } = useTranslation();
  const isAHit = question.largerSide === 'A';
  const isBHit = question.largerSide === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('packs.angle.views.comparisonHint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      optionA={{
        title: t('common.areaA'),
        isCorrect: isAHit,
        badge: showAnswer ? `${question.angleA}°` : undefined,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) => drawAngleCanvas(canvas, question.linesA, ANGLE_2AFC_SIZE)}
              deps={[question.linesA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: t('common.areaB'),
        isCorrect: isBHit,
        badge: showAnswer ? `${question.angleB}°` : undefined,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) => drawAngleCanvas(canvas, question.linesB, ANGLE_2AFC_SIZE)}
              deps={[question.linesB]}
            />
          </div>
        ),
      }}
    />
  );
}

export const AngleComparisonCard: CardManifest<
  AngleComparisonQuestion,
  AngleComparisonHit,
  'A' | 'B',
  BaseModuleSettings
> = {
  id: 'angle_comparison_2afc',
  domain: 'form_and_proportion',
  groupId: 'angle',
  icon: Columns,
  tags: {
    domain: ['form_and_proportion'],
    path: ['relational_mapping'],
    interaction: ['binary_choice'],
  },
  hasWeaknessAnalytics: false,
  locales: {
    'zh-CN': {
      title: '角度二分对比',
      desc: '二选一快速判别哪一侧的两射线夹角更大 (2AFC)',
      instruction: '二选一快速判别哪一侧夹角更大 (键 1 / 2)',
    },
    'en-US': {
      title: 'Angle 2AFC Comparison',
      desc: 'Quickly identify which side has a larger angle under non-orthogonal orientations (2AFC).',
      instruction: 'Identify which angle is larger (Keys 1 / 2).',
    },
  },
  training: {
    generateQuestion: (level) => generateAngleComparisonQuestion(level),
    evaluateAnswer: (userVal, q) => {
      const isHit = userVal === q.largerSide;
      return {
        isHit,
        userChoice: userVal,
        correctChoice: q.largerSide,
        errorValue: isHit ? 0 : 1,
        tolerance: q.tolerance,
      };
    },
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (_q, hitResult, userVal) => ({
      userChoice: userVal,
      errorValue: hitResult.errorValue,
    }),
    renderCanvas: ({ question, showAnswer, onAnswer, disabled, settings }) =>
      AngleComparisonView({
        question,
        showAnswer,
        onAnswer,
        disabled,
        showCanvasHints: (settings.showCanvasHints as boolean) ?? true,
      }),
  },
};

export default AngleComparisonCard;