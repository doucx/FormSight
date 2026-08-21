import { Sparkles } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { hsvToHex } from '../../utils/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../../utils/relativeColor';
import { ChoiceNafcContainer } from '../common/ChoiceNafcContainer';
import { DualViewportContainer } from '../common/DualViewportContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';

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
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const { bgLeft, bgRight, targetLeftCenter, idealRightCenter, options, correctIndex } = question;

  const bgLeftHex = hsvToHex(...(bgLeft ?? [0, 0, 90]));
  const bgRightHex = hsvToHex(...(bgRight ?? [0, 0, 20]));
  const centerLeftHex = hsvToHex(...(targetLeftCenter ?? [0, 0, 50]));
  const idealRightHex = hsvToHex(...(idealRightCenter ?? [0, 0, 50]));

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (disabled || showAnswer || !options) return;

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, showAnswer, options, handleSubmit]);

  const nafcOptions = (options || []).map((opt, idx) => {
    const isTarget = idx === targetIdx;
    const hexVal = hsvToHex(...opt);
    return {
      key: `hue-opt-${idx}-${hexVal}`,
      title: `候选 ${idx + 1}`,
      value: opt,
      isCorrect: isTarget,
      content: (
        <div className="w-full aspect-[4/3] rounded-xl shadow-inner border border-white/60 p-1 flex items-center justify-center bg-white">
          <div
            className="w-full h-full rounded-lg shadow-sm border border-slate-200/50"
            style={{ backgroundColor: hexVal }}
          />
        </div>
      ),
    };
  });

  return (
    <QuestionCardShell
      hintText="观察左侧基准，在下方切换选项预览并确认提交 (键 1-4 切换，Space 提交)"
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <DualViewportContainer
        leftTitle="左侧固定基准"
        rightTitle="右侧环境补偿区 (实时预览)"
        leftContent={
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
            style={{ backgroundColor: bgLeftHex }}
          >
            <div
              className="w-16 h-16 rounded-xl transition-all"
              style={{ backgroundColor: centerLeftHex }}
            />
          </div>
        }
        rightContent={
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
        }
      />

      <ChoiceNafcContainer
        options={nafcOptions}
        selectedIndex={selectedIdx}
        showAnswer={showAnswer}
        disabled={disabled}
        columns={4}
        onSelect={(idx) => setSelectedIdx(idx)}
      />

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
    </QuestionCardShell>
  );
}
