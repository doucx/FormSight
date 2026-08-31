import { type VariantProps, cva } from 'class-variance-authority';
import type { ComponentChildren, JSX } from 'preact';
import { cn } from '../../utils/cn';

export const calloutVariants = cva(
  'p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs transition-all',
  {
    variants: {
      variant: {
        default: 'bg-muted/60 border-border text-foreground',
        info: 'bg-accent/70 border-border/60 dark:border-border text-foreground',
        accent: 'bg-accent/80 border-border/60 text-primary',
        success:
          'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-100',
        warning:
          'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/60 text-amber-900 dark:text-amber-100',
        danger:
          'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/60 text-rose-900 dark:text-rose-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface CalloutProps
  extends JSX.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof calloutVariants> {
  icon?: (props: { className?: string }) => ComponentChildren;
  title?: ComponentChildren;
  children?: ComponentChildren;
}

export function Callout({
  className,
  variant,
  icon: Icon,
  title,
  children,
  ...props
}: CalloutProps) {
  return (
    <div className={cn(calloutVariants({ variant }), className)} {...props}>
      {Icon && <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />}
      <div className="flex-1 space-y-1 min-w-0">
        {title && <div className="font-bold">{title}</div>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}