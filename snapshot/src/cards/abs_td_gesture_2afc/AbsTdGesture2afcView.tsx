import { Check, Columns } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import {
  Badge,
  CanvasView,
  ChoiceCard,
  QuestionCardShell,
  getChoiceCardState,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
import {
  OPTION_SIZE,
  THUMB_SIZE,
  drawParticlesCanvas,
  drawSpinePromptCanvas,
} from './utils/generator';

const CANVAS_OPTION_CLASS =
  'w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block';

export interface AbsTdGesture2afcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AbsTdGesture2afcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsTdGesture2afcViewProps) {
  const { t } = useCardTranslation('abs_td_gesture_2afc');
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

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
  const isTargetA = question.correctParticleChoice === 'A';
  const isTargetB = !isTargetA;

  const stateA = getChoiceCardState({
    showAnswer,
    isTarget: isTargetA,
    isSelected: effectiveChoice === 'A',
  });

  const stateB = getChoiceCardState({
    showAnswer,
    isTarget: isTargetB,
    isSelected: effectiveChoice === 'B',
  });

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col items-center gap-2 bg-muted/60 p-3 rounded-2xl border border-border shadow-inner w-full max-w-[250px] sm:max-w-[270px] mx-auto">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {t('promptTitle')}
        </span>
        <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
          <CanvasView
            width={THUMB_SIZE}
            height={THUMB_SIZE}
            className={CANVAS_OPTION_CLASS}
            draw={(canvas) => drawSpinePromptCanvas(canvas, question.promptSpine, THUMB_SIZE)}
            deps={[question.promptSpine]}
          />
        </div>
      </div>

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
              {`${t('common.areaA')} (${t('common.optionA')})`}
            </span>
            {showAnswer && isTargetA && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) => drawParticlesCanvas(canvas, question.particlesA, OPTION_SIZE)}
              deps={[question.particlesA]}
            />
          </div>
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
              {`${t('common.areaB')} (${t('common.optionB')})`}
            </span>
            {showAnswer && isTargetB && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) => drawParticlesCanvas(canvas, question.particlesB, OPTION_SIZE)}
              deps={[question.particlesB]}
            />
          </div>
        </ChoiceCard>
      </div>
    </QuestionCardShell>
  );
}
