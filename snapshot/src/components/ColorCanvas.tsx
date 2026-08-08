import { useRef } from 'preact/hooks';
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

  const { mode, targetH, targetS, targetV } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);

  // 点击活动待测轨道选择数值
  const handleActiveTrackClick = (e: MouseEvent) => {
    if (disabled || showAnswer || !activeTrackRef.current) return;
    const rect = activeTrackRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const maxVal = mode === 'H' ? 360 : 100;
    const selectedVal = Math.round(ratio * maxVal);

    onAnswer(selectedVal);
  };

  const getPercent = (val: number, max: number) => `${(val / max) * 100}%`;

  // === 渐变背景 (完美复刻 Anki 算法) ===
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
          className={`relative flex-1 h-5 rounded-full border border-slate-200/80 shadow-inner ${
            isTargetActiveMode && !showAnswer && !disabled
              ? 'cursor-pointer hover:ring-2 ring-indigo-400/60'
              : 'cursor-default'
          }`}
          style={{ background: gradient }}
        >
          {/* 已知维度滑块 Marker */}
          {!isTargetActiveMode && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-700 shadow-sm"
              style={{ left: getPercent(val, max) }}
            />
          )}

          {/* 待测维度答题后揭晓真理点与用户点击点 */}
          {isTargetActiveMode && showAnswer && (
            <>
              {/* 真理目标位 Marker */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-emerald-500 shadow-md z-10"
                style={{ left: getPercent(val, max) }}
              />

              {/* 用户点击 Marker */}
              {userAnswer && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 ${
                    userAnswer.isHit ? 'border-emerald-500' : 'border-rose-500'
                  } shadow-md z-20`}
                  style={{ left: getPercent(userAnswer.userValue, max) }}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full mx-auto my-1 ${
                      userAnswer.isHit ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                </div>
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
          {isTargetActiveMode && !showAnswer ? '?' : `${val}${unit}`}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 目标色块 */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-32 h-32 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
          style={{ backgroundColor: targetHex }}
        />
        <div className="font-mono text-xs font-bold text-slate-400">
          {showAnswer ? targetHex : '???'}
        </div>
      </div>

      {/* 按 Anki 规则递进显隐轨道 */}
      <div className="w-full space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        {/* H 行: 所有模式均展示 */}
        {renderSliderRow('H', mode === 'H', hueGradient, targetH, 360, '°')}

        {/* S 行: 仅在测试 S 时展示 */}
        {mode === 'S' && renderSliderRow('S', true, satGradient, targetS, 100, '%')}

        {/* V 行: 在测试 V 和测试 S 时展示 */}
        {(mode === 'V' || mode === 'S') &&
          renderSliderRow('V', mode === 'V', valGradient, targetV, 100, '%')}
      </div>
    </div>
  );
}