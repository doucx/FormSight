我们将解耦并重构 `HsvTrackSlider` 控件，将其抽取为独导的通用组件 `src/components/HsvTrackSlider.tsx`，并重构 `RelativeColorCanvas.tsx`，为其赋予与综合拾色相同的顶级交互手感、吸附感应区与 OKLab 动态 $\Delta E$ 容错指示。

## [WIP] refactor(ui): 抽取 HsvTrackSlider 独立组件并统一相对色感交互手感

### 用户需求
1. 从 `ColorCanvas.tsx` 中将 `AllMatchSlider` 解耦为独立的、通用导出的 `HsvTrackSlider` 组件。
2. 保持并增强 `HsvTrackSlider` 的指针捕获、外延吸附感应 (`hitMargin`) 与基于 OKLab 的动态 $\Delta E$ 容错带可视化线段。
3. 重构 `RelativeColorCanvas.tsx`，使用 `HsvTrackSlider` 替代原生 range input 控件。
4. 重构 `getToleranceSpan` 使其能同时适配绝对色感与相对色感的目标色。

### 评论
解耦 `HsvTrackSlider` 后，相对色感不仅能消除原有原生 HTML `<input type="range">` 带来的样式死板和手感生硬，更能将关键的 OKLab 感知色差 $\Delta E$ 容错可视化线段与准心线带入相对色感，彻底弥合两个模块的体验差异。

### 目标
1. 范化 `colorUtils.ts` 中的 `getToleranceSpan` 函数，使其接受通用 `targetHSV` 与 `difficultyLevel`。
2. 新建 `src/components/HsvTrackSlider.tsx`。
3. 重构 `src/components/ColorCanvas.tsx`，引入 `HsvTrackSlider`。
4. 重构 `src/components/RelativeColorCanvas.tsx`，全面引入 `HsvTrackSlider`。

### 基本原理
利用 HTML5 Pointer Event API（`setPointerCapture`/`releasePointerCapture`）提供无缝滑块拖拽，结合负 Margin 外延算法支持极值点外延吸附。在悬停与拖拽时，调用 OKLab 空间的色差探索算子，动态寻找左右两侧 $\Delta E \le \Delta E_{\text{target}}$ 的边界值，并在 Canvas/Slider 轨道上精准绘制指示线。

### 标签
#intent/refine #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/hsv-track-slider #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 重构 `src/utils/colorUtils.ts` 中的 `getToleranceSpan`

使 `getToleranceSpan` 支持范化传入 `targetHSV` 与 `difficultyLevel`，实现绝对色感与相对色感的通用算子共享。

~~~~~act
write_file
src/utils/colorUtils.ts
~~~~~
~~~~~typescript
import { calcDeltaEOk, getOkChroma, getTargetDeltaEForLevel, hsvToOkLab } from './oklchUtils';

export type ColorMode = 'H' | 'S' | 'V' | 'ALL';

export interface ColorQuestionData {
  id: string;
  mode: ColorMode;
  difficultyLevel: number; // 1..35
  targetH: number; // 0..359
  targetS: number; // 0..100
  targetV: number; // 0..100
  tolerance: number; // 允许的感知色差阈值 ΔE_target
}

export interface ColorHitResult {
  isHit: boolean;
  userValue: number;
  targetValue: number;
  errorValue: number; // 绝对数值误差 (角度、百分比或 OKLab ΔE)
  tolerance: number;
  userHSV?: [number, number, number];
}

/**
 * HSV (0..360, 0..100, 0..100) 转 16 进制 Hex
 */
export function hsvToHex(h: number, s: number, v: number): string {
  const normH = ((h % 360) + 360) % 360;
  const normS = s / 100;
  const normV = v / 100;
  const c = normV * normS;
  const x = c * (1 - Math.abs(((normH / 60) % 2) - 1));
  const m = normV - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (normH >= 0 && normH < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (normH >= 60 && normH < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (normH >= 120 && normH < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (normH >= 180 && normH < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (normH >= 240 && normH < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const rHex = Math.round((r + m) * 255)
    .toString(16)
    .padStart(2, '0');
  const gHex = Math.round((g + m) * 255)
    .toString(16)
    .padStart(2, '0');
  const bHex = Math.round((b + m) * 255)
    .toString(16)
    .padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`.toUpperCase();
}

/**
 * 根据 Level (1..35) 计算允许的容错阈值（感知色差 ΔE）
 */
export function getToleranceForLevel(_mode: ColorMode, level: number): number {
  return getTargetDeltaEForLevel(level);
}

export interface ColorQuestionGenerateOptions {
  targetingMode?: 'off' | 'manual';
  targetSectors?: number[]; // [0~11] 代表 12 个 30° 的色相扇区
}

/**
 * 色相加权生成：70% 概率落在指定弱点靶向区间内，30% 全局随机
 */
function selectHueWithTargeting(options?: ColorQuestionGenerateOptions): number {
  if (
    options?.targetingMode &&
    options.targetingMode !== 'off' &&
    options.targetSectors &&
    options.targetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        options.targetSectors[Math.floor(Math.random() * options.targetSectors.length)];
      const sectorCenterAngle = chosenSector * 30 + 15;
      const jitter = (Math.random() - 0.5) * 30; // ±15° 范围抖动
      return Math.floor((sectorCenterAngle + jitter + 360) % 360);
    }
  }
  return Math.floor(Math.random() * 360);
}

/**
 * 生成色感练习题目 (基于 OKLab 可观测彩度与感知难度对齐)
 */
export function generateColorQuestion(
  mode: ColorMode,
  level: number,
  options?: ColorQuestionGenerateOptions,
): ColorQuestionData {
  const id = `cq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const tolerance = getTargetDeltaEForLevel(clampedLevel);

  const targetH = mode === 'H' ? selectHueWithTargeting(options) : Math.floor(Math.random() * 360);
  let targetS = 100;
  let targetV = 100;

  // 题目生成过滤逻辑：确保抽取的色彩具备视觉可观测量
  let attempts = 0;
  while (attempts < 50) {
    attempts++;
    if (mode === 'H' || mode === 'ALL') {
      targetS = Math.floor(Math.random() * 81) + 20; // 20..100
      targetV = Math.floor(Math.random() * 81) + 20; // 20..100

      // 检验 OKLab 彩度：必须保证彩度足够大，否则色相被低 S/V 遮蔽不可辩
      const lab = hsvToOkLab(targetH, targetS, targetV);
      if (getOkChroma(lab) >= tolerance * 1.5) {
        break;
      }
    } else if (mode === 'V') {
      targetS = Math.floor(Math.random() * 71) + 30; // S >= 30% 防止纯灰无明度变化感
      targetV = Math.floor(Math.random() * 101);
      break;
    } else {
      // mode === 'S'
      targetV = Math.floor(Math.random() * 71) + 30; // V >= 30% 防止纯黑无饱和度感
      targetS = Math.floor(Math.random() * 101);
      break;
    }
  }

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    targetH,
    targetS,
    targetV,
    tolerance,
  };
}

/**
 * 基于 OKLab 色差 ΔE_OK 的色感答题命中检测
 */
export function checkColorHit(
  mode: ColorMode,
  userVal: number | [number, number, number],
  question: ColorQuestionData,
): ColorHitResult {
  const { targetH, targetS, targetV, difficultyLevel } = question;

  let userH: number;
  let userS: number;
  let userV: number;

  if (mode === 'ALL' && Array.isArray(userVal)) {
    [userH, userS, userV] = userVal;
  } else {
    const singleVal = typeof userVal === 'number' ? userVal : userVal[0];
    userH = mode === 'H' ? singleVal : targetH;
    userS = mode === 'S' ? singleVal : targetS;
    userV = mode === 'V' ? singleVal : targetV;
  }

  const targetLab = hsvToOkLab(targetH, targetS, targetV);
  const userLab = hsvToOkLab(userH, userS, userV);
  const realDeltaE = calcDeltaEOk(targetLab, userLab);

  const targetDeltaE = getTargetDeltaEForLevel(difficultyLevel);
  const isHit = realDeltaE <= targetDeltaE;

  let targetVal = targetH;
  let errorVal = 0;

  if (mode === 'ALL') {
    targetVal = 0;
    errorVal = Math.round(realDeltaE * 1000) / 1000;
  } else if (mode === 'H') {
    targetVal = targetH;
    const diff = Math.abs((userVal as number) - targetVal);
    errorVal = Math.min(diff, 360 - diff);
  } else if (mode === 'V') {
    targetVal = targetV;
    errorVal = Math.abs((userVal as number) - targetVal);
  } else {
    targetVal = targetS;
    errorVal = Math.abs((userVal as number) - targetVal);
  }

  return {
    isHit,
    userValue: typeof userVal === 'number' ? userVal : userH,
    targetValue: targetVal,
    errorValue: Math.round(errorVal * 10) / 10,
    tolerance: targetDeltaE,
    userHSV: [userH, userS, userV],
  };
}

export interface ToleranceSpan {
  minVal: number;
  maxVal: number;
  halfSpan: number;
}

/**
 * 范化容错计算函数：支持直接传入 targetHSV 数组与 difficultyLevel
 */
export function getToleranceSpan(
  dimension: 'H' | 'S' | 'V',
  val: number,
  targetHSV: [number, number, number],
  difficultyLevel: number,
  currentHSV?: [number, number, number],
): ToleranceSpan {
  const [targetH, targetS, targetV] = targetHSV;
  const targetDeltaE = getTargetDeltaEForLevel(difficultyLevel);

  const curH = currentHSV ? currentHSV[0] : dimension === 'H' ? val : targetH;
  const curS = currentHSV ? currentHSV[1] : dimension === 'S' ? val : targetS;
  const curV = currentHSV ? currentHSV[2] : dimension === 'V' ? val : targetV;
  const baseLab = hsvToOkLab(curH, curS, curV);

  const maxValLimit = dimension === 'H' ? 360 : 100;
  const step = dimension === 'H' ? 0.5 : 0.2;

  // 向左探索界限
  let leftVal = val;
  while (leftVal > (dimension === 'H' ? val - 180 : 0)) {
    const testVal = leftVal - step;
    const testH = dimension === 'H' ? (testVal + 360) % 360 : curH;
    const testS = dimension === 'S' ? Math.max(0, testVal) : curS;
    const testV = dimension === 'V' ? Math.max(0, testVal) : curV;
    const testLab = hsvToOkLab(testH, testS, testV);

    if (calcDeltaEOk(baseLab, testLab) > targetDeltaE) break;
    leftVal = testVal;
  }

  // 向右探索界限
  let rightVal = val;
  while (rightVal < (dimension === 'H' ? val + 180 : 100)) {
    const testVal = rightVal + step;
    const testH = dimension === 'H' ? testVal % 360 : curH;
    const testS = dimension === 'S' ? Math.min(100, testVal) : curS;
    const testV = dimension === 'V' ? Math.min(100, testVal) : curV;
    const testLab = hsvToOkLab(testH, testS, testV);

    if (calcDeltaEOk(baseLab, testLab) > targetDeltaE) break;
    rightVal = testVal;
  }

  const halfSpan = (rightVal - leftVal) / 2;
  return {
    minVal: Math.max(0, val - halfSpan),
    maxVal: Math.min(maxValLimit, val + halfSpan),
    halfSpan: Math.round(halfSpan * 10) / 10,
  };
}
~~~~~

#### Acts 2: 新建 `src/components/HsvTrackSlider.tsx` 通用滑块轨道组件

~~~~~act
write_file
src/components/HsvTrackSlider.tsx
~~~~~
~~~~~typescript
import { useRef, useState } from 'preact/hooks';
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
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [hoverVal, setHoverVal] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const calcValFromClientX = (clientX: number): number | null => {
    if (!trackRef.current) return null;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    return Math.round(ratio * max);
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (disabled || showAnswer) return;
    setIsDragging(true);
    if (onDraggingStateChange) onDraggingStateChange(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const calculated = calcValFromClientX(e.clientX);
    if (calculated !== null) {
      onValChange(calculated);
      setHoverVal(calculated);
      if (onHoverStateChange) onHoverStateChange(calculated);
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (disabled || showAnswer) return;
    const calculated = calcValFromClientX(e.clientX);
    if (calculated !== null) {
      if (isDragging) {
        onValChange(calculated);
      }
      setHoverVal(calculated);
      if (onHoverStateChange) onHoverStateChange(calculated);
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (disabled || showAnswer) return;
    if (isDragging) {
      setIsDragging(false);
      if (onDraggingStateChange) onDraggingStateChange(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      const calculated = calcValFromClientX(e.clientX);
      if (calculated !== null) {
        onValChange(calculated);
      }
    }
  };

  const handleMouseLeave = () => {
    if (!isDragging) {
      setHoverVal(null);
      if (onHoverStateChange) onHoverStateChange(null);
    }
  };

  const activeVal = hoverVal !== null ? hoverVal : val;
  const actualTargetVal =
    targetVal ??
    (label === 'H' ? targetHSV[0] : label === 'S' ? targetHSV[1] : targetHSV[2]);

  return (
    <div className="flex items-center gap-3 w-full">
      <span className="w-5 font-bold font-mono text-slate-400 text-sm text-center">{label}</span>

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseLeave={handleMouseLeave}
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
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-8 bg-emerald-500 border-x border-white shadow-md z-10"
                style={{ left: getPercent(actualTargetVal, max) }}
              />
              {userVal !== undefined && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-8 border-x border-white ${
                    isHit ? 'bg-emerald-500' : 'bg-rose-500'
                  } shadow-md z-20`}
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

#### Acts 3: 重构 `src/components/ColorCanvas.tsx` 使用通用 `HsvTrackSlider`

~~~~~act
write_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript
import { useEffect, useRef, useState } from 'preact/hooks';
import { HsvTrackSlider } from './HsvTrackSlider';
import {
  type ColorHitResult,
  type ColorQuestionData,
  getToleranceSpan,
  hsvToHex,
} from '../utils/colorUtils';

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
  isTargetActiveMode: boolean; // 是否是当前正在寻找/回答的活跃维度
  gradient: string;
  val: number; // 目标值 targetVal
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
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [hoverVal, setHoverVal] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // 计算 ClientX 对应的数值
  const calcValFromClientX = (clientX: number): number | null => {
    if (!trackRef.current) return null;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    return Math.round(ratio * max);
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (!isTargetActiveMode || disabled || showAnswer) return;
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const calculated = calcValFromClientX(e.clientX);
    if (calculated !== null) setHoverVal(calculated);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isTargetActiveMode || disabled || showAnswer) return;
    const calculated = calcValFromClientX(e.clientX);
    if (calculated !== null) setHoverVal(calculated);
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (!isTargetActiveMode || disabled || showAnswer) return;
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      const calculated = calcValFromClientX(e.clientX);
      if (calculated !== null) {
        setHoverVal(null);
        onAnswer(calculated);
      }
    }
  };

  const handleMouseLeave = () => {
    if (!isDragging) {
      setHoverVal(null);
    }
  };

  const renderLabelContent = () => {
    if (showAnswer) {
      return `${val}${unit}`;
    }
    if (!isTargetActiveMode) {
      return `${val}${unit}`;
    }
    if (hoverVal !== null) {
      return `${hoverVal}${unit}`;
    }
    return '?';
  };

  const isInteractive = isTargetActiveMode && !showAnswer && !disabled;
  const targetHSV: [number, number, number] = [
    question.targetH,
    question.targetS,
    question.targetV,
  ];

  return (
    <div className="flex items-center gap-3 w-full">
      <span className="w-5 font-bold font-mono text-slate-400 text-sm text-center">{label}</span>

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseLeave={handleMouseLeave}
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
              const span = getToleranceSpan(
                label,
                hoverVal,
                targetHSV,
                question.difficultyLevel,
              );
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
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-8 bg-emerald-500 border-x border-white shadow-md z-10"
                style={{ left: getPercent(val, max) }}
              />
              {userAnswer && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-8 border-x border-white ${
                    userAnswer.isHit ? 'bg-emerald-500' : 'bg-rose-500'
                  } shadow-md z-20`}
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

#### Acts 4: 重构 `src/components/RelativeColorCanvas.tsx` 使用 `HsvTrackSlider`

~~~~~act
write_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~typescript
import { ArrowRight } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { HsvTrackSlider } from './HsvTrackSlider';
import { hsvToHex } from '../utils/colorUtils';
import type {
  RelativeColorHitResult,
  RelativeColorQuestionData,
} from '../utils/relativeColorUtils';

interface RelativeColorCanvasProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
  onAnswer: (userD: [number, number, number]) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  enableHoverColorPreview?: boolean;
}

export function RelativeColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  enableHoverColorPreview = true,
}: RelativeColorCanvasProps) {
  const { colorA, colorB, colorC, targetD, difficultyLevel } = question;

  const [userH, setUserH] = useState<number>(colorC[0]);
  const [userS, setUserS] = useState<number>(colorC[1]);
  const [userV, setUserV] = useState<number>(colorC[2]);

  // 悬停与拖拽试探预览状态
  const [allHoverVals, setAllHoverVals] = useState<Record<'H' | 'S' | 'V', number | null>>({
    H: null,
    S: null,
    V: null,
  });
  const [draggingLabel, setDraggingLabel] = useState<'H' | 'S' | 'V' | null>(null);

  // 题目切换时重置 D 为 C 的初始状态
  useEffect(() => {
    setUserH(colorC[0]);
    setUserS(colorC[1]);
    setUserV(colorC[2]);
    setAllHoverVals({ H: null, S: null, V: null });
    setDraggingLabel(null);
  }, [colorC]);

  const handleSubmit = () => {
    if (disabled || showAnswer) return;
    onAnswer([userH, userS, userV]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !showAnswer && !disabled) {
        e.preventDefault();
        onAnswer([userH, userS, userV]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, disabled, userH, userS, userV, onAnswer]);

  const hexA = hsvToHex(...colorA);
  const hexB = hsvToHex(...colorB);
  const hexC = hsvToHex(...colorC);

  const previewH =
    draggingLabel === 'H' || (enableHoverColorPreview && allHoverVals.H !== null)
      ? (allHoverVals.H ?? userH)
      : userH;
  const previewS =
    draggingLabel === 'S' || (enableHoverColorPreview && allHoverVals.S !== null)
      ? (allHoverVals.S ?? userS)
      : userS;
  const previewV =
    draggingLabel === 'V' || (enableHoverColorPreview && allHoverVals.V !== null)
      ? (allHoverVals.V ?? userV)
      : userV;

  const hexUserD = hsvToHex(previewH, previewS, previewV);
  const hexTargetD = hsvToHex(...targetD);

  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
  const satGradient = `linear-gradient(to right, ${hsvToHex(userH, 0, userV)}, ${hsvToHex(userH, 100, userV)})`;
  const valGradient = `linear-gradient(to right, #000000, ${hsvToHex(userH, 100, 100)})`;

  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 上方对比展示区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* 基准推移组 (A -> B) */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            1. 基准色彩矢量推移 (A ➔ B)
          </span>
          <div className="flex items-center justify-center gap-3 w-full">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
                style={{ backgroundColor: hexA }}
              />
              <span className="text-[10px] font-mono text-slate-400">固有色 A</span>
            </div>
            <ArrowRight className="w-5 h-5 text-indigo-500" />
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
                style={{ backgroundColor: hexB }}
              />
              <span className="text-[10px] font-mono text-slate-400">推移色 B</span>
            </div>
          </div>
        </div>

        {/* 目标推移组 (C -> D) */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            2. 目标色彩矢量推移 (C ➔ D)
          </span>
          <div className="flex items-center justify-center gap-3 w-full">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
                style={{ backgroundColor: hexC }}
              />
              <span className="text-[10px] font-mono text-slate-400">固有色 C</span>
            </div>
            <ArrowRight className="w-5 h-5 text-indigo-500" />
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-20 h-20 rounded-2xl border-2 border-white shadow-md transition-all duration-75 relative"
                style={{ backgroundColor: hexUserD }}
              >
                {showAnswer && (
                  <div
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-white shadow-md"
                    style={{ backgroundColor: hexTargetD }}
                    title="真理色彩 D"
                  />
                )}
              </div>
              <span className="text-[10px] font-mono text-indigo-600 font-bold">待调色 D</span>
            </div>
          </div>
        </div>
      </div>

      {/* 揭晓答案诊断数据 */}
      {showAnswer && userAnswer && (
        <div
          className={`w-full p-3.5 rounded-2xl border text-xs flex justify-between items-center ${
            userAnswer.isHit
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="font-bold">
            {userAnswer.isHit ? '✅ 矢量匹配成功！' : '❌ 矢量偏转较大'}
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>感知色差 ΔE: {userAnswer.deltaEError}</span>
            <span>矢量模长差: {userAnswer.magnitudeError}</span>
            <span>色温偏角: {userAnswer.angleErrorDeg}°</span>
          </div>
        </div>
      )}

      {/* 下方 D 颜色调制滑块轨道 (使用通用 HsvTrackSlider) */}
      <div className="w-full space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <HsvTrackSlider
          label="H"
          gradient={hueGradient}
          val={userH}
          max={360}
          unit="°"
          targetHSV={targetD}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetD[0]}
          userVal={userAnswer?.userD?.[0] ?? userH}
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
          targetHSV={targetD}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetD[1]}
          userVal={userAnswer?.userD?.[1] ?? userS}
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
          targetHSV={targetD}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetD[2]}
          userVal={userAnswer?.userD?.[2] ?? userV}
          isHit={userAnswer?.isHit}
          onValChange={setUserV}
          allUserHSV={[userH, userS, userV]}
          disabled={disabled}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
          onHoverStateChange={(hVal) => setAllHoverVals((prev) => ({ ...prev, V: hVal }))}
          onDraggingStateChange={(isDrag) => setDraggingLabel(isDrag ? 'V' : null)}
        />
      </div>

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

#### Acts 5: 更新 `RelativeColorTrainingView.tsx` 传递 `hitMargin` 等属性

~~~~~act
write_file
src/views/RelativeColorTrainingView.tsx
~~~~~
~~~~~typescript
import { ArrowLeft, ChevronRight, Clock } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { RelativeColorCanvas } from '../components/RelativeColorCanvas';
import { type SessionHistoryItem, SessionSummaryModal } from '../components/SessionSummaryModal';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import { saveSession, saveTrialRecord } from '../utils/db';
import {
  type RelativeColorHitResult,
  type RelativeColorMode,
  type RelativeColorQuestionData,
  checkRelativeColorHit,
  generateRelativeColorQuestion,
} from '../utils/relativeColorUtils';
import type { RelativeColorSettings } from '../utils/settings';

interface RelativeColorTrainingViewProps {
  mode: RelativeColorMode;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: RelativeColorSettings;
  onExit: () => void;
}

export function RelativeColorTrainingView({
  mode,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: RelativeColorTrainingViewProps) {
  const sessionIdRef = useRef<string>(`rcsession_${Date.now()}`);
  const startTimeRef = useRef<number>(Date.now());
  const adaptiveEngineRef = useRef<AdaptiveEngine>(
    new AdaptiveEngine(
      initialLevel,
      settings.stepGranularity === 'fine',
      sessionType === 'benchmark' ? 'staircase' : settings.adaptiveMode,
      settings.targetAccuracy,
      settings.blockSize,
    ),
  );
  const autoNextTimerRef = useRef<number | null>(null);

  const [question, setQuestion] = useState<RelativeColorQuestionData>(() =>
    generateRelativeColorQuestion(mode, initialLevel),
  );
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [userAnswer, setUserAnswer] = useState<RelativeColorHitResult | null>(null);

  const [totalTrials, setTotalTrials] = useState<number>(0);
  const [hitTrials, setHitTrials] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      if (showSummaryModal || isFinished) return;
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [showSummaryModal, isFinished]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (showAnswer && !isFinished) {
          e.preventDefault();
          handleNextQuestion();
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        handleFinishSession();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, isFinished]);

  const handleAnswer = async (userD: [number, number, number]) => {
    const responseTimeMs = Date.now() - questionStartTime;
    const hitResult = checkRelativeColorHit(mode, userD, question);

    setUserAnswer(hitResult);
    setShowAnswer(true);

    const newTotal = totalTrials + 1;
    const newHits = hitTrials + (hitResult.isHit ? 1 : 0);
    setTotalTrials(newTotal);
    setHitTrials(newHits);

    // 通用 DB API 提交
    await saveTrialRecord({
      id: `rcrec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: sessionIdRef.current,
      domain: 'relative_color',
      mode,
      timestamp: Date.now(),
      difficultyLevel: question.difficultyLevel,
      isHit: hitResult.isHit,
      responseTimeMs,
      details: {
        colorA: question.colorA,
        colorB: question.colorB,
        colorC: question.colorC,
        targetD: question.targetD,
        userD,
        deltaEError: hitResult.deltaEError,
      },
    });

    setSessionHistory((prev) => [
      ...prev,
      {
        trialIndex: newTotal,
        level: question.difficultyLevel,
        isHit: hitResult.isHit,
        responseTimeMs,
      },
    ]);

    adaptiveEngineRef.current.recordResult(hitResult.isHit);

    const delay = settings.autoNextDelay;

    if (sessionType === 'benchmark' && newTotal >= 20) {
      setIsFinished(true);
      await saveCurrentSession(newTotal, newHits, true);
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = window.setTimeout(() => {
        setShowSummaryModal(true);
      }, delay);
    } else if (settings.autoNext) {
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = window.setTimeout(() => {
        handleNextQuestion();
      }, delay);
    }
  };

  const handleNextQuestion = () => {
    if (isFinished) return;
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }

    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateRelativeColorQuestion(mode, nextLevel));
    setQuestionStartTime(Date.now());
  };

  const saveCurrentSession = async (trials = totalTrials, hits = hitTrials, ended = false) => {
    await saveSession({
      id: sessionIdRef.current,
      domain: 'relative_color',
      mode,
      type: sessionType,
      startTimestamp: startTimeRef.current,
      endTimestamp: ended ? Date.now() : undefined,
      totalTrials: trials,
      hitTrials: hits,
      startLevel: initialLevel,
      endLevel: adaptiveEngineRef.current.getCurrentLevel(),
    });
  };

  const handleRequestFinish = async () => {
    if (sessionHistory.length > 0 && !showSummaryModal) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      setShowSummaryModal(true);
    } else {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onExit();
    }
  };

  const handleFinishSession = async () => {
    await saveCurrentSession(totalTrials, hitTrials, true);
    onExit();
  };

  const handleRestartSession = () => {
    setShowSummaryModal(false);
    setIsFinished(false);
    setTotalTrials(0);
    setHitTrials(0);
    setSessionHistory([]);
    setShowAnswer(false);
    setUserAnswer(null);
    sessionIdRef.current = `rcsession_${Date.now()}`;
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateRelativeColorQuestion(mode, nextLevel));
    setQuestionStartTime(Date.now());
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      {/* 顶栏 */}
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRequestFinish}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            退出训练 (Esc)
          </button>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            色彩矢量迁移 | {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
        </div>

        {/* 监控指标 */}
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              已练题数
            </span>
            <span className="font-black text-gray-800">
              {totalTrials} {sessionType === 'benchmark' ? '/ 20' : ''}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              当前难度
            </span>
            <span className="font-black text-indigo-600">Level {question.difficultyLevel}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono font-bold text-slate-700">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>
      </header>

      {/* 相对色彩矢量 Canvas */}
      <RelativeColorCanvas
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={handleAnswer}
        disabled={isFinished}
        hitMargin={settings.sliderHitMargin ?? 12}
        showToleranceBand={settings.showToleranceBand ?? true}
        enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
      />

      {/* 底部控制栏 */}
      {!settings.autoNext && (
        <div className="w-full max-w-md bg-white border border-gray-200/80 rounded-2xl p-3 shadow-sm flex items-center justify-end min-h-[56px]">
          {isFinished ? (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all"
            >
              完成并查看总结
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              disabled={!showAnswer}
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-1 ${
                showAnswer
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              下一题
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 结算弹窗 */}
      {showSummaryModal && (
        <SessionSummaryModal
          mode="single"
          sessionType={sessionType}
          elapsedSeconds={elapsedSeconds}
          history={sessionHistory}
          onClose={handleFinishSession}
          onRestart={handleRestartSession}
        />
      )}
    </div>
  );
}
~~~~~

### 下一步建议
我们已经完成了通用 `HsvTrackSlider` 滑块控件的完全解耦与重构，并成功替换了相对色感中的原生输入轨道。现在，相对色感不仅拥有指针捕获、两端极值外延吸附 (`hitMargin`) 手感，还能在滑动或试探悬停时获得 OKLab 动态 $\Delta E$ 容错可视化双线的全套特性。

建议下一步：
- 可以执行单元测试与构建（`npm test` / `npm run build`），验证应用整体构建和功能连贯性。
