import { Check } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';
import { ChoiceCard, getChoiceCardState } from '../ui/choice-card';

export interface ChoiceNafcOption<T = unknown> {
  key?: string | number;
  keyLabel?: string;
  title?: string;
  value?: T;
  isCorrect: boolean;
  content: ComponentChildren;
}

interface ChoiceNafcContainerProps<T = unknown> {
  options: ChoiceNafcOption<T>[];
  selectedIndex: number | null;
  showAnswer: boolean;
  disabled?: boolean;
  columns?: 2 | 3 | 4;
  gridClassName?: string;
  enableKeyboardShortcuts?: boolean;
  onSelect: (index: number, option: ChoiceNafcOption<T>) => void;
}

export function ChoiceNafcContainer<T = unknown>({
  options,
  selectedIndex,
  showAnswer,
  disabled = false,
  columns = 4,
  gridClassName,
  enableKeyboardShortcuts = true,
  onSelect,
}: ChoiceNafcContainerProps<T>) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!enableKeyboardShortcuts || disabled || showAnswer) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const num = Number.parseInt(e.key, 10);
      if (!Number.isNaN(num) && num >= 1 && num <= options.length) {
        e.preventDefault();
        const idx = num - 1;
        onSelect(idx, options[idx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, disabled, showAnswer, options, onSelect]);

  const defaultGrid =
    columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 3
        ? 'grid-cols-1 sm:grid-cols-3'
        : 'grid-cols-2 sm:grid-cols-4';

  return (
    <div className={`grid ${gridClassName || defaultGrid} gap-3 w-full`}>
      {options.map((opt, idx) => {
        const isSelected = selectedIndex === idx;
        const isTarget = opt.isCorrect;
        const keyLabel = opt.keyLabel || (idx + 1).toString();
        const state = getChoiceCardState({ showAnswer, isTarget, isSelected });

        return (
          <ChoiceCard
            key={opt.key ?? `nafc-opt-${idx}`}
            state={state}
            size="sm"
            disabled={disabled || showAnswer}
            onClick={() => onSelect(idx, opt)}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-foreground">
                <span className="w-5 h-5 rounded-lg bg-muted text-foreground flex items-center justify-center font-mono text-[11px]">
                  {keyLabel}
                </span>
                {opt.title || t('common.optionN', { num: keyLabel })}
              </span>
              {showAnswer && isTarget && (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
              )}
            </div>

            {opt.content}
          </ChoiceCard>
        );
      })}
    </div>
  );
}
