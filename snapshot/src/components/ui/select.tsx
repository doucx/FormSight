import { type VariantProps, cva } from 'class-variance-authority';
import type { ComponentChildren, JSX } from 'preact';
import { cn } from '../../utils/cn';

export const selectVariants = cva(
  'w-full appearance-none bg-muted hover:bg-accent text-foreground font-bold border border-border transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
  {
    variants: {
      selectSize: {
        default: 'py-2 pl-8 pr-8 text-xs rounded-xl',
        sm: 'py-1.5 pl-6 pr-6 text-xs rounded-lg',
        lg: 'py-2.5 pl-10 pr-10 text-sm rounded-2xl',
      },
    },
    defaultVariants: {
      selectSize: 'default',
    },
  },
);

export interface SelectProps
  extends Omit<JSX.HTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof selectVariants> {
  children?: ComponentChildren;
}

export function Select({ className, selectSize, children, ...props }: SelectProps) {
  return (
    <select className={cn(selectVariants({ selectSize }), className)} {...props}>
      {children}
    </select>
  );
}