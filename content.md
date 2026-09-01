你的分析完全正确。

将 `angle` 卡组从旧的 `src/packs/angle` 统一重构到 `src/modules/angle` 中，使其采用与 `star` 模块完全一致的 `CardManifest` 自包含架构和目录组织方式。这能极大地提升代码的一致性、可维护性以及新卡片接入的规范性。

我将生成一个计划来执行此重构。

## [WIP] refactor(angle): 参考 star 模块重构 angle 卡组至 modules 架构

### 用户需求
将原本位于 `src/packs/angle` 的 `angle` 训练卡组重构并迁移至 `src/modules/angle`。卡片定义需由原先集中式的 `PackManifest` + `CardDefinition` 转换为与 `star` 模块一致的、自包含的 `CardManifest` 架构，拆分为独立的子卡片目录 (`EstimationCard`, `ComparisonCard`, `ParallelCard`) 并共享公共工具与国际化词典。

### 评论
这种重构消除了不同模块间架构不一致的的技术债，使所有训练领域（Domain）都严格遵循 `CardManifest` 的一等公民规范。重构后，每张卡片自包含其元数据、标签、本地化词典、训练逻辑及视图渲染，极大地增强了模块的内聚性。

### 目标
1. 在 `src/modules/angle` 下建立与 `star` 模块对齐的目录结构 (`_shared/`, `EstimationCard/`, `ComparisonCard/`, `ParallelCard/`)。
2. 提取公共工具和配置至 `_shared/`。
3. 将 `angle_estimation`、`angle_comparison_2afc`、`angle_parallel_2afc` 三张卡片分别改造成独立的 `CardManifest` 实现。
4. 在 `src/modules/angle/index.ts` 中统一导出 `angleCards`。
5. 清理旧的 `src/packs/angle` 目录。

### 基本原理
参考 `star` 模块的现代模块化组织方式，每个卡片拥有独立的文件夹，内部包含专属的视图组件与 `index.ts`（导出 `CardManifest`）。这样可以将国际化（`locales`）、训练逻辑（`training`）、分析插件（`analytics`）和设置架构（`settingSchemas`）高度聚合，避免集中式定义导致的膨胀与耦合。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #concept/config #scope/core #ai/instruct #task/domain/modules #task/object/angle-card-refactor #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 创建 angle 模块公共共享与工具文件

我们将把 `angle` 的几何与工具函数及通用设置项迁移至 `src/modules/angle/_shared/`。

~~~~~act
write_file
src/modules/angle/_shared/schemas.ts
~~~~~
~~~~~ts
import type { SettingFieldSchema } from '../../../components/settings/DynamicDomainSettings';

export const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: 'packs.angle.settings.showToleranceBandTitle',
    description: 'packs.angle.settings.showToleranceBandDesc',
  },
];
~~~~~

~~~~~act
write_file
src/modules/angle/_shared/angleUtils.ts
~~~~~
~~~~~ts
import { setup2DCanvas } from '../../../core/canvas/hidpi';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';

export type AngleMode = 'ANGLE_ESTIMATION' | 'ANGLE_COMPARISON_2AFC' | 'PARALLEL_ALIGNMENT_2AFC';

export const ANGLE_CANVAS_SIZE = 340;
export const ANGLE_2AFC_SIZE = 240;
export const ANGLE_PROMPT_SIZE = 140;

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface AngleQuestionData {
  id: string;
  mode: AngleMode;
  difficultyLevel: number;
  tolerance: number;

  targetAngleDeg?: number;
  startAngleDeg?: number;
  lineA?: LineSegment;
  lineB?: LineSegment;

  angleA?: number;
  angleB?: number;
  linesA?: [LineSegment, LineSegment];
  linesB?: [LineSegment, LineSegment];
  largerSide?: 'A' | 'B';

  promptLine?: LineSegment;
  lineOptionA?: LineSegment;
  lineOptionB?: LineSegment;
  parallelSide?: 'A' | 'B';
  angularDeviation?: number;
}

export interface AngleHitResult {
  isHit: boolean;
  userValue?: number;
  targetValue?: number;
  errorValue: number;
  tolerance: number;
  userChoice?: 'A' | 'B';
  correctChoice?: 'A' | 'B';
}

export function drawAngleCanvas(
  canvas: HTMLCanvasElement | null,
  lines: [LineSegment, LineSegment] | undefined,
  size = ANGLE_CANVAS_SIZE,
  strokeColor: string = CANVAS_THEME.shape.fill,
  lineWidth = 2.5,
): void {
  if (!lines) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const line of lines) {
    ctx.beginPath();
    ctx.moveTo(line.p1.x, line.p1.y);
    ctx.lineTo(line.p2.x, line.p2.y);
    ctx.stroke();
  }
}

export function drawSingleLineCanvas(
  canvas: HTMLCanvasElement | null,
  line: LineSegment | undefined,
  size = ANGLE_2AFC_SIZE,
  strokeColor: string = CANVAS_THEME.shape.fill,
  lineWidth = 2.5,
): void {
  if (!line) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(line.p1.x, line.p1.y);
  ctx.lineTo(line.p2.x, line.p2.y);
  ctx.stroke();
}

function createCenteredLine(center: Point, angleDeg: number, length: number): LineSegment {
  const rad = (angleDeg * Math.PI) / 180;
  const halfL = length / 2;
  return {
    p1: {
      x: Math.round((center.x - halfL * Math.cos(rad)) * 10) / 10,
      y: Math.round((center.y + halfL * Math.sin(rad)) * 10) / 10,
    },
    p2: {
      x: Math.round((center.x + halfL * Math.cos(rad)) * 10) / 10,
      y: Math.round((center.y - halfL * Math.sin(rad)) * 10) / 10,
    },
  };
}

function createRadialLine(center: Point, angleDeg: number, length: number): LineSegment {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    p1: { x: center.x, y: center.y },
    p2: {
      x: Math.round((center.x + length * Math.cos(rad)) * 10) / 10,
      y: Math.round((center.y - length * Math.sin(rad)) * 10) / 10,
    },
  };
}

export function generateAngleQuestion(mode: AngleMode, level: number): AngleQuestionData {
  const id = `ang_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  if (mode === 'ANGLE_ESTIMATION') {
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
      mode,
      difficultyLevel: clampedLevel,
      targetAngleDeg,
      startAngleDeg,
      lineA,
      lineB,
      tolerance,
    };
  }

  if (mode === 'ANGLE_COMPARISON_2AFC') {
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
      mode,
      difficultyLevel: clampedLevel,
      angleA,
      angleB,
      linesA,
      linesB,
      largerSide: isALarger ? 'A' : 'B',
      tolerance: deltaAngle,
    };
  }

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
    mode,
    difficultyLevel: clampedLevel,
    promptLine,
    lineOptionA,
    lineOptionB,
    parallelSide: isAParallel ? 'A' : 'B',
    angularDeviation,
    tolerance: angularDeviation,
  };
}

export function checkAngleHit(
  userAnswer: number | 'A' | 'B',
  question: AngleQuestionData,
): AngleHitResult {
  const { mode } = question;

  if (mode === 'ANGLE_ESTIMATION') {
    const userVal = typeof userAnswer === 'number' ? userAnswer : 90;
    const targetVal = question.targetAngleDeg ?? 90;
    const errorValue = Math.round(Math.abs(userVal - targetVal) * 10) / 10;
    const isHit = errorValue <= question.tolerance;

    return {
      isHit,
      userValue: userVal,
      targetValue: targetVal,
      errorValue,
      tolerance: question.tolerance,
    };
  }

  const choice = userAnswer as 'A' | 'B';
  const correctChoice =
    mode === 'ANGLE_COMPARISON_2AFC'
      ? (question.largerSide ?? 'A')
      : (question.parallelSide ?? 'A');

  const isHit = choice === correctChoice;

  return {
    isHit,
    userChoice: choice,
    correctChoice,
    errorValue: isHit ? 0 : 1,
    tolerance: question.tolerance,
  };
}
~~~~~

#### Acts 2: 实现夹角估算卡片 (EstimationCard)

~~~~~act
write_file
src/modules/angle/EstimationCard/EstimationView.tsx
~~~~~
~~~~~tsx
import { Eye } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import { useTranslation } from '../../../core/i18n';
import {
  ANGLE_CANVAS_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawAngleCanvas,
} from '../_shared/angleUtils';

interface AngleEstimationViewProps {
  question: AngleQuestionData;
  showAnswer: boolean;
  userAnswer: AngleHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function EstimationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: AngleEstimationViewProps) {
  const { t } = useTranslation();
  const targetVal = question.targetAngleDeg ?? 90;
  const tolerance = question.tolerance;
  const isHit = Boolean(userAnswer?.isHit);
  const userVal = userAnswer?.userValue;

  return (
    <StandardSliderView
      questionId={question.id}
      hintText={t('packs.angle.views.estimationHint')}
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
~~~~~

~~~~~act
write_file
src/modules/angle/EstimationCard/index.ts
~~~~~
~~~~~ts
import { Compass } from 'lucide-preact';
import type { CardManifest } from '../../../core/contracts';
import type { BaseModuleSettings } from '../../../storage/settings';
import { SLIDER_COMMON_SCHEMAS } from '../_shared/schemas';
import {
  type AngleHitResult,
  type AngleQuestionData,
  checkAngleHit,
  generateAngleQuestion,
} from '../_shared/angleUtils';
import { EstimationView } from './EstimationView';

export const angleEstimationCard: CardManifest<
  AngleQuestionData,
  AngleHitResult,
  number,
  BaseModuleSettings
> = {
  id: 'angle_estimation',
  groupId: 'angle',
  mode: 'ANGLE_ESTIMATION',
  icon: Compass,
  tags: {
    domain: ['form_and_proportion'],
    path: ['absolute_estimation'],
    interaction: ['continuous_mod'],
  },
  hasWeaknessAnalytics: true,
  settingSchemas: SLIDER_COMMON_SCHEMAS,
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
  locales: {
    'zh-CN': {
      title: '夹角大小估算',
      desc: '观察由纯黑线段构成的夹角，使用连续滑块精准评估夹角弧度大小 (0°~180°)。',
      instruction: '观察极简两条射线夹角，调制滑块逼近精准度数 (0°~180°)',
      badge: '夹角大小估算',
      settings: {
        showToleranceBandTitle: '显示容错带范围',
        showToleranceBandDesc: '在滑块轨道上直观展示当前难度下的容错区间色带',
      },
    },
    'en-US': {
      title: 'Angle Estimation',
      desc: 'Observe the angle formed by two rays and estimate its degree using a slider (0°~180°).',
      instruction: 'Observe the two rays and adjust the slider to match the true angle (0°~180°).',
      badge: 'Angle Estimation',
      settings: {
        showToleranceBandTitle: 'Show Tolerance Band',
        showToleranceBandDesc: 'Visually highlight the accepted tolerance window on the slider track.',
      },
    },
  },
  training: {
    generateQuestion: (level) => generateAngleQuestion('ANGLE_ESTIMATION', level),
    evaluateAnswer: (userVal, q) => checkAngleHit(userVal, q),
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (_q, hitResult, userVal, mode) => ({
      mode,
      userAnswer: userVal,
      errorValue: hitResult.errorValue,
      tolerance: hitResult.tolerance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <EstimationView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        hitMargin={(settings.sliderHitMargin as number) ?? 12}
        showToleranceBand={(settings.showToleranceBand as boolean) ?? true}
        showCanvasHints={(settings.showCanvasHints as boolean) ?? true}
      />
    ),
  },
};

export default angleEstimationCard;
~~~~~

#### Acts 3: 实现角度对比卡片 (ComparisonCard)

~~~~~act
write_file
src/modules/angle/ComparisonCard/ComparisonView.tsx
~~~~~
~~~~~tsx
import { Columns } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import { useTranslation } from '../../../core/i18n';
import {
  ANGLE_2AFC_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawAngleCanvas,
} from '../_shared/angleUtils';

interface AngleComparison2AfcViewProps {
  question: AngleQuestionData;
  showAnswer: boolean;
  userAnswer: AngleHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function ComparisonView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AngleComparison2AfcViewProps) {
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
~~~~~

~~~~~act
write_file
src/modules/angle/ComparisonCard/index.ts
~~~~~
~~~~~ts
import { Columns } from 'lucide-preact';
import type { CardManifest } from '../../../core/contracts';
import type { BaseModuleSettings } from '../../../storage/settings';
import {
  type AngleHitResult,
  type AngleQuestionData,
  checkAngleHit,
  generateAngleQuestion,
} from '../_shared/angleUtils';
import { ComparisonView } from './ComparisonView';

export const angleComparisonCard: CardManifest<
  AngleQuestionData,
  AngleHitResult,
  'A' | 'B',
  BaseModuleSettings
> = {
  id: 'angle_comparison_2afc',
  groupId: 'angle',
  mode: 'ANGLE_COMPARISON_2AFC',
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
      desc: '在消除空间正交基准干扰下，二选一快速判别哪一侧的两射线夹角更大 (2AFC)。',
      instruction: '二选一快速判别哪一侧夹角更大 (键 1 / 2)',
      badge: '角度二分对比',
    },
    'en-US': {
      title: 'Angle 2AFC Comparison',
      desc: 'Quickly identify which side has a larger angle under non-orthogonal orientations (2AFC).',
      instruction: 'Identify which angle is larger (Keys 1 / 2).',
      badge: 'Angle Comparison',
    },
  },
  training: {
    generateQuestion: (level) => generateAngleQuestion('ANGLE_COMPARISON_2AFC', level),
    evaluateAnswer: (userVal, q) => checkAngleHit(userVal, q),
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (_q, hitResult, userVal, mode) => ({
      mode,
      userAnswer: userVal,
      errorValue: hitResult.errorValue,
      tolerance: hitResult.tolerance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <ComparisonView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={(settings.showCanvasHints as boolean) ?? true}
      />
    ),
  },
};

export default angleComparisonCard;
~~~~~

#### Acts 4: 实现平行线基准辨识卡片 (ParallelCard)

~~~~~act
write_file
src/modules/angle/ParallelCard/ParallelView.tsx
~~~~~
~~~~~tsx
import { Split } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import { useTranslation } from '../../../core/i18n';
import { CANVAS_THEME } from '../../../utils/theme';
import {
  ANGLE_2AFC_SIZE,
  ANGLE_PROMPT_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawSingleLineCanvas,
} from '../_shared/angleUtils';

interface AngleParallel2AfcViewProps {
  question: AngleQuestionData;
  showAnswer: boolean;
  userAnswer: AngleHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function ParallelView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AngleParallel2AfcViewProps) {
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
~~~~~

~~~~~act
write_file
src/modules/angle/ParallelCard/index.ts
~~~~~
~~~~~ts
import { Split } from 'lucide-preact';
import type { CardManifest } from '../../../core/contracts';
import type { BaseModuleSettings } from '../../../storage/settings';
import {
  type AngleHitResult,
  type AngleQuestionData,
  checkAngleHit,
  generateAngleQuestion,
} from '../_shared/angleUtils';
import { ParallelView } from './ParallelView';

export const angleParallelCard: CardManifest<
  AngleQuestionData,
  AngleHitResult,
  'A' | 'B',
  BaseModuleSettings
> = {
  id: 'angle_parallel_2afc',
  groupId: 'angle',
  mode: 'PARALLEL_ALIGNMENT_2AFC',
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
      desc: '观察上方给定的斜率基准线，在下方两个候选项中二选一找出与其绝对平行的线段 (2AFC)。',
      instruction: '观察上方基准线，在下方选出与其保持绝对平行的线 (键 1 / 2)',
      badge: '平行线基准辨识',
    },
    'en-US': {
      title: 'Parallel Alignment',
      desc: 'Observe the prompt orientation and identify the strictly parallel line below (2AFC).',
      instruction: 'Find the line that is strictly parallel to the prompt line (Keys 1 / 2).',
      badge: 'Parallel Alignment',
    },
  },
  training: {
    generateQuestion: (level) => generateAngleQuestion('PARALLEL_ALIGNMENT_2AFC', level),
    evaluateAnswer: (userVal, q) => checkAngleHit(userVal, q),
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (_q, hitResult, userVal, mode) => ({
      mode,
      userAnswer: userVal,
      errorValue: hitResult.errorValue,
      tolerance: hitResult.tolerance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <ParallelView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={(settings.showCanvasHints as boolean) ?? true}
      />
    ),
  },
};

export default angleParallelCard;
~~~~~

#### Acts 5: 创建 angle 模块总入口文件与删除旧包

~~~~~act
write_file
src/modules/angle/index.ts
~~~~~
~~~~~ts
import { angleComparisonCard } from './ComparisonCard';
import { angleEstimationCard } from './EstimationCard';
import { angleParallelCard } from './ParallelCard';

export * from './EstimationCard';
export * from './ComparisonCard';
export * from './ParallelCard';

export const angleCards = [angleEstimationCard, angleComparisonCard, angleParallelCard];
export default angleCards;
~~~~~

~~~~~act
delete_file
src/packs/angle
~~~~~

### 下一步建议

现在我们已经成功将 `angle` 训练卡组从旧的 packs 结构重构到了 `src/modules/angle` 中，并升级为了现代的 `CardManifest` 自包含架构。
我建议下一步检查其他 packs 中的卡组（例如色彩、负空间等），并同样按照此模式将它们迁移到 `modules` 目录中，实现全局模块架构的完全统一。
