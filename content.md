我将为你生成一个完整的重构计划，按照卡片一等公民架构将 `abstraction` 扩展包中的 8 张卡片全部解耦并平铺迁移到 `src/cards/` 独立目录中，并清理旧版 `src/packs/abstraction/`。

## [WIP] refactor: 迁移 Abstraction 抽象感知域 8 张卡片为一等公民独立目录

### 用户需求
按照 FormSight 卡片一等公民架构标准（Card-Centric Architecture），将现存 `src/packs/abstraction/` 领域包解耦，平铺重构成 8 个独立的自包含卡片目录：
1. `src/cards/abs_gesture_axis/` (动态势线提取)
2. `src/cards/abs_polygon_decimation/` (折线低模大形)
3. `src/cards/abs_notan_threshold/` (黑白素描归组)
4. `src/cards/abs_palette_clustering/` (主调色群提炼)
5. `src/cards/abs_td_gesture_2afc/` (动态势线寻源)
6. `src/cards/abs_td_hull_2afc/` (几何大模寻形)
7. `src/cards/abs_td_notan_2afc/` (黑白素描骨架)
8. `src/cards/abs_td_palette_2afc/` (调性基底归位)

### 评论
视觉抽象与概括是造型认知的核心能力。本次重构将自底向上（Bottom-Up）的特征提取与自顶向下（Top-Down）的具象寻源两组对称训练任务彻底原子化。重构后，每张卡片都具备完全自洽的出题算法、绘制逻辑、独立的相对语言包以及导出标准 `CardManifest` 的能力，并废除针对 `mode` 的大型 switch 集中式分发。

### 目标
1. 在 `src/cards/` 下分别建立 8 个独立卡片目录，各包含自闭环的 `locales/`、`utils/`、`types.ts`、视图组件与 `index.tsx`。
2. 确保所有 `locales` 文件与 `settingSchemas` 使用纯相对 key，不硬编码 `cards.<card_id>` 前缀。
3. 删除已废弃的 `src/packs/abstraction/` 包目录。

### 基本原理
注册中心 `registry.ts` 会自动扫描 `src/cards/*/index.tsx` 并完成双轨装配。通过将 `abstraction` 拆分为独立的 `CardManifest`，训练引擎与探索大盘可直接加载每张卡片，同时保持数据库中历史记录与自适应难度阶梯的完整连续。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/executor #scope/core #ai/instruct #task/domain/cards #task/object/abstraction-pack-migration #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 创建 `abs_gesture_axis` 卡片（动态势线提取）

~~~~~act
write_file
src/cards/abs_gesture_axis/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export interface QuestionData {
  id: string;
  difficultyLevel: number;
  particles: Point[];
  targetAngleDeg: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userValue: number;
  targetValue: number;
  errorValue: number;
  tolerance: number;
}
~~~~~

~~~~~act
write_file
src/cards/abs_gesture_axis/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "动态势线提取",
  "desc": "从离散散点流向中提取第一主成分 PCA 势线角度，建立画面主导动势感知力。",
  "instruction": "旋转调节主轴，对齐粒子群的主动态流向 (0°~180°)",
  "badge": "动态势线提取",
  "hint": "旋转主轴对齐粒子群动态流向 (0°~180°)",
  "label": "动态势线角度:",
  "settings": {
    "showToleranceBandTitle": "显示滑块容错感应区",
    "showToleranceBandDesc": "在悬停光标两侧实时显示动态容错区间"
  }
}
~~~~~

~~~~~act
write_file
src/cards/abs_gesture_axis/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Gesture Axis Extraction",
  "desc": "Extract the primary PCA gesture axis angle from flowing particle fields.",
  "instruction": "Rotate the primary axis to align with the main particle flow (0°~180°).",
  "badge": "Gesture Axis",
  "hint": "Rotate the primary axis to align with the particle flow (0°~180°)",
  "label": "Gesture Axis Angle:",
  "settings": {
    "showToleranceBandTitle": "Show Slider Tolerance Band",
    "showToleranceBandDesc": "Display dynamic tolerance interval around the hover cursor"
  }
}
~~~~~

~~~~~act
write_file
src/cards/abs_gesture_axis/utils/generator.ts
~~~~~
~~~~~typescript
import { setup2DCanvas } from '../../../core/canvas/hidpi';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';
import type { HitResult, QuestionData } from '../types';

export const CANVAS_SIZE = 400;

export function calcPCAOrientation(points: Point[]): number {
  const n = points.length;
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  const cx = sumX / n;
  const cy = sumY / n;

  let covXX = 0;
  let covYY = 0;
  let covXY = 0;
  for (const p of points) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    covXX += dx * dx;
    covYY += dy * dy;
    covXY += dx * dy;
  }

  const theta = 0.5 * Math.atan2(2 * covXY, covXX - covYY);
  let deg = (theta * 180) / Math.PI;
  deg = ((deg % 180) + 180) % 180;
  return Math.round(deg * 10) / 10;
}

export function generateFlowParticles(
  angleDeg: number,
  spreadRatio: number,
  size = CANVAS_SIZE,
): Point[] {
  const rad = (angleDeg * Math.PI) / 180;
  const count = 45 + Math.floor(Math.random() * 20);
  const cx = size / 2;
  const cy = size / 2;
  const majorLen = size * 0.38;
  const minorLen = majorLen * spreadRatio;

  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const u = (Math.random() * 2 - 1) * majorLen;
    const v = (Math.random() * 2 - 1) * minorLen;

    const x = Math.round(cx + u * Math.cos(rad) - v * Math.sin(rad));
    const y = Math.round(cy + u * Math.sin(rad) + v * Math.cos(rad));
    points.push({
      x: Math.max(15, Math.min(size - 15, x)),
      y: Math.max(15, Math.min(size - 15, y)),
    });
  }
  return points;
}

export function drawParticlesCanvas(
  canvas: HTMLCanvasElement | null,
  particles?: Point[],
  size = CANVAS_SIZE,
  axisAngle?: number,
  axisColor: string = CANVAS_THEME.status.hit,
  userAxisAngle?: number,
  isHit?: boolean,
) {
  if (!particles) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = CANVAS_THEME.shape.fill;
    ctx.fill();
  }

  if (userAxisAngle !== undefined && userAxisAngle !== axisAngle) {
    const radU = (userAxisAngle * Math.PI) / 180;
    const cx = size / 2;
    const cy = size / 2;
    const L = size * 0.44;

    ctx.strokeStyle = isHit ? CANVAS_THEME.status.hit : CANVAS_THEME.status.miss;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx - L * Math.cos(radU), cy - L * Math.sin(radU));
    ctx.lineTo(cx + L * Math.cos(radU), cy + L * Math.sin(radU));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (axisAngle !== undefined) {
    const rad = (axisAngle * Math.PI) / 180;
    const cx = size / 2;
    const cy = size / 2;
    const L = size * 0.44;

    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - L * Math.cos(rad), cy - L * Math.sin(rad));
    ctx.lineTo(cx + L * Math.cos(rad), cy + L * Math.sin(rad));
    ctx.stroke();
  }
}

export function generateQuestion(level: number): QuestionData {
  const id = `abs_ga_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34;

  const targetAngleDeg = Math.floor(Math.random() * 180);
  const spreadRatio = 0.15 + t * 0.5;
  const particles = generateFlowParticles(targetAngleDeg, spreadRatio);
  const realPCA = calcPCAOrientation(particles);
  const tolerance = Math.round(expDecayInterpolate(18.0, 2.5, clampedLevel) * 10) / 10;

  return {
    id,
    difficultyLevel: clampedLevel,
    particles,
    targetAngleDeg: realPCA,
    tolerance,
  };
}

export function checkHit(userAnswer: number, question: QuestionData): HitResult {
  const targetDeg = question.targetAngleDeg;
  let diff = Math.abs(userAnswer - targetDeg);
  diff = Math.min(diff, 180 - diff);
  const isHit = diff <= question.tolerance;

  return {
    isHit,
    userValue: userAnswer,
    targetValue: targetDeg,
    errorValue: Math.round(diff * 10) / 10,
    tolerance: question.tolerance,
  };
}
~~~~~

~~~~~act
write_file
src/cards/abs_gesture_axis/AbsGestureAxisView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { CanvasView } from '../../components/common/CanvasView';
import { StandardSliderView } from '../../components/common/StandardSliderView';
import { useTranslation } from '../../core/i18n';
import { CANVAS_THEME } from '../../utils/theme';
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE, drawParticlesCanvas } from './utils/generator';

export interface AbsGestureAxisViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function AbsGestureAxisView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showCanvasHints = true,
}: AbsGestureAxisViewProps) {
  const { t } = useTranslation();
  const [activeSliderVal, setActiveSliderVal] = useState<number>(90);

  const targetVal = question.targetAngleDeg;
  const userVal = userAnswer?.userValue ?? activeSliderVal;
  const isHit = Boolean(userAnswer?.isHit);

  return (
    <StandardSliderView
      questionId={question.id}
      hintText={t('cards.abs_gesture_axis.hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label={t('cards.abs_gesture_axis.label')}
      max={180}
      step={0.5}
      initialValue={90}
      unit="°"
      targetValue={targetVal}
      showAnswer={showAnswer}
      isHit={isHit}
      userValue={userAnswer?.userValue}
      disabled={disabled}
      hitMargin={hitMargin}
      submitMode="commit_on_release"
      onValueChange={(_val, active) => setActiveSliderVal(active)}
      onAnswer={onAnswer}
      preview={
        <div className="bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex justify-center items-center">
          <CanvasView
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card"
            draw={(canvas) => {
              drawParticlesCanvas(
                canvas,
                question.particles,
                CANVAS_SIZE,
                showAnswer ? targetVal : activeSliderVal,
                showAnswer ? CANVAS_THEME.status.hit : CANVAS_THEME.status.accentHover,
                showAnswer ? userVal : undefined,
                isHit,
              );
            }}
            deps={[question.particles, activeSliderVal, showAnswer, targetVal, userVal, isHit]}
          />
        </div>
      }
    />
  );
}
~~~~~

~~~~~act
write_file
src/cards/abs_gesture_axis/index.tsx
~~~~~
~~~~~typescript
import { RotateCw } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import { AbsGestureAxisView } from './AbsGestureAxisView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const absGestureAxisCard: CardManifest<QuestionData, HitResult, number, BaseModuleSettings> = {
  id: 'abs_gesture_axis',
  domain: 'rhythm_and_notan',
  icon: RotateCw,
  tags: {
    domain: ['rhythm_and_notan'],
    path: ['extraction'],
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
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsGestureAxisView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        hitMargin={settings.sliderHitMargin as number}
        showToleranceBand={settings.showToleranceBand as boolean}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
  },
};

export default absGestureAxisCard;
~~~~~

#### Acts 2: 创建 `abs_polygon_decimation` 卡片（折线低模大形）

~~~~~act
write_file
src/cards/abs_polygon_decimation/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export interface QuestionData {
  id: string;
  difficultyLevel: number;
  detailedPolygon: Point[];
  simplifiedOptions: Point[][];
  correctPolyIndex: number;
  correctPolyChoice: 'A' | 'B';
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userChoice: 'A' | 'B';
  correctChoice: 'A' | 'B';
  errorValue: number;
  tolerance: number;
}
~~~~~

~~~~~act
write_file
src/cards/abs_polygon_decimation/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "折线低模大形",
  "desc": "从细碎繁复轮廓中穿透高频噪波，识别出其底层的最优关键折线大形框架。",
  "instruction": "观察左侧细碎多边形，选择右侧保留了关键折线大形的概括项",
  "badge": "折线低模大形",
  "hint": "选择保留了主要转折大形的精简项",
  "promptTitle": "多边形原图"
}
~~~~~

~~~~~act
write_file
src/cards/abs_polygon_decimation/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Polygon Hull Decimation",
  "desc": "Filter high-frequency noise from intricate silhouettes to identify the optimal low-poly hull.",
  "instruction": "Select the simplified polygon that best preserves key structural vertices.",
  "badge": "Polygon Hull",
  "hint": "Select the simplified polygon that best preserves key structural vertices",
  "promptTitle": "Detailed Silhouette"
}
~~~~~

~~~~~act
write_file
src/cards/abs_polygon_decimation/utils/generator.ts
~~~~~
~~~~~typescript
import type { Point } from '../../../types';
import type { HitResult, QuestionData } from '../types';

export const CANVAS_SIZE = 400;
export const OPTION_SIZE = 260;

export function fractalizePolygon(
  basePolygon: Point[],
  detailLevel: number,
  noiseFactor: number,
): Point[] {
  let currentPoints = [...basePolygon];

  for (let iter = 0; iter < detailLevel; iter++) {
    const nextPoints: Point[] = [];
    for (let i = 0; i < currentPoints.length; i++) {
      const p1 = currentPoints[i];
      const p2 = currentPoints[(i + 1) % currentPoints.length];

      nextPoints.push(p1);

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) continue;

      const nx = -dy / len;
      const ny = dx / len;

      const displacement = (Math.random() * 2 - 1) * noiseFactor * (len * 0.3);
      nextPoints.push({
        x: Math.round(midX + nx * displacement),
        y: Math.round(midY + ny * displacement),
      });
    }
    currentPoints = nextPoints;
  }
  return currentPoints;
}

export function generateDetailedPolygon(verticesCount: number, size = CANVAS_SIZE): Point[] {
  const cx = size / 2;
  const cy = size / 2;
  const baseR = size * 0.32;
  const angles: number[] = [];
  const step = (Math.PI * 2) / verticesCount;

  for (let i = 0; i < verticesCount; i++) {
    angles.push(i * step + (Math.random() - 0.5) * step * 0.65);
  }
  angles.sort((a, b) => a - b);

  return angles.map((a) => {
    const r = baseR * (0.65 + Math.random() * 0.65);
    return {
      x: Math.round(cx + r * Math.cos(a)),
      y: Math.round(cy + r * Math.sin(a)),
    };
  });
}

export function generateAdversarialDistractorHull(
  targetHull: Point[],
  level: number,
  size = OPTION_SIZE,
): Point[] {
  const t = (Math.max(1, Math.min(35, level)) - 1) / 34;
  const n = targetHull.length;
  const distractor: Point[] = targetHull.map((p) => ({ ...p }));
  const cx = size / 2;
  const cy = size / 2;

  const mutationType = Math.random();

  if (mutationType < 0.35 && n > 4) {
    const idx = Math.floor(Math.random() * n);
    const prev = targetHull[(idx - 1 + n) % n];
    const next = targetHull[(idx + 1) % n];
    distractor[idx] = {
      x: Math.round((prev.x + next.x) / 2),
      y: Math.round((prev.y + next.y) / 2),
    };
  } else {
    const mutateCount = t > 0.6 && Math.random() < 0.5 ? 2 : 1;
    const chosenIndices = new Set<number>();
    while (chosenIndices.size < mutateCount) {
      chosenIndices.add(Math.floor(Math.random() * n));
    }

    const shiftMag = 14 + (1 - t) * 26;

    for (const idx of chosenIndices) {
      const p = targetHull[idx];
      const angleFromCenter = Math.atan2(p.y - cy, p.x - cx);
      const angle = angleFromCenter + (Math.random() - 0.5) * (Math.PI * 0.8);

      distractor[idx] = {
        x: Math.max(10, Math.min(size - 10, Math.round(p.x + Math.cos(angle) * shiftMag))),
        y: Math.max(10, Math.min(size - 10, Math.round(p.y + Math.sin(angle) * shiftMag))),
      };
    }
  }

  return distractor;
}

export function generateQuestion(level: number): QuestionData {
  const id = `abs_pd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34;

  const minVerts = 4 + Math.floor(t * 3);
  const maxVerts = 5 + Math.floor(t * 4);
  const vertCount = Math.floor(Math.random() * (maxVerts - minVerts + 1)) + minVerts;

  const targetHull = generateDetailedPolygon(vertCount, OPTION_SIZE);
  const distractorHull = generateAdversarialDistractorHull(targetHull, clampedLevel, OPTION_SIZE);

  const scaleToMain = CANVAS_SIZE / OPTION_SIZE;
  const baseForDetailed = targetHull.map((p) => ({
    x: Math.round(p.x * scaleToMain),
    y: Math.round(p.y * scaleToMain),
  }));

  const noiseFactor = 0.4 + t * 0.9;
  const detailedPolygon = fractalizePolygon(baseForDetailed, 2, noiseFactor);

  const isA = Math.random() < 0.5;
  const simplifiedOptions = isA ? [targetHull, distractorHull] : [distractorHull, targetHull];

  return {
    id,
    difficultyLevel: clampedLevel,
    detailedPolygon,
    simplifiedOptions,
    correctPolyIndex: isA ? 0 : 1,
    correctPolyChoice: isA ? 'A' : 'B',
    tolerance: 0,
  };
}

export function checkHit(userChoice: 'A' | 'B', question: QuestionData): HitResult {
  const isHit = userChoice === question.correctPolyChoice;
  return {
    isHit,
    userChoice,
    correctChoice: question.correctPolyChoice,
    errorValue: isHit ? 0 : 1,
    tolerance: 0,
  };
}
~~~~~

~~~~~act
write_file
src/cards/abs_polygon_decimation/AbsPolygonDecimationView.tsx
~~~~~
~~~~~typescript
import { Columns } from 'lucide-preact';
import { CanvasView } from '../../components/common/CanvasView';
import { Standard2AfcView } from '../../components/common/Standard2AfcView';
import { drawPolygonCanvas } from '../../core/canvas/drawPolygon';
import { useTranslation } from '../../core/i18n';
import { CANVAS_THEME } from '../../utils/theme';
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE, OPTION_SIZE } from './utils/generator';

const CANVAS_OPTION_CLASS =
  'w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block';

export interface AbsPolygonDecimationViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AbsPolygonDecimationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsPolygonDecimationViewProps) {
  const { t } = useTranslation();

  const isTargetA = question.correctPolyChoice === 'A';
  const isTargetB = !isTargetA;

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('cards.abs_polygon_decimation.hint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      prompt={
        <div className="flex flex-col items-center gap-2 bg-muted/60 p-3 rounded-2xl border border-border shadow-inner w-full max-w-[250px] sm:max-w-[270px] mx-auto">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t('cards.abs_polygon_decimation.promptTitle')}
          </span>
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.detailedPolygon,
                  size: CANVAS_SIZE,
                })
              }
              deps={[question.detailedPolygon]}
            />
          </div>
        </div>
      }
      optionA={{
        title: `${t('common.areaA')} (${t('common.optionA')})`,
        isCorrect: isTargetA,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.simplifiedOptions[0],
                  size: OPTION_SIZE,
                  fillColor: CANVAS_THEME.status.accent,
                })
              }
              deps={[question.simplifiedOptions]}
            />
          </div>
        ),
      }}
      optionB={{
        title: `${t('common.areaB')} (${t('common.optionB')})`,
        isCorrect: isTargetB,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.simplifiedOptions[1],
                  size: OPTION_SIZE,
                  fillColor: CANVAS_THEME.status.accent,
                })
              }
              deps={[question.simplifiedOptions]}
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
src/cards/abs_polygon_decimation/index.tsx
~~~~~
~~~~~typescript
import { Maximize2 } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import { AbsPolygonDecimationView } from './AbsPolygonDecimationView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const absPolygonDecimationCard: CardManifest<QuestionData, HitResult, 'A' | 'B', BaseModuleSettings> = {
  id: 'abs_polygon_decimation',
  domain: 'form_and_proportion',
  icon: Maximize2,
  tags: {
    domain: ['form_and_proportion'],
    path: ['extraction'],
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
      userAnswer: userVal,
      correctChoice: q.correctPolyChoice,
      errorValue: hitResult.errorValue,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsPolygonDecimationView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
  },
};

export default absPolygonDecimationCard;
~~~~~

#### Acts 3: 创建 `abs_notan_threshold` 卡片（黑白素描归组）

~~~~~act
write_file
src/cards/abs_notan_threshold/types.ts
~~~~~
~~~~~typescript
export interface QuestionData {
  id: string;
  difficultyLevel: number;
  notanBuffer: number[];
  notanFieldDim: number;
  idealNotanThreshold: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userValue: number;
  targetValue: number;
  errorValue: number;
  tolerance: number;
}
~~~~~

~~~~~act
write_file
src/cards/abs_notan_threshold/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "黑白素描归组",
  "desc": "调节二值化明度剪切阈值，过滤杂乱中间调，压榨出最坚固的 Notan 黑白大关系。",
  "instruction": "调节二值化阈值滑块，达成黑白咬合最平衡的 Notan 状态",
  "badge": "黑白素描归组",
  "hint": "观察左侧灰阶原图，在下方滑块点击/调节右侧最佳黑白二值截断点",
  "label": "二值化截断阈值:",
  "rawScene": "灰阶原图 (Raw Scene)",
  "notanOutput": "二值显影 (Notan Output)",
  "settings": {
    "showToleranceBandTitle": "显示滑块容错感应区",
    "showToleranceBandDesc": "在悬停光标两侧实时显示动态容错区间"
  }
}
~~~~~

~~~~~act
write_file
src/cards/abs_notan_threshold/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Notan Value Thresholding",
  "desc": "Modulate the binarization cutoff threshold to extract solid Notan value groupings.",
  "instruction": "Adjust the threshold slider to find the most balanced Notan state.",
  "badge": "Notan Threshold",
  "hint": "Observe the raw scene on the left, then adjust the Notan threshold slider below",
  "label": "Binarization Threshold:",
  "rawScene": "Raw Grayscale Scene",
  "notanOutput": "Notan Output",
  "settings": {
    "showToleranceBandTitle": "Show Slider Tolerance Band",
    "showToleranceBandDesc": "Display dynamic tolerance interval around the hover cursor"
  }
}
~~~~~

~~~~~act
write_file
src/cards/abs_notan_threshold/utils/generator.ts
~~~~~
~~~~~typescript
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import { calculateOtsuThreshold, createNoise2D, fbm2D } from '../../../core/math/noiseUtils';
import type { HitResult, QuestionData } from '../types';

export const CANVAS_SIZE = 260;

export function drawRawGrayscaleNoiseField(
  canvas: HTMLCanvasElement | null,
  buffer?: number[],
  dim = 120,
  size = CANVAS_SIZE,
) {
  if (!canvas || !buffer) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const offscreen = document.createElement('canvas');
  offscreen.width = dim;
  offscreen.height = dim;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  const imgData = offCtx.createImageData(dim, dim);
  const pixels = imgData.data;

  for (let i = 0; i < buffer.length; i++) {
    const val = buffer[i];
    const pIdx = i * 4;
    pixels[pIdx] = val;
    pixels[pIdx + 1] = val;
    pixels[pIdx + 2] = val;
    pixels[pIdx + 3] = 255;
  }
  offCtx.putImageData(imgData, 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(offscreen, 0, 0, size, size);
}

export function drawNotanNoiseField(
  canvas: HTMLCanvasElement | null,
  buffer?: number[],
  dim = 120,
  thresholdPercent = 50,
  size = CANVAS_SIZE,
) {
  if (!canvas || !buffer) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const thresholdByte = Math.round((thresholdPercent / 100) * 255);

  const offscreen = document.createElement('canvas');
  offscreen.width = dim;
  offscreen.height = dim;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  const imgData = offCtx.createImageData(dim, dim);
  const pixels = imgData.data;

  for (let i = 0; i < buffer.length; i++) {
    const isDark = buffer[i] <= thresholdByte;
    const color = isDark ? 15 : 248;
    const pIdx = i * 4;
    pixels[pIdx] = color;
    pixels[pIdx + 1] = color === 15 ? 23 : 250;
    pixels[pIdx + 2] = color === 15 ? 42 : 252;
    pixels[pIdx + 3] = 255;
  }
  offCtx.putImageData(imgData, 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(offscreen, 0, 0, size, size);
}

export function generateQuestion(level: number): QuestionData {
  const id = `abs_nt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34;

  const fieldDim = 120;
  const buffer = new Uint8Array(fieldDim * fieldDim);

  const macroNoise = createNoise2D(Math.random());
  const microNoise = createNoise2D(Math.random());

  const keyType = Math.random();
  const baseKey =
    keyType < 0.35
      ? 22 + Math.random() * 14
      : keyType < 0.7
        ? 64 + Math.random() * 14
        : 44 + Math.random() * 12;

  const macroScale = 0.012 + Math.random() * 0.008;
  const macroAmp = 42 + Math.random() * 10;

  const microScale = 0.08 + Math.random() * 0.04;
  const microAmp = 10 + t * 38;

  for (let y = 0; y < fieldDim; y++) {
    for (let x = 0; x < fieldDim; x++) {
      const idx = y * fieldDim + x;
      const macroVal =
        (fbm2D(x * macroScale, y * macroScale, 2, macroNoise) - 0.5) * 2 * macroAmp;
      const microVal =
        (fbm2D(x * microScale, y * microScale, 3, microNoise) - 0.5) * 2 * microAmp;

      const raw = baseKey + macroVal + microVal;
      const clamped0to100 = Math.max(0, Math.min(100, raw));
      buffer[idx] = Math.round((clamped0to100 / 100) * 255);
    }
  }

  const otsuByte = calculateOtsuThreshold(buffer);
  const idealNotanThreshold = Math.round((otsuByte / 255) * 100);
  const tolerance = Math.round(expDecayInterpolate(10.0, 2.0, clampedLevel) * 10) / 10;

  return {
    id,
    difficultyLevel: clampedLevel,
    notanBuffer: Array.from(buffer),
    notanFieldDim: fieldDim,
    idealNotanThreshold,
    tolerance,
  };
}

export function checkHit(userVal: number, question: QuestionData): HitResult {
  const targetVal = question.idealNotanThreshold;
  const errorVal = Math.round(Math.abs(userVal - targetVal) * 10) / 10;
  const isHit = errorVal <= question.tolerance;

  return {
    isHit,
    userValue: userVal,
    targetValue: targetVal,
    errorValue: errorVal,
    tolerance: question.tolerance,
  };
}
~~~~~

~~~~~act
write_file
src/cards/abs_notan_threshold/AbsNotanThresholdView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { CanvasView } from '../../components/common/CanvasView';
import { DualViewportContainer } from '../../components/common/DualViewportContainer';
import { StandardSliderView } from '../../components/common/StandardSliderView';
import { useTranslation } from '../../core/i18n';
import type { HitResult, QuestionData } from './types';
import {
  CANVAS_SIZE,
  drawNotanNoiseField,
  drawRawGrayscaleNoiseField,
} from './utils/generator';

export interface AbsNotanThresholdViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function AbsNotanThresholdView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showCanvasHints = true,
}: AbsNotanThresholdViewProps) {
  const { t } = useTranslation();
  const [activeVal, setActiveVal] = useState<number>(50);

  const targetVal = question.idealNotanThreshold;

  return (
    <StandardSliderView
      questionId={question.id}
      hintText={t('cards.abs_notan_threshold.hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      label={t('cards.abs_notan_threshold.label')}
      max={100}
      step={0.5}
      initialValue={50}
      unit="%"
      targetValue={targetVal}
      showAnswer={showAnswer}
      isHit={Boolean(userAnswer?.isHit)}
      userValue={userAnswer?.userValue}
      disabled={disabled}
      hitMargin={hitMargin}
      submitMode="commit_on_release"
      onValueChange={(_val, active) => setActiveVal(active)}
      onAnswer={onAnswer}
      preview={
        <DualViewportContainer
          leftTitle={t('cards.abs_notan_threshold.rawScene')}
          rightTitle={t('cards.abs_notan_threshold.notanOutput')}
          leftContent={
            <div className="w-full flex justify-center bg-muted/60 p-2.5 rounded-2xl border border-border shadow-inner">
              <CanvasView
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="w-full max-w-[240px] aspect-square rounded-xl shadow-sm border border-border bg-card"
                draw={(canvas) => {
                  if (question.notanBuffer) {
                    drawRawGrayscaleNoiseField(
                      canvas,
                      question.notanBuffer,
                      question.notanFieldDim ?? 120,
                      CANVAS_SIZE,
                    );
                  }
                }}
                deps={[question.notanBuffer, question.notanFieldDim]}
              />
            </div>
          }
          rightContent={
            <div className="w-full flex justify-center bg-muted/60 p-2.5 rounded-2xl border border-border shadow-inner">
              <CanvasView
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="w-full max-w-[240px] aspect-square rounded-xl shadow-sm border border-border bg-card"
                draw={(canvas) => {
                  if (question.notanBuffer) {
                    drawNotanNoiseField(
                      canvas,
                      question.notanBuffer,
                      question.notanFieldDim ?? 120,
                      showAnswer ? targetVal : activeVal,
                      CANVAS_SIZE,
                    );
                  }
                }}
                deps={[
                  question.notanBuffer,
                  question.notanFieldDim,
                  targetVal,
                  activeVal,
                  showAnswer,
                ]}
              />
            </div>
          }
        />
      }
    />
  );
}
~~~~~

~~~~~act
write_file
src/cards/abs_notan_threshold/index.tsx
~~~~~
~~~~~typescript
import { Sun } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import { AbsNotanThresholdView } from './AbsNotanThresholdView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const absNotanThresholdCard: CardManifest<QuestionData, HitResult, number, BaseModuleSettings> = {
  id: 'abs_notan_threshold',
  domain: 'rhythm_and_notan',
  icon: Sun,
  tags: {
    domain: ['rhythm_and_notan'],
    path: ['extraction'],
    challenge: ['figure_ground_reversal'],
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
      targetValue: q.idealNotanThreshold,
      errorValue: hitResult.errorValue,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsNotanThresholdView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        hitMargin={settings.sliderHitMargin as number}
        showToleranceBand={settings.showToleranceBand as boolean}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
  },
};

export default absNotanThresholdCard;
~~~~~

#### Acts 4: 创建 `abs_palette_clustering` 卡片（主调色群提炼）

~~~~~act
write_file
src/cards/abs_palette_clustering/types.ts
~~~~~
~~~~~typescript
export interface PaletteTile {
  x: number;
  y: number;
  w: number;
  h: number;
  hsv: [number, number, number];
  weight: number;
}

export interface QuestionData {
  id: string;
  difficultyLevel: number;
  paletteTiles: PaletteTile[];
  dominantColorHsv: [number, number, number];
  paletteOptions: [number, number, number][];
  correctPaletteIndex: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userChoiceIndex: number;
  correctIndex: number;
  errorValue: number;
  tolerance: number;
}
~~~~~

~~~~~act
write_file
src/cards/abs_palette_clustering/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "主调色群提炼",
  "desc": "穿透多色拼贴马赛克的混色噪点，四选一提炼出面积加权下的加权质心主色。",
  "instruction": "在下方 4 个候选项中，选出代表画面全局主调的加权主色",
  "badge": "主调色群提炼",
  "hint": "选出最能代表全局主调的加权主色 (键 1-4)"
}
~~~~~

~~~~~act
write_file
src/cards/abs_palette_clustering/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Dominant Color Clustering",
  "desc": "Pierce mosaic noise to identify the area-weighted dominant centroid color (4AFC).",
  "instruction": "Select the dominant color that represents the overall scene palette.",
  "badge": "Color Clustering",
  "hint": "Select the dominant color representing the overall palette (Keys 1-4)"
}
~~~~~

~~~~~act
write_file
src/cards/abs_palette_clustering/utils/generator.ts
~~~~~
~~~~~typescript
import { setup2DCanvas } from '../../../core/canvas/hidpi';
import { hsvToHex } from '../../../core/color/colorUtils';
import {
  generateTetrahedralDistractors,
  getDistractorDistanceForLevel,
  hsvToOkLab,
} from '../../../core/color/oklchUtils';
import { createShuffledChoices } from '../../../core/math/mathUtils';
import { CANVAS_THEME, hexToRgba } from '../../../utils/theme';
import type { HitResult, PaletteTile, QuestionData } from '../types';

export const CANVAS_SIZE = 400;

export function drawPaletteTilesCanvas(
  canvas: HTMLCanvasElement | null,
  tiles?: PaletteTile[],
  size = CANVAS_SIZE,
) {
  if (!tiles) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  for (const t of tiles) {
    ctx.fillStyle = hsvToHex(...t.hsv);
    ctx.fillRect(t.x, t.y, t.w, t.h);
    ctx.strokeStyle = hexToRgba(CANVAS_THEME.bg.primary, 0.4);
    ctx.strokeRect(t.x, t.y, t.w, t.h);
  }
}

export function generateQuestion(level: number): QuestionData {
  const id = `abs_pc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  const baseH = Math.floor(Math.random() * 360);
  const baseS = Math.floor(Math.random() * 40) + 40;
  const baseV = Math.floor(Math.random() * 40) + 40;

  const dominantColorHsv: [number, number, number] = [baseH, baseS, baseV];
  const paletteTiles: PaletteTile[] = [];
  const gridSize = 4;
  const tileSize = CANVAS_SIZE / gridSize;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const jitterH = (baseH + (Math.floor(Math.random() * 40) - 20) + 360) % 360;
      const jitterS = Math.max(10, Math.min(100, baseS + (Math.floor(Math.random() * 30) - 15)));
      const jitterV = Math.max(15, Math.min(100, baseV + (Math.floor(Math.random() * 30) - 15)));
      paletteTiles.push({
        x: c * tileSize,
        y: r * tileSize,
        w: tileSize,
        h: tileSize,
        hsv: [jitterH, jitterS, jitterV],
        weight: 1,
      });
    }
  }

  const distractorDeltaE = getDistractorDistanceForLevel(clampedLevel);
  const labDom = hsvToOkLab(...dominantColorHsv);
  const distractors = generateTetrahedralDistractors(labDom, distractorDeltaE);
  const { options: paletteOptions, correctIndex: correctPaletteIndex } = createShuffledChoices(
    dominantColorHsv,
    distractors,
  );

  return {
    id,
    difficultyLevel: clampedLevel,
    paletteTiles,
    dominantColorHsv,
    paletteOptions,
    correctPaletteIndex,
    tolerance: distractorDeltaE,
  };
}

export function checkHit(userChoiceIndex: number, question: QuestionData): HitResult {
  const isHit = userChoiceIndex === question.correctPaletteIndex;
  return {
    isHit,
    userChoiceIndex,
    correctIndex: question.correctPaletteIndex,
    errorValue: isHit ? 0 : 1,
    tolerance: question.tolerance,
  };
}
~~~~~

~~~~~act
write_file
src/cards/abs_palette_clustering/AbsPaletteClusteringView.tsx
~~~~~
~~~~~typescript
import { Sparkles } from 'lucide-preact';
import { CanvasView } from '../../components/common/CanvasView';
import { StandardNafcView } from '../../components/common/StandardNafcView';
import { hsvToHex } from '../../core/color/colorUtils';
import { useTranslation } from '../../core/i18n';
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE, drawPaletteTilesCanvas } from './utils/generator';

export interface AbsPaletteClusteringViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (idx: number) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AbsPaletteClusteringView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsPaletteClusteringViewProps) {
  const { t } = useTranslation();

  const nafcOptions = (question.paletteOptions || []).map((hsv, idx) => {
    const hex = hsvToHex(...hsv);
    const isTarget = idx === question.correctPaletteIndex;
    return {
      key: `palette-opt-${idx}-${hex}`,
      value: idx,
      isCorrect: isTarget,
      content: (
        <div
          className="w-full aspect-square rounded-xl shadow-inner border border-white/60"
          style={{ backgroundColor: hex }}
        />
      ),
    };
  });

  return (
    <StandardNafcView
      questionId={question.id}
      hintText={t('cards.abs_palette_clustering.hint')}
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      columns={4}
      options={nafcOptions}
      showAnswer={showAnswer}
      disabled={disabled}
      submitMode="immediate"
      onAnswer={(idx) => onAnswer(idx)}
      preview={
        <div className="bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex justify-center items-center">
          <CanvasView
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card"
            draw={(canvas) =>
              drawPaletteTilesCanvas(canvas, question.paletteTiles, CANVAS_SIZE)
            }
            deps={[question.paletteTiles]}
          />
        </div>
      }
    />
  );
}
~~~~~

~~~~~act
write_file
src/cards/abs_palette_clustering/index.tsx
~~~~~
~~~~~typescript
import { Palette } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import { AbsPaletteClusteringView } from './AbsPaletteClusteringView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const absPaletteClusteringCard: CardManifest<QuestionData, HitResult, number, BaseModuleSettings> = {
  id: 'abs_palette_clustering',
  domain: 'color_and_value',
  icon: Palette,
  tags: {
    domain: ['color_and_value'],
    path: ['extraction'],
    interaction: ['multi_choice'],
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
      userAnswer: userVal,
      correctIndex: q.correctPaletteIndex,
      errorValue: hitResult.errorValue,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsPaletteClusteringView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
  },
};

export default absPaletteClusteringCard;
~~~~~

#### Acts 5: 创建 `abs_td_gesture_2afc` 卡片（动态势线寻源）

~~~~~act
write_file
src/cards/abs_td_gesture_2afc/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export interface QuestionData {
  id: string;
  difficultyLevel: number;
  promptSpine: Point[];
  particlesA: Point[];
  particlesB: Point[];
  correctParticleChoice: 'A' | 'B';
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userChoice: 'A' | 'B';
  correctChoice: 'A' | 'B';
  errorValue: number;
  tolerance: number;
}
~~~~~

~~~~~act
write_file
src/cards/abs_td_gesture_2afc/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "动态势线寻源",
  "desc": "给定抽象势线骨架，在两幅复杂点阵中透视判别谁长在该动势中 (2AFC)。",
  "instruction": "观察上方提炼的势线骨架，判别哪侧复杂点阵符合该动势",
  "badge": "动态势线寻源",
  "hint": "判别哪一侧具象细节符合上方骨架",
  "promptTitle": "概括基准 (Prompt)"
}
~~~~~

~~~~~act
write_file
src/cards/abs_td_gesture_2afc/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Top-Down Gesture Match",
  "desc": "Given an abstract spine, identify which complex particle field follows that dynamic.",
  "instruction": "Identify which particle field conforms to the prompt spine (Keys 1 / 2).",
  "badge": "Top-Down Gesture",
  "hint": "Identify which detailed field conforms to the prompt spine above",
  "promptTitle": "Prompt Spine"
}
~~~~~

~~~~~act
write_file
src/cards/abs_td_gesture_2afc/utils/generator.ts
~~~~~
~~~~~typescript
import { setup2DCanvas } from '../../../core/canvas/hidpi';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';
import type { HitResult, QuestionData } from '../types';

export const THUMB_SIZE = 160;
export const OPTION_SIZE = 260;

export function drawSpinePromptCanvas(
  canvas: HTMLCanvasElement | null,
  spine?: Point[],
  size = THUMB_SIZE,
) {
  if (!spine || spine.length < 2) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  const [p1, p2] = spine;
  ctx.strokeStyle = CANVAS_THEME.status.accent;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  ctx.fillStyle = CANVAS_THEME.status.accent;
  ctx.beginPath();
  ctx.arc(p1.x, p1.y, 4, 0, Math.PI * 2);
  ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
  ctx.fill();
}

export function drawParticlesCanvas(
  canvas: HTMLCanvasElement | null,
  particles?: Point[],
  size = OPTION_SIZE,
) {
  if (!particles) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = CANVAS_THEME.shape.fill;
    ctx.fill();
  }
}

export function generateFlowParticlesWithClutter(
  angleDeg: number,
  spreadRatio: number,
  clutterRatio = 0,
  size = OPTION_SIZE,
): Point[] {
  const rad = (angleDeg * Math.PI) / 180;
  const count = 45 + Math.floor(Math.random() * 20);
  const cx = size / 2;
  const cy = size / 2;
  const majorLen = size * 0.38;
  const minorLen = majorLen * spreadRatio;

  const points: Point[] = [];
  const clutterCount = Math.floor(count * clutterRatio);
  const flowCount = count - clutterCount;

  for (let i = 0; i < flowCount; i++) {
    const u = (Math.random() * 2 - 1) * majorLen;
    const v = (Math.random() * 2 - 1) * minorLen;

    const x = Math.round(cx + u * Math.cos(rad) - v * Math.sin(rad));
    const y = Math.round(cy + u * Math.sin(rad) + v * Math.cos(rad));
    points.push({
      x: Math.max(15, Math.min(size - 15, x)),
      y: Math.max(15, Math.min(size - 15, y)),
    });
  }

  for (let i = 0; i < clutterCount; i++) {
    const r = Math.sqrt(Math.random()) * majorLen * 0.95;
    const theta = Math.random() * Math.PI * 2;
    const x = Math.round(cx + r * Math.cos(theta));
    const y = Math.round(cy + r * Math.sin(theta));
    points.push({
      x: Math.max(15, Math.min(size - 15, x)),
      y: Math.max(15, Math.min(size - 15, y)),
    });
  }

  return points;
}

export function generateQuestion(level: number): QuestionData {
  const id = `abs_tdg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34;

  const targetAngle = Math.floor(Math.random() * 180);
  const angleDelta = expDecayInterpolate(36.0, 4.0, clampedLevel);
  const sign = Math.random() < 0.5 ? 1 : -1;
  const distractorAngle = (targetAngle + sign * angleDelta + 180) % 180;

  const rad = (targetAngle * Math.PI) / 180;
  const L = THUMB_SIZE * 0.36;
  const cx = THUMB_SIZE / 2;
  const cy = THUMB_SIZE / 2;
  const promptSpine: Point[] = [
    { x: cx - L * Math.cos(rad), y: cy - L * Math.sin(rad) },
    { x: cx + L * Math.cos(rad), y: cy + L * Math.sin(rad) },
  ];

  const spreadRatio = 0.18 + t * 0.38;
  const clutterRatio = t * 0.28;

  const partA = generateFlowParticlesWithClutter(
    targetAngle,
    spreadRatio,
    clutterRatio,
    OPTION_SIZE,
  );
  const partB = generateFlowParticlesWithClutter(
    distractorAngle,
    spreadRatio,
    clutterRatio,
    OPTION_SIZE,
  );

  const isA = Math.random() < 0.5;
  return {
    id,
    difficultyLevel: clampedLevel,
    promptSpine,
    particlesA: isA ? partA : partB,
    particlesB: isA ? partB : partA,
    correctParticleChoice: isA ? 'A' : 'B',
    tolerance: 0,
  };
}

export function checkHit(userChoice: 'A' | 'B', question: QuestionData): HitResult {
  const isHit = userChoice === question.correctParticleChoice;
  return {
    isHit,
    userChoice,
    correctChoice: question.correctParticleChoice,
    errorValue: isHit ? 0 : 1,
    tolerance: 0,
  };
}
~~~~~

~~~~~act
write_file
src/cards/abs_td_gesture_2afc/AbsTdGesture2afcView.tsx
~~~~~
~~~~~typescript
import { Columns } from 'lucide-preact';
import { CanvasView } from '../../components/common/CanvasView';
import { Standard2AfcView } from '../../components/common/Standard2AfcView';
import { useTranslation } from '../../core/i18n';
import type { HitResult, QuestionData } from './types';
import {
  OPTION_SIZE,
  THUMB_SIZE,
  drawParticlesCanvas,
  drawSpinePromptCanvas,
} from './utils/generator';

const CANVAS_OPTION_CLASS =
  'w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block';

export interface AbsTdGesture2afcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AbsTdGesture2afcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsTdGesture2afcViewProps) {
  const { t } = useTranslation();

  const isTargetA = question.correctParticleChoice === 'A';
  const isTargetB = !isTargetA;

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('cards.abs_td_gesture_2afc.hint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      prompt={
        <div className="flex flex-col items-center gap-2 bg-muted/60 p-3 rounded-2xl border border-border shadow-inner w-full max-w-[250px] sm:max-w-[270px] mx-auto">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t('cards.abs_td_gesture_2afc.promptTitle')}
          </span>
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={THUMB_SIZE}
              height={THUMB_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawSpinePromptCanvas(canvas, question.promptSpine, THUMB_SIZE)
              }
              deps={[question.promptSpine]}
            />
          </div>
        </div>
      }
      optionA={{
        title: `${t('common.areaA')} (${t('common.optionA')})`,
        isCorrect: isTargetA,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) => drawParticlesCanvas(canvas, question.particlesA, OPTION_SIZE)}
              deps={[question.particlesA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: `${t('common.areaB')} (${t('common.optionB')})`,
        isCorrect: isTargetB,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) => drawParticlesCanvas(canvas, question.particlesB, OPTION_SIZE)}
              deps={[question.particlesB]}
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
src/cards/abs_td_gesture_2afc/index.tsx
~~~~~
~~~~~typescript
import { Shuffle } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import { AbsTdGesture2afcView } from './AbsTdGesture2afcView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const absTdGesture2afcCard: CardManifest<QuestionData, HitResult, 'A' | 'B', BaseModuleSettings> = {
  id: 'abs_td_gesture_2afc',
  domain: 'rhythm_and_notan',
  icon: Shuffle,
  tags: {
    domain: ['rhythm_and_notan'],
    path: ['concretization'],
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
      userAnswer: userVal,
      correctChoice: q.correctParticleChoice,
      errorValue: hitResult.errorValue,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsTdGesture2afcView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
  },
};

export default absTdGesture2afcCard;
~~~~~

#### Acts 6: 创建 `abs_td_hull_2afc` 卡片（几何大模寻形）

~~~~~act
write_file
src/cards/abs_td_hull_2afc/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export interface QuestionData {
  id: string;
  difficultyLevel: number;
  promptHull: Point[];
  hullDetailedA: Point[];
  hullDetailedB: Point[];
  correctHullChoice: 'A' | 'B';
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userChoice: 'A' | 'B';
  correctChoice: 'A' | 'B';
  errorValue: number;
  tolerance: number;
}
~~~~~

~~~~~act
write_file
src/cards/abs_td_hull_2afc/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "几何大模寻形",
  "desc": "给定极简低模多边形，在两个高细碎剪影中二选一辨识其具象原形 (2AFC)。",
  "instruction": "观察上方极简低模外壳，二选一辨识哪侧剪影符合该大形",
  "badge": "几何大模寻形",
  "hint": "判别哪一侧具象细节符合上方骨架",
  "promptTitle": "概括基准 (Prompt)"
}
~~~~~

~~~~~act
write_file
src/cards/abs_td_hull_2afc/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Top-Down Hull Match",
  "desc": "Given a minimalist convex hull, match its detailed organic silhouette.",
  "instruction": "Identify which detailed silhouette conforms to the prompt hull (Keys 1 / 2).",
  "badge": "Top-Down Hull",
  "hint": "Identify which detailed silhouette conforms to the prompt hull above",
  "promptTitle": "Prompt Low-Poly Hull"
}
~~~~~

~~~~~act
write_file
src/cards/abs_td_hull_2afc/utils/generator.ts
~~~~~
~~~~~typescript
import type { Point } from '../../../types';
import type { HitResult, QuestionData } from '../types';

export const THUMB_SIZE = 160;
export const OPTION_SIZE = 260;

export function fractalizePolygon(
  basePolygon: Point[],
  detailLevel: number,
  noiseFactor: number,
): Point[] {
  let currentPoints = [...basePolygon];

  for (let iter = 0; iter < detailLevel; iter++) {
    const nextPoints: Point[] = [];
    for (let i = 0; i < currentPoints.length; i++) {
      const p1 = currentPoints[i];
      const p2 = currentPoints[(i + 1) % currentPoints.length];

      nextPoints.push(p1);

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) continue;

      const nx = -dy / len;
      const ny = dx / len;

      const displacement = (Math.random() * 2 - 1) * noiseFactor * (len * 0.3);
      nextPoints.push({
        x: Math.round(midX + nx * displacement),
        y: Math.round(midY + ny * displacement),
      });
    }
    currentPoints = nextPoints;
  }
  return currentPoints;
}

export function generateDetailedPolygon(verticesCount: number, size = THUMB_SIZE): Point[] {
  const cx = size / 2;
  const cy = size / 2;
  const baseR = size * 0.32;
  const angles: number[] = [];
  const step = (Math.PI * 2) / verticesCount;

  for (let i = 0; i < verticesCount; i++) {
    angles.push(i * step + (Math.random() - 0.5) * step * 0.65);
  }
  angles.sort((a, b) => a - b);

  return angles.map((a) => {
    const r = baseR * (0.65 + Math.random() * 0.65);
    return {
      x: Math.round(cx + r * Math.cos(a)),
      y: Math.round(cy + r * Math.sin(a)),
    };
  });
}

export function generateAdversarialDistractorHull(
  targetHull: Point[],
  level: number,
  size = OPTION_SIZE,
): Point[] {
  const t = (Math.max(1, Math.min(35, level)) - 1) / 34;
  const n = targetHull.length;
  const distractor: Point[] = targetHull.map((p) => ({ ...p }));
  const cx = size / 2;
  const cy = size / 2;

  const mutationType = Math.random();

  if (mutationType < 0.35 && n > 4) {
    const idx = Math.floor(Math.random() * n);
    const prev = targetHull[(idx - 1 + n) % n];
    const next = targetHull[(idx + 1) % n];
    distractor[idx] = {
      x: Math.round((prev.x + next.x) / 2),
      y: Math.round((prev.y + next.y) / 2),
    };
  } else {
    const mutateCount = t > 0.6 && Math.random() < 0.5 ? 2 : 1;
    const chosenIndices = new Set<number>();
    while (chosenIndices.size < mutateCount) {
      chosenIndices.add(Math.floor(Math.random() * n));
    }

    const shiftMag = 14 + (1 - t) * 26;

    for (const idx of chosenIndices) {
      const p = targetHull[idx];
      const angleFromCenter = Math.atan2(p.y - cy, p.x - cx);
      const angle = angleFromCenter + (Math.random() - 0.5) * (Math.PI * 0.8);

      distractor[idx] = {
        x: Math.max(10, Math.min(size - 10, Math.round(p.x + Math.cos(angle) * shiftMag))),
        y: Math.max(10, Math.min(size - 10, Math.round(p.y + Math.sin(angle) * shiftMag))),
      };
    }
  }

  return distractor;
}

export function generateQuestion(level: number): QuestionData {
  const id = `abs_tdh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34;

  const minVerts = 4 + Math.floor(t * 2);
  const maxVerts = 5 + Math.floor(t * 4);
  const vertCount = Math.floor(Math.random() * (maxVerts - minVerts + 1)) + minVerts;

  const promptHull = generateDetailedPolygon(vertCount, THUMB_SIZE);
  const scale = OPTION_SIZE / THUMB_SIZE;

  const targetBase = promptHull.map((p) => ({
    x: Math.round(p.x * scale),
    y: Math.round(p.y * scale),
  }));

  const distractorBase = generateAdversarialDistractorHull(
    targetBase,
    clampedLevel,
    OPTION_SIZE,
  );

  const noiseFactor = 0.45 + t * 0.85;
  const targetDetailed = fractalizePolygon(targetBase, 2, noiseFactor);
  const distractorDetailed = fractalizePolygon(distractorBase, 2, noiseFactor);

  const isA = Math.random() < 0.5;

  return {
    id,
    difficultyLevel: clampedLevel,
    promptHull,
    hullDetailedA: isA ? targetDetailed : distractorDetailed,
    hullDetailedB: isA ? distractorDetailed : targetDetailed,
    correctHullChoice: isA ? 'A' : 'B',
    tolerance: 0,
  };
}

export function checkHit(userChoice: 'A' | 'B', question: QuestionData): HitResult {
  const isHit = userChoice === question.correctHullChoice;
  return {
    isHit,
    userChoice,
    correctChoice: question.correctHullChoice,
    errorValue: isHit ? 0 : 1,
    tolerance: 0,
  };
}
~~~~~

~~~~~act
write_file
src/cards/abs_td_hull_2afc/AbsTdHull2afcView.tsx
~~~~~
~~~~~typescript
import { Columns } from 'lucide-preact';
import { CanvasView } from '../../components/common/CanvasView';
import { Standard2AfcView } from '../../components/common/Standard2AfcView';
import { drawPolygonCanvas } from '../../core/canvas/drawPolygon';
import { useTranslation } from '../../core/i18n';
import { CANVAS_THEME } from '../../utils/theme';
import type { HitResult, QuestionData } from './types';
import { OPTION_SIZE, THUMB_SIZE } from './utils/generator';

const CANVAS_OPTION_CLASS =
  'w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block';

export interface AbsTdHull2afcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AbsTdHull2afcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsTdHull2afcViewProps) {
  const { t } = useTranslation();

  const isTargetA = question.correctHullChoice === 'A';
  const isTargetB = !isTargetA;

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('cards.abs_td_hull_2afc.hint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      prompt={
        <div className="flex flex-col items-center gap-2 bg-muted/60 p-3 rounded-2xl border border-border shadow-inner w-full max-w-[250px] sm:max-w-[270px] mx-auto">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t('cards.abs_td_hull_2afc.promptTitle')}
          </span>
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={THUMB_SIZE}
              height={THUMB_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.promptHull,
                  size: THUMB_SIZE,
                  fillColor: CANVAS_THEME.status.accent,
                  strokeColor: CANVAS_THEME.status.accentDark,
                })
              }
              deps={[question.promptHull]}
            />
          </div>
        </div>
      }
      optionA={{
        title: `${t('common.areaA')} (${t('common.optionA')})`,
        isCorrect: isTargetA,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.hullDetailedA,
                  size: OPTION_SIZE,
                })
              }
              deps={[question.hullDetailedA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: `${t('common.areaB')} (${t('common.optionB')})`,
        isCorrect: isTargetB,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.hullDetailedB,
                  size: OPTION_SIZE,
                })
              }
              deps={[question.hullDetailedB]}
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
src/cards/abs_td_hull_2afc/index.tsx
~~~~~
~~~~~typescript
import { Columns } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import { AbsTdHull2afcView } from './AbsTdHull2afcView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const absTdHull2afcCard: CardManifest<QuestionData, HitResult, 'A' | 'B', BaseModuleSettings> = {
  id: 'abs_td_hull_2afc',
  domain: 'form_and_proportion',
  icon: Columns,
  tags: {
    domain: ['form_and_proportion'],
    path: ['concretization'],
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
      userAnswer: userVal,
      correctChoice: q.correctHullChoice,
      errorValue: hitResult.errorValue,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsTdHull2afcView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
  },
};

export default absTdHull2afcCard;
~~~~~

#### Acts 7: 创建 `abs_td_notan_2afc` 卡片（黑白素描骨架）

~~~~~act
write_file
src/cards/abs_td_notan_2afc/types.ts
~~~~~
~~~~~typescript
export interface QuestionData {
  id: string;
  difficultyLevel: number;
  promptNotanBuffer: number[];
  notanSceneBufferA: number[];
  notanSceneBufferB: number[];
  notanFieldDim: number;
  correctNotanChoice: 'A' | 'B';
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userChoice: 'A' | 'B';
  correctChoice: 'A' | 'B';
  errorValue: number;
  tolerance: number;
}
~~~~~

~~~~~act
write_file
src/cards/abs_td_notan_2afc/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "黑白素描骨架",
  "desc": "给定二值 Notan 剪影，透视辨识哪幅丰富灰阶素描拥有该黑白大结构 (2AFC)。",
  "instruction": "观察上方 Notan 剪影，判别哪侧复杂画面拥有该黑白大结构",
  "badge": "黑白素描骨架",
  "hint": "判别哪一侧具象细节符合上方骨架",
  "promptTitle": "概括基准 (Prompt)"
}
~~~~~

~~~~~act
write_file
src/cards/abs_td_notan_2afc/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Top-Down Notan Match",
  "desc": "Given a binary Notan silhouette, match the grayscale scene with that value foundation.",
  "instruction": "Identify which grayscale scene shares this Notan foundation (Keys 1 / 2).",
  "badge": "Top-Down Notan",
  "hint": "Identify which grayscale scene shares the Notan foundation above",
  "promptTitle": "Prompt Notan Silhouette"
}
~~~~~

~~~~~act
write_file
src/cards/abs_td_notan_2afc/utils/generator.ts
~~~~~
~~~~~typescript
import { calculateOtsuThreshold, createNoise2D, fbm2D } from '../../../core/math/noiseUtils';
import type { HitResult, QuestionData } from '../types';

export const THUMB_SIZE = 160;
export const OPTION_SIZE = 260;

export function drawRawGrayscaleNoiseField(
  canvas: HTMLCanvasElement | null,
  buffer?: number[],
  dim = 120,
  size = OPTION_SIZE,
) {
  if (!canvas || !buffer) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const offscreen = document.createElement('canvas');
  offscreen.width = dim;
  offscreen.height = dim;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  const imgData = offCtx.createImageData(dim, dim);
  const pixels = imgData.data;

  for (let i = 0; i < buffer.length; i++) {
    const val = buffer[i];
    const pIdx = i * 4;
    pixels[pIdx] = val;
    pixels[pIdx + 1] = val;
    pixels[pIdx + 2] = val;
    pixels[pIdx + 3] = 255;
  }
  offCtx.putImageData(imgData, 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(offscreen, 0, 0, size, size);
}

export function generateQuestion(level: number): QuestionData {
  const id = `abs_tdn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34;

  const fieldDim = 120;
  const totalPixels = fieldDim * fieldDim;

  const targetMacroNoise = createNoise2D(Math.random());
  const distractorMacroNoise = createNoise2D(Math.random() + 100);
  const microNoise = createNoise2D(Math.random() + 200);

  const keyType = Math.random();
  const baseKey =
    keyType < 0.35
      ? 24 + Math.random() * 12
      : keyType < 0.7
        ? 64 + Math.random() * 12
        : 45 + Math.random() * 10;

  const macroScale = 0.012 + Math.random() * 0.008;
  const macroAmp = 42 + Math.random() * 10;
  const microScale = 0.08 + Math.random() * 0.04;
  const microAmp = 10 + t * 38;

  const macroSimilarityWeight = t * 0.68;
  const blendNorm = Math.sqrt((1 - macroSimilarityWeight) ** 2 + macroSimilarityWeight ** 2);

  const targetMacroBuffer = new Uint8Array(totalPixels);
  const targetSceneBuffer = new Uint8Array(totalPixels);
  const distractorSceneBuffer = new Uint8Array(totalPixels);

  for (let y = 0; y < fieldDim; y++) {
    for (let x = 0; x < fieldDim; x++) {
      const idx = y * fieldDim + x;
      const targetMacroVal =
        (fbm2D(x * macroScale, y * macroScale, 2, targetMacroNoise) - 0.5) * 2 * macroAmp;
      const rawIndependentDistractorVal =
        (fbm2D(x * macroScale, y * macroScale, 2, distractorMacroNoise) - 0.5) * 2 * macroAmp;

      const distractorMacroVal =
        ((1 - macroSimilarityWeight) * rawIndependentDistractorVal +
          macroSimilarityWeight * targetMacroVal) /
        blendNorm;

      const microVal =
        (fbm2D(x * microScale, y * microScale, 3, microNoise) - 0.5) * 2 * microAmp;

      const macroRaw = Math.max(0, Math.min(100, baseKey + targetMacroVal));
      targetMacroBuffer[idx] = Math.round((macroRaw / 100) * 255);

      const targetSceneRaw = Math.max(0, Math.min(100, baseKey + targetMacroVal + microVal));
      targetSceneBuffer[idx] = Math.round((targetSceneRaw / 100) * 255);

      const distractorSceneRaw = Math.max(
        0,
        Math.min(100, baseKey + distractorMacroVal + microVal),
      );
      distractorSceneBuffer[idx] = Math.round((distractorSceneRaw / 100) * 255);
    }
  }

  const otsuByte = calculateOtsuThreshold(targetMacroBuffer);
  const promptBuffer = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    promptBuffer[i] = targetMacroBuffer[i] <= otsuByte ? 15 : 248;
  }

  const isA = Math.random() < 0.5;
  return {
    id,
    difficultyLevel: clampedLevel,
    promptNotanBuffer: Array.from(promptBuffer),
    notanSceneBufferA: isA ? Array.from(targetSceneBuffer) : Array.from(distractorSceneBuffer),
    notanSceneBufferB: isA ? Array.from(distractorSceneBuffer) : Array.from(targetSceneBuffer),
    notanFieldDim: fieldDim,
    correctNotanChoice: isA ? 'A' : 'B',
    tolerance: 0,
  };
}

export function checkHit(userChoice: 'A' | 'B', question: QuestionData): HitResult {
  const isHit = userChoice === question.correctNotanChoice;
  return {
    isHit,
    userChoice,
    correctChoice: question.correctNotanChoice,
    errorValue: isHit ? 0 : 1,
    tolerance: 0,
  };
}
~~~~~

~~~~~act
write_file
src/cards/abs_td_notan_2afc/AbsTdNotan2afcView.tsx
~~~~~
~~~~~typescript
import { Columns } from 'lucide-preact';
import { CanvasView } from '../../components/common/CanvasView';
import { Standard2AfcView } from '../../components/common/Standard2AfcView';
import { useTranslation } from '../../core/i18n';
import type { HitResult, QuestionData } from './types';
import {
  OPTION_SIZE,
  THUMB_SIZE,
  drawRawGrayscaleNoiseField,
} from './utils/generator';

const CANVAS_OPTION_CLASS =
  'w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block';

export interface AbsTdNotan2afcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AbsTdNotan2afcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsTdNotan2afcViewProps) {
  const { t } = useTranslation();

  const isTargetA = question.correctNotanChoice === 'A';
  const isTargetB = !isTargetA;

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('cards.abs_td_notan_2afc.hint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      prompt={
        <div className="flex flex-col items-center gap-2 bg-muted/60 p-3 rounded-2xl border border-border shadow-inner w-full max-w-[250px] sm:max-w-[270px] mx-auto">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t('cards.abs_td_notan_2afc.promptTitle')}
          </span>
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={THUMB_SIZE}
              height={THUMB_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawRawGrayscaleNoiseField(
                  canvas,
                  question.promptNotanBuffer,
                  question.notanFieldDim ?? 120,
                  THUMB_SIZE,
                )
              }
              deps={[question.promptNotanBuffer, question.notanFieldDim]}
            />
          </div>
        </div>
      }
      optionA={{
        title: `${t('common.areaA')} (${t('common.optionA')})`,
        isCorrect: isTargetA,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawRawGrayscaleNoiseField(
                  canvas,
                  question.notanSceneBufferA,
                  question.notanFieldDim ?? 120,
                  OPTION_SIZE,
                )
              }
              deps={[question.notanSceneBufferA, question.notanFieldDim]}
            />
          </div>
        ),
      }}
      optionB={{
        title: `${t('common.areaB')} (${t('common.optionB')})`,
        isCorrect: isTargetB,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawRawGrayscaleNoiseField(
                  canvas,
                  question.notanSceneBufferB,
                  question.notanFieldDim ?? 120,
                  OPTION_SIZE,
                )
              }
              deps={[question.notanSceneBufferB, question.notanFieldDim]}
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
src/cards/abs_td_notan_2afc/index.tsx
~~~~~
~~~~~typescript
import { Droplet } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import { AbsTdNotan2afcView } from './AbsTdNotan2afcView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const absTdNotan2afcCard: CardManifest<QuestionData, HitResult, 'A' | 'B', BaseModuleSettings> = {
  id: 'abs_td_notan_2afc',
  domain: 'rhythm_and_notan',
  icon: Droplet,
  tags: {
    domain: ['rhythm_and_notan'],
    path: ['concretization'],
    challenge: ['figure_ground_reversal'],
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
      userAnswer: userVal,
      correctChoice: q.correctNotanChoice,
      errorValue: hitResult.errorValue,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsTdNotan2afcView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
  },
};

export default absTdNotan2afcCard;
~~~~~

#### Acts 8: 创建 `abs_td_palette_2afc` 卡片（调性基底归位）

~~~~~act
write_file
src/cards/abs_td_palette_2afc/types.ts
~~~~~
~~~~~typescript
export interface PaletteTile {
  x: number;
  y: number;
  w: number;
  h: number;
  hsv: [number, number, number];
  weight: number;
}

export interface QuestionData {
  id: string;
  difficultyLevel: number;
  promptDominantColor: [number, number, number];
  palettePatternOptions: PaletteTile[][];
  correctPatternIndex: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userChoiceIndex: number;
  correctIndex: number;
  errorValue: number;
  tolerance: number;
}
~~~~~

~~~~~act
write_file
src/cards/abs_td_palette_2afc/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "调性基底归位",
  "desc": "给定抽象基准主调色，在四幅复杂混色拼贴图案中选出以此为基调的画面 (4AFC)。",
  "instruction": "观察上方基准主调色，选出以此为色彩基底的拼贴画面",
  "badge": "调性基底归位",
  "hint": "观察上方基准主色，选出以此为基调的拼贴画面 (键 1-4)",
  "promptTitle": "基准主调色"
}
~~~~~

~~~~~act
write_file
src/cards/abs_td_palette_2afc/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Top-Down Palette Match",
  "desc": "Given a prompt dominant color, match the mosaic pattern sharing that tonality.",
  "instruction": "Select the mosaic pattern with the matching dominant color base (Keys 1-4).",
  "badge": "Top-Down Palette",
  "hint": "Observe the dominant color above and select the matching mosaic pattern (Keys 1-4)",
  "promptTitle": "Prompt Dominant Color"
}
~~~~~

~~~~~act
write_file
src/cards/abs_td_palette_2afc/utils/generator.ts
~~~~~
~~~~~typescript
import { setup2DCanvas } from '../../../core/canvas/hidpi';
import { hsvToHex } from '../../../core/color/colorUtils';
import {
  generateTetrahedralDistractors,
  getDistractorDistanceForLevel,
  hsvToOkLab,
} from '../../../core/color/oklchUtils';
import { createShuffledChoices } from '../../../core/math/mathUtils';
import { CANVAS_THEME, hexToRgba } from '../../../utils/theme';
import type { HitResult, PaletteTile, QuestionData } from '../types';

export const OPTION_SIZE = 260;

export function drawPaletteTilesCanvas(
  canvas: HTMLCanvasElement | null,
  tiles?: PaletteTile[],
  size = OPTION_SIZE,
) {
  if (!tiles) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  for (const t of tiles) {
    ctx.fillStyle = hsvToHex(...t.hsv);
    ctx.fillRect(t.x, t.y, t.w, t.h);
    ctx.strokeStyle = hexToRgba(CANVAS_THEME.bg.primary, 0.4);
    ctx.strokeRect(t.x, t.y, t.w, t.h);
  }
}

export function generateQuestion(level: number): QuestionData {
  const id = `abs_tdp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  const baseH = Math.floor(Math.random() * 360);
  const baseS = Math.floor(Math.random() * 40) + 40;
  const baseV = Math.floor(Math.random() * 40) + 40;
  const promptDominantColor: [number, number, number] = [baseH, baseS, baseV];

  const makePatternTiles = (domH: number, domS: number, domV: number) => {
    const tiles: PaletteTile[] = [];
    const gridSize = 3;
    const tileDim = OPTION_SIZE / gridSize;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const jitterH = (domH + (Math.floor(Math.random() * 36) - 18) + 360) % 360;
        const jitterS = Math.max(10, Math.min(100, domS + (Math.floor(Math.random() * 26) - 13)));
        const jitterV = Math.max(15, Math.min(100, domV + (Math.floor(Math.random() * 26) - 13)));
        tiles.push({
          x: c * tileDim,
          y: r * tileDim,
          w: tileDim,
          h: tileDim,
          hsv: [jitterH, jitterS, jitterV],
          weight: 1,
        });
      }
    }
    return tiles;
  };

  const distractorDeltaE = getDistractorDistanceForLevel(clampedLevel);
  const labDom = hsvToOkLab(...promptDominantColor);
  const distractorsDom = generateTetrahedralDistractors(labDom, distractorDeltaE);

  const { options: palettePatternOptions, correctIndex: correctPatternIndex } =
    createShuffledChoices(makePatternTiles(baseH, baseS, baseV), [
      makePatternTiles(...distractorsDom[0]),
      makePatternTiles(...distractorsDom[1]),
      makePatternTiles(...distractorsDom[2]),
    ]);

  return {
    id,
    difficultyLevel: clampedLevel,
    promptDominantColor,
    palettePatternOptions,
    correctPatternIndex,
    tolerance: 0,
  };
}

export function checkHit(userChoiceIndex: number, question: QuestionData): HitResult {
  const isHit = userChoiceIndex === question.correctPatternIndex;
  return {
    isHit,
    userChoiceIndex,
    correctIndex: question.correctPatternIndex,
    errorValue: isHit ? 0 : 1,
    tolerance: 0,
  };
}
~~~~~

~~~~~act
write_file
src/cards/abs_td_palette_2afc/AbsTdPalette2afcView.tsx
~~~~~
~~~~~typescript
import { Sparkles } from 'lucide-preact';
import { CanvasView } from '../../components/common/CanvasView';
import { StandardNafcView } from '../../components/common/StandardNafcView';
import { hsvToHex } from '../../core/color/colorUtils';
import { useTranslation } from '../../core/i18n';
import { CANVAS_THEME } from '../../utils/theme';
import type { HitResult, QuestionData } from './types';
import { OPTION_SIZE, drawPaletteTilesCanvas } from './utils/generator';

export interface AbsTdPalette2afcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (idx: number) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AbsTdPalette2afcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsTdPalette2afcViewProps) {
  const { t } = useTranslation();
  const promptHex = question.promptDominantColor
    ? hsvToHex(...question.promptDominantColor)
    : CANVAS_THEME.status.accentHover;
  const targetIdx = question.correctPatternIndex ?? 0;

  const nafcOptions = (question.palettePatternOptions || []).map((pat, idx) => {
    const isTarget = idx === targetIdx;
    return {
      key: `td-pattern-${question.id}-${idx}`,
      title: t('common.screenN', { num: idx + 1 }),
      value: idx,
      isCorrect: isTarget,
      content: (
        <div className="w-full aspect-square bg-white p-1 rounded-xl border border-border shadow-inner flex items-center justify-center">
          <CanvasView
            width={OPTION_SIZE}
            height={OPTION_SIZE}
            className="w-full aspect-square rounded-lg shadow-sm"
            draw={(canvas) => drawPaletteTilesCanvas(canvas, pat, OPTION_SIZE)}
            deps={[pat]}
          />
        </div>
      ),
    };
  });

  return (
    <StandardNafcView
      questionId={question.id}
      hintText={t('cards.abs_td_palette_2afc.hint')}
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
      columns={4}
      options={nafcOptions}
      showAnswer={showAnswer}
      disabled={disabled}
      submitMode="immediate"
      onAnswer={(idx) => onAnswer(idx)}
      preview={
        <div className="flex flex-col items-center gap-1.5 bg-muted/60 p-3 rounded-2xl border border-border shadow-inner">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t('cards.abs_td_palette_2afc.promptTitle')}
          </span>
          <div
            className="w-16 h-16 rounded-2xl border-4 border-card dark:border-border shadow-md ring-1 ring-border/60"
            style={{ backgroundColor: promptHex }}
          />
        </div>
      }
    />
  );
}
~~~~~

~~~~~act
write_file
src/cards/abs_td_palette_2afc/index.tsx
~~~~~
~~~~~typescript
import { Sparkles } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import { AbsTdPalette2afcView } from './AbsTdPalette2afcView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const absTdPalette2afcCard: CardManifest<QuestionData, HitResult, number, BaseModuleSettings> = {
  id: 'abs_td_palette_2afc',
  domain: 'color_and_value',
  icon: Sparkles,
  tags: {
    domain: ['color_and_value'],
    path: ['concretization'],
    interaction: ['multi_choice'],
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
      userAnswer: userVal,
      correctIndex: q.correctPatternIndex,
      errorValue: hitResult.errorValue,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsTdPalette2afcView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
  },
};

export default absTdPalette2afcCard;
~~~~~

#### Acts 9: 物理绞杀删除旧版 `src/packs/abstraction/` 包目录

~~~~~act
delete_file
src/packs/abstraction/canvas/drawNotanField.ts
src/packs/abstraction/canvas/drawPaletteTiles.ts
src/packs/abstraction/canvas/drawParticles.ts
src/packs/abstraction/components/GestureAxisView.tsx
src/packs/abstraction/components/NotanThresholdView.tsx
src/packs/abstraction/components/PaletteClusteringView.tsx
src/packs/abstraction/components/TopDown2AfcView.tsx
src/packs/abstraction/components/TopDownPatternView.tsx
src/packs/abstraction/locales/en-US.json
src/packs/abstraction/locales/zh-CN.json
src/packs/abstraction/utils/hitDetection.ts
src/packs/abstraction/utils/index.ts
src/packs/abstraction/utils/pca.ts
src/packs/abstraction/utils/polygon.ts
src/packs/abstraction/utils/questionGenerator.ts
src/packs/abstraction/utils/types.ts
src/packs/abstraction/views/AbstractionCanvas.tsx
src/packs/abstraction/plugin.tsx
src/packs/abstraction/index.ts
~~~~~

### 下一步建议
- 执行该计划后，运行 `pnpm build` 或启动开发服务器，检查 8 张抽象感知卡片在探索大盘与训练流中是否均能正常出题、作答与判定。
- 确认全部运行正常后，可继续进行负空间域（Negative Space）卡片的展平迁移。
