现在开始执行**阶段一·批次 C：连续滑块卡片（Continuous Slider）**。

我们将重构全部 6 张连续滑块交互卡片（`abs_gesture_axis`、`abs_notan_threshold`、`angle_estimation`、`fractal_edge_roughness`、`neg_ratio_estimation`、`persp_vp_convergence`），彻底剥离 `StandardSliderView`，全面改用无头指针 Hook `useTrackPointer` + 原子组件 `SliderTrack` 进行原生扁平组合。

## [WIP] refactor: 重构批次 C 全量连续滑块卡片至原子组合架构

### 用户需求
落实路线图中的批次 C：将全部使用连续滑块交互的业务卡片彻底解构，淘汰 `StandardSliderView` 包装层，统一采用 `useTrackPointer` 处理指针追踪与拖拽计算，通过 `SliderTrack` 呈现轨道与容错，展开各卡片独有的画布渲染、动态双视口与参数详情。

### 评论
连续滑块卡片具有最细致的交互反馈（实时悬停联动、外延点击命中、多模式提交、动态容错带）。过去由于所有卡片都被硬塞进同一个具有多重插槽的 Wrapper 中，当个别卡片需要定制视口布局（如二值素描的左右双视口）、独立计算精度（如分形粗糙度 0.01 步长）或按钮提交时，Wrapper 内部充斥着大量条件分支。解构后，各卡片拥有完全自治的 DOM 组织权。

### 目标
1. 重构 6 张连续滑块交互卡片视图：
   - `abs_gesture_axis/AbsGestureAxisView.tsx`（动态势线角度提取）
   - `abs_notan_threshold/AbsNotanThresholdView.tsx`（黑白素描二值化阈值）
   - `angle_estimation/AngleEstimationView.tsx`（夹角大小估算）
   - `fractal_edge_roughness/FractalEdgeRoughnessView.tsx`（分形边缘粗糙度）
   - `neg_ratio_estimation/NegRatioEstimationView.tsx`（负形占比评估）
   - `persp_vp_convergence/PerspVpConvergenceView.tsx`（透视灭点汇聚角）
2. 确保释放提交（`commit_on_release`）与按钮/空格提交（`submit_button`）交互逻辑顺畅稳定。

### 基本原理
利用 `<QuestionCardShell>` 作为顶层容器，卡片专属内容（如 `CanvasView`、`DualViewportContainer` 或分形边缘视口）以普通子元素形式居中排布。滑块区域由标准 `useTrackPointer` Hook 提供响应式属性与实时数值，搭配纯视觉原子组件 `<SliderTrack>` 绘制指示线与容错区间。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/ui #scope/dx #scope/ux #ai/instruct #task/domain/ui #task/object/batch-c-slider #task/action/refactor #task/state/continue #task/status/active

---

### Script

#### Acts 1: 重构动态势线与黑白素描阈值卡片视图

~~~~~act
write_file
src/cards/abs_gesture_axis/AbsGestureAxisView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import {
  CANVAS_THEME,
  CanvasView,
  QuestionCardShell,
  SliderTrack,
  useCardTranslation,
  useTrackPointer,
} from '@formsight/card-sdk';
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
  showToleranceBand = true,
  showCanvasHints = true,
}: AbsGestureAxisViewProps) {
  const { t } = useCardTranslation('abs_gesture_axis');
  const [currentVal, setCurrentVal] = useState<number>(90);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 180,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });

  useEffect(() => {
    setCurrentVal(90);
    setHoverVal(null);
  }, [question.id, setHoverVal]);

  const targetVal = question.targetAngleDeg;
  const isHit = Boolean(userAnswer?.isHit);
  const activeSliderVal = hoverVal !== null ? hoverVal : currentVal;
  const userVal = userAnswer?.userValue ?? activeSliderVal;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
    >
      {/* 粒子流向预览画布 */}
      <div className="bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex justify-center items-center w-full">
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

      {/* 势线角度连续调节滑块 */}
      <div className="w-full space-y-3 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>{t('label')}</span>
          <span className="font-mono text-base font-black text-primary">
            {showAnswer && userAnswer?.userValue !== undefined ? `${userAnswer.userValue}°` : `${activeSliderVal}°`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-muted-foreground text-xs">0°</span>
          <SliderTrack
            trackRef={trackRef}
            pointerProps={pointerProps}
            activeVal={activeSliderVal}
            max={180}
            min={0}
            hitMargin={hitMargin}
            disabled={disabled}
            showAnswer={showAnswer}
            targetValue={targetVal}
            userValue={userAnswer?.userValue}
            tolerance={question.tolerance}
            showToleranceBand={showToleranceBand}
            isHit={isHit}
          />
          <span className="font-bold font-mono text-muted-foreground text-xs">180°</span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/cards/abs_notan_threshold/AbsNotanThresholdView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import {
  CanvasView,
  DualViewportContainer,
  QuestionCardShell,
  SliderTrack,
  useCardTranslation,
  useTrackPointer,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE, drawNotanNoiseField, drawRawGrayscaleNoiseField } from './utils/generator';

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
  showToleranceBand = true,
  showCanvasHints = true,
}: AbsNotanThresholdViewProps) {
  const { t } = useCardTranslation('abs_notan_threshold');
  const [currentVal, setCurrentVal] = useState<number>(50);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 100,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });

  useEffect(() => {
    setCurrentVal(50);
    setHoverVal(null);
  }, [question.id, setHoverVal]);

  const targetVal = question.idealNotanThreshold;
  const isHit = Boolean(userAnswer?.isHit);
  const activeVal = hoverVal !== null ? hoverVal : currentVal;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      {/* 灰阶原图与二值显影双视口 */}
      <DualViewportContainer
        leftTitle={t('rawScene')}
        rightTitle={t('notanOutput')}
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

      {/* 二值化截断阈值滑块 */}
      <div className="w-full space-y-3 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>{t('label')}</span>
          <span className="font-mono text-base font-black text-primary">
            {showAnswer && userAnswer?.userValue !== undefined ? `${userAnswer.userValue}%` : `${activeVal}%`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-muted-foreground text-xs">0%</span>
          <SliderTrack
            trackRef={trackRef}
            pointerProps={pointerProps}
            activeVal={activeVal}
            max={100}
            min={0}
            hitMargin={hitMargin}
            disabled={disabled}
            showAnswer={showAnswer}
            targetValue={targetVal}
            userValue={userAnswer?.userValue}
            tolerance={question.tolerance}
            showToleranceBand={showToleranceBand}
            isHit={isHit}
          />
          <span className="font-bold font-mono text-muted-foreground text-xs">100%</span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

#### Acts 2: 重构夹角估算与分形粗糙度卡片视图

~~~~~act
write_file
src/cards/angle_estimation/AngleEstimationView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import {
  CanvasView,
  QuestionCardShell,
  SliderTrack,
  useCardTranslation,
  useTrackPointer,
} from '@formsight/card-sdk';
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
  const [currentVal, setCurrentVal] = useState<number>(90);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 180,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });

  useEffect(() => {
    setCurrentVal(90);
    setHoverVal(null);
  }, [question.id, setHoverVal]);

  const targetVal = question.targetAngleDeg ?? 90;
  const tolerance = question.tolerance;
  const isHit = Boolean(userAnswer?.isHit);
  const activeVal = hoverVal !== null ? hoverVal : currentVal;
  const userVal = userAnswer?.userValue;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
    >
      {/* 夹角展示画布 */}
      <div className="bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex justify-center items-center w-full">
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

      {/* 夹角角度滑块与真理比对 */}
      <div className="w-full space-y-3 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>{t('label')}</span>
          <span className="font-mono text-base font-black text-primary">
            {showAnswer && userVal !== undefined ? `${userVal}°` : `${activeVal}°`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-muted-foreground text-xs">0°</span>
          <SliderTrack
            trackRef={trackRef}
            pointerProps={pointerProps}
            activeVal={activeVal}
            max={180}
            min={0}
            hitMargin={hitMargin}
            disabled={disabled}
            showAnswer={showAnswer}
            targetValue={targetVal}
            userValue={userVal}
            tolerance={tolerance}
            showToleranceBand={showToleranceBand}
            isHit={isHit}
          />
          <span className="font-bold font-mono text-muted-foreground text-xs">180°</span>
        </div>

        {showAnswer && userVal !== undefined && (
          <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">
              {t('trueAngle')}{' '}
              <span className="font-bold text-foreground font-mono">{targetVal}°</span>
            </span>
            <span
              className={
                isHit
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-rose-600 dark:text-rose-400 font-bold'
              }
            >
              {t('errorInfo', {
                error: Math.round(Math.abs(userVal - targetVal) * 10) / 10,
                tolerance,
              })}
            </span>
          </div>
        )}
      </div>
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/cards/fractal_edge_roughness/FractalEdgeRoughnessView.tsx
~~~~~
~~~~~typescript
import { useEffect, useRef, useState } from 'preact/hooks';

import {
  CANVAS_THEME,
  QuestionCardShell,
  SliderTrack,
  setupHiDpiCanvas,
  useCardTranslation,
  useTrackPointer,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
import { CANVAS_HEIGHT, CANVAS_WIDTH, generateFractalLine } from './utils/generator';

export interface FractalEdgeRoughnessViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
}

export function FractalEdgeRoughnessView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: FractalEdgeRoughnessViewProps) {
  const { t } = useCardTranslation('fractal_edge_roughness');
  const [currentH, setCurrentH] = useState<number>(0.5);

  const targetCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const userCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 1.0,
    step: 0.01,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentH(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });

  useEffect(() => {
    setCurrentH(0.5);
    setHoverVal(null);
  }, [question.id, setHoverVal]);

  // 1. 绘制目标边缘波形
  useEffect(() => {
    const canvas = targetCanvasRef.current;
    if (!canvas) return;
    const ctx = setupHiDpiCanvas(canvas, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (!ctx) return;

    ctx.fillStyle = CANVAS_THEME.bg.primary;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const points = generateFractalLine(question.targetH, question.targetSeed);
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = CANVAS_THEME.shape.stroke;
      ctx.lineWidth = 1.75;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }, [question.targetH, question.targetSeed]);

  // 2. 绘制用户当前调节边缘波形
  const activeH = showAnswer && userAnswer ? userAnswer.userH : hoverVal !== null ? hoverVal : currentH;
  useEffect(() => {
    const canvas = userCanvasRef.current;
    if (!canvas) return;
    const ctx = setupHiDpiCanvas(canvas, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (!ctx) return;

    ctx.fillStyle = CANVAS_THEME.bg.primary;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const points = generateFractalLine(activeH, question.userSeed);
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }

      ctx.strokeStyle = showAnswer
        ? userAnswer?.isHit
          ? CANVAS_THEME.status.hit
          : CANVAS_THEME.status.miss
        : CANVAS_THEME.status.accent;
      ctx.lineWidth = 1.85;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }, [activeH, question.userSeed, showAnswer, userAnswer]);

  return (
    <QuestionCardShell
      hintText={t('instruction')}
      maxWidth="max-w-2xl"
    >
      {/* 边缘对比视口 */}
      <div className="w-full space-y-3">
        <div className="relative rounded-2xl border border-border bg-card p-3 shadow-inner">
          <span className="absolute top-2.5 left-3.5 text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
            {t('targetEdge')}
          </span>
          <canvas
            ref={targetCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-24 sm:h-28 rounded-xl block"
          />
        </div>

        <div className="relative rounded-2xl border-2 border-primary/40 bg-card p-3 shadow-inner">
          <span className="absolute top-2.5 left-3.5 text-[10px] font-mono font-bold text-primary uppercase tracking-wider">
            {t('userEdge')}
          </span>
          <canvas
            ref={userCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-24 sm:h-28 rounded-xl block"
          />
        </div>
      </div>

      {/* Hurst 指数滑块调节区 */}
      <div className="w-full space-y-3 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>{t('hurstExponent')}</span>
          <span className="font-mono text-base font-black text-primary">
            {activeH.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-muted-foreground text-xs">0.1</span>
          <SliderTrack
            trackRef={trackRef}
            pointerProps={pointerProps}
            activeVal={activeH}
            max={1.0}
            min={0}
            disabled={disabled}
            showAnswer={showAnswer}
            targetValue={question.targetH}
            userValue={userAnswer?.userH}
            tolerance={question.tolerance}
            showToleranceBand={true}
            isHit={userAnswer?.isHit}
          />
          <span className="font-bold font-mono text-muted-foreground text-xs">1.0</span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

#### Acts 3: 重构负形比例估算与透视灭点汇聚卡片视图

~~~~~act
write_file
src/cards/neg_ratio_estimation/NegRatioEstimationView.tsx
~~~~~
~~~~~typescript
import { Maximize2 } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import {
  Button,
  CANVAS_THEME,
  CanvasView,
  QuestionCardShell,
  SliderTrack,
  drawPolygonCanvas,
  useCardTranslation,
  useSubmitShortcut,
  useTrackPointer,
} from '@formsight/card-sdk';
import { type HitResult, NEGATIVE_SPACE_CANVAS_SIZE, type QuestionData } from './types';

export interface NegRatioEstimationViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function NegRatioEstimationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: NegRatioEstimationViewProps) {
  const { t } = useCardTranslation('neg_ratio_estimation');
  const [currentVal, setCurrentVal] = useState<number>(50.0);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 100,
    step: 0.1,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
  });

  useEffect(() => {
    setCurrentVal(50.0);
    setHoverVal(null);
  }, [question.id, setHoverVal]);

  const handleSubmit = () => {
    if (!disabled && !showAnswer) onAnswer(currentVal);
  };

  useSubmitShortcut({
    disabled: disabled || showAnswer,
    onSubmit: handleSubmit,
  });

  const { targetNegativeRatio, tolerance } = question;
  const isHit = Boolean(userAnswer?.isHit);
  const activeVal = hoverVal !== null ? hoverVal : currentVal;

  return (
    <QuestionCardShell
      hintText={t('ratioHint')}
      hintIcon={Maximize2}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
    >
      {/* 负形多边形画布 */}
      <div className="bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex justify-center items-center w-full">
        <CanvasView
          width={NEGATIVE_SPACE_CANVAS_SIZE}
          height={NEGATIVE_SPACE_CANVAS_SIZE}
          className="w-full max-w-[340px] aspect-square rounded-xl border border-border shadow-sm bg-card"
          draw={(canvas) => {
            if (question.vertices) {
              drawPolygonCanvas({
                canvas,
                vertices: question.vertices,
                size: NEGATIVE_SPACE_CANVAS_SIZE,
                fillColor: CANVAS_THEME.shape.fill,
                strokeColor: CANVAS_THEME.shape.stroke,
                isHighlighted: showAnswer && isHit,
              });
            }
          }}
          deps={[question.vertices, showAnswer, isHit]}
        />
      </div>

      {/* 负形比例估算滑块 */}
      <div className="w-full space-y-3 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>{t('ratioLabel')}</span>
          <span className="font-mono text-base font-black text-primary">
            {showAnswer && userAnswer?.userRatio !== undefined ? `${userAnswer.userRatio}%` : `${activeVal.toFixed(1)}%`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-muted-foreground text-xs">0%</span>
          <SliderTrack
            trackRef={trackRef}
            pointerProps={pointerProps}
            activeVal={activeVal}
            max={100}
            min={0}
            hitMargin={hitMargin}
            disabled={disabled}
            showAnswer={showAnswer}
            targetValue={targetNegativeRatio}
            userValue={userAnswer?.userRatio}
            tolerance={tolerance}
            showToleranceBand={showToleranceBand}
            isHit={isHit}
          />
          <span className="font-bold font-mono text-muted-foreground text-xs">100%</span>
        </div>
      </div>

      {/* 二段显式确认按钮（支持空格键） */}
      {!showAnswer && (
        <Button
          variant="default"
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full py-3 h-auto rounded-2xl"
        >
          {t('common.confirmSpace')}
        </Button>
      )}
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/cards/persp_vp_convergence/PerspVpConvergenceView.tsx
~~~~~
~~~~~typescript
import { Sliders } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import {
  CanvasView,
  QuestionCardShell,
  SliderTrack,
  useCardTranslation,
  useTrackPointer,
} from '@formsight/card-sdk';
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
  const [currentVal, setCurrentVal] = useState<number>(180);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 360,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });

  useEffect(() => {
    setCurrentVal(180);
    setHoverVal(null);
  }, [question.id, setHoverVal]);

  const targetVal = question.targetAngleDeg ?? 0;
  const tolerance = question.tolerance;
  const isHit = Boolean(userAnswer?.isHit);
  const userVal = userAnswer?.userValue;
  const activeVal = hoverVal !== null ? hoverVal : currentVal;
  const currentActiveAngle = showAnswer && userVal !== undefined ? userVal : activeVal;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Sliders}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
    >
      {/* 透视线灭点汇聚画布 */}
      <div className="bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex justify-center items-center w-full">
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

      {/* 射线倾角滑块与误差反馈 */}
      <div className="w-full space-y-3 bg-muted/60 p-4 rounded-2xl border border-border/60">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>{t('rayAngle')}</span>
          <span className="font-mono text-base font-black text-primary">
            {showAnswer && userVal !== undefined ? `${userVal}°` : `${activeVal}°`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-muted-foreground text-xs">0°</span>
          <SliderTrack
            trackRef={trackRef}
            pointerProps={pointerProps}
            activeVal={activeVal}
            max={360}
            min={0}
            hitMargin={hitMargin}
            disabled={disabled}
            showAnswer={showAnswer}
            targetValue={targetVal}
            userValue={userVal}
            tolerance={tolerance}
            showToleranceBand={showToleranceBand}
            isHit={isHit}
          />
          <span className="font-bold font-mono text-muted-foreground text-xs">360°</span>
        </div>

        {showAnswer && userVal !== undefined && (
          <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">
              {t('vpTrueAngle')}{' '}
              <span className="font-bold text-foreground font-mono">{targetVal}°</span>
            </span>
            <span
              className={
                isHit
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-rose-600 dark:text-rose-400 font-bold'
              }
            >
              {t('vpErrorInfo', {
                error: userAnswer?.errorValue ?? 0,
                tolerance,
              })}
            </span>
          </div>
        )}
      </div>
    </QuestionCardShell>
  );
}
~~~~~

---

### 下一步建议

至此，**阶段一全部 3 个批次（共 20 处视图重构）已全量实施交付**：
- 批次 A：10 张 2AFC 二分选择卡片
- 批次 B：4 张 N-AFC 多元选择卡片
- 批次 C：6 张连续滑块交互卡片

目前项目中已没有任何业务卡片在引用 `Standard2AfcView`、`StandardNafcView`、`StandardSliderView`、`Choice2AfcContainer` 或 `ChoiceNafcContainer`。

下一步建议推进**阶段三：旧容器淘汰、依赖清理与 SDK 固化**：
彻底删除这 5 个冗余组件文件，清理 `src/card-sdk/index.ts` 中的过期声明，完成代码基石的纯化。
