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
}: RelativeColorCanvasProps) {
  const { colorA, colorB, colorC, targetD, options, correctIndex, difficultyLevel } = question;

  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  useEffect(() => {
    if (question.id) {
      setSelectedIndex(0);
    }
  }, [question.id]);

  const activeColor = options?.[selectedIndex] ?? targetD;
  const userH = activeColor[0];
  const userS = activeColor[1];
  const userV = activeColor[2];

  const handleSubmit = () => {
    if (disabled || showAnswer) return;
    onAnswer(activeColor);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (disabled || showAnswer) return;

      let targetIdx: number | null = null;
      if (['1', '2', '3', '4'].includes(e.key)) {
        targetIdx = Number.parseInt(e.key, 10) - 1;
      } else if (e.code.startsWith('Digit') || e.code.startsWith('Numpad')) {
        const num = Number.parseInt(e.code.replace(/\D/g, ''), 10);
        if (num >= 1 && num <= 4) {
          targetIdx = num - 1;
        }
      }

      if (targetIdx !== null && options && targetIdx < options.length) {
        e.preventDefault();
        setSelectedIndex(targetIdx);
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        const chosenColor = options?.[selectedIndex] ?? targetD;
        onAnswer(chosenColor);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, disabled, selectedIndex, options, targetD, onAnswer]);

  const hexA = hsvToHex(...colorA);
  const hexB = hsvToHex(...colorB);
  const hexC = hsvToHex(...colorC);

  const hexSelectedD = hsvToHex(userH, userS, userV);
  const hexTargetD = hsvToHex(...targetD);

  const cH = colorC[0];
  const cS = colorC[1];
  const cV = colorC[2];

  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
  const satGradient = `linear-gradient(to right, ${hsvToHex(userH, 0, userV)}, ${hsvToHex(userH, 100, userV)})`;
  const valGradient = `linear-gradient(to right, #000000, ${hsvToHex(userH, 100, 100)})`;

  const cSatGradient = `linear-gradient(to right, ${hsvToHex(cH, 0, cV)}, ${hsvToHex(cH, 100, cV)})`;
  const cValGradient = `linear-gradient(to right, #000000, ${hsvToHex(cH, 100, 100)})`;

  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 对比展示区 (2x2 网格: 上 A -> B，下 C -> D) */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 w-full flex flex-col items-center gap-4">
        {/* 上排: 基准推移组 (A -> B) */}
        <div className="flex items-center justify-center gap-4">
          <div
            className="w-24 h-24 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexA }}
          />
          <ArrowRight className="w-5 h-5 text-indigo-400" />
          <div
            className="w-24 h-24 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexB }}
          />
        </div>

        {/* 下排: 目标推移组 (C -> D) */}
        <div className="flex items-center justify-center gap-4">
          <div
            className="w-24 h-24 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexC }}
          />
          <ArrowRight className="w-5 h-5 text-indigo-400" />
          <div
            className="w-24 h-24 rounded-2xl border-2 border-white shadow-md transition-all duration-150 relative overflow-hidden"
            style={{ backgroundColor: hexSelectedD }}
          >
            {showAnswer && (
              <div
                className="absolute bottom-0 left-0 right-0 h-1/2 border-t border-white/40"
                style={{ backgroundColor: hexTargetD }}
              />
            )}
          </div>
        </div>
      </div>

      {/* 轨道面板 */}
      <div className="w-full space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 左侧：C 节点颜色 */}
          <div className="space-y-3 md:pr-4 md:border-r border-slate-200/60">
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={cH}
              max={360}
              unit="°"
              targetHSV={colorC}
              difficultyLevel={difficultyLevel}
              showAnswer={false}
              targetVal={cH}
              userVal={cH}
              allUserHSV={colorC}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={false}
            />
            <HsvTrackSlider
              label="S"
              gradient={cSatGradient}
              val={cS}
              max={100}
              unit="%"
              targetHSV={colorC}
              difficultyLevel={difficultyLevel}
              showAnswer={false}
              targetVal={cS}
              userVal={cS}
              allUserHSV={colorC}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={false}
            />
            <HsvTrackSlider
              label="V"
              gradient={cValGradient}
              val={cV}
              max={100}
              unit="%"
              targetHSV={colorC}
              difficultyLevel={difficultyLevel}
              showAnswer={false}
              targetVal={cV}
              userVal={cV}
              allUserHSV={colorC}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={false}
            />
          </div>

          {/* 右侧：D 节点颜色 */}
          <div className="space-y-3">
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
              onValChange={() => {}}
              allUserHSV={[userH, userS, userV]}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
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
              onValChange={() => {}}
              allUserHSV={[userH, userS, userV]}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
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
              onValChange={() => {}}
              allUserHSV={[userH, userS, userV]}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
            />
          </div>
        </div>
      </div>

      {/* 候选色块卡片区 */}
      <div className="grid grid-cols-4 gap-3 w-full">
        {options?.map((opt, idx) => {
          const isSelected = selectedIndex === idx;
          const isTarget = idx === correctIndex;
          const hexVal = hsvToHex(...opt);

          let borderStyle = 'border-slate-200 hover:border-slate-300';
          let ringStyle = '';

          if (showAnswer) {
            if (isTarget) {
              borderStyle = 'border-emerald-500';
              ringStyle = 'ring-2 ring-emerald-500/40';
            } else if (isSelected && !isTarget) {
              borderStyle = 'border-rose-400';
              ringStyle = 'ring-1 ring-rose-400/40 opacity-80';
            } else {
              borderStyle = 'border-slate-200 opacity-40';
            }
          } else if (isSelected) {
            borderStyle = 'border-indigo-600';
            ringStyle = 'ring-2 ring-indigo-500/30 shadow-sm';
          }

          return (
            <button
              key={`${idx}-${hexVal}`}
              type="button"
              disabled={disabled || showAnswer}
              onClick={() => setSelectedIndex(idx)}
              className={`p-1.5 rounded-2xl border bg-white transition-all duration-150 active:scale-95 cursor-pointer ${borderStyle} ${ringStyle}`}
            >
              <div
                className="w-full aspect-[4/3] rounded-xl shadow-inner border border-white/60"
                style={{ backgroundColor: hexVal }}
              />
            </button>
          );
        })}
      </div>

      {/* 确认提交按钮 */}
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
