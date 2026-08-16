import { ArrowRight } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { hsvToHex } from '../utils/colorUtils';
import type {
  RelativeColorHitResult,
  RelativeColorQuestionData,
} from '../utils/relativeColorUtils';
import { HsvTrackSlider } from './HsvTrackSlider';

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
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-3">
          <div className="flex items-center justify-center gap-4 w-full">
            <div
              className="w-28 h-28 rounded-2xl border-2 border-white shadow-md"
              style={{ backgroundColor: hexA }}
            />
            <ArrowRight className="w-6 h-6 text-indigo-400" />
            <div
              className="w-28 h-28 rounded-2xl border-2 border-white shadow-md"
              style={{ backgroundColor: hexB }}
            />
          </div>
        </div>

        {/* 目标推移组 (C -> D) */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-3">
          <div className="flex items-center justify-center gap-4 w-full">
            <div
              className="w-28 h-28 rounded-2xl border-2 border-white shadow-md"
              style={{ backgroundColor: hexC }}
            />
            <ArrowRight className="w-6 h-6 text-indigo-400" />
            <div
              className="w-28 h-28 rounded-2xl border-2 border-white shadow-md transition-all duration-75 relative"
              style={{ backgroundColor: hexUserD }}
            >
              {showAnswer && (
                <div
                  className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-2 border-white shadow-md"
                  style={{ backgroundColor: hexTargetD }}
                  title="真理色彩 D"
                />
              )}
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
