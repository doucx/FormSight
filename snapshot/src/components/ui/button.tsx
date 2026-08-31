import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentChildren, JSX } from 'preact';
import { cn } from '../../utils/cn';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none active:scale-95 cursor-pointer select-none',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-indigo-200 dark:shadow-none',
        secondary: 'bg-muted text-foreground hover:bg-muted/80',
        outline:
          'border border-border bg-card hover:bg-accent hover:text-accent-foreground text-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground text-muted-foreground hover:text-foreground',
        danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-200 dark:shadow-none',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-2.5 text-[11px]',
        lg: 'h-12 px-6 text-sm',
        icon: 'h-8 w-8 p-0',
        iconSm: 'h-7 w-7 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends JSX.HTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children?: ComponentChildren;
}

export function Button({ className, variant, size, children, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size, className }))} {...props}>
      {children}
    </button>
  );
}