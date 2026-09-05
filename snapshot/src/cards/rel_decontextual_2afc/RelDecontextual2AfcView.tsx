import { Check, Eye } from 'lucide-preact';
import { useState } from 'preact/hooks';

import {
  Badge,
  ChoiceCard,
  ColorSwatch,
  QuestionCardShell,
  getChoiceCardState,
  hsvToHex,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';

/** 揭晓时剥离环境诱导的绝对中性纯黑基准背景 */
const DECONTEXTUAL_REVEAL_BG = '#000000';

export interface RelDecontextual2AfcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer?: HitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function RelDecontextual2AfcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: RelDecontextual2AfcViewProps) {
  const { t } = useCardTranslation('rel_decontextual_2afc');
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  const handleSelect = (choice: 'A' | 'B') => {
    if (disabled || showAnswer) return;
    setSelectedChoice(choice);
    onAnswer(choice);
  };

  useChoiceShortcuts({
    optionsCount: 2,
    disabled: disabled || showAnswer,
    onSelect: (idx) => handleSelect(idx === 0 ? 'A' : 'B'),
  });

  const effectiveChoice = selectedChoice ?? userAnswer?.userChoice ?? null;
  const isAHit = question.largerPhysicalSide === 'A';
  const isBHit = question.largerPhysicalSide === 'B';

  const hexBgA = hsvToHex(...question.bgLeft);
  const hexBgB = hsvToHex(...question.bgRight);
  const hexCenterA = hsvToHex(...question.centerColorA);
  const hexCenterB = hsvToHex(...question.centerColorB);

  const stateA = getChoiceCardState({
    showAnswer,
    isTarget: isAHit,
    isSelected: effectiveChoice === 'A',
  });

  const stateB = getChoiceCardState({
    showAnswer,
    isTarget: isBHit,
    isSelected: effectiveChoice === 'B',
  });

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
        <ChoiceCard
          state={stateA}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('A')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge
                variant="secondary"
                size="sm"
                className="w-5 h-5 p-0 justify-center font-mono text-xs"
              >
                1
              </Badge>
              {t('common.areaA')}
            </span>

            {showAnswer && (
              <span
                className={`text-xs font-semibold flex items-center gap-1 ${
                  isAHit
                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'text-muted-foreground'
                }`}
              >
                {isAHit && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                {isAHit
                  ? t('physicallyBrighter', { v: question.centerColorA[2] })
                  : t('physicallyDarker', { v: question.centerColorA[2] })}
              </span>
            )}
          </div>

          <ColorSwatch
            color={showAnswer ? DECONTEXTUAL_REVEAL_BG : hexBgA}
            variant="container"
            className="w-full h-44 shadow-inner"
          >
            <ColorSwatch color={hexCenterA} variant="embedded" size="sm" />
          </ColorSwatch>
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge
                variant="secondary"
                size="sm"
                className="w-5 h-5 p-0 justify-center font-mono text-xs"
              >
                2
              </Badge>
              {t('common.areaB')}
            </span>

            {showAnswer && (
              <span
                className={`text-xs font-semibold flex items-center gap-1 ${
                  isBHit
                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'text-muted-foreground'
                }`}
              >
                {isBHit && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                {isBHit
                  ? t('physicallyBrighter', { v: question.centerColorB[2] })
                  : t('physicallyDarker', { v: question.centerColorB[2] })}
              </span>
            )}
          </div>

          <ColorSwatch
            color={showAnswer ? DECONTEXTUAL_REVEAL_BG : hexBgB}
            variant="container"
            className="w-full h-44 shadow-inner"
          >
            <ColorSwatch color={hexCenterB} variant="embedded" size="sm" />
          </ColorSwatch>
        </ChoiceCard>
      </div>
    </QuestionCardShell>
  );
}
