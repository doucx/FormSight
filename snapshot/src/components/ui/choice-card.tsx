import { type VariantProps, cva } from 'class-variance-authority';
import type { ComponentChildren, JSX } from 'preact';
import { cn } from '../../utils/cn';

export const choiceCardVariants = cva(
  'group relative flex flex-col items-center border transition-all duration-200 text-left active:scale-[0.98]',
  {
    variants: {
      state: {
        idle: 'bg-muted/60 hover:bg-accent/30 border-border hover:border-primary/60 hover:shadow-md cursor-pointer',
        selected:
          'border-primary dark:border-indigo-500 bg-accent/30 dark:bg-accent/40 ring-2 ring-indigo-500/20 shadow-md cursor-pointer',
        correct:
          'bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-500 shadow-md ring-2 ring-emerald-500/20 cursor-default',
        wrong: 'bg-rose-50/50 dark:bg-rose-950/40 border-rose-400 shadow-sm cursor-default',
        faded: 'bg-muted/40 border-border cursor-default pointer-events-none',
      },
      size: {
        default: 'gap-3 p-4 rounded-3xl',
        sm: 'gap-2.5 p-2.5 sm:p-3 rounded-2xl',
        lg: 'gap-3 p-4 rounded-3xl',
      },
    },
    defaultVariants: {
      state: 'idle',
      size: 'default',
    },
  },
);

export type ChoiceCardState = 'idle' | 'selected' | 'correct' | 'wrong' | 'faded';

/**
 * 辅助解析器：根据答题揭晓状态与命中结果，解析出对应的视觉枚举状态
 */
export function getChoiceCardState({
  showAnswer,
  isTarget,
  isSelected,
}: {
  showAnswer: boolean;
  isTarget: boolean;
  isSelected: boolean;
}): ChoiceCardState {
  if (showAnswer) {
    if (isTarget) return 'correct';
    if (isSelected) return 'wrong';
    return 'faded';
  }
  return isSelected ? 'selected' : 'idle';
}

export interface ChoiceCardProps
  extends JSX.HTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof choiceCardVariants> {
  disabled?: boolean;
  children?: ComponentChildren;
}

export function ChoiceCard({
  className,
  state,
  size,
  disabled,
  children,
  ...props
}: ChoiceCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(choiceCardVariants({ state, size }), className)}
      {...props}
    >
      {children}
    </button>
  );
}
