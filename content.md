现在我们开始执行**阶段 2 的后半部分：空间透视感知（Perspective 5 张卡片）** 的展平迁移。

我们将把原 `src/packs/perspective/` 扩展包中的 5 个模式拆解为 5 个符合白皮书规范的完全平铺、自闭环卡片：
1. `src/cards/persp_vp_convergence/`（透视灭点汇聚感）
2. `src/cards/persp_prop_division/`（平面比例与黄金分割盲切）
3. `src/cards/persp_prop_migration/`（空间比例角度迁移）
4. `src/cards/persp_gestalt_continuation/`（断线完形连续性辨识）
5. `src/cards/persp_structure_3d/`（3D 结构空间翻转）

随后物理删除 `src/packs/perspective/` 目录。

## [WIP] feat(cards): 将空间透视 (perspective) 迁移为平铺卡片架构

### 用户需求
根据 FormSight 卡片化架构白皮书规范，将原 `src/packs/perspective/` 扩展包内的 5 种透视模式解耦为 5 个独立的 `src/cards/persp_*` 平铺微模块，提供自洽的几何出题计算、专属视图与纯相对 Key 多语言词典，并移除旧版透视包。

### 评论
空间透视包含连续调制（灭点角度）、空间交互盲切（比例分割/迁移）、二分选择（完形断线）以及三维轴测投影（3D 结构）多种完全不同的交互形态。将它们独立展平后，各卡片专注于自身的投影数学计算与视图呈现，彻底移除了公用庞杂的 `perspectiveUtils.ts` 与大 `switch` 派发。

### 目标
1. 创建 `src/cards/persp_vp_convergence/` 及其自包含逻辑、滑块视图与 `CardManifest`。
2. 创建 `src/cards/persp_prop_division/` 及其正交投影吸附盲切交互、视图与 `CardManifest`。
3. 创建 `src/cards/persp_prop_migration/` 及其水平参考基准线与倾斜线段比例迁移视图与 `CardManifest`。
4. 创建 `src/cards/persp_gestalt_continuation/` 及其穿透障碍物 2AFC 完形判断视图与 `CardManifest`。
5. 创建 `src/cards/persp_structure_3d/` 及其三视图与 3D 轴测线框立方体点阵交互视图与 `CardManifest`。
6. 物理清理并删除 `src/packs/perspective/` 目录。

### 基本原理
各卡片统一向框架导出 `CardManifest`，多语言词条均置于内部 `locales/{zh-CN,en-US}.json` 纯相对命名空间下，视图内使用 `useCardTranslation`，注册中心自动扫描并前缀修饰 `settingSchemas`，完全实现自洽热插拔。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/executor #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/card-migration-perspective #task/action/implementation #task/state/continue #task/status/active

---

### Script

#### Acts 1: 创建 `persp_vp_convergence`（透视灭点汇聚感）卡片

~~~~~act
write_file
src/cards/persp_vp_convergence/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "VP Convergence",
  "desc": "Modulate the ray angle to make it converge at the exact same vanishing point.",
  "instruction": "Adjust the ray angle using the slider so all lines meet at the vanishing point.",
  "settings": {
    "showToleranceBandTitle": "Show Tolerance Band",
    "showToleranceBandDesc": "Display dynamic tolerance band around current slider position"
  },
  "views": {
    "hint": "Observe the existing perspective lines and adjust the slider to converge rays at the vanishing point (0°~360°)",
    "rayAngle": "Ray Angle:",
    "vpTrueAngle": "True Convergence Angle:",
    "vpErrorInfo": "Error: {{error}}° (Tolerance: ±{{tolerance}}°)"
  }
}
~~~~~

~~~~~act
write_file
src/cards/persp_vp_convergence/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "透视灭点汇聚感",
  "desc": "观察已有倾角透视线，通过滑块调制第三条线段倾斜度，使其精准延长交汇于同一灭点 (VP)。",
  "instruction": "观察已有透视线，调制滑块旋转第三条线使其交汇于同一灭点",
  "settings": {
    "showToleranceBandTitle": "显示动态容错带",
    "showToleranceBandDesc": "在滑块周围显示当前难度下的容错区间指示线"
  },
  "views": {
    "hint": "观察已有透视基准线，调制滑块旋转第三条射线使其交汇于同一灭点 (0°~360°)",
    "rayAngle": "射线倾角:",
    "vpTrueAngle": "精准交汇角:",
    "vpErrorInfo": "误差: {{error}}° (容错: ±{{tolerance}}°)"
  }
}
~~~~~

~~~~~act
write_file
src/cards/persp_vp_convergence/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface PerspVpQuestion {
  id: string;
  difficultyLevel: number;
  tolerance: number;
  vpPoint: Point;
  referenceLines: [LineSegment, LineSegment];
  testLineAnchor: Point;
  testLineLength: number;
  targetAngleDeg: number;
}

export interface PerspVpHitResult {
  isHit: boolean;
  userValue: number;
  targetValue: number;
  errorValue: number;
  tolerance: number;
}
~~~~~

~~~~~act
write_file
src/cards/persp_vp_convergence/utils/generator.ts
~~~~~
~~~~~typescript
import { setup2DCanvas } from '../../../core/canvas/hidpi';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';
import type { LineSegment, PerspVpHitResult, PerspVpQuestion } from '../types';

export const PERSPECTIVE_CANVAS_SIZE = 340;

export function drawVpConvergenceCanvas(
  canvas: HTMLCanvasElement | null,
  referenceLines: [LineSegment, LineSegment] | undefined,
  anchor: Point | undefined,
  angleDeg: number,
  length: number,
  size = PERSPECTIVE_CANVAS_SIZE,
  showAnswer = false,
  targetAngleDeg?: number,
): void {
  if (!referenceLines || !anchor) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  // 1. 绘制已有参考线
  ctx.strokeStyle = CANVAS_THEME.text.secondary;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  for (const line of referenceLines) {
    ctx.beginPath();
    ctx.moveTo(line.p1.x, line.p1.y);
    ctx.lineTo(line.p2.x, line.p2.y);
    ctx.stroke();
  }

  // 2. 绘制锚点
  ctx.fillStyle = CANVAS_THEME.status.accent;
  ctx.beginPath();
  ctx.arc(anchor.x, anchor.y, 4, 0, Math.PI * 2);
  ctx.fill();

  // 3. 绘制用户当前调整的测试线段
  const rad = (angleDeg * Math.PI) / 180;
  const endX = anchor.x + length * Math.cos(rad);
  const endY = anchor.y + length * Math.sin(rad);

  ctx.strokeStyle = showAnswer ? CANVAS_THEME.text.muted : CANVAS_THEME.shape.fill;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(anchor.x, anchor.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // 4. 答案揭晓时绘制绝对正确线段
  if (showAnswer && targetAngleDeg !== undefined) {
    const targetRad = (targetAngleDeg * Math.PI) / 180;
    const tEndX = anchor.x + length * Math.cos(targetRad);
    const tEndY = anchor.y + length * Math.sin(targetRad);

    ctx.strokeStyle = CANVAS_THEME.status.hit;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y);
    ctx.lineTo(tEndX, tEndY);
    ctx.stroke();
  }
}

export function generateQuestion(level: number): PerspVpQuestion {
  const id = `psp_vp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  const vpDist = expDecayInterpolate(400, 1800, clampedLevel);
  const vpAngle = (Math.floor(Math.random() * 360) * Math.PI) / 180;
  const center = PERSPECTIVE_CANVAS_SIZE / 2;

  const dirX = Math.cos(vpAngle);
  const dirY = Math.sin(vpAngle);
  const perpX = -dirY;
  const perpY = dirX;

  const vpPoint: Point = {
    x: center + vpDist * dirX,
    y: center + vpDist * dirY,
  };

  const lineLength = 95;

  const getCenteredRay = (perpOffset: number, length = lineLength) => {
    const anchorX = center - dirX * (length * 0.5) + perpX * perpOffset;
    const anchorY = center - dirY * (length * 0.5) + perpY * perpOffset;
    const ang = Math.atan2(vpPoint.y - anchorY, vpPoint.x - anchorX);

    return {
      p1: { x: Math.round(anchorX * 10) / 10, y: Math.round(anchorY * 10) / 10 },
      p2: {
        x: Math.round((anchorX + length * Math.cos(ang)) * 10) / 10,
        y: Math.round((anchorY + length * Math.sin(ang)) * 10) / 10,
      },
    };
  };

  const refLine1 = getCenteredRay(-55);
  const refLine2 = getCenteredRay(55);
  const testRay = getCenteredRay(0);

  const testAnchor = testRay.p1;
  const targetRad = Math.atan2(vpPoint.y - testAnchor.y, vpPoint.x - testAnchor.x);
  const targetAngleDeg = Math.round((((targetRad * 180) / Math.PI + 360) % 360) * 10) / 10;
  const tolerance = Math.round(expDecayInterpolate(8.0, 0.6, clampedLevel) * 10) / 10;

  return {
    id,
    difficultyLevel: clampedLevel,
    vpPoint,
    referenceLines: [refLine1, refLine2],
    testLineAnchor: testAnchor,
    testLineLength: lineLength,
    targetAngleDeg,
    tolerance,
  };
}

export function checkHit(userVal: number, question: PerspVpQuestion): PerspVpHitResult {
  const userAngle = typeof userVal === 'number' ? userVal : 0;
  const targetAngle = question.targetAngleDeg ?? 0;
  const diff = Math.abs(userAngle - targetAngle);
  const errorVal = Math.min(diff, 360 - diff);
  const isHit = errorVal <= question.tolerance;

  return {
    isHit,
    userValue: userAngle,
    targetValue: targetAngle,
    errorValue: Math.round(errorVal * 10) / 10,
    tolerance: question.tolerance,
  };
}
~~~~~

~~~~~act
write_file
src/cards/persp_vp_convergence/PerspVpConvergenceView.tsx
~~~~~
~~~~~tsx
import { Sliders } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { CanvasView } from '../../components/common/CanvasView';
import { StandardSliderView } from '../../components/common/StandardSliderView';
import { useCardTranslation } from '../../core/i18n';
import type { PerspVpHitResult, PerspVpQuestion } from './types';
import { PERSPECTIVE_CANVAS_SIZE, drawVpConvergenceCanvas } from './utils/generator';

export interface PerspVpConvergenceViewProps {
  question: PerspVpQuestion;
  showAnswer: boolean;
  userAnswer: PerspVpHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function PerspVpConvergenceView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: PerspVpConvergenceViewProps) {
  const { t } = useCardTranslation('persp_vp_convergence');
  const targetVal = question.targetAngleDeg ?? 0;
  const tolerance = question.tolerance;
  const isHit = Boolean(userAnswer?.isHit);
  const userVal = userAnswer?.userValue;

  const [liveAngle, setLiveAngle] = useState<number>(180);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset liveAngle on new question
  useEffect(() => {
    setLiveAngle(180);
  }, [question.id]);

  const currentActiveAngle = showAnswer && userVal !== undefined ? userVal : liveAngle;

  return (
    <StandardSliderView
      questionId={question.id}
      hintText={t('views.hint')}
      hintIcon={Sliders}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label={t('views.rayAngle')}
      max={360}
      step={0.5}
      initialValue={180}
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
      onValueChange={(_cur, active) => setLiveAngle(active)}
      onAnswer={onAnswer}
      preview={
        <div className="bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex justify-center items-center">
          <CanvasView
            width={PERSPECTIVE_CANVAS_SIZE}
            height={PERSPECTIVE_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card"
            draw={(canvas) => {
              drawVpConvergenceCanvas(
                canvas,
                question.referenceLines,
                question.testLineAnchor,
                currentActiveAngle,
                question.testLineLength ?? 95,
                PERSPECTIVE_CANVAS_SIZE,
                showAnswer,
                targetVal,
              );
            }}
            deps={[
              question.referenceLines,
              question.testLineAnchor,
              question.testLineLength,
              currentActiveAngle,
              showAnswer,
              targetVal,
            ]}
          />
        </div>
      }
      footerDetails={
        showAnswer && userVal !== undefined ? (
          <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">
              {t('views.vpTrueAngle')}{' '}
              <span className="font-bold text-foreground font-mono">{targetVal}°</span>
            </span>
            <span
              className={
                isHit
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-rose-600 dark:text-rose-400 font-bold'
              }
            >
              {t('views.vpErrorInfo', {
                error: userAnswer?.errorValue ?? 0,
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
src/cards/persp_vp_convergence/index.tsx
~~~~~
~~~~~tsx
import { Sliders } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import { PerspVpConvergenceView } from './PerspVpConvergenceView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { PerspVpHitResult, PerspVpQuestion } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export interface PerspVpSettings extends BaseModuleSettings {
  sliderHitMargin?: number;
  showToleranceBand?: boolean;
}

export const perspVpConvergenceCard: CardManifest<
  PerspVpQuestion,
  PerspVpHitResult,
  number,
  PerspVpSettings
> = {
  id: 'persp_vp_convergence',
  domain: 'spatial_structure',
  icon: Sliders,
  tags: {
    domain: ['spatial_structure'],
    path: ['relational_mapping'],
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
      <PerspVpConvergenceView
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

export default perspVpConvergenceCard;
~~~~~

#### Acts 2: 创建 `persp_prop_division`（平面比例与黄金分割盲切）卡片

~~~~~act
write_file
src/cards/persp_prop_division/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Proportion Division",
  "desc": "Blindly cut lines at 1/2, 1/3, 1/4, or golden ratio (0.618).",
  "instruction": "Click at the designated target proportion along the tilted line.",
  "views": {
    "hint": "Slide along the tilted segment and release to confirm proportional division (or click directly)",
    "targetRatio": "Target Proportion:",
    "userPosition": "User Position: {{pos}}% (Error: ±{{error}}%)"
  }
}
~~~~~

~~~~~act
write_file
src/cards/persp_prop_division/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "平面比例与黄金分割盲切",
  "desc": "观察倾斜线段，单次点击盲切估测 1/2、1/3、1/4 或黄金分割点 (0.618)。",
  "instruction": "观察线段并在指定比例位置单次点击",
  "views": {
    "hint": "在倾斜线段上滑动试探，松手确认比例位置（也可直接点击）",
    "targetRatio": "目标比例:",
    "userPosition": "作答位置: {{pos}}% (误差: ±{{error}}%)"
  }
}
~~~~~

~~~~~act
write_file
src/cards/persp_prop_division/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface PerspPropDivisionQuestion {
  id: string;
  difficultyLevel: number;
  divisionLine: LineSegment;
  targetRatio: number;
  targetRatioName: string;
  targetDivisionPoint: Point;
  tolerance: number;
}

export interface PerspPropDivisionHitResult {
  isHit: boolean;
  userValue: Point;
  targetValue: Point;
  errorValue: number;
  tolerance: number;
  ratioProgress: number;
}
~~~~~

~~~~~act
write_file
src/cards/persp_prop_division/utils/generator.ts
~~~~~
~~~~~typescript
import { setup2DCanvas } from '../../../core/canvas/hidpi';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
import { CANVAS_THEME, hexToRgba } from '../../../utils/theme';
import type { LineSegment, PerspPropDivisionHitResult, PerspPropDivisionQuestion } from '../types';

export const PERSPECTIVE_CANVAS_SIZE = 340;

const PROPORTION_PRESETS = [
  { name: '1/2', ratio: 0.5 },
  { name: '1/3', ratio: 1 / 3 },
  { name: '2/3', ratio: 2 / 3 },
  { name: '1/4', ratio: 0.25 },
  { name: '0.618', ratio: 0.618 },
];

export function drawProportionCanvas(
  canvas: HTMLCanvasElement | null,
  line: LineSegment | undefined,
  targetPoint: Point | undefined,
  userPoint: Point | null | undefined,
  hoverPoint?: Point | null,
  showAnswer = false,
  size = PERSPECTIVE_CANVAS_SIZE,
): void {
  if (!line) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  // 主干线段
  ctx.strokeStyle = CANVAS_THEME.shape.fill;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(line.p1.x, line.p1.y);
  ctx.lineTo(line.p2.x, line.p2.y);
  ctx.stroke();

  // 起点端点 (P1)
  ctx.strokeStyle = CANVAS_THEME.status.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(line.p1.x, line.p1.y, 7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = CANVAS_THEME.status.accent;
  ctx.beginPath();
  ctx.arc(line.p1.x, line.p1.y, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 终点端点 (P2)
  ctx.fillStyle = CANVAS_THEME.text.muted;
  ctx.beginPath();
  ctx.arc(line.p2.x, line.p2.y, 4, 0, Math.PI * 2);
  ctx.fill();

  // 悬停正交投影吸附点
  if (!showAnswer && hoverPoint) {
    ctx.fillStyle = hexToRgba(CANVAS_THEME.status.accent, 0.2);
    ctx.beginPath();
    ctx.arc(hoverPoint.x, hoverPoint.y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = CANVAS_THEME.status.accent;
    ctx.beginPath();
    ctx.arc(hoverPoint.x, hoverPoint.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 结果揭晓
  if (showAnswer) {
    if (targetPoint) {
      ctx.fillStyle = CANVAS_THEME.status.hit;
      ctx.beginPath();
      ctx.arc(targetPoint.x, targetPoint.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (userPoint) {
      ctx.fillStyle = CANVAS_THEME.status.miss;
      ctx.beginPath();
      ctx.arc(userPoint.x, userPoint.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function generateQuestion(level: number): PerspPropDivisionQuestion {
  const id = `psp_div_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  const preset = PROPORTION_PRESETS[Math.floor(Math.random() * PROPORTION_PRESETS.length)];
  const ratio = preset.ratio;
  const ratioName = preset.name;

  const angleRad = Math.random() * Math.PI * 2;
  const lineLen = 220;
  const center = PERSPECTIVE_CANVAS_SIZE / 2;

  const halfX = (lineLen / 2) * Math.cos(angleRad);
  const halfY = (lineLen / 2) * Math.sin(angleRad);

  const p1: Point = {
    x: Math.round(center - halfX),
    y: Math.round(center - halfY),
  };
  const p2: Point = {
    x: Math.round(center + halfX),
    y: Math.round(center + halfY),
  };

  const targetDivisionPoint: Point = {
    x: Math.round(p1.x + (p2.x - p1.x) * ratio),
    y: Math.round(p1.y + (p2.y - p1.y) * ratio),
  };

  const tolerance = Math.round(expDecayInterpolate(0.08, 0.015, clampedLevel) * 1000) / 1000;

  return {
    id,
    difficultyLevel: clampedLevel,
    divisionLine: { p1, p2 },
    targetRatio: ratio,
    targetRatioName: ratioName,
    targetDivisionPoint,
    tolerance,
  };
}

export function checkHit(clickPoint: Point, question: PerspPropDivisionQuestion): PerspPropDivisionHitResult {
  const line = question.divisionLine;
  const dx = line.p2.x - line.p1.x;
  const dy = line.p2.y - line.p1.y;
  const lenSq = dx * dx + dy * dy;
  const t = ((clickPoint.x - line.p1.x) * dx + (clickPoint.y - line.p1.y) * dy) / (lenSq || 1);
  const clampedT = Math.max(0, Math.min(1, t));

  const targetT = question.targetRatio ?? 0.5;
  const errorT = Math.abs(clampedT - targetT);
  const isHit = errorT <= question.tolerance;

  return {
    isHit,
    userValue: clickPoint,
    targetValue: question.targetDivisionPoint,
    errorValue: Math.round(errorT * 1000) / 1000,
    tolerance: question.tolerance,
    ratioProgress: Math.round(clampedT * 1000) / 1000,
  };
}
~~~~~

~~~~~act
write_file
src/cards/persp_prop_division/PerspPropDivisionView.tsx
~~~~~
~~~~~tsx
import { Disc } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { QuestionCardShell } from '../../components/common/QuestionCardShell';
import { Badge } from '../../components/ui/badge';
import { useCardTranslation, useTranslation } from '../../core/i18n';
import type { Point } from '../../types';
import type { PerspPropDivisionHitResult, PerspPropDivisionQuestion } from './types';
import { PERSPECTIVE_CANVAS_SIZE, drawProportionCanvas } from './utils/generator';

export interface PerspPropDivisionViewProps {
  question: PerspPropDivisionQuestion;
  showAnswer: boolean;
  userAnswer: PerspPropDivisionHitResult | null;
  onAnswer: (point: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function PerspPropDivisionView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: PerspPropDivisionViewProps) {
  const { t: cardT } = useCardTranslation('persp_prop_division');
  const { t: commonT } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [userClickedPoint, setUserClickedPoint] = useState<Point | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setUserClickedPoint(null);
    setHoverPoint(null);
  }, [question.id]);

  const getProjectedPoint = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const canvas = canvasRef.current;
      const line = question.divisionLine;
      if (!canvas || !line) return null;

      const rect = canvas.getBoundingClientRect();
      const scale = PERSPECTIVE_CANVAS_SIZE / rect.width;
      const mouseX = (clientX - rect.left) * scale;
      const mouseY = (clientY - rect.top) * scale;

      const dx = line.p2.x - line.p1.x;
      const dy = line.p2.y - line.p1.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return null;

      const t = ((mouseX - line.p1.x) * dx + (mouseY - line.p1.y) * dy) / lenSq;
      const clampedT = Math.max(0, Math.min(1, t));

      return {
        x: Math.round((line.p1.x + clampedT * dx) * 10) / 10,
        y: Math.round((line.p1.y + clampedT * dy) * 10) / 10,
      };
    },
    [question.divisionLine],
  );

  const handleMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer) {
      if (hoverPoint) setHoverPoint(null);
      return;
    }
    const projPt = getProjectedPoint(e.clientX, e.clientY);
    if (projPt) {
      setHoverPoint(projPt);
    }
  };

  const handleMouseLeave = () => {
    if (hoverPoint) setHoverPoint(null);
  };

  const handleClick = (e: MouseEvent) => {
    if (disabled || showAnswer) return;
    const projPt = getProjectedPoint(e.clientX, e.clientY);
    if (!projPt) return;

    setUserClickedPoint(projPt);
    setHoverPoint(null);
    onAnswer(projPt);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled || showAnswer || !e.touches[0]) return;
    const touch = e.touches[0];
    const projPt = getProjectedPoint(touch.clientX, touch.clientY);
    if (projPt) {
      setHoverPoint(projPt);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (disabled || showAnswer || !e.touches[0]) return;
    if (e.cancelable) e.preventDefault();
    const touch = e.touches[0];
    const projPt = getProjectedPoint(touch.clientX, touch.clientY);
    if (projPt) {
      setHoverPoint(projPt);
    }
  };

  const handleTouchEnd = () => {
    if (disabled || showAnswer) return;
    if (hoverPoint) {
      const finalPt = hoverPoint;
      setUserClickedPoint(finalPt);
      setHoverPoint(null);
      onAnswer(finalPt);
    }
  };

  const isHit = Boolean(userAnswer?.isHit);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      drawProportionCanvas(
        canvas,
        question.divisionLine,
        question.targetDivisionPoint,
        userClickedPoint,
        hoverPoint,
        showAnswer,
        PERSPECTIVE_CANVAS_SIZE,
      );
    }
  }, [
    question.divisionLine,
    question.targetDivisionPoint,
    userClickedPoint,
    hoverPoint,
    showAnswer,
  ]);

  return (
    <QuestionCardShell
      hintText={cardT('views.hint')}
      hintIcon={Disc}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      footer={
        showAnswer ? (
          <div className="w-full pt-2 border-t border-border/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">
              {cardT('views.targetRatio')}{' '}
              <span className="font-bold text-foreground font-mono">
                {((question.targetRatio ?? 0) * 100).toFixed(1)}%
              </span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              {cardT('views.userPosition', {
                pos: ((userAnswer?.ratioProgress ?? 0) * 100).toFixed(1),
                error: ((userAnswer?.errorValue ?? 0) * 100).toFixed(1),
              })}
            </span>
          </div>
        ) : null
      }
    >
      <div className="w-full bg-accent/80 border border-border/60 dark:border-border rounded-2xl py-2 px-4 flex items-center justify-center shadow-xs">
        <span className="text-2xl font-black text-primary font-black dark:text-indigo-200 font-mono tracking-widest">
          {question.targetRatioName ?? '1/2'}
        </span>
      </div>

      <div className="w-full bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex flex-col items-center gap-2">
        <canvas
          ref={canvasRef}
          width={PERSPECTIVE_CANVAS_SIZE}
          height={PERSPECTIVE_CANVAS_SIZE}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleMouseLeave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          tabIndex={0}
          role="button"
          aria-label={cardT('title')}
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card touch-none select-none transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-crosshair md:cursor-none hover:border-indigo-400 hover:shadow-md'
          }`}
        />
        <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <Badge
              variant="accent"
              size="sm"
              className="w-2.5 h-2.5 p-0 rounded-full border-2 border-indigo-600 bg-indigo-600"
            />
            <span>{commonT('common.startPercent')}</span>
          </span>
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <Badge
              variant="secondary"
              size="sm"
              className="w-2 h-2 p-0 rounded-full border-none bg-muted-foreground"
            />
            <span>{commonT('common.endPercent')}</span>
          </span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/cards/persp_prop_division/index.tsx
~~~~~
~~~~~tsx
import { Layers } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import type { Point } from '../../types';
import { PerspPropDivisionView } from './PerspPropDivisionView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { PerspPropDivisionHitResult, PerspPropDivisionQuestion } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const perspPropDivisionCard: CardManifest<
  PerspPropDivisionQuestion,
  PerspPropDivisionHitResult,
  Point,
  BaseModuleSettings
> = {
  id: 'persp_prop_division',
  domain: 'form_and_proportion',
  icon: Layers,
  tags: {
    domain: ['form_and_proportion'],
    path: ['absolute_estimation'],
    interaction: ['spatial_locate'],
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
      userAnswer: [userVal.x, userVal.y],
      targetValue: [q.targetDivisionPoint.x, q.targetDivisionPoint.y],
      targetRatio: q.targetRatio,
      ratioProgress: hitResult.ratioProgress,
      errorValue: hitResult.errorValue,
      tolerance: hitResult.tolerance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <PerspPropDivisionView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
};

export default perspPropDivisionCard;
~~~~~

#### Acts 3: 创建 `persp_prop_migration`（空间比例角度迁移）卡片

~~~~~act
write_file
src/cards/persp_prop_migration/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Proportion Migration",
  "desc": "Migrate proportional divisions from horizontal references onto randomly tilted lines.",
  "instruction": "Observe the target point above and mark the identical proportion below.",
  "views": {
    "hint": "Observe the horizontal reference above and confirm the corresponding proportion on the tilted segment below",
    "targetRatio": "Target Proportion:",
    "userPosition": "User Position: {{pos}}% (Error: ±{{error}}%)"
  }
}
~~~~~

~~~~~act
write_file
src/cards/persp_prop_migration/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "空间比例角度迁移",
  "desc": "观察上方水平基准线上的任意比例目标点，在下方随机倾斜角度的线段上准确标出相同比例位置。",
  "instruction": "观察上方基准线目标点，在下方倾斜线段上点选相同比例位置",
  "views": {
    "hint": "观察上方基准线目标点，在下方倾斜线段滑动试探并松手确认",
    "targetRatio": "目标比例:",
    "userPosition": "作答位置: {{pos}}% (误差: ±{{error}}%)"
  }
}
~~~~~

~~~~~act
write_file
src/cards/persp_prop_migration/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface PerspPropMigrationQuestion {
  id: string;
  difficultyLevel: number;
  divisionLine: LineSegment;
  targetRatio: number;
  targetDivisionPoint: Point;
  tolerance: number;
}

export interface PerspPropMigrationHitResult {
  isHit: boolean;
  userValue: Point;
  targetValue: Point;
  errorValue: number;
  tolerance: number;
  ratioProgress: number;
}
~~~~~

~~~~~act
write_file
src/cards/persp_prop_migration/utils/generator.ts
~~~~~
~~~~~typescript
import { setup2DCanvas } from '../../../core/canvas/hidpi';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
import { CANVAS_THEME, hexToRgba } from '../../../utils/theme';
import type { LineSegment, PerspPropMigrationHitResult, PerspPropMigrationQuestion } from '../types';

export const PERSPECTIVE_CANVAS_SIZE = 340;

export function drawProportionCanvas(
  canvas: HTMLCanvasElement | null,
  line: LineSegment | undefined,
  targetPoint: Point | undefined,
  userPoint: Point | null | undefined,
  hoverPoint?: Point | null,
  showAnswer = false,
  size = PERSPECTIVE_CANVAS_SIZE,
): void {
  if (!line) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  // 主干线段
  ctx.strokeStyle = CANVAS_THEME.shape.fill;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(line.p1.x, line.p1.y);
  ctx.lineTo(line.p2.x, line.p2.y);
  ctx.stroke();

  // 起点端点 (P1)
  ctx.strokeStyle = CANVAS_THEME.status.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(line.p1.x, line.p1.y, 7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = CANVAS_THEME.status.accent;
  ctx.beginPath();
  ctx.arc(line.p1.x, line.p1.y, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 终点端点 (P2)
  ctx.fillStyle = CANVAS_THEME.text.muted;
  ctx.beginPath();
  ctx.arc(line.p2.x, line.p2.y, 4, 0, Math.PI * 2);
  ctx.fill();

  // 悬停正交投影吸附点
  if (!showAnswer && hoverPoint) {
    ctx.fillStyle = hexToRgba(CANVAS_THEME.status.accent, 0.2);
    ctx.beginPath();
    ctx.arc(hoverPoint.x, hoverPoint.y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = CANVAS_THEME.status.accent;
    ctx.beginPath();
    ctx.arc(hoverPoint.x, hoverPoint.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 结果揭晓
  if (showAnswer) {
    if (targetPoint) {
      ctx.fillStyle = CANVAS_THEME.status.hit;
      ctx.beginPath();
      ctx.arc(targetPoint.x, targetPoint.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (userPoint) {
      ctx.fillStyle = CANVAS_THEME.status.miss;
      ctx.beginPath();
      ctx.arc(userPoint.x, userPoint.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawHorizontalReferenceCanvas(
  canvas: HTMLCanvasElement | null,
  targetRatio = 0.5,
  width = 280,
  height = 48,
): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = CANVAS_THEME.bg.primary;
  ctx.fillRect(0, 0, width, height);

  const marginX = 24;
  const y = height / 2;
  const lineW = width - marginX * 2;
  const p1 = { x: marginX, y };
  const p2 = { x: marginX + lineW, y };

  ctx.strokeStyle = CANVAS_THEME.shape.fill;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  ctx.strokeStyle = CANVAS_THEME.status.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p1.x, p1.y, 7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = CANVAS_THEME.status.accent;
  ctx.beginPath();
  ctx.arc(p1.x, p1.y, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = CANVAS_THEME.text.muted;
  ctx.beginPath();
  ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
  ctx.fill();

  const targetX = p1.x + lineW * targetRatio;
  ctx.fillStyle = CANVAS_THEME.status.accent;
  ctx.beginPath();
  ctx.arc(targetX, y, 5.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = CANVAS_THEME.status.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(targetX, y - 11);
  ctx.lineTo(targetX, y - 6);
  ctx.stroke();
}

export function generateQuestion(level: number): PerspPropMigrationQuestion {
  const id = `psp_mig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  const ratio = Math.round((Math.random() * 0.84 + 0.08) * 1000) / 1000;

  const angleRad = Math.random() * Math.PI * 2;
  const lineLen = 220;
  const center = PERSPECTIVE_CANVAS_SIZE / 2;

  const halfX = (lineLen / 2) * Math.cos(angleRad);
  const halfY = (lineLen / 2) * Math.sin(angleRad);

  const p1: Point = {
    x: Math.round(center - halfX),
    y: Math.round(center - halfY),
  };
  const p2: Point = {
    x: Math.round(center + halfX),
    y: Math.round(center + halfY),
  };

  const targetDivisionPoint: Point = {
    x: Math.round(p1.x + (p2.x - p1.x) * ratio),
    y: Math.round(p1.y + (p2.y - p1.y) * ratio),
  };

  const tolerance = Math.round(expDecayInterpolate(0.08, 0.015, clampedLevel) * 1000) / 1000;

  return {
    id,
    difficultyLevel: clampedLevel,
    divisionLine: { p1, p2 },
    targetRatio: ratio,
    targetDivisionPoint,
    tolerance,
  };
}

export function checkHit(clickPoint: Point, question: PerspPropMigrationQuestion): PerspPropMigrationHitResult {
  const line = question.divisionLine;
  const dx = line.p2.x - line.p1.x;
  const dy = line.p2.y - line.p1.y;
  const lenSq = dx * dx + dy * dy;
  const t = ((clickPoint.x - line.p1.x) * dx + (clickPoint.y - line.p1.y) * dy) / (lenSq || 1);
  const clampedT = Math.max(0, Math.min(1, t));

  const targetT = question.targetRatio ?? 0.5;
  const errorT = Math.abs(clampedT - targetT);
  const isHit = errorT <= question.tolerance;

  return {
    isHit,
    userValue: clickPoint,
    targetValue: question.targetDivisionPoint,
    errorValue: Math.round(errorT * 1000) / 1000,
    tolerance: question.tolerance,
    ratioProgress: Math.round(clampedT * 1000) / 1000,
  };
}
~~~~~

~~~~~act
write_file
src/cards/persp_prop_migration/PerspPropMigrationView.tsx
~~~~~
~~~~~tsx
import { ArrowRightLeft } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { CanvasView } from '../../components/common/CanvasView';
import { QuestionCardShell } from '../../components/common/QuestionCardShell';
import { Badge } from '../../components/ui/badge';
import { useCardTranslation, useTranslation } from '../../core/i18n';
import type { Point } from '../../types';
import type { PerspPropMigrationHitResult, PerspPropMigrationQuestion } from './types';
import {
  PERSPECTIVE_CANVAS_SIZE,
  drawHorizontalReferenceCanvas,
  drawProportionCanvas,
} from './utils/generator';

export interface PerspPropMigrationViewProps {
  question: PerspPropMigrationQuestion;
  showAnswer: boolean;
  userAnswer: PerspPropMigrationHitResult | null;
  onAnswer: (point: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function PerspPropMigrationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: PerspPropMigrationViewProps) {
  const { t: cardT } = useCardTranslation('persp_prop_migration');
  const { t: commonT } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [userClickedPoint, setUserClickedPoint] = useState<Point | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setUserClickedPoint(null);
    setHoverPoint(null);
  }, [question.id]);

  const getProjectedPoint = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const canvas = canvasRef.current;
      const line = question.divisionLine;
      if (!canvas || !line) return null;

      const rect = canvas.getBoundingClientRect();
      const scale = PERSPECTIVE_CANVAS_SIZE / rect.width;
      const mouseX = (clientX - rect.left) * scale;
      const mouseY = (clientY - rect.top) * scale;

      const dx = line.p2.x - line.p1.x;
      const dy = line.p2.y - line.p1.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return null;

      const t = ((mouseX - line.p1.x) * dx + (mouseY - line.p1.y) * dy) / lenSq;
      const clampedT = Math.max(0, Math.min(1, t));

      return {
        x: Math.round((line.p1.x + clampedT * dx) * 10) / 10,
        y: Math.round((line.p1.y + clampedT * dy) * 10) / 10,
      };
    },
    [question.divisionLine],
  );

  const handleMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer) {
      if (hoverPoint) setHoverPoint(null);
      return;
    }
    const projPt = getProjectedPoint(e.clientX, e.clientY);
    if (projPt) {
      setHoverPoint(projPt);
    }
  };

  const handleMouseLeave = () => {
    if (hoverPoint) setHoverPoint(null);
  };

  const handleClick = (e: MouseEvent) => {
    if (disabled || showAnswer) return;
    const projPt = getProjectedPoint(e.clientX, e.clientY);
    if (!projPt) return;

    setUserClickedPoint(projPt);
    setHoverPoint(null);
    onAnswer(projPt);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled || showAnswer || !e.touches[0]) return;
    const touch = e.touches[0];
    const projPt = getProjectedPoint(touch.clientX, touch.clientY);
    if (projPt) {
      setHoverPoint(projPt);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (disabled || showAnswer || !e.touches[0]) return;
    if (e.cancelable) e.preventDefault();
    const touch = e.touches[0];
    const projPt = getProjectedPoint(touch.clientX, touch.clientY);
    if (projPt) {
      setHoverPoint(projPt);
    }
  };

  const handleTouchEnd = () => {
    if (disabled || showAnswer) return;
    if (hoverPoint) {
      const finalPt = hoverPoint;
      setUserClickedPoint(finalPt);
      setHoverPoint(null);
      onAnswer(finalPt);
    }
  };

  const isHit = Boolean(userAnswer?.isHit);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      drawProportionCanvas(
        canvas,
        question.divisionLine,
        question.targetDivisionPoint,
        userClickedPoint,
        hoverPoint,
        showAnswer,
        PERSPECTIVE_CANVAS_SIZE,
      );
    }
  }, [
    question.divisionLine,
    question.targetDivisionPoint,
    userClickedPoint,
    hoverPoint,
    showAnswer,
  ]);

  return (
    <QuestionCardShell
      hintText={cardT('views.hint')}
      hintIcon={ArrowRightLeft}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      footer={
        showAnswer ? (
          <div className="w-full pt-2 border-t border-border/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">
              {cardT('views.targetRatio')}{' '}
              <span className="font-bold text-foreground font-mono">
                {((question.targetRatio ?? 0) * 100).toFixed(1)}%
              </span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              {cardT('views.userPosition', {
                pos: ((userAnswer?.ratioProgress ?? 0) * 100).toFixed(1),
                error: ((userAnswer?.errorValue ?? 0) * 100).toFixed(1),
              })}
            </span>
          </div>
        ) : null
      }
    >
      <div className="w-full bg-muted/60 border border-border rounded-2xl p-2.5 flex justify-center shadow-inner">
        <CanvasView
          width={280}
          height={48}
          className="w-full max-w-[280px] h-[48px] bg-card rounded-xl border border-border shadow-sm"
          draw={(canvas) => {
            drawHorizontalReferenceCanvas(canvas, question.targetRatio ?? 0.5, 280, 48);
          }}
          deps={[question.targetRatio]}
        />
      </div>

      <div className="w-full bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex flex-col items-center gap-2">
        <canvas
          ref={canvasRef}
          width={PERSPECTIVE_CANVAS_SIZE}
          height={PERSPECTIVE_CANVAS_SIZE}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleMouseLeave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          tabIndex={0}
          role="button"
          aria-label={cardT('title')}
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card touch-none select-none transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-crosshair md:cursor-none hover:border-indigo-400 hover:shadow-md'
          }`}
        />
        <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <Badge
              variant="accent"
              size="sm"
              className="w-2.5 h-2.5 p-0 rounded-full border-2 border-indigo-600 bg-indigo-600"
            />
            <span>{commonT('common.startPercent')}</span>
          </span>
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <Badge
              variant="secondary"
              size="sm"
              className="w-2 h-2 p-0 rounded-full border-none bg-muted-foreground"
            />
            <span>{commonT('common.endPercent')}</span>
          </span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/cards/persp_prop_migration/index.tsx
~~~~~
~~~~~tsx
import { ArrowRightLeft } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import type { Point } from '../../types';
import { PerspPropMigrationView } from './PerspPropMigrationView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { PerspPropMigrationHitResult, PerspPropMigrationQuestion } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const perspPropMigrationCard: CardManifest<
  PerspPropMigrationQuestion,
  PerspPropMigrationHitResult,
  Point,
  BaseModuleSettings
> = {
  id: 'persp_prop_migration',
  domain: 'form_and_proportion',
  icon: ArrowRightLeft,
  tags: {
    domain: ['form_and_proportion', 'spatial_structure'],
    path: ['relational_mapping'],
    challenge: ['working_memory', 'dimensional_translation'],
    interaction: ['spatial_locate'],
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
      userAnswer: [userVal.x, userVal.y],
      targetValue: [q.targetDivisionPoint.x, q.targetDivisionPoint.y],
      targetRatio: q.targetRatio,
      ratioProgress: hitResult.ratioProgress,
      errorValue: hitResult.errorValue,
      tolerance: hitResult.tolerance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <PerspPropMigrationView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
};

export default perspPropMigrationCard;
~~~~~

#### Acts 4: 创建 `persp_gestalt_continuation`（断线完形连续性辨识）卡片

~~~~~act
write_file
src/cards/persp_gestalt_continuation/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Gestalt Continuation 2AFC",
  "desc": "Identify the true collinear continuation penetrating an obstacle (2AFC).",
  "instruction": "Select the line that maintains true collinear continuation (Keys 1 / 2).",
  "views": {
    "hint": "Observe incoming line and identify the true collinear continuation penetrating the obstacle (Keys 1 / 2)",
    "optionA": "Continuation A",
    "optionB": "Continuation B"
  }
}
~~~~~

~~~~~act
write_file
src/cards/persp_gestalt_continuation/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "断线完形连续性辨识",
  "desc": "基于格式塔完形心理学，二选一快速辨识穿透中间障碍物的真实延续线段 (2AFC)。",
  "instruction": "二选一选出保持绝对连续贯穿的延伸线 (键 1 / 2)",
  "views": {
    "hint": "观察穿入线段，二选一辨识哪一侧保持了绝对真实的贯穿延伸 (键 1 / 2)",
    "optionA": "延伸 A",
    "optionB": "延伸 B"
  }
}
~~~~~

~~~~~act
write_file
src/cards/persp_gestalt_continuation/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface Obstacle {
  type: 'circle' | 'rect';
  cx: number;
  cy: number;
  size: number;
}

export interface PerspGestaltQuestion {
  id: string;
  difficultyLevel: number;
  obstacle: Obstacle;
  incomingLine: LineSegment;
  lineOptionA: LineSegment;
  lineOptionB: LineSegment;
  correctChoice: 'A' | 'B';
  parallelOffset: number;
  tolerance: number;
}

export interface PerspGestaltHitResult {
  isHit: boolean;
  userChoice: 'A' | 'B';
  correctChoice: 'A' | 'B';
  errorValue: number;
  tolerance: number;
}
~~~~~

~~~~~act
write_file
src/cards/persp_gestalt_continuation/utils/generator.ts
~~~~~
~~~~~typescript
import { setup2DCanvas } from '../../../core/canvas/hidpi';
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';
import type { LineSegment, Obstacle, PerspGestaltHitResult, PerspGestaltQuestion } from '../types';

export const PERSPECTIVE_2AFC_SIZE = 240;

export function drawGestaltCanvas(
  canvas: HTMLCanvasElement | null,
  obstacle: Obstacle | undefined,
  incomingLine: LineSegment | undefined,
  outgoingLine: LineSegment | undefined,
  size = PERSPECTIVE_2AFC_SIZE,
): void {
  if (!obstacle || !incomingLine || !outgoingLine) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  ctx.strokeStyle = CANVAS_THEME.shape.fill;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(incomingLine.p1.x, incomingLine.p1.y);
  ctx.lineTo(incomingLine.p2.x, incomingLine.p2.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(outgoingLine.p1.x, outgoingLine.p1.y);
  ctx.lineTo(outgoingLine.p2.x, outgoingLine.p2.y);
  ctx.stroke();

  ctx.fillStyle = CANVAS_THEME.axis.grid;
  ctx.strokeStyle = CANVAS_THEME.text.secondary;
  ctx.lineWidth = 2;

  if (obstacle.type === 'circle') {
    ctx.beginPath();
    ctx.arc(obstacle.cx, obstacle.cy, obstacle.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    const half = obstacle.size / 2;
    ctx.fillRect(obstacle.cx - half, obstacle.cy - half, obstacle.size, obstacle.size);
    ctx.strokeRect(obstacle.cx - half, obstacle.cy - half, obstacle.size, obstacle.size);
  }
}

export function generateQuestion(level: number): PerspGestaltQuestion {
  const id = `psp_ges_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  const center = PERSPECTIVE_2AFC_SIZE / 2;
  const obstacleType = Math.random() < 0.5 ? 'circle' : 'rect';
  const obstacleSize = 65;

  const obstacle: Obstacle = {
    type: obstacleType,
    cx: center,
    cy: center,
    size: obstacleSize,
  };

  const lineAngle = (Math.random() * 80 + 10) * (Math.PI / 180);
  const dirX = Math.cos(lineAngle);
  const dirY = Math.sin(lineAngle);

  const inStart: Point = { x: center - 90 * dirX, y: center - 90 * dirY };
  const inEnd: Point = { x: center - 35 * dirX, y: center - 35 * dirY };
  const outStart: Point = { x: center + 35 * dirX, y: center + 35 * dirY };
  const outEnd: Point = { x: center + 90 * dirX, y: center + 90 * dirY };

  const parallelOffset = Math.round(expDecayInterpolate(20, 2.5, clampedLevel) * 10) / 10;
  const perpX = -dirY * parallelOffset;
  const perpY = dirX * parallelOffset;

  const distractorStart: Point = { x: outStart.x + perpX, y: outStart.y + perpY };
  const distractorEnd: Point = { x: outEnd.x + perpX, y: outEnd.y + perpY };

  const isACorrect = Math.random() < 0.5;

  return {
    id,
    difficultyLevel: clampedLevel,
    obstacle,
    incomingLine: { p1: inStart, p2: inEnd },
    lineOptionA: isACorrect
      ? { p1: outStart, p2: outEnd }
      : { p1: distractorStart, p2: distractorEnd },
    lineOptionB: isACorrect
      ? { p1: distractorStart, p2: distractorEnd }
      : { p1: outStart, p2: outEnd },
    correctChoice: isACorrect ? 'A' : 'B',
    parallelOffset,
    tolerance: parallelOffset,
  };
}

export function checkHit(choice: 'A' | 'B', question: PerspGestaltQuestion): PerspGestaltHitResult {
  const isHit = choice === question.correctChoice;
  return {
    isHit,
    userChoice: choice,
    correctChoice: question.correctChoice,
    errorValue: isHit ? 0 : 1,
    tolerance: question.tolerance,
  };
}
~~~~~

~~~~~act
write_file
src/cards/persp_gestalt_continuation/PerspGestaltContinuationView.tsx
~~~~~
~~~~~tsx
import { Eye } from 'lucide-preact';
import { CanvasView } from '../../components/common/CanvasView';
import { Standard2AfcView } from '../../components/common/Standard2AfcView';
import { useCardTranslation } from '../../core/i18n';
import type { PerspGestaltHitResult, PerspGestaltQuestion } from './types';
import { PERSPECTIVE_2AFC_SIZE, drawGestaltCanvas } from './utils/generator';

export interface PerspGestaltContinuationViewProps {
  question: PerspGestaltQuestion;
  showAnswer: boolean;
  userAnswer: PerspGestaltHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function PerspGestaltContinuationView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: PerspGestaltContinuationViewProps) {
  const { t } = useCardTranslation('persp_gestalt_continuation');
  const isAHit = question.correctChoice === 'A';
  const isBHit = question.correctChoice === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('views.hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      optionA={{
        title: t('views.optionA'),
        isCorrect: isAHit,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={PERSPECTIVE_2AFC_SIZE}
              height={PERSPECTIVE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawGestaltCanvas(
                  canvas,
                  question.obstacle,
                  question.incomingLine,
                  question.lineOptionA,
                  PERSPECTIVE_2AFC_SIZE,
                )
              }
              deps={[question.incomingLine, question.lineOptionA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: t('views.optionB'),
        isCorrect: isBHit,
        content: (
          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={PERSPECTIVE_2AFC_SIZE}
              height={PERSPECTIVE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawGestaltCanvas(
                  canvas,
                  question.obstacle,
                  question.incomingLine,
                  question.lineOptionB,
                  PERSPECTIVE_2AFC_SIZE,
                )
              }
              deps={[question.incomingLine, question.lineOptionB]}
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
src/cards/persp_gestalt_continuation/index.tsx
~~~~~
~~~~~tsx
import { Eye } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import { PerspGestaltContinuationView } from './PerspGestaltContinuationView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { PerspGestaltHitResult, PerspGestaltQuestion } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const perspGestaltContinuationCard: CardManifest<
  PerspGestaltQuestion,
  PerspGestaltHitResult,
  'A' | 'B',
  BaseModuleSettings
> = {
  id: 'persp_gestalt_continuation',
  domain: 'spatial_structure',
  icon: Eye,
  tags: {
    domain: ['spatial_structure'],
    path: ['relational_mapping'],
    challenge: ['illusion_piercing'],
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
      parallelOffset: q.parallelOffset,
      tolerance: hitResult.tolerance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <PerspGestaltContinuationView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
};

export default perspGestaltContinuationCard;
~~~~~

#### Acts 5: 创建 `persp_structure_3d`（3D 结构空间翻转）卡片

~~~~~act
write_file
src/cards/persp_structure_3d/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "3D Structural Rotation",
  "desc": "Translate orthographic tri-views into 3D isometric cube grid coordinates.",
  "instruction": "Locate the 3D point in the axonometric cube grid based on the 3 views.",
  "views": {
    "hint": "Observe the tri-view coordinates and select the corresponding 3D vertex inside the isometric grid"
  }
}
~~~~~

~~~~~act
write_file
src/cards/persp_structure_3d/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "3D 结构空间翻转",
  "desc": "观察正交三视图标点，在 3D 透视立方体点阵中定位对应的三维空间坐标点。",
  "instruction": "结合三视图坐标，在 3D 立方体点阵中点选对应点",
  "views": {
    "hint": "观察左侧正交三视图标点，在右侧 3D 立方体透视点阵中选出对应空间坐标点"
  }
}
~~~~~

~~~~~act
write_file
src/cards/persp_structure_3d/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface PerspStructure3DQuestion {
  id: string;
  difficultyLevel: number;
  gridDim3D: number;
  targetPoint3D: Point3D;
  projectedGridPoints: Point[];
  targetProjectedPoint: Point;
  tolerance: number;
}

export interface PerspStructure3DHitResult {
  isHit: boolean;
  userValue: Point;
  targetValue?: Point;
  errorValue: number;
  tolerance: number;
}
~~~~~

~~~~~act
write_file
src/cards/persp_structure_3d/utils/generator.ts
~~~~~
~~~~~typescript
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';
import type { PerspStructure3DHitResult, PerspStructure3DQuestion, Point3D } from '../types';

export const PERSPECTIVE_CANVAS_SIZE = 340;

export function project3DTo2D(p: Point3D, center: Point, scale: number): Point {
  const rad30 = (30 * Math.PI) / 180;
  const screenX = center.x + (p.x * Math.cos(rad30) - p.z * Math.cos(rad30)) * scale;
  const screenY = center.y - (p.y - p.x * Math.sin(rad30) - p.z * Math.sin(rad30)) * scale;

  return {
    x: Math.round(screenX * 10) / 10,
    y: Math.round(screenY * 10) / 10,
  };
}

export function draw3DCubeWireframe(
  ctx: CanvasRenderingContext2D,
  center: Point,
  scale: number,
  dim: number,
): void {
  const maxCoord = dim - 1;
  const vertices: Point3D[] = [
    { x: 0, y: 0, z: 0 },
    { x: maxCoord, y: 0, z: 0 },
    { x: maxCoord, y: maxCoord, z: 0 },
    { x: 0, y: maxCoord, z: 0 },
    { x: 0, y: 0, z: maxCoord },
    { x: maxCoord, y: 0, z: maxCoord },
    { x: maxCoord, y: maxCoord, z: maxCoord },
    { x: 0, y: maxCoord, z: maxCoord },
  ];

  const p2d = vertices.map((v) => project3DTo2D(v, center, scale));

  ctx.strokeStyle = CANVAS_THEME.axis.grid;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);

  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];

  for (const [start, end] of edges) {
    ctx.beginPath();
    ctx.moveTo(p2d[start].x, p2d[start].y);
    ctx.lineTo(p2d[end].x, p2d[end].y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

export function generateQuestion(level: number): PerspStructure3DQuestion {
  const id = `psp_3d_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  const gridDim3D = clampedLevel > 15 ? 4 : 3;
  const targetPoint3D: Point3D = {
    x: Math.floor(Math.random() * gridDim3D),
    y: Math.floor(Math.random() * gridDim3D),
    z: Math.floor(Math.random() * gridDim3D),
  };

  const center: Point = {
    x: PERSPECTIVE_CANVAS_SIZE / 2,
    y: PERSPECTIVE_CANVAS_SIZE / 2 + 10,
  };
  const scale = gridDim3D === 4 ? 42 : 55;

  const projectedGridPoints: Point[] = [];
  for (let x = 0; x < gridDim3D; x++) {
    for (let y = 0; y < gridDim3D; y++) {
      for (let z = 0; z < gridDim3D; z++) {
        projectedGridPoints.push(project3DTo2D({ x, y, z }, center, scale));
      }
    }
  }

  const targetProjectedPoint = project3DTo2D(targetPoint3D, center, scale);

  return {
    id,
    difficultyLevel: clampedLevel,
    gridDim3D,
    targetPoint3D,
    projectedGridPoints,
    targetProjectedPoint,
    tolerance: 0.5,
  };
}

export function checkHit(clickPoint: Point, question: PerspStructure3DQuestion): PerspStructure3DHitResult {
  const target = question.targetProjectedPoint;
  const dist = target
    ? Math.sqrt((clickPoint.x - target.x) ** 2 + (clickPoint.y - target.y) ** 2)
    : 999;
  const isHit = dist <= 12;

  return {
    isHit,
    userValue: clickPoint,
    targetValue: target,
    errorValue: Math.round(dist * 10) / 10,
    tolerance: question.tolerance,
  };
}
~~~~~

~~~~~act
write_file
src/cards/persp_structure_3d/PerspStructure3DView.tsx
~~~~~
~~~~~tsx
import { Box } from 'lucide-preact';
import { PointClickCanvas } from '../../components/common/PointClickCanvas';
import { QuestionCardShell } from '../../components/common/QuestionCardShell';
import { useCardTranslation, useTranslation } from '../../core/i18n';
import type { Point } from '../../types';
import type { PerspStructure3DHitResult, PerspStructure3DQuestion } from './types';
import { PERSPECTIVE_CANVAS_SIZE, draw3DCubeWireframe } from './utils/generator';

export interface PerspStructure3DViewProps {
  question: PerspStructure3DQuestion;
  showAnswer: boolean;
  userAnswer: PerspStructure3DHitResult | null;
  onAnswer: (point: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function PerspStructure3DView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: PerspStructure3DViewProps) {
  const { t: cardT } = useCardTranslation('persp_structure_3d');
  const { t: commonT } = useTranslation();
  const isHit = Boolean(userAnswer?.isHit);
  const targetPt3D = question.targetPoint3D;
  const dim = question.gridDim3D ?? 3;

  return (
    <QuestionCardShell
      hintText={cardT('views.hint')}
      hintIcon={Box}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full items-center">
        {/* 左侧三视图正交切面预览 */}
        <div className="bg-muted/60 p-4 rounded-2xl border border-border flex flex-col gap-3">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">
            {commonT('common.viewTriAxis')}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-muted-foreground">
            {/* 顶视图 (X-Z) */}
            <div className="flex flex-col items-center gap-1 bg-card p-2 rounded-xl border border-border">
              <span className="text-muted-foreground font-bold">{commonT('common.topView')}</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 dark:border-indigo-900 rounded grid relative bg-muted/40"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.x + 0.5) / dim) * 100}%`,
                      top: `${((targetPt3D.z + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* 正视图 (X-Y) */}
            <div className="flex flex-col items-center gap-1 bg-card p-2 rounded-xl border border-border">
              <span className="text-muted-foreground font-bold">{commonT('common.frontView')}</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 dark:border-indigo-900 rounded grid relative bg-muted/40"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.x + 0.5) / dim) * 100}%`,
                      top: `${((dim - 1 - targetPt3D.y + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* 侧视图 (Z-Y) */}
            <div className="flex flex-col items-center gap-1 bg-card p-2 rounded-xl border border-border">
              <span className="text-muted-foreground font-bold">{commonT('common.sideView')}</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 dark:border-indigo-900 rounded grid relative bg-muted/40"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.z + 0.5) / dim) * 100}%`,
                      top: `${((dim - 1 - targetPt3D.y + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧 3D 立方体透视交互点阵 */}
        <div className="flex justify-center">
          <PointClickCanvas
            canvasSize={PERSPECTIVE_CANVAS_SIZE}
            gridPoints={question.projectedGridPoints || []}
            targetPoint={question.targetProjectedPoint}
            showAnswer={showAnswer}
            isHit={isHit}
            disabled={disabled}
            onCommitPoint={onAnswer}
            customOverlayRender={(ctx) => {
              const center = {
                x: PERSPECTIVE_CANVAS_SIZE / 2,
                y: PERSPECTIVE_CANVAS_SIZE / 2 + 10,
              };
              const scale = dim === 4 ? 42 : 55;
              draw3DCubeWireframe(ctx, center, scale, dim);
            }}
          />
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/cards/persp_structure_3d/index.tsx
~~~~~
~~~~~tsx
import { Box } from 'lucide-preact';
import type { CardManifest } from '../../core/cardContract';
import type { BaseModuleSettings } from '../../storage/settings';
import type { Point } from '../../types';
import { PerspStructure3DView } from './PerspStructure3DView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { PerspStructure3DHitResult, PerspStructure3DQuestion } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const perspStructure3DCard: CardManifest<
  PerspStructure3DQuestion,
  PerspStructure3DHitResult,
  Point,
  BaseModuleSettings
> = {
  id: 'persp_structure_3d',
  domain: 'spatial_structure',
  icon: Box,
  tags: {
    domain: ['spatial_structure'],
    path: ['absolute_estimation'],
    challenge: ['dimensional_translation'],
    interaction: ['spatial_locate'],
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
      userAnswer: [userVal.x, userVal.y],
      targetValue: [q.targetProjectedPoint.x, q.targetProjectedPoint.y],
      targetPoint3D: q.targetPoint3D,
      errorValue: hitResult.errorValue,
      tolerance: hitResult.tolerance,
    }),
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <PerspStructure3DView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
};

export default perspStructure3DCard;
~~~~~

#### Acts 6: 物理移除旧的 `src/packs/perspective/` 目录

~~~~~act
delete_file
src/packs/perspective/components/GestaltContinuation2AfcView.tsx
~~~~~

~~~~~act
delete_file
src/packs/perspective/components/PerspectiveVpView.tsx
~~~~~

~~~~~act
delete_file
src/packs/perspective/components/ProportionDivisionView.tsx
~~~~~

~~~~~act
delete_file
src/packs/perspective/components/ProportionMigrationView.tsx
~~~~~

~~~~~act
delete_file
src/packs/perspective/components/StructureProjection3DView.tsx
~~~~~

~~~~~act
delete_file
src/packs/perspective/locales/en-US.json
~~~~~

~~~~~act
delete_file
src/packs/perspective/locales/zh-CN.json
~~~~~

~~~~~act
delete_file
src/packs/perspective/utils/perspectiveCanvas.ts
~~~~~

~~~~~act
delete_file
src/packs/perspective/utils/perspectiveGenerators.ts
~~~~~

~~~~~act
delete_file
src/packs/perspective/utils/perspectiveTypes.ts
~~~~~

~~~~~act
delete_file
src/packs/perspective/utils/perspectiveUtils.ts
~~~~~

~~~~~act
delete_file
src/packs/perspective/views/PerspectiveCanvas.tsx
~~~~~

~~~~~act
delete_file
src/packs/perspective/index.ts
~~~~~

~~~~~act
delete_file
src/packs/perspective/plugin.tsx
~~~~~

### 下一步建议
1. 运行 `pnpm build` 进行全量编译验证，确保 5 张空间透视卡片被注册中心顺利加载且无类型报错。
2. 至此，**阶段 2（几何与结构域迁移：Angle 3 张 + Perspective 5 张）已全部圆满完成**。
3. 随后可以继续推进**阶段 3：色彩感知域迁移（Color 4 张 & Relative Color 4 张）**。
