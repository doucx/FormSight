import { Check } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';

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

        let border =
          'border-slate-200 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md bg-slate-50 dark:bg-slate-800/60';
        if (showAnswer) {
          if (isTarget) {
            border =
              'bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md';
          } else if (isSelected) {
            border = 'bg-rose-50/50 dark:bg-rose-950/40 border-rose-400 shadow-sm';
          } else {
            border = 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-50';
          }
        } else if (isSelected) {
          border =
            'border-indigo-600 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 shadow-md';
        }

        return (
          <button
            key={opt.key ?? `nafc-opt-${idx}`}
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => onSelect(idx, opt)}
            className={`group flex flex-col items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 text-left active:scale-[0.98] cursor-pointer ${border}`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-200">
                <span className="w-5 h-5 rounded-lg bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center font-mono text-[11px]">
                  {keyLabel}
                </span>
                {opt.title || t('common.optionN', { num: keyLabel })}
              </span>
              {showAnswer && isTarget && (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
              )}
            </div>

            {opt.content}
          </button>
        );
      })}
    </div>
  );
}
