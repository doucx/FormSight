import { Check, Sparkles } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';

import {
  Badge,
  Button,
  ChoiceCard,
  DualViewportContainer,
  QuestionCardShell,
  getChoiceCardState,
  hsvToHex,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';

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

  const handleSubmit = useCallback(() => {
    if (disabled || showAnswer) return;
    const chosen = options[selectedIdx] ?? idealRightCenter;
    onAnswer(chosen);
  }, [disabled, showAnswer, options, selectedIdx, idealRightCenter, onAnswer]);

  useChoiceShortcuts({
    optionsCount: options.length,
    disabled: disabled || showAnswer,
    onSelect: (idx) => setSelectedIdx(idx),
    onSubmit: handleSubmit,
  });

  const bgLeftHex = hsvToHex(...bgLeft);
  const bgRightHex = hsvToHex(...bgRight);
  const centerLeftHex = hsvToHex(...targetLeftCenter);
  const idealRightHex = hsvToHex(...idealRightCenter);

  const activeColor = options[selectedIdx] ?? idealRightCenter;
  const activeRightHex = hsvToHex(...activeColor);

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      {/* 双视口实时联动残像对比区 */}
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

      {/* 4AFC 候选色块网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
        {options.map((opt, idx) => {
          const isTarget = idx === correctIndex;
          const isSelected = selectedIdx === idx;
          const hexVal = hsvToHex(...opt);
          const state = getChoiceCardState({ showAnswer, isTarget, isSelected });

          return (
            <ChoiceCard
              key={`hue-opt-${idx}-${hexVal}`}
              state={state}
              size="sm"
              disabled={disabled || showAnswer}
              onClick={() => setSelectedIdx(idx)}
            >
              <div className="flex items-center justify-between w-full px-1">
                <span className="flex items-center gap-1.5 text-xs font-black text-foreground">
                  <Badge
                    variant="secondary"
                    size="sm"
                    className="w-5 h-5 p-0 justify-center font-mono text-xs"
                  >
                    {idx + 1}
                  </Badge>
                  {t('common.candidateN', { num: idx + 1 })}
                </span>
                {showAnswer && isTarget && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
                )}
              </div>

              <div className="w-full aspect-[4/3] rounded-xl shadow-inner border border-border/60 p-1 flex items-center justify-center bg-card">
                <div
                  className="w-full h-full rounded-lg shadow-sm border border-border/50"
                  style={{ backgroundColor: hexVal }}
                />
              </div>
            </ChoiceCard>
          );
        })}
      </div>

      {/* 空格/手动确认按钮 */}
      {!showAnswer && (
        <Button
          variant="default"
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full py-3 h-auto rounded-2xl"
        >
          {t('common.confirmSpace')}
        </Button>
      )}
    </QuestionCardShell>
  );
}
