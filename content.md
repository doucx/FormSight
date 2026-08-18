我已完成对这两个滑块回归问题的详细原因定位，现在为你生成修复计划，将滑块的交互与作答提交流程彻底解耦，并恢复单维度测试中的盲测与状态清理机制。

## [WIP] fix(color): 修复滑块答案剧透与切题鼠标移动自动作答问题

### 错误分析
1. **真理值标线暴露与数字剧透**：
   - `HsvTrackSlider` 内部无条件渲染了当前 `val` 的指示标线 `!showAnswer && left: getPercent(val, max)`，且右侧数字在未悬停时默认打印 `activeVal`。
   - 在单维度模式（H/S/V）下，传入的 `val` 恰好是真理值 `targetVal`，导致在用户作答前轨道直接标出了正确答案位置与具体数值。
2. **指针捕获残留与高频值改变错绑答题提交**：
   - `ColorCanvas` 将 `onAnswer` 挂载到了每次微小指针位移都会触发的 `onValChange` 上。
   - 用户在 `pointerDown` 时即触发了 `onAnswer`，使得题目瞬间进入 `showAnswer = true` 与 `disabled = true` 状态。
   - 随后的 `pointerUp` 事件因 `if (disabled) return;` 导致 `setIsDragging(false)` 与 `releasePointerCapture` 被提前拦截跳过，`isDragging` 被锁死在 `true`。
   - 切题后 `disabled` 恢复，用户随手移动鼠标触发 `pointerMove`，因 `isDragging === true` 立即再次触发 `onValChange`，造成新题目在鼠标刚一移动时被非预期自动作答。

### 用户需求
1. 消除 H、S、V 单维度练习模式下未答题时出现的真理值黑线与数值剧透，保持题目悬念。
2. 修复点击滑块后自动切题时由于拖拽状态未复位而产生的“幽灵点击/自动作答”现象。
3. 保持 ALL 综合拾色模式下实时拖动预览能力不受影响。

### 评论
该修复是保证色感训练有效性与核心交互体验的关键。通过在统一的 `HsvTrackSlider` 中引入 `isInteractiveTarget` 标识，并在 `useTrackPointer` 中完善指针捕获生命周期清理，可以使组件既满足单维度盲测点击提交需求，又支持多维度连续调节。

### 目标
1. 在 `useTrackPointer` 中确保无论是否 `disabled`，`pointerUp` 都会强制重置 `isDragging` 并释放 PointerCapture。
2. 在 `HsvTrackSlider` 增加 `isInteractiveTarget` 与 `onCommit` 支持；对于目标答题轨，在未作答时隐藏默认值黑线且数值显示为 `?`。
3. 在 `ColorCanvas` 单维度模式中，将 `onAnswer` 从 `onValChange` 转移至 `onCommit`（点击释放时触发）。

### 基本原理
- **状态安全**：将拖拽状态清理 (`isDragging = false`, `releasePointerCapture`) 提升至 `pointerUp` 的顶层，不受 `disabled` 状态拦截，并在 `disabled` 变动时进行被动重置，消除状态穿透。
- **模式隔离**：区分「实时调节（Continuous）」与「单次确认提交（Commit）」——单维度盲测使用 `onCommit` 作答，未作答时渲染试探准心；多维度/参考轨使用 `val` 渲染确定性游标。

### 标签
#intent/fix #flow/ready #priority/high #comp/ui #concept/ui #scope/core #scope/ux #ai/instruct #task/domain/ui #task/object/track-slider #task/action/bug-fix #task/state/begin #task/status/active

---

### Script

#### Acts 1: 修复 `useTrackPointer.ts` 指针状态死锁

~~~~~act
write_file
src/hooks/useTrackPointer.ts
~~~~~
~~~~~typescript
import { useEffect, useRef, useState } from 'preact/hooks';

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

  // 当 disabled 切换时重置拖拽状态与悬停指示
  useEffect(() => {
    if (disabled) {
      if (isDragging) {
        setIsDragging(false);
        onDraggingStateChange?.(false);
      }
      setHoverVal(null);
      onHoverStateChange?.(null);
    }
  }, [disabled, isDragging, onDraggingStateChange, onHoverStateChange]);

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
    const wasDragging = isDragging;
    if (wasDragging) {
      setIsDragging(false);
      onDraggingStateChange?.(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
    if (disabled) return;
    const calculated = calcValFromClientX(e.clientX);
    if (calculated !== null) {
      onValChange?.(calculated);
      if (wasDragging) {
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

#### Acts 2: 完善 `HsvTrackSlider.tsx` 支持盲测目标轨道

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
  isInteractiveTarget?: boolean;
  onValChange?: (newVal: number) => void;
  onCommit?: (committedVal: number) => void;
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
  isInteractiveTarget = false,
  onValChange,
  onCommit,
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
    onCommit,
    onHoverStateChange,
    onDraggingStateChange,
  });

  const activeVal = hoverVal !== null ? hoverVal : val;
  const actualTargetVal =
    targetVal ?? (label === 'H' ? targetHSV[0] : label === 'S' ? targetHSV[1] : targetHSV[2]);

  const renderLabelText = () => {
    if (showAnswer) {
      return `${userVal !== undefined ? userVal : val}${unit}`;
    }
    if (isInteractiveTarget) {
      return hoverVal !== null ? `${hoverVal}${unit}` : '?';
    }
    return `${activeVal}${unit}`;
  };

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
          {/* 当前设定值标记线：在非目标盲测轨道显示 */}
          {!showAnswer && !isInteractiveTarget && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 pointer-events-none shadow-sm z-20"
              style={{ left: getPercent(val, max) }}
            />
          )}

          {/* 动态 ΔE 容错感应指示线 */}
          {!showAnswer &&
            showToleranceBand &&
            (hoverVal !== null || !isInteractiveTarget) &&
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
          {!showAnswer && hoverVal !== null && (isInteractiveTarget || hoverVal !== val) && (
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
          isInteractiveTarget && !showAnswer
            ? 'text-amber-500'
            : showAnswer && isHit
              ? 'text-emerald-600'
              : showAnswer
                ? 'text-rose-600'
                : 'text-slate-700'
        }`}
      >
        {renderLabelText()}
      </span>
    </div>
  );
}
~~~~~

#### Acts 3: 调整 `ColorCanvas.tsx` 单维度答题提交绑定

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
            {/* 单维度模式 H 轨 */}
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={targetH}
              max={360}
              unit="°"
              targetHSV={targetHSV}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetH}
              userVal={userAnswer?.userValue}
              isHit={userAnswer?.isHit}
              onValChange={(v) => {
                if (mode === 'H' && !showAnswer && !disabled) onAnswer(v);
              }}
              disabled={disabled || mode !== 'H'}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand && mode === 'H'}
            />

            {/* 单维度模式 S 轨 */}
            {mode === 'S' && (
              <HsvTrackSlider
                label="S"
                gradient={satGradient}
                val={targetS}
                max={100}
                unit="%"
                targetHSV={targetHSV}
                difficultyLevel={difficultyLevel}
                showAnswer={showAnswer}
                targetVal={targetS}
                userVal={userAnswer?.userValue}
                isHit={userAnswer?.isHit}
                onValChange={(v) => {
                  if (!showAnswer && !disabled) onAnswer(v);
                }}
                disabled={disabled}
                hitMargin={hitMargin}
                showToleranceBand={showToleranceBand}
              />
            )}

            {/* 单维度模式 V 轨 */}
            {(mode === 'V' || mode === 'S') && (
              <HsvTrackSlider
                label="V"
                gradient={valGradient}
                val={targetV}
                max={100}
                unit="%"
                targetHSV={targetHSV}
                difficultyLevel={difficultyLevel}
                showAnswer={showAnswer}
                targetVal={targetV}
                userVal={mode === 'V' ? userAnswer?.userValue : targetV}
                isHit={mode === 'V' ? userAnswer?.isHit : undefined}
                onValChange={(v) => {
                  if (mode === 'V' && !showAnswer && !disabled) onAnswer(v);
                }}
                disabled={disabled || mode !== 'V'}
                hitMargin={hitMargin}
                showToleranceBand={showToleranceBand && mode === 'V'}
              />
            )}
~~~~~
~~~~~typescript.new
            {/* 单维度模式 H 轨 */}
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={targetH}
              max={360}
              unit="°"
              targetHSV={targetHSV}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetH}
              userVal={userAnswer?.userValue}
              isHit={userAnswer?.isHit}
              isInteractiveTarget={mode === 'H'}
              onCommit={(v) => {
                if (mode === 'H' && !showAnswer && !disabled) onAnswer(v);
              }}
              disabled={disabled || mode !== 'H'}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand && mode === 'H'}
            />

            {/* 单维度模式 S 轨 */}
            {mode === 'S' && (
              <HsvTrackSlider
                label="S"
                gradient={satGradient}
                val={targetS}
                max={100}
                unit="%"
                targetHSV={targetHSV}
                difficultyLevel={difficultyLevel}
                showAnswer={showAnswer}
                targetVal={targetS}
                userVal={userAnswer?.userValue}
                isHit={userAnswer?.isHit}
                isInteractiveTarget={true}
                onCommit={(v) => {
                  if (!showAnswer && !disabled) onAnswer(v);
                }}
                disabled={disabled}
                hitMargin={hitMargin}
                showToleranceBand={showToleranceBand}
              />
            )}

            {/* 单维度模式 V 轨 */}
            {(mode === 'V' || mode === 'S') && (
              <HsvTrackSlider
                label="V"
                gradient={valGradient}
                val={targetV}
                max={100}
                unit="%"
                targetHSV={targetHSV}
                difficultyLevel={difficultyLevel}
                showAnswer={showAnswer}
                targetVal={targetV}
                userVal={mode === 'V' ? userAnswer?.userValue : targetV}
                isHit={mode === 'V' ? userAnswer?.isHit : undefined}
                isInteractiveTarget={mode === 'V'}
                onCommit={(v) => {
                  if (mode === 'V' && !showAnswer && !disabled) onAnswer(v);
                }}
                disabled={disabled || mode !== 'V'}
                hitMargin={hitMargin}
                showToleranceBand={showToleranceBand && mode === 'V'}
              />
            )}
~~~~~

### 下一步建议
1. 执行测试套件，验证 `npm run test` 与 `npm run check` 确保类型与代码格式完全通过。
2. 试玩色相 (H)、饱和度 (S)、明度 (V) 以及综合拾色 (ALL) 四种模式，验证滑块在未作答时的盲测效果与切题流畅度。
