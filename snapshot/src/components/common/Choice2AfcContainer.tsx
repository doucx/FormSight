import { Check } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';
import { Badge } from '../ui/badge';
import { ChoiceCard, getChoiceCardState } from '../ui/choice-card';

export interface Choice2AfcOption {
  key: 'A' | 'B';
  keyLabel?: string;
  title: string;
  isCorrect: boolean;
  badge?: ComponentChildren;
  content: ComponentChildren;
}

interface Choice2AfcContainerProps {
  optionA: Choice2AfcOption;
  optionB: Choice2AfcOption;
  selectedChoice: 'A' | 'B' | null;
  showAnswer: boolean;
  disabled?: boolean;
  onSelect: (choice: 'A' | 'B') => void;
  enableKeyboardShortcuts?: boolean;
}

export function Choice2AfcContainer({
  optionA,
  optionB,
  selectedChoice,
  showAnswer,
  disabled = false,
  onSelect,
  enableKeyboardShortcuts = true,
}: Choice2AfcContainerProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!enableKeyboardShortcuts || disabled || showAnswer) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
        e.preventDefault();
        onSelect('A');
      } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
        e.preventDefault();
        onSelect('B');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, disabled, showAnswer, onSelect]);

  const renderCard = (opt: Choice2AfcOption) => {
    const isSelected = selectedChoice === opt.key;
    const isTarget = opt.isCorrect;
    const state = getChoiceCardState({ showAnswer, isTarget, isSelected });

    return (
      <ChoiceCard
        key={opt.key}
        state={state}
        size="lg"
        disabled={disabled || showAnswer}
        onClick={() => onSelect(opt.key)}
      >
        <div className="flex items-center justify-between w-full px-1">
          <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
            <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-[11px]">
              {opt.keyLabel || (opt.key === 'A' ? '1' : '2')}
            </Badge>
            {opt.title}
          </span>

          {showAnswer && isTarget && (
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {opt.badge || t('common.trueMatch')}
            </span>
          )}

          {showAnswer && !isTarget && opt.badge && (
            <span className="text-xs font-semibold text-muted-foreground">{opt.badge}</span>
          )}
        </div>

        {opt.content}
      </ChoiceCard>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
      {renderCard(optionA)}
      {renderCard(optionB)}
    </div>
  );
}
