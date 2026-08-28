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
      'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]';

    if (showAnswer) {
      if (isTarget) {
        borderStyle = 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20';
      } else if (isSelected) {
        borderStyle = 'bg-rose-50/50 border-rose-400 shadow-sm';
      } else {
        borderStyle = 'bg-slate-50/60 border-slate-200 opacity-60';
      }
    } else if (isSelected) {
      borderStyle = 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md';
    }

    return (
      <button
        type="button"
        disabled={disabled || showAnswer}
        onClick={() => onSelect(opt.key)}
        className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${borderStyle}`}
      >
        <div className="flex items-center justify-between w-full px-1">
          <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
            <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
              {opt.keyLabel || (opt.key === 'A' ? '1' : '2')}
            </span>
            {opt.title}
          </span>

          {showAnswer && isTarget && (
            <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
              <Check className="w-4 h-4 text-emerald-600" />
              {opt.badge || t('common.trueMatch')}
            </span>
          )}

          {showAnswer && !isTarget && opt.badge && (
            <span className="text-xs font-semibold text-slate-400">{opt.badge}</span>
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