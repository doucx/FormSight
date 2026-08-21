import { Check, Sparkles } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { hsvToHex } from '../../utils/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../../utils/relativeColor';

interface HueInductionViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer?: RelativeColorHitResult | null;
  onAnswer: (chosenColor: [number, number, number]) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function HueInductionView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: HueInductionViewProps) {
  // 默认选中第一项 (索引 0)
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const { bgLeft, bgRight, targetLeftCenter, idealRightCenter, options, correctIndex } = question;

  const bgLeftHex = hsvToHex(...(bgLeft ?? [0, 0, 90]));
  const bgRightHex = hsvToHex(...(bgRight ?? [0, 0, 20]));
  const centerLeftHex = hsvToHex(...(targetLeftCenter ?? [0, 0, 50]));
  const idealRightHex = hsvToHex(...(idealRightCenter ?? [0, 0, 50]));

  // 题目切换时重置为默认第 1 项
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection when question changes
  useEffect(() => {
    setSelectedIdx(0);
  }, [question.id]);

  const targetIdx = correctIndex ?? 0;
  const activeColor = options?.[selectedIdx] ?? idealRightCenter ?? [0, 0, 50];
  const activeRightHex = hsvToHex(...activeColor);

  const handleSubmit = useCallback(() => {
    if (disabled || showAnswer || !options) return;
    const chosen = options[selectedIdx] ?? idealRightCenter ?? [0, 0, 50];
    onAnswer(chosen);
  }, [disabled, showAnswer, options, selectedIdx, idealRightCenter, onAnswer]);

  // 键盘快捷键监听：数字键 1-4 切换预览，Space 确认提交
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (disabled || showAnswer || !options) return;

      if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const idx = Number.parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < options.length) {
          setSelectedIdx(idx);
        }
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, showAnswer, options, handleSubmit]);

  return (
    <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          观察左侧基准，在下方切换选项预览并确认提交 (键 1-4 切换，Space 提交)
        </div>
      )}

      {/* 左右双环境视错觉对比区 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            左侧固定基准
          </span>
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
            style={{ backgroundColor: bgLeftHex }}
          >
            <div
              className="w-16 h-16 rounded-xl transition-all"
              style={{ backgroundColor: centerLeftHex }}
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
            右侧环境补偿区 (实时预览)
          </span>
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
            style={{ backgroundColor: bgRightHex }}
          >
            <div
              className="w-16 h-16 rounded-xl transition-all relative overflow-hidden"
              style={{ backgroundColor: activeRightHex }}
            >
              {showAnswer && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1/2"
                  style={{ backgroundColor: idealRightHex }}
                  title="上半部为您的选择，下半部为理论真理色"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4 选 1 候选色彩卡片区 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
        {options?.map((opt, idx) => {
          const isSelected = selectedIdx === idx;
          const isTarget = idx === targetIdx;
          const hexVal = hsvToHex(...opt);
          const keyLabel = (idx + 1).toString();

          let borderStyle = 'border-slate-200 hover:border-indigo-300 hover:shadow-md bg-slate-50';
          if (showAnswer) {
            if (isTarget) {
              borderStyle =
                'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md';
            } else if (isSelected) {
              borderStyle = 'bg-rose-50/50 border-rose-400 shadow-sm';
            } else {
              borderStyle = 'bg-slate-50/60 border-slate-200 opacity-50';
            }
          } else if (isSelected) {
            borderStyle = 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md';
          }

          return (
            <button
              key={`hue-induction-option-${idx}-${hexVal}`}
              type="button"
              disabled={disabled || showAnswer}
              onClick={() => setSelectedIdx(idx)}
              className={`group flex flex-col items-center gap-2.5 p-3 rounded-2xl border transition-all duration-200 text-left active:scale-[0.98] cursor-pointer ${borderStyle}`}
            >
              <div className="flex items-center justify-between w-full px-1">
                <span className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                  <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                    {keyLabel}
                  </span>
                  候选 {keyLabel}
                </span>
                {showAnswer && isTarget && (
                  <Check className="w-4 h-4 text-emerald-600 font-extrabold" />
                )}
              </div>

              <div className="w-full aspect-[4/3] rounded-xl shadow-inner border border-white/60 p-1 flex items-center justify-center bg-white">
                <div
                  className="w-full h-full rounded-lg shadow-sm border border-slate-200/50"
                  style={{ backgroundColor: hexVal }}
                />
              </div>
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
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all cursor-pointer"
        >
          确认提交 (Space)
        </button>
      )}
    </div>
  );
}
