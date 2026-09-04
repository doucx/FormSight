import { Sparkles } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import type { HitResult, QuestionData } from './types';
import {
  DualViewportContainer,
  hsvToHex,
  StandardNafcView,
  useCardTranslation
} from '@formsight/card-sdk';

export interface RelHueInductionViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer?: HitResult | null;
  onAnswer: (chosenColor: [number, number, number]) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function RelHueInductionView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: RelHueInductionViewProps) {
  const { t } = useCardTranslation('rel_hue_induction');
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const { bgLeft, bgRight, targetLeftCenter, idealRightCenter, options, correctIndex } = question;

  useEffect(() => {
    if (question.id) {
      setSelectedIdx(0);
    }
  }, [question.id]);

  const bgLeftHex = hsvToHex(...bgLeft);
  const bgRightHex = hsvToHex(...bgRight);
  const centerLeftHex = hsvToHex(...targetLeftCenter);
  const idealRightHex = hsvToHex(...idealRightCenter);

  const activeColor = options[selectedIdx] ?? idealRightCenter;
  const activeRightHex = hsvToHex(...activeColor);

  const nafcOptions = options.map((opt, idx) => {
    const isTarget = idx === correctIndex;
    const hexVal = hsvToHex(...opt);
    return {
      key: `hue-opt-${idx}-${hexVal}`,
      title: t('common.candidateN', { num: idx + 1 }),
      value: opt,
      isCorrect: isTarget,
      content: (
        <div className="w-full aspect-[4/3] rounded-xl shadow-inner border border-border/60 p-1 flex items-center justify-center bg-card">
          <div
            className="w-full h-full rounded-lg shadow-sm border border-border/50"
            style={{ backgroundColor: hexVal }}
          />
        </div>
      ),
    };
  });

  return (
    <StandardNafcView<[number, number, number]>
      questionId={question.id}
      hintText={t('hint')}
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
      columns={4}
      options={nafcOptions}
      selectedIndex={selectedIdx}
      showAnswer={showAnswer}
      disabled={disabled}
      submitMode="button"
      submitButtonText={t('common.confirmSpace')}
      onSelectIndex={(idx) => setSelectedIdx(idx)}
      onAnswer={(_idx, option) => {
        const chosen = option.value ?? activeColor;
        onAnswer(chosen);
      }}
      preview={
        <DualViewportContainer
          leftTitle={t('leftBase')}
          rightTitle={t('rightPreview')}
          leftContent={
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-card dark:border-border shadow-md relative"
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
              className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-card dark:border-border shadow-md relative"
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
                    title={t('splitComparisonTooltip')}
                  />
                )}
              </div>
            </div>
          }
        />
      }
    />
  );
}
