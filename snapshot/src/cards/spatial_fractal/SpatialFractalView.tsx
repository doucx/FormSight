import { Cuboid } from 'lucide-preact';
import {
  QuestionCardShell,
  useCardTranslation,
  ChoiceCard,
  getChoiceCardState,
  useChoiceShortcuts
} from '@formsight/card-sdk';
import { Fractal3DViewport } from './components/Fractal3DViewport';
import { OptionCanvas } from './components/OptionCanvas';
import type { HitResult, QuestionData } from './types';

export interface SpatialFractalViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: number) => void;
  disabled?: boolean;
}

export function SpatialFractalView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: SpatialFractalViewProps) {
  const { t } = useCardTranslation('spatial_fractal');

  // 支持键盘数字键 1-4 直接做答
  useChoiceShortcuts({
    optionsCount: 4,
    disabled: disabled || showAnswer,
    onSelect: (idx) => onAnswer(idx),
  });

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Cuboid}
      showCanvasHints={true}
      maxWidth="max-w-4xl"
      className="gap-6"
    >
      <div className="w-full flex flex-col md:flex-row gap-6">
        {/* 左侧：3D 动态 WebGL 视口 */}
        <div className="w-full md:w-1/2 flex items-center justify-center">
          <Fractal3DViewport question={question} disabled={disabled} />
        </div>

        {/* 右侧：4-AFC 截面选项区 */}
        <div className="w-full md:w-1/2 flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span className="font-bold uppercase tracking-wider">{t('optionsLabel')}</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block"></span> {t('topOrientation')}</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block"></span> {t('leftOrientation')}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {question.configs.map((config, idx) => {
              const isTarget = idx === question.correctIdx;
              const isSelected = userAnswer?.chosenIdx === idx;
              const state = getChoiceCardState({ showAnswer, isTarget, isSelected });

              return (
                <ChoiceCard
                  key={`${question.id}-${idx}`}
                  state={state}
                  size="sm"
                  disabled={disabled || showAnswer}
                  onClick={() => onAnswer(idx)}
                >
                  <div className="flex flex-col gap-2 w-full">
                    <span className="text-xs font-bold font-mono text-muted-foreground">[{idx + 1}]</span>
                    <OptionCanvas config={config} level={question.difficultyLevel} seed={question.seed} />
                  </div>
                </ChoiceCard>
              );
            })}
          </div>
        </div>
      </div>
    </QuestionCardShell>
  );
}