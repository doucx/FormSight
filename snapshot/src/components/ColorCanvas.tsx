import { useEffect, useRef, useState } from 'preact/hooks';
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

          {isTargetActiveMode &&
            showToleranceBand &&
            (hoverVal !== null || showAnswer) &&
            (() => {
              const currentVal = showAnswer
                ? (userAnswer ? userAnswer.userValue : val)
                : hoverVal!;
              const span = getToleranceSpan(
                label,
                currentVal,
                targetHSV,
                question.difficultyLevel,
              );
              const isWrapMode = label === 'H';
              const leftVal = isWrapMode
                ? (currentVal - span.halfSpan + max) % max
                : Math.max(0, currentVal - span.halfSpan);
              const rightVal = isWrapMode
                ? (currentVal + span.halfSpan + max) % max
                : Math.min(max, currentVal + span.halfSpan);

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
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 pointer-events-none shadow-sm z-20"
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
