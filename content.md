收到，我将按照你的指示将 `ColorCanvas.tsx` 的单维度滑块模式回滚至专用的 `SingleDimensionSlider` 架构，彻底隔离单维度答题提交（基于 `onCommit`）与综合模式连续调制（基于 `onValChange`）的生命周期。

## [WIP] fix: 回滚色感单维度滑块实现以消除真理剧透与状态残留

### 错误分析
1. **真理值标线暴露与数字剧透**：
   - 统一使用 `HsvTrackSlider` 时，组件默认渲染了当前传入的 `val` 标线，且右侧数字在未悬停时默认打印 `activeVal`。在 H/S/V 单维度模式下传入的 `val` 即为目标真理值，导致未作答即剧透了答案。
2. **指针状态残留与幽灵作答**：
   - `ColorCanvas` 在单维度模式下直接将 `onAnswer` 挂载到了指针微动即触发的 `onValChange`。用户按下指针瞬间触发提交并使组件进入 `disabled` 状态，后续的 `pointerUp` 被拦截导致捕获未正常释放，切题后鼠标移动再次触发了 `onValChange` 产生非预期自动作答。

### 用户需求
1. 回滚单维度模式的实现，恢复 `SingleDimensionSlider` 专属子组件。
2. 单维度模式下未答题时不显示任何真理线和数字，数字位显示 `?`，仅在鼠标悬停时显示动态准心线与容错带。
3. 单维度答题提交严格收敛在 `onCommit`（松开指针）阶段，避免切题后的指针拖拽状态残留与连续误判。
4. 保持 ALL 综合拾色模式的多轴联动与拖拽预览机制正常运行。

### 评论
将“单维度单次点击作答（One-shot Commit）”与“综合多维度连续拖拽调制（Continuous Tuning）”解耦是保证交互鲁棒性的正确选择。通过为单维度模式恢复专用的 `SingleDimensionSlider`，可以从根本上解决状态机不匹配带来的边界副作用。

### 目标
1. 在 `src/components/ColorCanvas.tsx` 中重新引入 `SingleDimensionSlider` 子组件。
2. 单维度（H、S、V）模式使用 `SingleDimensionSlider`，答题事件绑定到 `onCommit`。
3. 恢复非活动维度的静态展示以及活动维度的 `?` 状态遮罩。
4. 保留 ALL 模式中 `HsvTrackSlider` 的完整功能。

### 基本原理
`SingleDimensionSlider` 专门处理单次作答场景：
- 未作答时隐藏真理标线，仅在 `hoverVal !== null` 时显示悬停试探线和动态 OKLab 容错带。
- 通过 `useTrackPointer` 的 `onCommit` 回调在指针释放时触发 `onAnswer` 并清除悬停状态，避免将拖拽过程中的中间值误判为提交。
- `ALL` 模式继续使用 `HsvTrackSlider`，保留多轨道实时联动预览。

### 标签
#intent/fix #flow/ready #priority/high #comp/interfaces #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/color-canvas #task/action/rollback #task/state/begin

---

### Script

#### Acts 1: 回滚恢复 `ColorCanvas.tsx` 中的单维度独立滑块实现

~~~~~act
write_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~tsx
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

### 下一步建议
1. 运行测试套件验证代码格式与测试回归情况：
   ```bash
   pnpm test
   pnpm check
   ```
2. 进入色感训练模块，分别实测单维度（色相 H、饱和度 S、明度 V）与综合拾色（ALL）模式，确认：
   - 单维度作答前不显示任何标线，右侧数值保持 `?`。
   - 点击并松开鼠标即完成答题，自动切题后鼠标移动不会发生幽灵作答。
   - ALL 模式下三轨滑动交互及色块实时预览表现正常。
