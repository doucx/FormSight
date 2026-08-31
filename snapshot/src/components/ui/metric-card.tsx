import { type VariantProps, cva } from 'class-variance-authority';
import type { ComponentChildren, JSX } from 'preact';
import { cn } from '../../utils/cn';

export const metricCardVariants = cva('rounded-2xl border transition-colors shadow-xs', {
  variants: {
    variant: {
      default: 'bg-card border-border',
      subtle: 'bg-muted/60 border-border',
      accent: 'bg-accent border-border/60 text-primary',
      success:
        'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60',
      warning: 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/60',
      danger: 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/60',
    },
    padding: {
      default: 'p-4 sm:p-5',
      compact: 'p-3.5 sm:p-4',
      dense: 'p-3',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'default',
  },
});

export interface MetricCardProps
  extends JSX.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof metricCardVariants> {
  children?: ComponentChildren;
}

export function MetricCard({ className, variant, padding, children, ...props }: MetricCardProps) {
  return (
    <div className={cn(metricCardVariants({ variant, padding }), className)} {...props}>
      {children}
    </div>
  );
}
