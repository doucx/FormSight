import { type VariantProps, cva } from 'class-variance-authority';
import type { JSX } from 'preact';
import { cn } from '../../utils/cn';

export const inputVariants = cva(
  'w-full bg-card hover:bg-muted/50 focus:bg-card text-foreground font-bold border border-border transition-all placeholder:text-muted-foreground placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      inputSize: {
        default: 'px-3.5 py-2.5 text-xs rounded-2xl',
        sm: 'px-2.5 py-1.5 text-xs rounded-xl',
        lg: 'px-4 py-3 text-sm rounded-2xl',
      },
    },
    defaultVariants: {
      inputSize: 'default',
    },
  },
);

export interface InputProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  type?: string;
}

export function Input({ className, inputSize, type = 'text', ...props }: InputProps) {
  return <input type={type} className={cn(inputVariants({ inputSize }), className)} {...props} />;
}