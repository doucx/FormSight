我们现在开始执行**阶段 2：几何与结构域迁移（Angle 角度感知 3 张卡片）**。

我们将把现有的 `src/packs/angle/` 下的 3 个训练模式拆解并展平为 3 个符合 `CardManifest` 规范的独立自治卡片：
1. `src/cards/angle_estimation/`（夹角大小估算）
2. `src/cards/angle_comparison_2afc/`（角度二分对比）
3. `src/cards/angle_parallel_2afc/`（平行线基准辨识）

随后删除旧的 `src/packs/angle/` 目录，完成绞杀替换。

## [WIP] feat(cards): 将角度感知 (angle) 迁移为平铺卡片架构

### 用户需求
按照 FormSight “卡片一等公民 (Card-Centric)” 核心架构白皮书规范，将原 `src/packs/angle/` 扩展包中的 3 个模式解构成 3 个完全平铺、自闭环的卡片（`angle_estimation`, `angle_comparison_2afc`, `angle_parallel_2afc`），并使用纯相对 Key 多语言与自洽算法，最后清理旧的 angle pack。

### 评论
将角度感知卡片独立展平，彻底去除了原本集中在单个 `angleUtils.ts`、`plugin.tsx` 与大 `switch/case` 中的耦合逻辑，使每张角度卡片的出题几何、打分判断、画布渲染与局部词典完全内聚在各自文件夹内，提升了模块自治性与可维护性。

### 目标
1. 创建 `src/cards/angle_estimation/`，包含自洽出题/判定、滑块视图、相对词典以及 `CardManifest` 导出。
2. 创建 `src/cards/angle_comparison_2afc/`，包含 2AFC 对比出题/判定、双画布对比视图、相对词典以及 `CardManifest` 导出。
3. 创建 `src/cards/angle_parallel_2afc/`，包含平行线识别出题/判定、Prompt 与选项视图、相对词典以及 `CardManifest` 导出。
4. 清理并删除旧的 `src/packs/angle/` 目录及相关文件。

### 基本原理
每个卡片文件夹均遵循 `CardManifest` 契约，提供 `locales/{zh-CN,en-US}.json` 相对词典。系统注册中心 `registry.ts` 借助 `import.meta.glob` 自动扫描 `src/cards/*/index.tsx` 并对 `settingSchemas` 递归补全 `cards.<card_id>.*` 前缀，实现零硬编码、热插拔注册。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/executor #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/card-migration-angle #task/action/implementation #task/state/begin #task/status/active

---

### Script

#### Acts 1: 创建 `angle_estimation`（夹角大小估算）卡片

~~~~~act
write_file
src/cards/angle_estimation/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Angle Estimation",
  "desc": "Observe the angle formed by two rays and estimate its degree using a slider (0°~180°).",
  "instruction": "Observe the two rays and adjust the slider to match the true angle (0°~180°).",
  "settings": {
    "showToleranceBandTitle": "Show Tolerance Band",
    "showToleranceBandDesc": "Display dynamic tolerance band around current slider position"
  },
  "views": {
    "hint": "Observe the angle formed by rays and modulate the slider to match (0°~180°)",
    "label": "Angle Estimation Value:",
    "trueAngle": "Ground Truth Value:",
    "errorInfo": "Error: {{error}}° (Tolerance: ±{{tolerance}}°)"
  }
}
~~~~~

~~~~~act
write_file
src/cards/angle_estimation/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "夹角大小估算",
  "desc": "观察由纯黑线段构成的夹角，使用连续滑块精准评估夹角弧度大小 (0°~180°)。",
  "instruction": "观察极简两条射线夹角，调制滑块逼近精准度数 (0°~180°)",
  "settings": {
    "showToleranceBandTitle": "显示动态容错带",
    "showToleranceBandDesc": "在滑块周围显示当前难度下的容错区间指示线"
  },
  "views": {
    "hint": "观察两射线夹角，调制滑块逼近精准度数 (0°~180°)",
    "label": "夹角估算值:",
    "trueAngle": "绝对真理值:",
    "errorInfo": "误差: {{error}}° (容错: ±{{tolerance}}°)"
  }
}
~~~~~

~~~~~act
write_file
src/cards/angle_estimation/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface AngleEstimationQuestion {
  id: string;
  difficultyLevel: number;
  tolerance: number;
  targetAngleDeg: number;
  startAngleDeg: number;
  lineA: LineSegment;
  lineB: LineSegment;
}

export interface AngleEstimationHitResult {
  isHit: boolean;
  userValue: number;
  targetValue: number;
  errorValue: number;
  tolerance: number;
}
~~~~~

~~~~~act
write_file
src/cards/angle_estimation/utils/generator.ts
~~~~~
~~~~~typescript
import { setup2DCanvas } from '../../../core/canvas/hidpi';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';
import type { AngleEstimationHitResult, AngleEstimationQuestion, LineSegment } from '../types';

export const ANGLE_CANVAS_SIZE = 340;

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

export function generateQuestion(level: number): AngleEstimationQuestion {
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
    difficultyLevel: clampedLevel,
    targetAngleDeg,
    startAngleDeg,
    lineA,
    lineB,
    tolerance,
  };
}

export function checkHit(userValue: number, question: AngleEstimationQuestion): AngleEstimationHitResult {
  const userVal = typeof userValue === 'number' ? userValue : 90;
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
~~~~~

~~~~~act
write_file
src/cards/angle_estimation/AngleEstimationView.tsx
~~~~~
~~~~~tsx
import { Eye } from 'lucide-preact';
import { CanvasView } from '../../components/common/CanvasView';
import { StandardSliderView } from '../../components/common/StandardSliderView';
import { useCardTranslation } from '../../core/i18n';
import type { AngleEstimationHitResult, AngleEstimationQuestion } from './types';
import { ANGLE_CANVAS_SIZE, drawAngleCanvas } from './utils/generator';

export interface AngleEstimationViewProps {
  question: AngleEstimationQuestion;
  showAnswer: boolean;
  userAnswer: AngleEstimationHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function AngleEstimationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: AngleEstimationViewProps) {
  const { t } = useCardTranslation('angle_estimation');
  const targetVal = question.targetAngleDeg ?? 90;
  const tolerance = question.tolerance;
  const isHit = Boolean(userAnswer?.isHit);
  const userVal = userAnswer?.userValue;

  return (
    <StandardSliderView
      questionId={question.id}
      hintText={t('views.hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label={t('views.label')}
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
              {t('views.trueAngle')}{' '}
              <span className="font-bold text-foreground font-mono">{targetVal}°</span>
            </span>
            <span
              className={
                isHit
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-rose-600 dark:text-rose-400 font-bold'
              }
            >
              {t('views.errorInfo', {
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
src/cards/angle_estimation/index.tsx
~~~~~
~~~~~tsx
import { Compass } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import { AngleEstimationView } from './AngleEstimationView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { AngleEstimationHitResult, AngleEstimationQuestion } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export interface AngleEstimationSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
}

export const angleEstimationCard: CardManifest<
  AngleEstimationQuestion,
  AngleEstimationHitResult,
  number,
  AngleEstimationSettings
> = {
  id: 'angle_estimation',
  domain: 'form_and_proportion',
  icon: Compass,
  tags: {
    domain: ['form_and_proportion', 'spatial_structure'],
    path: ['absolute_estimation'],
    interaction: ['continuous_mod'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  settingSchemas: [
    {
      type: 'toggle',
      key: 'showToleranceBand',
      title: 'settings.showToleranceBandTitle',
      description: 'settings.showToleranceBandDesc',
    },
  ],
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
  training: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, question) => checkHit(userVal, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      userAnswer: userVal,
      targetValue: q.targetAngleDeg,
      errorValue: hitResult.errorValue,
      tolerance: hitResult.tolerance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AngleEstimationView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        hitMargin={settings?.sliderHitMargin ?? 12}
        showToleranceBand={settings?.showToleranceBand ?? true}
      />
    ),
  },
};

export default angleEstimationCard;
~~~~~

#### Acts 2: 创建 `angle_comparison_2afc`（角度二分对比）卡片

~~~~~act
write_file
src/cards/angle_comparison_2afc/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Angle 2AFC Comparison",
  "desc": "Quickly identify which side has a larger angle under non-orthogonal orientations (2AFC).",
  "instruction": "Identify which angle is larger (Keys 1 / 2).",
  "views": {
    "hint": "Identify which side contains a larger angle (Keys 1 / 2)",
    "areaA": "Angle A",
    "areaB": "Angle B"
  }
}
~~~~~

~~~~~act
write_file
src/cards/angle_comparison_2afc/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "角度二分对比",
  "desc": "在消除空间正交基准干扰下，二选一快速判别哪一侧的两射线夹角更大 (2AFC)。",
  "instruction": "二选一快速判别哪一侧夹角更大 (键 1 / 2)",
  "views": {
    "hint": "二选一辨识哪一侧的两射线夹角更大 (键 1 / 2)",
    "areaA": "夹角 A",
    "areaB": "夹角 B"
  }
}
~~~~~

~~~~~act
write_file
src/cards/angle_comparison_2afc/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface AngleComparisonQuestion {
  id: string;
  difficultyLevel: number;
  angleA: number;
  angleB: number;
  linesA: [LineSegment, LineSegment];
  linesB: [LineSegment, LineSegment];
  largerSide: 'A' | 'B';
  tolerance: number;
}

export interface AngleComparisonHitResult {
  isHit: boolean;
  userChoice: 'A' | 'B';
  correctChoice: 'A' | 'B';
  errorValue: number;
  tolerance: number;
}
~~~~~

~~~~~act
write_file
src/cards/angle_comparison_2afc/utils/generator.ts
~~~~~
~~~~~typescript
import { setup2DCanvas } from '../../../core/canvas/hidpi';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';
import type { AngleComparisonHitResult, AngleComparisonQuestion, LineSegment } from '../types';

export const ANGLE_2AFC_SIZE = 240;

export function drawAngleCanvas(
  canvas: HTMLCanvasElement | null,
  lines: [LineSegment, LineSegment] | undefined,
  size = ANGLE_2AFC_SIZE,
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

export function generateQuestion(level: number): AngleComparisonQuestion {
  const id = `ang_2afc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
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
    difficultyLevel: clampedLevel,
    angleA,
    angleB,
    linesA,
    linesB,
    largerSide: isALarger ? 'A' : 'B',
    tolerance: deltaAngle,
  };
}

export function checkHit(choice: 'A' | 'B', question: AngleComparisonQuestion): AngleComparisonHitResult {
  const correctChoice = question.largerSide ?? 'A';
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

~~~~~act
write_file
src/cards/angle_comparison_2afc/AngleComparison2AfcView.tsx
~~~~~
~~~~~tsx
import { Columns } from 'lucide-preact';
import { CanvasView } from '../../components/common/CanvasView';
import { Standard2AfcView } from '../../components/common/Standard2AfcView';
import { useCardTranslation } from '../../core/i18n';
import type { AngleComparisonHitResult, AngleComparisonQuestion } from './types';
import { ANGLE_2AFC_SIZE, drawAngleCanvas } from './utils/generator';

export interface AngleComparison2AfcViewProps {
  question: AngleComparisonQuestion;
  showAnswer: boolean;
  userAnswer: AngleComparisonHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AngleComparison2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AngleComparison2AfcViewProps) {
  const { t } = useCardTranslation('angle_comparison_2afc');
  const isAHit = question.largerSide === 'A';
  const isBHit = question.largerSide === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('views.hint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      optionA={{
        title: t('views.areaA'),
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
        title: t('views.areaB'),
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
src/cards/angle_comparison_2afc/index.tsx
~~~~~
~~~~~tsx
import { Columns } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import { AngleComparison2AfcView } from './AngleComparison2AfcView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { AngleComparisonHitResult, AngleComparisonQuestion } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const angleComparison2AfcCard: CardManifest<
  AngleComparisonQuestion,
  AngleComparisonHitResult,
  'A' | 'B',
  BaseModuleSettings
> = {
  id: 'angle_comparison_2afc',
  domain: 'form_and_proportion',
  icon: Columns,
  tags: {
    domain: ['form_and_proportion', 'spatial_structure'],
    path: ['relational_mapping'],
    interaction: ['binary_choice'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  training: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, question) => checkHit(userVal, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      userChoice: userVal,
      correctChoice: hitResult.correctChoice,
      angleA: q.angleA,
      angleB: q.angleB,
      tolerance: hitResult.tolerance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <AngleComparison2AfcView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
};

export default angleComparison2AfcCard;
~~~~~

#### Acts 3: 创建 `angle_parallel_2afc`（平行线基准辨识）卡片

~~~~~act
write_file
src/cards/angle_parallel_2afc/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Parallel Alignment",
  "desc": "Observe the prompt orientation and identify the strictly parallel line below (2AFC).",
  "instruction": "Find the line that is strictly parallel to the prompt line (Keys 1 / 2).",
  "views": {
    "hint": "Observe the prompt line and select the parallel one below (Keys 1 / 2)",
    "promptTitle": "Parallel Alignment Reference (Prompt)",
    "optionA": "Line A",
    "optionB": "Line B",
    "absoluteParallel": "Strictly Parallel",
    "deviationBadge": "Deviation {{deg}}°"
  }
}
~~~~~

~~~~~act
write_file
src/cards/angle_parallel_2afc/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "平行线基准辨识",
  "desc": "观察上方给定的斜率基准线，在下方两个候选项中二选一找出与其绝对平行的线段 (2AFC)。",
  "instruction": "观察上方基准线，在下方选出与其保持绝对平行的线 (键 1 / 2)",
  "views": {
    "hint": "观察上方基准线，选出下方与它严格平行的线 (键 1 / 2)",
    "promptTitle": "平行基准线 (Prompt)",
    "optionA": "选项 A",
    "optionB": "选项 B",
    "absoluteParallel": "绝对平行",
    "deviationBadge": "偏转 {{deg}}°"
  }
}
~~~~~

~~~~~act
write_file
src/cards/angle_parallel_2afc/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface AngleParallelQuestion {
  id: string;
  difficultyLevel: number;
  promptLine: LineSegment;
  lineOptionA: LineSegment;
  lineOptionB: LineSegment;
  parallelSide: 'A' | 'B';
  angularDeviation: number;
  tolerance: number;
}

export interface AngleParallelHitResult {
  isHit: boolean;
  userChoice: 'A' | 'B';
  correctChoice: 'A' | 'B';
  errorValue: number;
  tolerance: number;
}
~~~~~

~~~~~act
write_file
src/cards/angle_parallel_2afc/utils/generator.ts
~~~~~
~~~~~typescript
import { setup2DCanvas } from '../../../core/canvas/hidpi';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';
import type { AngleParallelHitResult, AngleParallelQuestion, LineSegment } from '../types';

export const ANGLE_2AFC_SIZE = 240;
export const ANGLE_PROMPT_SIZE = 140;

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

export function generateQuestion(level: number): AngleParallelQuestion {
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
    difficultyLevel: clampedLevel,
    promptLine,
    lineOptionA,
    lineOptionB,
    parallelSide: isAParallel ? 'A' : 'B',
    angularDeviation,
    tolerance: angularDeviation,
  };
}

export function checkHit(choice: 'A' | 'B', question: AngleParallelQuestion): AngleParallelHitResult {
  const correctChoice = question.parallelSide ?? 'A';
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

~~~~~act
write_file
src/cards/angle_parallel_2afc/AngleParallel2AfcView.tsx
~~~~~
~~~~~tsx
import { Split } from 'lucide-preact';
import { CanvasView } from '../../components/common/CanvasView';
import { Standard2AfcView } from '../../components/common/Standard2AfcView';
import { useCardTranslation } from '../../core/i18n';
import { CANVAS_THEME } from '../../utils/theme';
import type { AngleParallelHitResult, AngleParallelQuestion } from './types';
import { ANGLE_2AFC_SIZE, ANGLE_PROMPT_SIZE, drawSingleLineCanvas } from './utils/generator';

export interface AngleParallel2AfcViewProps {
  question: AngleParallelQuestion;
  showAnswer: boolean;
  userAnswer: AngleParallelHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AngleParallel2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AngleParallel2AfcViewProps) {
  const { t } = useCardTranslation('angle_parallel_2afc');
  const isAHit = question.parallelSide === 'A';
  const isBHit = question.parallelSide === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('views.hint')}
      hintIcon={Split}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      prompt={
        <div className="flex flex-col items-center gap-1.5 bg-muted/60 p-2.5 rounded-2xl border border-border shadow-inner">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t('views.promptTitle')}
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
        title: t('views.optionA'),
        isCorrect: isAHit,
        badge: showAnswer
          ? isAHit
            ? t('views.absoluteParallel')
            : t('views.deviationBadge', { deg: question.angularDeviation ?? 0 })
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
        title: t('views.optionB'),
        isCorrect: isBHit,
        badge: showAnswer
          ? isBHit
            ? t('views.absoluteParallel')
            : t('views.deviationBadge', { deg: question.angularDeviation ?? 0 })
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
src/cards/angle_parallel_2afc/index.tsx
~~~~~
~~~~~tsx
import { Split } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import { AngleParallel2AfcView } from './AngleParallel2AfcView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { AngleParallelHitResult, AngleParallelQuestion } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const angleParallel2AfcCard: CardManifest<
  AngleParallelQuestion,
  AngleParallelHitResult,
  'A' | 'B',
  BaseModuleSettings
> = {
  id: 'angle_parallel_2afc',
  domain: 'form_and_proportion',
  icon: Split,
  tags: {
    domain: ['form_and_proportion', 'spatial_structure'],
    path: ['relational_mapping'],
    interaction: ['binary_choice'],
    status: 'stable',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  training: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, question) => checkHit(userVal, question),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    extractRecordDetails: (q, hitResult, userVal) => ({
      userChoice: userVal,
      correctChoice: hitResult.correctChoice,
      angularDeviation: q.angularDeviation,
      tolerance: hitResult.tolerance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <AngleParallel2AfcView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
};

export default angleParallel2AfcCard;
~~~~~

#### Acts 4: 物理移除旧的 `src/packs/angle/` 目录

~~~~~act
delete_file
src/packs/angle/components/AngleComparison2AfcView.tsx
~~~~~

~~~~~act
delete_file
src/packs/angle/components/AngleEstimationView.tsx
~~~~~

~~~~~act
delete_file
src/packs/angle/components/AngleParallel2AfcView.tsx
~~~~~

~~~~~act
delete_file
src/packs/angle/locales/en-US.json
~~~~~

~~~~~act
delete_file
src/packs/angle/locales/zh-CN.json
~~~~~

~~~~~act
delete_file
src/packs/angle/utils/angleUtils.ts
~~~~~

~~~~~act
delete_file
src/packs/angle/views/AngleCanvas.tsx
~~~~~

~~~~~act
delete_file
src/packs/angle/index.ts
~~~~~

~~~~~act
delete_file
src/packs/angle/plugin.tsx
~~~~~

### 下一步建议
1. 运行 `pnpm build` 与 `pnpm test` 进行类型与构建校验，验证 3 张角度卡片在探索大盘与训练流中的运行表现。
2. 确认无误后，继续进入阶段 2 的后半部分：**空间透视（Perspective 5 张卡片）** 的展平迁移。
