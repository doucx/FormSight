import { Check } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';

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

    let borderStyle =
      'bg-muted/60 hover:bg-accent/30 border-border hover:border-primary/60 hover:shadow-md cursor-pointer active:scale-[0.98]';

    if (showAnswer) {
      if (isTarget) {
        borderStyle =
          'bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-500 shadow-md ring-2 ring-emerald-500/20';
      } else if (isSelected) {
        borderStyle = 'bg-rose-50/50 dark:bg-rose-950/40 border-rose-400 shadow-sm';
      } else {
        borderStyle = 'bg-muted/40 border-border opacity-60';
      }
    } else if (isSelected) {
      borderStyle =
        'border-primary dark:border-indigo-500 bg-accent/30 dark:bg-accent/40 ring-2 ring-indigo-500/20 shadow-md';
    }

    return (
      <button
        type="button"
        disabled={disabled || showAnswer}
        onClick={() => onSelect(opt.key)}
        className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${borderStyle}`}
      >
        <div className="flex items-center justify-between w-full px-1">
          <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
            <span className="w-5 h-5 rounded-lg bg-muted dark:bg-muted text-foreground flex items-center justify-center font-mono text-[11px]">
              {opt.keyLabel || (opt.key === 'A' ? '1' : '2')}
            </span>
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
      </button>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
      {renderCard(optionA)}
      {renderCard(optionB)}
    </div>
  );
}
