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
  const trackRef = useRef<HTMLDivElement | null>(null);

  const { mode, targetH, targetS, targetV } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);

  // 轨道参数
  const maxVal = mode === 'H' ? 360 : 100;

  const handleTrackClick = (e: MouseEvent) => {
    if (disabled || showAnswer || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const selectedVal = Math.round(ratio * maxVal);

    onAnswer(selectedVal);
  };

  // 生成轨道 CSS 背景样式
  const getTrackBackground = () => {
    if (mode === 'H') {
      return 'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
    }
    if (mode === 'V') {
      const endHex = hsvToHex(targetH, targetS, 100);
      return `linear-gradient(to right, #000000, ${endHex})`;
    }
    // mode === 'S'
    const startHex = hsvToHex(targetH, 0, targetV);
    const endHex = hsvToHex(targetH, 100, targetV);
    return `linear-gradient(to right, ${startHex}, ${endHex})`;
  };

  // 角度/百分比位置计算
  const getThumbPosPercent = (val: number) => {
    return `${(val / maxVal) * 100}%`;
  };

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 1. 目标色块展示 */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-36 h-36 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300 scale-100 hover:scale-105"
          style={{ backgroundColor: targetHex }}
        />
        <div className="font-mono text-xs font-bold text-slate-400">
          {showAnswer ? targetHex : '???'}
        </div>
      </div>

      {/* 2. 当前已知维度展示 */}
      <div className="w-full grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center font-mono text-xs">
        <div>
          <span className="text-[10px] text-slate-400 block font-sans">色相 (H)</span>
          <span className={`font-bold ${mode === 'H' && !showAnswer ? 'text-amber-500' : 'text-slate-800'}`}>
            {mode === 'H' ? (showAnswer ? `${targetH}°` : '?') : `${targetH}°`}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block font-sans">饱和度 (S)</span>
          <span className={`font-bold ${mode === 'S' && !showAnswer ? 'text-amber-500' : 'text-slate-800'}`}>
            {mode === 'S' ? (showAnswer ? `${targetS}%` : '?') : `${targetS}%`}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block font-sans">明度 (V)</span>
          <span className={`font-bold ${mode === 'V' && !showAnswer ? 'text-amber-500' : 'text-slate-800'}`}>
            {mode === 'V' ? (showAnswer ? `${targetV}%` : '?') : `${targetV}%`}
          </span>
        </div>
      </div>

      {/* 3. 滑块点击交互轨道 */}
      <div className="w-full space-y-2 pt-2">
        <div className="flex justify-between text-xs font-bold text-slate-500">
          <span>{mode === 'H' ? '色相选区 (0° ~ 360°)' : mode === 'V' ? '明度选区 (0% ~ 100%)' : '饱和度选区 (0% ~ 100%)'}</span>
          <span className="text-indigo-600 font-mono">容错: ±{question.tolerance}{mode === 'H' ? '°' : '%'}</span>
        </div>

        <div
          ref={trackRef}
          onClick={handleTrackClick}
          className={`relative w-full h-8 rounded-xl shadow-inner border border-slate-200 cursor-pointer transition-all ${
            disabled || showAnswer ? 'cursor-default opacity-90' : 'hover:ring-2 ring-indigo-400/50'
          }`}
          style={{ background: getTrackBackground() }}
        >
          {/* 揭晓答案后的标记位 */}
          {showAnswer && (
            <>
              {/* 正确真理标记位 */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-emerald-500 shadow-md flex items-center justify-center z-10"
                style={{ left: getThumbPosPercent(mode === 'H' ? targetH : mode === 'V' ? targetV : targetS) }}
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>

              {/* 用户点击标记位 (若未完全重合) */}
              {userAnswer && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 ${
                    userAnswer.isHit ? 'border-emerald-500' : 'border-rose-500'
                  } shadow-md flex items-center justify-center z-20`}
                  style={{ left: getThumbPosPercent(userAnswer.userValue) }}
                >
                  <div className={`w-2 h-2 rounded-full ${userAnswer.isHit ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}