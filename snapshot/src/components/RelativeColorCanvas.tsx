import { ArrowRight } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
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
}

export function RelativeColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: RelativeColorCanvasProps) {
  const { colorA, colorB, colorC, targetD } = question;

  const [userH, setUserH] = useState<number>(colorC[0]);
  const [userS, setUserS] = useState<number>(colorC[1]);
  const [userV, setUserV] = useState<number>(colorC[2]);

  // 题目切换时重置 D 为 C 的初始状态
  useEffect(() => {
    setUserH(colorC[0]);
    setUserS(colorC[1]);
    setUserV(colorC[2]);
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
  const hexUserD = hsvToHex(userH, userS, userV);
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

      {/* 下方 D 颜色调制滑块轨道 */}
      <div className="w-full space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        {/* H 轨 */}
        <div className="flex items-center gap-3 w-full">
          <span className="w-5 font-bold font-mono text-slate-400 text-sm text-center">H</span>
          <div className="relative flex-1 flex items-center">
            <div
              className="w-full h-7 rounded-xl border border-slate-200/80 shadow-inner"
              style={{ background: hueGradient }}
            />
            <input
              type="range"
              min="0"
              max="360"
              value={userH}
              disabled={disabled || showAnswer}
              onInput={(e) => setUserH(Number.parseInt((e.target as HTMLInputElement).value, 10))}
              className="absolute inset-0 w-full h-7 opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-8 bg-slate-900 pointer-events-none rounded-full shadow-md z-10"
              style={{ left: `${(userH / 360) * 100}%` }}
            />
          </div>
          <span className="w-12 text-right font-mono font-bold text-xs text-amber-500">
            {userH}°
          </span>
        </div>

        {/* S 轨 */}
        <div className="flex items-center gap-3 w-full">
          <span className="w-5 font-bold font-mono text-slate-400 text-sm text-center">S</span>
          <div className="relative flex-1 flex items-center">
            <div
              className="w-full h-7 rounded-xl border border-slate-200/80 shadow-inner"
              style={{ background: satGradient }}
            />
            <input
              type="range"
              min="0"
              max="100"
              value={userS}
              disabled={disabled || showAnswer}
              onInput={(e) => setUserS(Number.parseInt((e.target as HTMLInputElement).value, 10))}
              className="absolute inset-0 w-full h-7 opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-8 bg-slate-900 pointer-events-none rounded-full shadow-md z-10"
              style={{ left: `${userS}%` }}
            />
          </div>
          <span className="w-12 text-right font-mono font-bold text-xs text-amber-500">
            {userS}%
          </span>
        </div>

        {/* V 轨 */}
        <div className="flex items-center gap-3 w-full">
          <span className="w-5 font-bold font-mono text-slate-400 text-sm text-center">V</span>
          <div className="relative flex-1 flex items-center">
            <div
              className="w-full h-7 rounded-xl border border-slate-200/80 shadow-inner"
              style={{ background: valGradient }}
            />
            <input
              type="range"
              min="0"
              max="100"
              value={userV}
              disabled={disabled || showAnswer}
              onInput={(e) => setUserV(Number.parseInt((e.target as HTMLInputElement).value, 10))}
              className="absolute inset-0 w-full h-7 opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-8 bg-slate-900 pointer-events-none rounded-full shadow-md z-10"
              style={{ left: `${userV}%` }}
            />
          </div>
          <span className="w-12 text-right font-mono font-bold text-xs text-amber-500">
            {userV}%
          </span>
        </div>
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
