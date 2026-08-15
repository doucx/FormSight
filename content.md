好的！我将立即开始执行重构计划。

将 `ColorCanvas.tsx` 中臃肿的拾色条逻辑拆分为职责明确的两个专用子组件：`SingleDimensionSlider`（用于单维度 H/S/V 模式，严格保障 `?` 答案遮罩与非活跃轨道不可操作）和 `AllMatchSlider`（用于 ALL 综合拾色模式，支持全轨流畅拖动、拖动感与实时双色块联动）。

下面为您生成实施计划：

## [WIP] refactor(color): 拆分 ColorCanvas 拾色轨道逻辑，修复单维度答案泄露与越权拖动问题

### 用户需求
1. 修复单维度模式（色相/明度/饱和度）在作答前数值 Label 泄漏真实答案的问题，恢复鼠标未悬停时严格显示 `'?'` 的机制。
2. 修复单维度模式下非活跃轨道（如明度模式中的色相轨）异常可拖动的缺陷。
3. 对 `ColorCanvas.tsx` 进行架构重构，将原本臃肿的“上帝逻辑”解耦拆分为 `SingleDimensionSlider` 和 `AllMatchSlider` 两个专用子组件。

### 评论
通过将单维度模式与综合拾色模式的轨道逻辑解耦拆分，彻底隔绝了两者的状态干扰，使代码边界清晰、可读性与可维护性大幅提升，同时完美兼顾了单维度盲猜的严谨性与综合拾色拖拽的流畅感。

### 目标
1. 在 `src/components/ColorCanvas.tsx` 中拆分子组件 `SingleDimensionSlider` 和 `AllMatchSlider`。
2. 修复 `SingleDimensionSlider` 逻辑：只有当 `isTargetActiveMode` 为 `true` 时才响应交互，作答前未悬停严格显示 `'?'`。
3. `AllMatchSlider` 专注于三轨道指针按拽拖动与实时 `userH/userS/userV` 联动。

### 标签
#intent/refine #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/color-recognition #task/object/color-canvas-decoupling #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 重构 ColorCanvas.tsx 解耦拆分 SingleDimensionSlider 与 AllMatchSlider

~~~~~act
write_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  type ColorHitResult,
  type ColorMode,
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

  // Label 渲染逻辑：严格防泄漏
  const renderLabelContent = () => {
    if (showAnswer) {
      return `${val}${unit}`;
    }
    if (!isTargetActiveMode) {
      // 非活跃固定轨道 (如 V 模式下的 H/S 轨)，已知公开值
      return `${val}${unit}`;
    }
    // 活跃轨道 (如 H 模式下的 H 轨)
    if (hoverVal !== null) {
      return `${hoverVal}${unit}`;
    }
    return '?';
  };

  const isInteractive = isTargetActiveMode && !showAnswer && !disabled;

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
          {/* 非活跃固定轨道的已知标记线 */}
          {!isTargetActiveMode && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 pointer-events-none shadow-sm"
              style={{ left: getPercent(val, max) }}
            />
          )}

          {/* 活跃轨道悬停时的容错感应线 */}
          {!showAnswer && isTargetActiveMode && showToleranceBand && hoverVal !== null && (
            (() => {
              const span = getToleranceSpan(label, hoverVal, question);
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
            })()
          )}

          {/* 活跃轨道的鼠标悬停准心线 */}
          {!showAnswer && isTargetActiveMode && hoverVal !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 shadow-sm pointer-events-none z-30 opacity-85"
              style={{ left: getPercent(hoverVal, max) }}
            />
          )}

          {/* 答案揭晓阶段真理线与提交线 */}
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

      {/* 数值 Label */}
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
// 子组件 2: 综合拾色模式轨道 (Match / ALL)
// ==========================================
interface AllMatchSliderProps {
  label: 'H' | 'S' | 'V';
  gradient: string;
  val: number; // 当前调制设定值 (userH / userS / userV)
  max: number;
  unit: string;
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onValChange: (newVal: number) => void;
  allUserHSV: [number, number, number];
  disabled: boolean;
  hitMargin: number;
  showToleranceBand: boolean;
  onHoverStateChange: (hoverVal: number | null) => void;
  onDraggingStateChange: (isDragging: boolean) => void;
}

function AllMatchSlider({
  label,
  gradient,
  val,
  max,
  unit,
  question,
  showAnswer,
  userAnswer,
  onValChange,
  allUserHSV,
  disabled,
  hitMargin,
  showToleranceBand,
  onHoverStateChange,
  onDraggingStateChange,
}: AllMatchSliderProps) {
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
    onDraggingStateChange(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const calculated = calcValFromClientX(e.clientX);
    if (calculated !== null) {
      onValChange(calculated);
      setHoverVal(calculated);
      onHoverStateChange(calculated);
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
      onHoverStateChange(calculated);
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (disabled || showAnswer) return;
    if (isDragging) {
      setIsDragging(false);
      onDraggingStateChange(false);
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
      onHoverStateChange(null);
    }
  };

  const activeVal = hoverVal !== null ? hoverVal : val;
  const targetVal = label === 'H' ? question.targetH : label === 'S' ? question.targetS : question.targetV;

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
          {!showAnswer && showToleranceBand && (
            (() => {
              const currentTuple: [number, number, number] = [
                label === 'H' ? activeVal : allUserHSV[0],
                label === 'S' ? activeVal : allUserHSV[1],
                label === 'V' ? activeVal : allUserHSV[2],
              ];

              const span = getToleranceSpan(label, activeVal, question, currentTuple);
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
            })()
          )}

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
                style={{ left: getPercent(targetVal, max) }}
              />
              {userAnswer && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-8 border-x border-white ${
                    userAnswer.isHit ? 'bg-emerald-500' : 'bg-rose-500'
                  } shadow-md z-20`}
                  style={{
                    left: getPercent(
                      userAnswer.userHSV?.[label === 'H' ? 0 : label === 'S' ? 1 : 2] ?? val,
                      max,
                    ),
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>

      <span
        className={`w-12 text-right font-mono font-bold text-xs ${
          !showAnswer
            ? 'text-amber-500'
            : userAnswer?.isHit
              ? 'text-emerald-600'
              : 'text-rose-600'
        }`}
      >
        {`${activeVal}${unit}`}
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
  const { mode, targetH, targetS, targetV } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);

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
            <AllMatchSlider
              label="H"
              gradient={hueGradient}
              val={userH}
              max={360}
              unit="°"
              question={question}
              showAnswer={showAnswer}
              userAnswer={userAnswer}
              onValChange={setUserH}
              allUserHSV={[userH, userS, userV]}
              disabled={disabled}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
              onHoverStateChange={(hVal) => setAllHoverVals((prev) => ({ ...prev, H: hVal }))}
              onDraggingStateChange={(isDrag) => setDraggingLabel(isDrag ? 'H' : null)}
            />
            <AllMatchSlider
              label="S"
              gradient={satGradient}
              val={userS}
              max={100}
              unit="%"
              question={question}
              showAnswer={showAnswer}
              userAnswer={userAnswer}
              onValChange={setUserS}
              allUserHSV={[userH, userS, userV]}
              disabled={disabled}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
              onHoverStateChange={(hVal) => setAllHoverVals((prev) => ({ ...prev, S: hVal }))}
              onDraggingStateChange={(isDrag) => setDraggingLabel(isDrag ? 'S' : null)}
            />
            <AllMatchSlider
              label="V"
              gradient={valGradient}
              val={userV}
              max={100}
              unit="%"
              question={question}
              showAnswer={showAnswer}
              userAnswer={userAnswer}
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

### 下一步建议
- 校验项目类型与自动化测试：运行 `npm run check` 及 `npm run build`，确保重构代码零编译报错且逻辑完全符合规范。
