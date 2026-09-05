import { ArrowRight, Check, Shuffle } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';

import {
  Badge,
  Button,
  ChoiceCard,
  QuestionCardShell,
  getChoiceCardState,
  hsvToHex,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';

export interface RelVectorShiftViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer?: HitResult | null;
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

  useEffect(() => {
    if (question.id) {
      setSelectedIndex(0);
    }
  }, [question.id]);

  const handleSubmit = useCallback(() => {
    if (disabled || showAnswer) return;
    const chosenColor = options[selectedIndex] ?? targetD;
    onAnswer(chosenColor);
  }, [disabled, showAnswer, options, selectedIndex, targetD, onAnswer]);

  useChoiceShortcuts({
    optionsCount: options.length,
    disabled: disabled || showAnswer,
    onSelect: (idx) => setSelectedIndex(idx),
    onSubmit: handleSubmit,
  });

  const activeColor = options[selectedIndex] ?? targetD;
  const hexA = hsvToHex(...colorA);
  const hexB = hsvToHex(...colorB);
  const hexC = hsvToHex(...colorC);
  const hexSelectedD = hsvToHex(...activeColor);
  const hexTargetD = hsvToHex(...targetD);

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Shuffle}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      {/* 题干 A->B 与 C->D 矢量推移展示区 */}
      <div className="bg-muted/60 p-4 rounded-2xl border border-border/60 w-full flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexA }}
          />
          <ArrowRight className="w-4 h-4 text-indigo-400" />
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexB }}
          />
        </div>

        <div className="flex items-center justify-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexC }}
          />
          <ArrowRight className="w-4 h-4 text-indigo-400" />
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md transition-all duration-150 relative overflow-hidden"
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

      {/* 4AFC 候选推移色网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
        {options.map((opt, idx) => {
          const isTarget = idx === correctIndex;
          const isSelected = selectedIndex === idx;
          const hexVal = hsvToHex(...opt);
          const state = getChoiceCardState({ showAnswer, isTarget, isSelected });

          return (
            <ChoiceCard
              key={`vector-shift-opt-${idx}-${hexVal}`}
              state={state}
              size="sm"
              disabled={disabled || showAnswer}
              onClick={() => setSelectedIndex(idx)}
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

              <div
                className="w-full aspect-[4/3] rounded-xl shadow-inner border border-white/60"
                style={{ backgroundColor: hexVal }}
              />
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
