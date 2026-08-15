import { useEffect, useRef, useState } from 'preact/hooks';
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
}

export function ColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
}: ColorCanvasProps) {
  const { mode, targetH, targetS, targetV } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);

  // === 综合拾色 ('ALL') 模式本地调制状态 ===
  const [userH, setUserH] = useState<number>(180);
  const [userS, setUserS] = useState<number>(50);
  const [userV, setUserV] = useState<number>(50);

  // 当题目切换时，重置调制状态为中性灰或随机初始状态
  useEffect(() => {
    if (mode === 'ALL') {
      setUserH(180);
      setUserS(50);
      setUserV(50);
    }
  }, [mode]);

  const activeTrackRef = useRef<HTMLDivElement | null>(null);
  const [hoverVal, setHoverVal] = useState<number | null>(null);

  const maxVal = mode === 'H' ? 360 : 100;

  // 单维度鼠标悬停追踪
  const handleMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer || !activeTrackRef.current || mode === 'ALL') return;
    const rect = activeTrackRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const val = Math.round(ratio * maxVal);
    setHoverVal(val);
  };

  const handleMouseLeave = () => {
    setHoverVal(null);
  };

  // 点击单维度活动轨道
  const handleActiveTrackClick = (e: MouseEvent) => {
    if (disabled || showAnswer || !activeTrackRef.current || mode === 'ALL') return;
    const rect = activeTrackRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const selectedVal = Math.round(ratio * maxVal);

    setHoverVal(null);
    onAnswer(selectedVal);
  };

  // === ALL 模式下滑块拖拽处理 ===
  const handleAllSliderChange = (label: 'H' | 'S' | 'V', val: number) => {
    if (disabled || showAnswer) return;
    if (label === 'H') setUserH(val);
    else if (label === 'S') setUserS(val);
    else if (label === 'V') setUserV(val);
  };

  const handleSubmitAll = () => {
    if (disabled || showAnswer) return;
    onAnswer([userH, userS, userV]);
  };

  const getPercent = (val: number, max: number) => `${(val / max) * 100}%`;

  // === 渐变背景计算 ===
  const currentH = mode === 'ALL' ? userH : targetH;
  const currentV = mode === 'ALL' ? userV : targetV;

  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
  const satGradient = `linear-gradient(to right, ${hsvToHex(currentH, 0, currentV)}, ${hsvToHex(currentH, 100, currentV)})`;
  const valGradient = `linear-gradient(to right, #000000, ${hsvToHex(currentH, 100, 100)})`;

  // 渲染单个 Slider 轨道行
  const renderSliderRow = (
    label: 'H' | 'S' | 'V',
    isTargetActiveMode: boolean,
    gradient: string,
    val: number,
    max: number,
    unit: string,
  ) => {
    const isInteractiveInAll = mode === 'ALL' && !showAnswer && !disabled;

    return (
      <div key={label} className="flex items-center gap-3 w-full">
        {/* Label */}
        <span className="w-5 font-bold font-mono text-slate-400 text-sm text-center">{label}</span>

        {/* Track Extended Hit Area */}
        <div
          onClick={isTargetActiveMode && mode !== 'ALL' ? handleActiveTrackClick : undefined}
          onKeyDown={
            isTargetActiveMode && mode !== 'ALL'
              ? (e) => {
                  if (
                    (e.key === 'Enter' || e.key === ' ') &&
                    hoverVal !== null &&
                    !disabled &&
                    !showAnswer
                  ) {
                    e.preventDefault();
                    onAnswer(hoverVal);
                  }
                }
              : undefined
          }
          role={isTargetActiveMode && mode !== 'ALL' ? 'button' : undefined}
          tabIndex={
            isTargetActiveMode && mode !== 'ALL' && !showAnswer && !disabled ? 0 : undefined
          }
          onMouseMove={isTargetActiveMode && mode !== 'ALL' ? handleMouseMove : undefined}
          onMouseLeave={isTargetActiveMode && mode !== 'ALL' ? handleMouseLeave : undefined}
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
          className={`relative flex-1 flex items-center ${
            isTargetActiveMode && mode !== 'ALL' && !showAnswer && !disabled
              ? 'cursor-none'
              : 'cursor-default'
          }`}
        >
          {/* Inner Track */}
          <div
            ref={isTargetActiveMode && mode !== 'ALL' ? activeTrackRef : null}
            className={`relative w-full h-7 rounded-xl border border-slate-200/80 shadow-inner flex items-center ${
              isTargetActiveMode && mode !== 'ALL' && !showAnswer && !disabled
                ? 'hover:ring-2 ring-indigo-400/60'
                : ''
            }`}
            style={{ background: gradient }}
          >
            {/* 已知维度/单维度标记 (无边框双像素黑色竖条) */}
            {(!isTargetActiveMode || (mode !== 'ALL' && !isTargetActiveMode)) && mode !== 'ALL' && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 pointer-events-none shadow-sm"
                style={{ left: getPercent(val, max) }}
              />
            )}

            {/* ALL 模式拖拽 Range Input */}
            {mode === 'ALL' && (
              <input
                type="range"
                min="0"
                max={max}
                value={val}
                disabled={disabled || showAnswer}
                onChange={(e) =>
                  handleAllSliderChange(
                    label,
                    Number.parseInt((e.target as HTMLInputElement).value, 10),
                  )
                }
                onInput={(e) =>
                  handleAllSliderChange(
                    label,
                    Number.parseInt((e.target as HTMLInputElement).value, 10),
                  )
                }
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default z-30"
              />
            )}

            {/* ALL 模式调制中的当前游标 (无边框双像素黑色竖条) */}
            {mode === 'ALL' && !showAnswer && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-900 pointer-events-none shadow-sm z-20"
                style={{ left: getPercent(val, max) }}
              />
            )}

            {/* 容错感应区指示线 (支持单维度悬停与 ALL 模式实时调制) */}
            {!showAnswer &&
              showToleranceBand &&
              ((mode !== 'ALL' && isTargetActiveMode && hoverVal !== null) || mode === 'ALL') &&
              (() => {
                const activeVal = mode === 'ALL' ? val : (hoverVal as number);
                const currentHSVTuple: [number, number, number] | undefined =
                  mode === 'ALL' ? [userH, userS, userV] : undefined;

                const span = getToleranceSpan(label, activeVal, question, currentHSVTuple);
                const isWrapMode = label === 'H';

                const leftVal = isWrapMode
                  ? (activeVal - span.halfSpan + max) % max
                  : Math.max(0, activeVal - span.halfSpan);
                const rightVal = isWrapMode
                  ? (activeVal + span.halfSpan + max) % max
                  : Math.min(max, activeVal + span.halfSpan);

                const leftPct = (leftVal / max) * 100;
                const rightPct = (rightVal / max) * 100;

                return (
                  <>
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                      style={{ left: `${leftPct}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none z-20 w-0.5 bg-indigo-500/80 -translate-x-1/2"
                      style={{ left: `${rightPct}%` }}
                    />
                  </>
                );
              })()}

            {/* 单维度悬停准心 */}
            {mode !== 'ALL' && isTargetActiveMode && !showAnswer && hoverVal !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-indigo-600/90 shadow-sm pointer-events-none z-30"
                style={{ left: getPercent(hoverVal, max) }}
              />
            )}

            {/* 答题揭晓阶段标记 */}
            {showAnswer && (
              <>
                {/* 真理目标位 (绿色细竖线) */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-8 bg-emerald-500 border-x border-white shadow-md z-10"
                  style={{
                    left: getPercent(
                      label === 'H' ? targetH : label === 'S' ? targetS : targetV,
                      max,
                    ),
                  }}
                />

                {/* 用户提交位 (红色或绿色细竖线) */}
                {userAnswer && (
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-8 border-x border-white ${
                      userAnswer.isHit ? 'bg-emerald-500' : 'bg-rose-500'
                    } shadow-md z-20`}
                    style={{
                      left: getPercent(
                        mode === 'ALL'
                          ? (userAnswer.userHSV?.[label === 'H' ? 0 : label === 'S' ? 1 : 2] ?? val)
                          : userAnswer.userValue,
                        max,
                      ),
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* 数值 Label */}
        <span
          className={`w-12 text-right font-mono font-bold text-xs ${
            isInteractiveInAll || (isTargetActiveMode && !showAnswer)
              ? showAnswer
                ? userAnswer?.isHit
                  ? 'text-emerald-600'
                  : 'text-rose-600'
                : 'text-amber-500'
              : 'text-slate-700'
          }`}
        >
          {mode === 'ALL'
            ? `${val}${unit}`
            : isTargetActiveMode && !showAnswer
              ? hoverVal !== null
                ? `${hoverVal}${unit}`
                : '?'
              : `${val}${unit}`}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 目标色块 / 双色块对比 */}
      <div className="flex flex-col items-center gap-2 w-full">
        {mode === 'ALL' ? (
          <div className="flex items-center justify-center gap-4 w-full">
            <div
              className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
              style={{ backgroundColor: targetHex }}
            />
            <div
              className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-150"
              style={{ backgroundColor: hsvToHex(userH, userS, userV) }}
            />
          </div>
        ) : (
          <div
            className="w-32 h-32 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
            style={{ backgroundColor: targetHex }}
          />
        )}
      </div>

      {/* 递进显隐/三轨交互 Slider */}
      <div className="w-full space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        {/* H 行 */}
        {renderSliderRow(
          'H',
          mode === 'H' || mode === 'ALL',
          hueGradient,
          mode === 'ALL' ? userH : targetH,
          360,
          '°',
        )}

        {/* S 行 */}
        {(mode === 'S' || mode === 'ALL') &&
          renderSliderRow(
            'S',
            mode === 'S' || mode === 'ALL',
            satGradient,
            mode === 'ALL' ? userS : targetS,
            100,
            '%',
          )}

        {/* V 行 */}
        {(mode === 'V' || mode === 'S' || mode === 'ALL') &&
          renderSliderRow(
            'V',
            mode === 'V' || mode === 'ALL',
            valGradient,
            mode === 'ALL' ? userV : targetV,
            100,
            '%',
          )}
      </div>

      {/* ALL 模式显式提交控制按钮 */}
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
