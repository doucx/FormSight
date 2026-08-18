我们将通过提取通用的 `useTrackPointer` 自定义 Hook，把 `HsvTrackSlider`、`ColorCanvas`（中的 `SingleDimensionSlider`）和 `NegativeSpaceCanvas` 中的 Pointer 事件处理与坐标映射数学逻辑彻底收敛。

## [WIP] refactor: 提取 useTrackPointer Hook 统一滑块拖拽与悬停交互

### 用户需求
将 `HsvTrackSlider`、`SingleDimensionSlider` 和 `NegativeSpaceCanvas` 中分散重复的鼠标/触摸 PointerCapture 捕获、坐标换算、拖拽与悬停逻辑提取为通用的 `useTrackPointer` Hook，降低代码冗余。

### 评论
当前多个滑块类组件（HSV 色彩滑块、单维度作答滑块、负形面积比例滑块）均包含近 40 行几乎一致的指针事件绑定与边界计算代码。将其收敛为 Headless 风格的 `useTrackPointer` Hook 不仅能精简约 150 行样板代码，还能统一精度处理（`step` 配置）、指针捕获保护（`setPointerCapture` / `releasePointerCapture` 异常捕获）与悬停状态通知。

### 目标
1. 新建 `src/hooks/useTrackPointer.ts` 通用交互 Hook。
2. 重构 `src/components/HsvTrackSlider.tsx`，使用 `useTrackPointer` 替代手动指针事件。
3. 重构 `src/components/ColorCanvas.tsx` 中的 `SingleDimensionSlider`，接入 `useTrackPointer`。
4. 重构 `src/components/NegativeSpaceCanvas.tsx`，接入 `useTrackPointer`。

### 基本原理
- **关注点分离 (Separation of Concerns)**：将 Canvas / Track UI 表现层与 Pointer 物理拖拽数学计算解耦。
- **配置化步长与回调 (Configurable Step & Callbacks)**：支持浮点（如正负形的 `step: 0.1`）与整数（如色相的 `step: 1`），并提供统一的 `onValChange`、`onCommit`、`onHoverStateChange` 与 `onDraggingStateChange` 声明式接口。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/dx #scope/ux #ai/instruct #task/domain/ui #task/object/track-slider-pointer #task/action/refactor #task/state/continue #task/status/active

---

### Script

#### Acts 1: 创建通用滑块交互 Hook `useTrackPointer.ts`

实现对 PointerDown / PointerMove / PointerUp / MouseLeave 的统一状态管理与 ClientX 归一化投影。

~~~~~act
write_file
src/hooks/useTrackPointer.ts
~~~~~
~~~~~typescript
import { useRef, useState } from 'preact/hooks';

export interface UseTrackPointerOptions {
  max: number;
  step?: number;
  disabled?: boolean;
  onValChange?: (val: number) => void;
  onCommit?: (val: number) => void;
  onHoverStateChange?: (hoverVal: number | null) => void;
  onDraggingStateChange?: (isDragging: boolean) => void;
}

export function useTrackPointer({
  max,
  step = 1,
  disabled = false,
  onValChange,
  onCommit,
  onHoverStateChange,
  onDraggingStateChange,
}: UseTrackPointerOptions) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [hoverVal, setHoverVal] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const calcValFromClientX = (clientX: number): number | null => {
    if (!trackRef.current) return null;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const rawVal = ratio * max;

    if (step >= 1) {
      return Math.round(rawVal / step) * step;
    }
    const factor = Math.round(1 / step);
    return Math.round(rawVal * factor) / factor;
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (disabled) return;
    setIsDragging(true);
    onDraggingStateChange?.(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const calculated = calcValFromClientX(e.clientX);
    if (calculated !== null) {
      setHoverVal(calculated);
      onHoverStateChange?.(calculated);
      onValChange?.(calculated);
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (disabled) return;
    const calculated = calcValFromClientX(e.clientX);
    if (calculated !== null) {
      setHoverVal(calculated);
      onHoverStateChange?.(calculated);
      if (isDragging) {
        onValChange?.(calculated);
      }
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (disabled) return;
    if (isDragging) {
      setIsDragging(false);
      onDraggingStateChange?.(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      const calculated = calcValFromClientX(e.clientX);
      if (calculated !== null) {
        onValChange?.(calculated);
        onCommit?.(calculated);
      }
    }
  };

  const handleMouseLeave = () => {
    if (!isDragging) {
      setHoverVal(null);
      onHoverStateChange?.(null);
    }
  };

  return {
    trackRef,
    hoverVal,
    setHoverVal,
    isDragging,
    pointerProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onMouseLeave: handleMouseLeave,
    },
  };
}
~~~~~

#### Acts 2: 重构 `src/components/HsvTrackSlider.tsx`

使用 `useTrackPointer` 替换原先的手动事件绑定与坐标计算。

~~~~~act
write_file
src/components/HsvTrackSlider.tsx
~~~~~
~~~~~typescript
import { useTrackPointer } from '../hooks/useTrackPointer';
import { getToleranceSpan } from '../utils/colorUtils';

const getPercent = (val: number, max: number) => `${(val / max) * 100}%`;

export interface HsvTrackSliderProps {
  label: 'H' | 'S' | 'V';
  gradient: string;
  val: number;
  max: number;
  unit: string;
  targetHSV: [number, number, number];
  difficultyLevel: number;
  showAnswer: boolean;
  targetVal?: number;
  userVal?: number;
  isHit?: boolean;
  onValChange: (newVal: number) => void;
  allUserHSV?: [number, number, number];
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  onHoverStateChange?: (hoverVal: number | null) => void;
  onDraggingStateChange?: (isDragging: boolean) => void;
}

export function HsvTrackSlider({
  label,
  gradient,
  val,
  max,
  unit,
  targetHSV,
  difficultyLevel,
  showAnswer,
  targetVal,
  userVal,
  isHit = false,
  onValChange,
  allUserHSV,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  onHoverStateChange,
  onDraggingStateChange,
}: HsvTrackSliderProps) {
  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    max,
    step: 1,
    disabled: disabled || showAnswer,
    onValChange,
    onHoverStateChange,
    onDraggingStateChange,
  });

  const activeVal = hoverVal !== null ? hoverVal : val;
  const actualTargetVal =
    targetVal ?? (label === 'H' ? targetHSV[0] : label === 'S' ? targetHSV[1] : targetHSV[2]);

  return (
    <div className="flex items-center gap-3 w-full">
      <span className="w-5 font-bold font-mono text-slate-400 text-sm text-center">{label}</span>

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
          !showAnswer && !disabled ? 'cursor-none' : 'cursor-default'
        }`}
      >
        <div
          ref={trackRef}
          className="relative w-full h-7 rounded-xl border border-slate-200/80 shadow-inner flex items-center"
          style={{ background: gradient }}
        >
          {/* 当前设定值标记线 */}
          {!showAnswer && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 pointer-events-none shadow-sm z-20"
              style={{ left: getPercent(val, max) }}
            />
          )}

          {/* 动态 ΔE 容错感应指示线 */}
          {!showAnswer &&
            showToleranceBand &&
            (() => {
              const currentTuple: [number, number, number] = allUserHSV
                ? [
                    label === 'H' ? activeVal : allUserHSV[0],
                    label === 'S' ? activeVal : allUserHSV[1],
                    label === 'V' ? activeVal : allUserHSV[2],
                  ]
                : [
                    label === 'H' ? activeVal : targetHSV[0],
                    label === 'S' ? activeVal : targetHSV[1],
                    label === 'V' ? activeVal : targetHSV[2],
                  ];

              const span = getToleranceSpan(
                label,
                activeVal,
                targetHSV,
                difficultyLevel,
                currentTuple,
              );
              const isWrapMode = label === 'H';
              const leftVal = isWrapMode
                ? (activeVal - span.halfSpan + max) % max
                : Math.max(0, activeVal - span.halfSpan);
              const rightVal = isWrapMode
                ? (activeVal + span.halfSpan + max) % max
                : Math.min(max, activeVal + span.halfSpan);

              return (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                    style={{ left: `${(leftVal / max) * 100}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                    style={{ left: `${(rightVal / max) * 100}%` }}
                  />
                </>
              );
            })()}

          {/* 鼠标悬停准心线 */}
          {!showAnswer && hoverVal !== null && hoverVal !== val && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 shadow-sm pointer-events-none z-30 opacity-75"
              style={{ left: getPercent(hoverVal, max) }}
            />
          )}

          {/* 揭晓答案之后的真理位与提交位 */}
          {showAnswer && (
            <>
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-10 bg-emerald-500 border-x border-white shadow-md z-20"
                style={{ left: getPercent(actualTargetVal, max) }}
              />
              {userVal !== undefined && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-7 border-x border-white ${
                    isHit ? 'bg-emerald-500' : 'bg-rose-500'
                  } shadow-md z-10`}
                  style={{ left: getPercent(userVal, max) }}
                />
              )}
            </>
          )}
        </div>
      </div>

      <span
        className={`w-12 text-right font-mono font-bold text-xs ${
          !showAnswer ? 'text-amber-500' : isHit ? 'text-emerald-600' : 'text-rose-600'
        }`}
      >
        {`${activeVal}${unit}`}
      </span>
    </div>
  );
}
~~~~~

#### Acts 3: 重构 `src/components/ColorCanvas.tsx` 中的 `SingleDimensionSlider`

使用 `useTrackPointer` 精简单维度滑块子组件。

~~~~~act
write_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript
import { useEffect, useState } from 'preact/hooks';
import { useTrackPointer } from '../hooks/useTrackPointer';
import {
  type ColorHitResult,
  type ColorQuestionData,
  getToleranceSpan,
  hsvToHex,
} from '../utils/colorUtils';
import { HsvTrackSlider } from './HsvTrackSlider';

interface ColorCanvasProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number | [number, number, number]) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  enableHoverColorPreview?: boolean;
}

const getPercent = (val: number, max: number) => `${(val / max) * 100}%`;

// ==========================================
// 子组件 1: 单维度练习模式轨道 (H / S / V)
// ==========================================
interface SingleDimensionSliderProps {
  label: 'H' | 'S' | 'V';
  isTargetActiveMode: boolean;
  gradient: string;
  val: number;
  max: number;
  unit: string;
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number) => void;
  disabled: boolean;
  hitMargin: number;
  showToleranceBand: boolean;
}

function SingleDimensionSlider({
  label,
  isTargetActiveMode,
  gradient,
  val,
  max,
  unit,
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled,
  hitMargin,
  showToleranceBand,
}: SingleDimensionSliderProps) {
  const isInteractive = isTargetActiveMode && !showAnswer && !disabled;

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max,
    step: 1,
    disabled: !isInteractive,
    onCommit: (calculated) => {
      setHoverVal(null);
      onAnswer(calculated);
    },
  });

  const renderLabelContent = () => {
    if (showAnswer || !isTargetActiveMode) {
      return `${val}${unit}`;
    }
    if (hoverVal !== null) {
      return `${hoverVal}${unit}`;
    }
    return '?';
  };

  const targetHSV: [number, number, number] = [
    question.targetH,
    question.targetS,
    question.targetV,
  ];

  return (
    <div className="flex items-center gap-3 w-full">
      <span className="w-5 font-bold font-mono text-slate-400 text-sm text-center">{label}</span>

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
          isInteractive ? 'cursor-none' : 'cursor-default'
        }`}
      >
        <div
          ref={trackRef}
          className="relative w-full h-7 rounded-xl border border-slate-200/80 shadow-inner flex items-center"
          style={{ background: gradient }}
        >
          {!isTargetActiveMode && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 pointer-events-none shadow-sm"
              style={{ left: getPercent(val, max) }}
            />
          )}

          {!showAnswer &&
            isTargetActiveMode &&
            showToleranceBand &&
            hoverVal !== null &&
            (() => {
              const span = getToleranceSpan(label, hoverVal, targetHSV, question.difficultyLevel);
              const isWrapMode = label === 'H';
              const leftVal = isWrapMode
                ? (hoverVal - span.halfSpan + max) % max
                : Math.max(0, hoverVal - span.halfSpan);
              const rightVal = isWrapMode
                ? (hoverVal + span.halfSpan + max) % max
                : Math.min(max, hoverVal + span.halfSpan);

              return (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                    style={{ left: `${(leftVal / max) * 100}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                    style={{ left: `${(rightVal / max) * 100}%` }}
                  />
                </>
              );
            })()}

          {!showAnswer && isTargetActiveMode && hoverVal !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 shadow-sm pointer-events-none z-30 opacity-85"
              style={{ left: getPercent(hoverVal, max) }}
            />
          )}

          {showAnswer && isTargetActiveMode && (
            <>
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-10 bg-emerald-500 border-x border-white shadow-md z-20"
                style={{ left: getPercent(val, max) }}
              />
              {userAnswer && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-7 border-x border-white ${
                    userAnswer.isHit ? 'bg-emerald-500' : 'bg-rose-500'
                  } shadow-md z-10`}
                  style={{ left: getPercent(userAnswer.userValue, max) }}
                />
              )}
            </>
          )}
        </div>
      </div>

      <span
        className={`w-12 text-right font-mono font-bold text-xs ${
          isTargetActiveMode && !showAnswer
            ? 'text-amber-500'
            : showAnswer && userAnswer?.isHit
              ? 'text-emerald-600'
              : showAnswer
                ? 'text-rose-600'
                : 'text-slate-700'
        }`}
      >
        {renderLabelContent()}
      </span>
    </div>
  );
}

// ==========================================
// 主入口组件: ColorCanvas
// ==========================================
export function ColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  enableHoverColorPreview = true,
}: ColorCanvasProps) {
  const { mode, targetH, targetS, targetV, difficultyLevel } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);
  const targetHSV: [number, number, number] = [targetH, targetS, targetV];

  // ALL 模式下的本地调制状态
  const [userH, setUserH] = useState<number>(180);
  const [userS, setUserS] = useState<number>(50);
  const [userV, setUserV] = useState<number>(50);

  // ALL 模式下悬停与拖拽状态 (控制右侧色块预览)
  const [allHoverVals, setAllHoverVals] = useState<Record<'H' | 'S' | 'V', number | null>>({
    H: null,
    S: null,
    V: null,
  });
  const [draggingLabel, setDraggingLabel] = useState<'H' | 'S' | 'V' | null>(null);

  // 题目切换时重置 ALL 模式状态
  useEffect(() => {
    if (mode === 'ALL') {
      setUserH(180);
      setUserS(50);
      setUserV(50);
      setAllHoverVals({ H: null, S: null, V: null });
      setDraggingLabel(null);
    }
  }, [mode]);

  const handleSubmitAll = () => {
    if (disabled || showAnswer) return;
    onAnswer([userH, userS, userV]);
  };

  // 键盘快捷键响应 (ALL 模式下 Space 显式提交)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && mode === 'ALL' && !showAnswer && !disabled) {
        e.preventDefault();
        onAnswer([userH, userS, userV]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, showAnswer, disabled, userH, userS, userV, onAnswer]);

  // 渐变背景计算
  const currentH = mode === 'ALL' ? userH : targetH;
  const currentV = mode === 'ALL' ? userV : targetV;

  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
  const satGradient = `linear-gradient(to right, ${hsvToHex(currentH, 0, currentV)}, ${hsvToHex(currentH, 100, currentV)})`;
  const valGradient = `linear-gradient(to right, #000000, ${hsvToHex(currentH, 100, 100)})`;

  return (
    <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 目标色块 / 综合对比色块 */}
      <div className="flex flex-col items-center gap-2 w-full">
        {mode === 'ALL' ? (
          <div className="flex items-center justify-center gap-4 w-full">
            <div
              className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
              style={{ backgroundColor: targetHex }}
            />
            <div
              className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-75"
              style={{
                backgroundColor: hsvToHex(
                  draggingLabel === 'H' || (enableHoverColorPreview && allHoverVals.H !== null)
                    ? (allHoverVals.H ?? userH)
                    : userH,
                  draggingLabel === 'S' || (enableHoverColorPreview && allHoverVals.S !== null)
                    ? (allHoverVals.S ?? userS)
                    : userS,
                  draggingLabel === 'V' || (enableHoverColorPreview && allHoverVals.V !== null)
                    ? (allHoverVals.V ?? userV)
                    : userV,
                ),
              }}
            />
          </div>
        ) : (
          <div
            className="w-32 h-32 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
            style={{ backgroundColor: targetHex }}
          />
        )}
      </div>

      {/* 轨道面板 */}
      <div className="w-full space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        {mode === 'ALL' ? (
          <>
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={userH}
              max={360}
              unit="°"
              targetHSV={targetHSV}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetH}
              userVal={userAnswer?.userHSV?.[0] ?? userH}
              isHit={userAnswer?.isHit}
              onValChange={setUserH}
              allUserHSV={[userH, userS, userV]}
              disabled={disabled}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
              onHoverStateChange={(hVal) => setAllHoverVals((prev) => ({ ...prev, H: hVal }))}
              onDraggingStateChange={(isDrag) => setDraggingLabel(isDrag ? 'H' : null)}
            />
            <HsvTrackSlider
              label="S"
              gradient={satGradient}
              val={userS}
              max={100}
              unit="%"
              targetHSV={targetHSV}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetS}
              userVal={userAnswer?.userHSV?.[1] ?? userS}
              isHit={userAnswer?.isHit}
              onValChange={setUserS}
              allUserHSV={[userH, userS, userV]}
              disabled={disabled}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
              onHoverStateChange={(hVal) => setAllHoverVals((prev) => ({ ...prev, S: hVal }))}
              onDraggingStateChange={(isDrag) => setDraggingLabel(isDrag ? 'S' : null)}
            />
            <HsvTrackSlider
              label="V"
              gradient={valGradient}
              val={userV}
              max={100}
              unit="%"
              targetHSV={targetHSV}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetV}
              userVal={userAnswer?.userHSV?.[2] ?? userV}
              isHit={userAnswer?.isHit}
              onValChange={setUserV}
              allUserHSV={[userH, userS, userV]}
              disabled={disabled}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
              onHoverStateChange={(hVal) => setAllHoverVals((prev) => ({ ...prev, V: hVal }))}
              onDraggingStateChange={(isDrag) => setDraggingLabel(isDrag ? 'V' : null)}
            />
          </>
        ) : (
          <>
            {/* 单维度模式 H 轨 */}
            <SingleDimensionSlider
              label="H"
              isTargetActiveMode={mode === 'H'}
              gradient={hueGradient}
              val={targetH}
              max={360}
              unit="°"
              question={question}
              showAnswer={showAnswer}
              userAnswer={userAnswer}
              onAnswer={(v) => onAnswer(v)}
              disabled={disabled}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
            />

            {/* 单维度模式 S 轨 */}
            {mode === 'S' && (
              <SingleDimensionSlider
                label="S"
                isTargetActiveMode={true}
                gradient={satGradient}
                val={targetS}
                max={100}
                unit="%"
                question={question}
                showAnswer={showAnswer}
                userAnswer={userAnswer}
                onAnswer={(v) => onAnswer(v)}
                disabled={disabled}
                hitMargin={hitMargin}
                showToleranceBand={showToleranceBand}
              />
            )}

            {/* 单维度模式 V 轨 */}
            {(mode === 'V' || mode === 'S') && (
              <SingleDimensionSlider
                label="V"
                isTargetActiveMode={mode === 'V'}
                gradient={valGradient}
                val={targetV}
                max={100}
                unit="%"
                question={question}
                showAnswer={showAnswer}
                userAnswer={userAnswer}
                onAnswer={(v) => onAnswer(v)}
                disabled={disabled}
                hitMargin={hitMargin}
                showToleranceBand={showToleranceBand}
              />
            )}
          </>
        )}
      </div>

      {/* ALL 模式确认提交按钮 */}
      {mode === 'ALL' && !showAnswer && (
        <button
          type="button"
          onClick={handleSubmitAll}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
        >
          确认提交 (Space)
        </button>
      )}
    </div>
  );
}
~~~~~

#### Acts 4: 重构 `src/components/NegativeSpaceCanvas.tsx`

使用 `useTrackPointer` 管理负形空间估算的百分比拖拽。

~~~~~act
write_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript
import { useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../hooks/useTrackPointer';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../utils/negativeSpaceUtils';

interface NegativeSpaceCanvasProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (userRatio: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
}

export function NegativeSpaceCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
}: NegativeSpaceCanvasProps) {
  const { vertices, targetNegativeRatio, tolerance } = question;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [currentVal, setCurrentVal] = useState<number>(50.0);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 100,
    step: 0.1,
    disabled: disabled || showAnswer,
    onValChange: setCurrentVal,
  });

  // 切换题目时重置滑块初始值
  useEffect(() => {
    if (question.id) {
      setCurrentVal(50.0);
      setHoverVal(null);
    }
  }, [question.id, setHoverVal]);

  // === Canvas 绘图渲染 ===
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清屏绘制纯白画框（即负形底色）
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, NEGATIVE_SPACE_CANVAS_SIZE, NEGATIVE_SPACE_CANVAS_SIZE);

    // 绘制正形多边形 (正形填充深色)
    if (vertices.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
      }
      ctx.closePath();

      ctx.fillStyle = '#0F172A'; // Slate-900 黑色正形
      ctx.fill();

      // 边缘描边
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 揭晓答案时的视觉反馈辅助
      if (showAnswer) {
        ctx.strokeStyle = userAnswer?.isHit ? '#22C55E' : '#EF4444';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }, [vertices, showAnswer, userAnswer]);

  const handleSubmit = () => {
    if (disabled || showAnswer) return;
    onAnswer(currentVal);
  };

  // 空格快捷键提交
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        if (!showAnswer && !disabled) {
          e.preventDefault();
          onAnswer(currentVal);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, disabled, currentVal, onAnswer]);

  const activeVal = hoverVal !== null ? hoverVal : currentVal;

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 提示文案 */}
      <div className="text-center space-y-1">
        <div className="text-sm font-bold text-slate-800">
          估计白色背景（负形）占整幅画面的面积百分比
        </div>
        <div className="text-xs text-slate-400">黑色为正形主体，白色空隙为负形</div>
      </div>

      {/* 画布区域 */}
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={NEGATIVE_SPACE_CANVAS_SIZE}
          height={NEGATIVE_SPACE_CANVAS_SIZE}
          className="w-full max-w-[340px] aspect-square rounded-xl border border-slate-300 shadow-sm"
        />
      </div>

      {/* 占比滑块调节区 */}
      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>负形空间占比估计:</span>
          <span className="font-mono text-base font-black text-indigo-600">
            {showAnswer ? `${userAnswer?.userRatio ?? currentVal}%` : `${activeVal}%`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-slate-400 text-xs">0%</span>

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
              {/* 进度底色 */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-indigo-500/20"
                style={{ width: `${activeVal}%` }}
              />

              {/* 当前设定游标线 */}
              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                  style={{ left: `${currentVal}%` }}
                />
              )}

              {/* 容错区间指示 */}
              {!showAnswer && showToleranceBand && (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: `${Math.max(0, activeVal - tolerance)}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: `${Math.min(100, activeVal + tolerance)}%` }}
                  />
                </>
              )}

              {/* 揭晓答案标记 */}
              {showAnswer && (
                <>
                  {/* 真理值 (绿色标线) */}
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                    style={{ left: `${targetNegativeRatio}%` }}
                  />
                  {/* 用户提交值 */}
                  {userAnswer && (
                    <div
                      className={`absolute top-0 bottom-0 w-1 -translate-x-1/2 z-10 border-x border-white shadow-md ${
                        userAnswer.isHit ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ left: `${userAnswer.userRatio}%` }}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <span className="font-bold font-mono text-slate-400 text-xs">100%</span>
        </div>

        {/* 揭晓答案对比条 */}
        {showAnswer && (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              真实负形占比:{' '}
              <span className="font-bold text-slate-800 font-mono">{targetNegativeRatio}%</span>
            </span>
            <span
              className={
                userAnswer?.isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'
              }
            >
              误差: {userAnswer?.errorValue}% (容错: ±{tolerance}%)
            </span>
          </div>
        )}
      </div>

      {/* 确认提交按钮 */}
      {!showAnswer && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
        >
          确认提交 (Space)
        </button>
      )}
    </div>
  );
}
~~~~~

### 下一步建议

1. **类型与构建检查**：运行 `npm run check` 和 `npm run build`，确认所有组件重构后类型与渲染完全正常。
2. **设置表单项组件提取**：将 `ColorSettingsForm`、`StarSettingsForm`、`NegativeSpaceSettingsForm` 中的滑块感应区按钮组和扇区多选器提取为通用原子组件。
