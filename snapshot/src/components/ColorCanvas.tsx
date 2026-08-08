import { useRef, useState } from 'preact/hooks';
import { type ColorHitResult, type ColorQuestionData, hsvToHex } from '../utils/colorUtils';

interface ColorCanvasProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number) => void;
  disabled?: boolean;
}

export function ColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: ColorCanvasProps) {
  const activeTrackRef = useRef<HTMLDivElement | null>(null);
  const [hoverVal, setHoverVal] = useState<number | null>(null);

  const { mode, targetH, targetS, targetV } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);

  const maxVal = mode === 'H' ? 360 : 100;

  // 鼠标悬停实时追踪
  const handleMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer || !activeTrackRef.current) return;
    const rect = activeTrackRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const val = Math.round(ratio * maxVal);
    setHoverVal(val);
  };

  const handleMouseLeave = () => {
    setHoverVal(null);
  };

  // 点击活动待测轨道选择数值
  const handleActiveTrackClick = (e: MouseEvent) => {
    if (disabled || showAnswer || !activeTrackRef.current) return;
    const rect = activeTrackRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const selectedVal = Math.round(ratio * maxVal);

    setHoverVal(null);
    onAnswer(selectedVal);
  };

  const getPercent = (val: number, max: number) => `${(val / max) * 100}%`;

  // === 渐变背景 ===
  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
  const satGradient = `linear-gradient(to right, ${hsvToHex(targetH, 0, targetV)}, ${hsvToHex(targetH, 100, targetV)})`;
  const valGradient = `linear-gradient(to right, #000000, ${hsvToHex(targetH, 100, 100)})`;

  // 渲染单个 Slider 轨道行
  const renderSliderRow = (
    label: 'H' | 'S' | 'V',
    isTargetActiveMode: boolean,
    gradient: string,
    val: number,
    max: number,
    unit: string,
  ) => {
    return (
      <div key={label} className="flex items-center gap-3 w-full">
        {/* Label */}
        <span className="w-5 font-bold font-mono text-slate-400 text-sm text-center">{label}</span>

        {/* Track */}
        <div
          ref={isTargetActiveMode ? activeTrackRef : null}
          onClick={isTargetActiveMode ? handleActiveTrackClick : undefined}
          onMouseMove={isTargetActiveMode ? handleMouseMove : undefined}
          onMouseLeave={isTargetActiveMode ? handleMouseLeave : undefined}
          className={`relative flex-1 h-7 rounded-xl border border-slate-200/80 shadow-inner flex items-center ${
            isTargetActiveMode && !showAnswer && !disabled
              ? 'cursor-none hover:ring-2 ring-indigo-400/60'
              : 'cursor-default'
          }`}
          style={{ background: gradient }}
        >
          {/* 已知维度标记 (细长黑色竖条) */}
          {!isTargetActiveMode && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-8 bg-slate-900 border border-white/80 rounded-sm shadow-sm"
              style={{ left: getPercent(val, max) }}
            />
          )}

          {/* 悬停准心 (细长空心竖条) */}
          {isTargetActiveMode && !showAnswer && hoverVal !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-8 border-2 border-indigo-600 bg-white/40 rounded-sm shadow-md pointer-events-none z-30"
              style={{ left: getPercent(hoverVal, max) }}
            />
          )}

          {/* 待测维度答题揭晓：真理目标与用户选择 (竖条标记) */}
          {isTargetActiveMode && showAnswer && (
            <>
              {/* 真理目标位 (绿色竖条) */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-8 bg-emerald-500 border-2 border-white rounded-sm shadow-md z-10"
                style={{ left: getPercent(val, max) }}
              />

              {/* 用户点击位 (红色或绿色竖条) */}
              {userAnswer && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-8 border-2 border-white ${
                    userAnswer.isHit ? 'bg-emerald-500' : 'bg-rose-500'
                  } rounded-sm shadow-md z-20`}
                  style={{ left: getPercent(userAnswer.userValue, max) }}
                />
              )}
            </>
          )}
        </div>

        {/* 数值 Label */}
        <span
          className={`w-12 text-right font-mono font-bold text-xs ${
            isTargetActiveMode
              ? showAnswer
                ? userAnswer?.isHit
                  ? 'text-emerald-600'
                  : 'text-rose-600'
                : 'text-amber-500'
              : 'text-slate-700'
          }`}
        >
          {isTargetActiveMode && !showAnswer
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
      {/* 目标色块 */}
      <div className="flex flex-col items-center">
        <div
          className="w-32 h-32 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
          style={{ backgroundColor: targetHex }}
        />
      </div>

      {/* 递进显隐轨道 */}
      <div className="w-full space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        {/* H 行 */}
        {renderSliderRow('H', mode === 'H', hueGradient, targetH, 360, '°')}

        {/* S 行 */}
        {mode === 'S' && renderSliderRow('S', true, satGradient, targetS, 100, '%')}

        {/* V 行 */}
        {(mode === 'V' || mode === 'S') &&
          renderSliderRow('V', mode === 'V', valGradient, targetV, 100, '%')}
      </div>
    </div>
  );
}
