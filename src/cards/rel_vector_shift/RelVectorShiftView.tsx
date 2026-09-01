import { ArrowRight, Shuffle } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { StandardNafcView } from '../../components/common/StandardNafcView';
import { hsvToHex } from '../../core/color/colorUtils';
import type {
  RelativeColorHitResult,
  RelativeColorQuestionData,
} from '../../core/color/relativeColor';
import { useCardTranslation } from '../../core/i18n';

export interface RelVectorShiftViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer?: RelativeColorHitResult | null;
  onAnswer: (userVal: [number, number, number]) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function RelVectorShiftView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: RelVectorShiftViewProps) {
  const { t } = useCardTranslation('rel_vector_shift');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const { colorA, colorB, colorC, targetD, options, correctIndex } = question;
  const activeColor = options?.[selectedIndex] ?? targetD;

  useEffect(() => {
    if (question.id) {
      setSelectedIndex(0);
    }
  }, [question.id]);

  const hexA = hsvToHex(...colorA);
  const hexB = hsvToHex(...colorB);
  const hexC = hsvToHex(...colorC);
  const hexSelectedD = hsvToHex(...activeColor);
  const hexTargetD = hsvToHex(...targetD);

  const nafcOptions = (options || []).map((opt, idx) => {
    const isTarget = idx === correctIndex;
    const hexVal = hsvToHex(...opt);
    return {
      key: `vector-shift-opt-${idx}-${hexVal}`,
      title: t('common.candidateN', { num: idx + 1 }),
      value: opt,
      isCorrect: isTarget,
      content: (
        <div
          className="w-full aspect-[4/3] rounded-xl shadow-inner border border-white/60"
          style={{ backgroundColor: hexVal }}
        />
      ),
    };
  });

  return (
    <StandardNafcView<[number, number, number]>
      questionId={question.id}
      hintText={t('views.prompt')}
      hintIcon={Shuffle}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      columns={4}
      options={nafcOptions}
      selectedIndex={selectedIndex}
      showAnswer={showAnswer}
      disabled={disabled}
      submitMode="button"
      submitButtonText={t('common.confirmSpace')}
      onSelectIndex={(idx) => setSelectedIndex(idx)}
      onAnswer={() => {
        const chosenColor = options?.[selectedIndex] ?? targetD;
        onAnswer(chosenColor);
      }}
      preview={
        <div className="bg-muted/60 p-4 rounded-2xl border border-border/60 w-full flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-4">
            <div
              className="w-20 h-20 rounded-2xl border-2 border-card dark:border-border shadow-md"
              style={{ backgroundColor: hexA }}
            />
            <ArrowRight className="w-4 h-4 text-indigo-400" />
            <div
              className="w-20 h-20 rounded-2xl border-2 border-card dark:border-border shadow-md"
              style={{ backgroundColor: hexB }}
            />
          </div>

          <div className="flex items-center justify-center gap-4">
            <div
              className="w-20 h-20 rounded-2xl border-2 border-card dark:border-border shadow-md"
              style={{ backgroundColor: hexC }}
            />
            <ArrowRight className="w-4 h-4 text-indigo-400" />
            <div
              className="w-20 h-20 rounded-2xl border-2 border-card dark:border-border shadow-md transition-all duration-150 relative overflow-hidden"
              style={{ backgroundColor: hexSelectedD }}
            >
              {showAnswer && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1/2"
                  style={{ backgroundColor: hexTargetD }}
                />
              )}
            </div>
          </div>
        </div>
      }
    />
  );
}
