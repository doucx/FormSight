import { Split } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import type { CardManifest } from '../../../core/contracts';
import { useTranslation } from '../../../core/i18n';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { BaseModuleSettings } from '../../../storage/settings';
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';
import {
  ANGLE_2AFC_SIZE,
  ANGLE_PROMPT_SIZE,
  createCenteredLine,
  drawSingleLineCanvas,
  type LineSegment,
} from '../_shared/angleCanvas';

export interface AngleParallelQuestion {
  id: string;
  promptLine: LineSegment;
  lineOptionA: LineSegment;
  lineOptionB: LineSegment;
  parallelSide: 'A' | 'B';
  angularDeviation: number;
  difficultyLevel: number;
  tolerance: number;
}

export interface AngleParallelHit {
  isHit: boolean;
  userChoice: 'A' | 'B';
  correctChoice: 'A' | 'B';
  errorValue: number;
  tolerance: number;
}

export function generateAngleParallelQuestion(level: number): AngleParallelQuestion {
  const id = `ang_par_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  const baseAngle = Math.floor(Math.random() * 360);
  const angularDeviation = Math.round(expDecayInterpolate(16.0, 1.0, clampedLevel) * 10) / 10;
  const deviationSign = Math.random() < 0.5 ? 1 : -1;
  const distractorAngle = (baseAngle + angularDeviation * deviationSign + 360) % 360;

  const promptCenter: Point = {
    x: ANGLE_PROMPT_SIZE / 2,
    y: ANGLE_PROMPT_SIZE / 2,
  };
  const promptLine = createCenteredLine(promptCenter, baseAngle, ANGLE_PROMPT_SIZE * 0.68);

  const optCenterA: Point = {
    x: ANGLE_2AFC_SIZE / 2 + (Math.random() * 20 - 10),
    y: ANGLE_2AFC_SIZE / 2 + (Math.random() * 20 - 10),
  };
  const optCenterB: Point = {
    x: ANGLE_2AFC_SIZE / 2 + (Math.random() * 20 - 10),
    y: ANGLE_2AFC_SIZE / 2 + (Math.random() * 20 - 10),
  };

  const lineLength = ANGLE_2AFC_SIZE * 0.65;
  const isAParallel = Math.random() < 0.5;

  const lineOptionA = isAParallel
    ? createCenteredLine(optCenterA, baseAngle, lineLength)
    : createCenteredLine(optCenterA, distractorAngle, lineLength);

  const lineOptionB = isAParallel
    ? createCenteredLine(optCenterB, distractorAngle, lineLength)
    : createCenteredLine(optCenterB, baseAngle, lineLength);

  return {
    id,
    promptLine,
    lineOptionA,
    lineOptionB,
    parallelSide: isAParallel ? 'A' : 'B',
    angularDeviation,
    difficultyLevel: clampedLevel,
    tolerance: angularDeviation,
  };
}

function AngleParallelView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: {
  question: AngleParallelQuestion;
  showAnswer: boolean;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}) {
  const { t } = useTranslation();
  const isAHit = question.parallelSide === 'A';
  const isBHit = question.parallelSide === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('packs.angle.views.parallelHint')}
      hintIcon={Split}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      prompt={
        <div className="flex flex-col items-center gap-1.5 bg-muted/60 p-2.5 rounded-2xl border border-border shadow-inner">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t('packs.angle.views.parallelPromptTitle')}
          </span>
          <CanvasView
            width={ANGLE_PROMPT_SIZE}
            height={ANGLE_PROMPT_SIZE}
            className="w-28 h-28 rounded-xl border border-border shadow-sm bg-card"
            draw={(canvas) =>
              drawSingleLineCanvas(
                canvas,
                question.promptLine,
                ANGLE_PROMPT_SIZE,
                CANVAS_THEME.status.accent,
                3.0,
              )
            }
            deps={[question.promptLine]}
          />
        </div>
      }
      optionA={{
        title: t('common.optionA'),
        isCorrect: isAHit,
        badge: showAnswer
          ? isAHit
            ? t('packs.angle.views.absoluteParallel')
            : t('packs.angle.views.deviationBadge', { deg: question.angularDeviation ?? 0 })
          : undefined,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawSingleLineCanvas(
                  canvas,
                  question.lineOptionA,
                  ANGLE_2AFC_SIZE,
                  CANVAS_THEME.shape.fill,
                  2.5,
                )
              }
              deps={[question.lineOptionA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: t('common.optionB'),
        isCorrect: isBHit,
        badge: showAnswer
          ? isBHit
            ? t('packs.angle.views.absoluteParallel')
            : t('packs.angle.views.deviationBadge', { deg: question.angularDeviation ?? 0 })
          : undefined,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawSingleLineCanvas(
                  canvas,
                  question.lineOptionB,
                  ANGLE_2AFC_SIZE,
                  CANVAS_THEME.shape.fill,
                  2.5,
                )
              }
              deps={[question.lineOptionB]}
            />
          </div>
        ),
      }}
    />
  );
}

export const AngleParallelCard: CardManifest<
  AngleParallelQuestion,
  AngleParallelHit,
  'A' | 'B',
  BaseModuleSettings
> = {
  id: 'angle_parallel_2afc',
  domain: 'form_and_proportion',
  groupId: 'angle',
  icon: Split,
  tags: {
    domain: ['form_and_proportion'],
    path: ['relational_mapping'],
    interaction: ['binary_choice'],
  },
  hasWeaknessAnalytics: false,
  locales: {
    'zh-CN': {
      title: '平行线基准辨识',
      desc: '观察上方斜率基准线，找出下方与其绝对平行的线段 (2AFC)',
      instruction: '观察上方基准线，在下方选出与其保持绝对平行的线 (键 1 / 2)',
    },
    'en-US': {
      title: 'Parallel Alignment',
      desc: 'Observe prompt orientation and identify strictly parallel line (2AFC).',
      instruction: 'Find the line that is strictly parallel to the prompt line (Keys 1 / 2).',
    },
  },
  training: {
    generateQuestion: (level) => generateAngleParallelQuestion(level),
    evaluateAnswer: (userVal, q) => {
      const isHit = userVal === q.parallelSide;
      return {
        isHit,
        userChoice: userVal,
        correctChoice: q.parallelSide,
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
      AngleParallelView({
        question,
        showAnswer,
        onAnswer,
        disabled,
        showCanvasHints: (settings.showCanvasHints as boolean) ?? true,
      }),
  },
};

export default AngleParallelCard;