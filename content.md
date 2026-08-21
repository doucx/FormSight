好的，我们现在推进通用滑块交互壳 `<StandardSliderView />` 的封装，将角度估算、势线提取、负形占比估算和黑白素描归组 4 个核心连续滑块卡片全面迁移至统一抽象壳层。

## [WIP] refactor: 抽象通用 StandardSliderView 并重构连续滑块类卡片

### 用户需求
将分散在各个领域组件中的滑块交互管理、容错指示区间、悬停/拖拽指针逻辑、作答揭晓与键盘响应逻辑抽取为通用组件 `<StandardSliderView />`，消除重复样板代码。

### 评论
连续滑块交互在视觉训练中广泛用于估算类与调和类卡片。将滑块轨道控制、容错感应线与真理/作答标记线统一封装后，业务组件只需关注具体的数学模型与 Canvas 渲染，不仅代码量减少约 60%，而且保证了全站滑块交互体验的高度一致性。

### 目标
1. 新建 `src/components/common/StandardSliderView.tsx`：支持释放即提交 (`commit_on_release`) 与显式按钮提交 (`button`) 两种触发模式，并内置容错光标、悬停联动和真理指示标记。
2. 重构以下 4 个滑块交互视图组件：
   - `src/domains/angle/components/AngleEstimationView.tsx`
   - `src/domains/abstraction/components/GestureAxisView.tsx`
   - `src/domains/negative_space/components/RatioEstimationView.tsx`
   - `src/domains/abstraction/components/NotanThresholdView.tsx`

### 基本原理
- `<StandardSliderView />` 组合了 `QuestionCardShell`、`useTrackPointer` 和通用滑块轨道渲染逻辑，通过 `preview` 属性插槽接收单视口或双视口 Canvas。
- 外部可通过 `onValueChange` 接收实时悬停值，驱动上方 Canvas 进行试探性重绘（如粒子流向预览、Notan 阈值二值显影等），解耦了 DOM 事件与绘图管线。

### 标签
#intent/refine #flow/ready #priority/high
#comp/components #scope/dx #scope/core
#ai/instruct
#task/domain/refactoring
#task/object/slider-view-primitive
#task/action/abstraction-and-consolidation
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 创建通用 `<StandardSliderView />` 组件

~~~~~act
write_file
src/components/common/StandardSliderView.tsx
~~~~~
~~~~~typescript
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { useTrackPointer } from '../../hooks/useTrackPointer';
import { QuestionCardShell } from './QuestionCardShell';

export interface StandardSliderViewProps {
  questionId: string;
  hintText?: string;
  hintIcon?: (props: { className?: string }) => ComponentChildren;
  showCanvasHints?: boolean;
  maxWidth?: string;
  preview: ComponentChildren;

  // 滑块基本属性
  label: string;
  min?: number;
  max: number;
  step?: number;
  initialValue?: number;
  unit?: string;
  formatValue?: (val: number) => string;

  // 答案揭晓与容错评估
  targetValue?: number;
  tolerance?: number;
  showToleranceBand?: boolean;
  showAnswer: boolean;
  isHit?: boolean;
  userValue?: number;

  // 交互控制
  disabled?: boolean;
  hitMargin?: number;
  submitMode?: 'commit_on_release' | 'button' | 'both';
  submitButtonText?: string;
  onValueChange?: (currentVal: number, activeVal: number) => void;
  onAnswer: (val: number) => void;

  // 底部附加卡片槽位
  footerDetails?: ComponentChildren;
}

export function StandardSliderView({
  questionId,
  hintText,
  hintIcon,
  showCanvasHints = true,
  maxWidth = 'max-w-lg',
  preview,
  label,
  min = 0,
  max,
  step = 0.5,
  initialValue,
  unit = '',
  formatValue,
  targetValue,
  tolerance,
  showToleranceBand = true,
  showAnswer,
  isHit = false,
  userValue,
  disabled = false,
  hitMargin = 12,
  submitMode = 'commit_on_release',
  submitButtonText = '确认提交 (Space)',
  onValueChange,
  onAnswer,
  footerDetails,
}: StandardSliderViewProps) {
  const defaultVal = initialValue ?? (max - min) / 2;
  const [currentVal, setCurrentVal] = useState<number>(defaultVal);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max,
    step,
    disabled: disabled || showAnswer,
    onValChange: (val) => {
      setCurrentVal(val);
      onValueChange?.(val, val);
    },
    onHoverStateChange: (hVal) => {
      onValueChange?.(currentVal, hVal !== null ? hVal : currentVal);
    },
    onCommit: (val) => {
      if (submitMode === 'commit_on_release' || submitMode === 'both') {
        if (!disabled && !showAnswer) {
          onAnswer(val);
        }
      }
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset slider when questionId changes
  useEffect(() => {
    setCurrentVal(defaultVal);
    setHoverVal(null);
    onValueChange?.(defaultVal, defaultVal);
  }, [questionId, defaultVal, setHoverVal]);

  // 支持键盘 Space 键提交（在显式按钮提交模式下）
  useEffect(() => {
    if (submitMode !== 'button' && submitMode !== 'both') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (disabled || showAnswer) return;
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        onAnswer(currentVal);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitMode, disabled, showAnswer, currentVal, onAnswer]);

  const activeVal = hoverVal !== null ? hoverVal : currentVal;
  const displayVal = showAnswer && userValue !== undefined ? userValue : activeVal;
  const formattedDisplay = formatValue ? formatValue(displayVal) : `${displayVal}${unit}`;

  const valToPercent = (val: number) => {
    const clamped = Math.max(0, Math.min(max, val));
    return `${(clamped / max) * 100}%`;
  };

  const isButtonSubmit = submitMode === 'button' || submitMode === 'both';

  return (
    <QuestionCardShell
      hintText={hintText}
      hintIcon={hintIcon}
      showCanvasHints={showCanvasHints}
      maxWidth={maxWidth}
    >
      {preview}

      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>{label}</span>
          <span className="font-mono text-base font-black text-indigo-600">{formattedDisplay}</span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-slate-400 text-xs">
            {min}
            {unit}
          </span>

          <div
            {...pointerProps}
            style={
              hitMargin > 0
                ? {
                    paddingLeft: `${hitMargin}px`,
                    paddingRight: `${hitMargin}px`,
                    marginLeft: `-${hitMargin}px`,
                    marginRight: `-${hitMargin}px`,
                    paddingTop: '6px',
                    paddingBottom: '6px',
                    marginTop: '-6px',
                    marginBottom: '-6px',
                  }
                : undefined
            }
            className={`relative flex-1 flex items-center select-none touch-none ${
              !showAnswer && !disabled ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <div
              ref={trackRef}
              className="relative w-full h-7 rounded-xl bg-slate-200 border border-slate-300/80 shadow-inner flex items-center overflow-hidden"
            >
              {/* 当前激活进度条 */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-indigo-500/20"
                style={{ width: valToPercent(activeVal) }}
              />

              {/* 未揭晓状态下的指针 */}
              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                  style={{ left: valToPercent(activeVal) }}
                />
              )}

              {/* 动态容错感应区间 */}
              {!showAnswer && showToleranceBand && tolerance !== undefined && tolerance > 0 && (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: valToPercent(activeVal - tolerance) }}
                  />
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: valToPercent(activeVal + tolerance) }}
                  />
                </>
              )}

              {/* 答案揭晓：真理线与用户作答线 */}
              {showAnswer && targetValue !== undefined && (
                <>
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                    style={{ left: valToPercent(targetValue) }}
                  />
                  {userValue !== undefined && (
                    <div
                      className={`absolute top-0 bottom-0 w-1 -translate-x-1/2 z-10 border-x border-white shadow-md ${
                        isHit ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ left: valToPercent(userValue) }}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <span className="font-bold font-mono text-slate-400 text-xs">
            {max}
            {unit}
          </span>
        </div>

        {footerDetails}
      </div>

      {isButtonSubmit && !showAnswer && (
        <button
          type="button"
          onClick={() => {
            if (!disabled && !showAnswer) onAnswer(currentVal);
          }}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all cursor-pointer"
        >
          {submitButtonText}
        </button>
      )}
    </QuestionCardShell>
  );
}
~~~~~

#### Acts 2: 重构角度估算与势线提取组件

~~~~~act
write_file
src/domains/angle/components/AngleEstimationView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import {
  ANGLE_CANVAS_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawAngleCanvas,
} from '../utils/angleUtils';

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
  const targetVal = question.targetAngleDeg ?? 90;
  const tolerance = question.tolerance;
  const isHit = Boolean(userAnswer?.isHit);
  const userVal = userAnswer?.userValue;

  return (
    <StandardSliderView
      questionId={question.id}
      hintText="观察两射线夹角，调制滑块逼近精准度数 (0°~180°)"
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label="夹角估算值:"
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
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
          <CanvasView
            width={ANGLE_CANVAS_SIZE}
            height={ANGLE_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white"
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
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              绝对真理值:{' '}
              <span className="font-bold text-slate-800 font-mono">{targetVal}°</span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              误差: {Math.round(Math.abs(userVal - targetVal) * 10) / 10}° (容错: ±{tolerance}°)
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
src/domains/abstraction/components/GestureAxisView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import { drawParticlesCanvas } from '../../../utils/canvas/drawParticles';
import {
  ABSTRACTION_CANVAS_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';

interface GestureAxisViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showCanvasHints?: boolean;
}

export function GestureAxisView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showCanvasHints = true,
}: GestureAxisViewProps) {
  const [activeSliderVal, setActiveSliderVal] = useState<number>(90);

  const targetVal = question.targetAngleDeg ?? 0;
  const userVal = userAnswer?.userValue ?? activeSliderVal;
  const isHit = Boolean(userAnswer?.isHit);

  return (
    <StandardSliderView
      questionId={question.id}
      hintText="旋转主轴对齐粒子群动态流向 (0°~180°)"
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label="动态势线角度:"
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
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
          <CanvasView
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm"
            draw={(canvas) => {
              drawParticlesCanvas(
                canvas,
                question.particles,
                ABSTRACTION_CANVAS_SIZE,
                showAnswer ? targetVal : activeSliderVal,
                showAnswer ? '#22C55E' : '#6366F1',
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

#### Acts 3: 重构负形占比估算与黑白素描归组组件

~~~~~act
write_file
src/domains/negative_space/components/RatioEstimationView.tsx
~~~~~
~~~~~typescript
import { Maximize2 } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../utils/index';

interface RatioEstimationViewProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function RatioEstimationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: RatioEstimationViewProps) {
  const { targetNegativeRatio, tolerance } = question;
  const isHit = Boolean(userAnswer?.isHit);

  return (
    <StandardSliderView
      questionId={question.id}
      hintText="估计白色留白 (负形) 占整幅画面的面积百分比"
      hintIcon={Maximize2}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label="负形空间占比估计:"
      max={100}
      step={0.1}
      initialValue={50.0}
      unit="%"
      targetValue={targetNegativeRatio}
      tolerance={tolerance}
      showToleranceBand={showToleranceBand}
      showAnswer={showAnswer}
      isHit={isHit}
      userValue={userAnswer?.userRatio}
      disabled={disabled}
      hitMargin={hitMargin}
      submitMode="button"
      submitButtonText="确认提交 (Space)"
      onAnswer={onAnswer}
      preview={
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
          <CanvasView
            width={NEGATIVE_SPACE_CANVAS_SIZE}
            height={NEGATIVE_SPACE_CANVAS_SIZE}
            className="w-full max-w-[340px] aspect-square rounded-xl border border-slate-300 shadow-sm"
            draw={(canvas) => {
              if (question.vertices) {
                drawPolygonCanvas({
                  canvas,
                  vertices: question.vertices,
                  size: NEGATIVE_SPACE_CANVAS_SIZE,
                  fillColor: '#0F172A',
                  strokeColor: '#1E293B',
                  isHighlighted: showAnswer && isHit,
                });
              }
            }}
            deps={[question.vertices, showAnswer, isHit]}
          />
        </div>
      }
    />
  );
}
~~~~~

~~~~~act
write_file
src/domains/abstraction/components/NotanThresholdView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { CanvasView } from '../../../components/common/CanvasView';
import { DualViewportContainer } from '../../../components/common/DualViewportContainer';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import {
  drawNotanNoiseField,
  drawRawGrayscaleNoiseField,
} from '../../../utils/canvas/drawNotanField';
import {
  ABSTRACTION_2AFC_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';

interface NotanThresholdViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showCanvasHints?: boolean;
}

export function NotanThresholdView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showCanvasHints = true,
}: NotanThresholdViewProps) {
  const [activeVal, setActiveVal] = useState<number>(50);

  const targetVal = question.idealNotanThreshold ?? 50;

  return (
    <StandardSliderView
      questionId={question.id}
      hintText="观察左侧灰阶原图，在下方滑块点击/调节右侧最佳黑白二值截断点"
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      label="二值化截断阈值:"
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
          leftTitle="灰阶原图 (Raw Scene)"
          rightTitle="二值显影 (Notan Output)"
          leftContent={
            <div className="w-full flex justify-center bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
              <CanvasView
                width={ABSTRACTION_2AFC_SIZE}
                height={ABSTRACTION_2AFC_SIZE}
                className="w-full max-w-[240px] aspect-square rounded-xl shadow-sm border border-slate-200"
                draw={(canvas) => {
                  if (question.notanBuffer) {
                    drawRawGrayscaleNoiseField(
                      canvas,
                      question.notanBuffer,
                      question.notanFieldDim ?? 120,
                      ABSTRACTION_2AFC_SIZE,
                    );
                  }
                }}
                deps={[question.notanBuffer, question.notanFieldDim]}
              />
            </div>
          }
          rightContent={
            <div className="w-full flex justify-center bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
              <CanvasView
                width={ABSTRACTION_2AFC_SIZE}
                height={ABSTRACTION_2AFC_SIZE}
                className="w-full max-w-[240px] aspect-square rounded-xl shadow-sm border border-slate-200"
                draw={(canvas) => {
                  if (question.notanBuffer) {
                    drawNotanNoiseField(
                      canvas,
                      question.notanBuffer,
                      question.notanFieldDim ?? 120,
                      showAnswer ? targetVal : activeVal,
                      ABSTRACTION_2AFC_SIZE,
                    );
                  }
                }}
                deps={[question.notanBuffer, question.notanFieldDim, targetVal, activeVal, showAnswer]}
              />
            </div>
          }
        />
      }
    />
  );
}
~~~~~

### 下一步建议
1. **测试与质量验证**：运行 `npm run check` 检查格式与类型，运行 `npm run test` 验证各交互与做答逻辑。
2. **N-AFC 组件抽象 (`StandardNafcView`)**：继续将四选一类视图（如 `PaletteClusteringView`, `TopDownPatternView`, `VectorShiftView`）抽离为通用 N-AFC 壳组件。
