import { type VariantProps, cva } from 'class-variance-authority';
import type { JSX } from 'preact';
import { cn } from '../../utils/cn';

export const switchVariants = cva(
  'inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 select-none',
  {
    variants: {
      checked: {
        true: 'bg-primary',
        false: 'bg-muted border-border',
      },
      size: {
        default: 'h-6 w-11',
        sm: 'h-5 w-9',
      },
    },
    defaultVariants: {
      checked: false,
      size: 'default',
    },
  },
);

const switchThumbVariants = cva(
  'pointer-events-none block rounded-full bg-white shadow-md ring-0 transition-transform duration-200',
  {
    variants: {
      checked: {
        true: 'translate-x-5',
        false: 'translate-x-0 bg-muted-foreground/80 dark:bg-muted-foreground',
      },
      size: {
        default: 'h-5 w-5',
        sm: 'h-4 w-4',
      },
    },
    compoundVariants: [{ size: 'sm', checked: true, className: 'translate-x-4' }],
    defaultVariants: {
      checked: false,
      size: 'default',
    },
  },
);

export interface SwitchProps
  extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'size'>,
    VariantProps<typeof switchVariants> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function Switch({
  className,
  checked,
  size,
  disabled,
  onCheckedChange,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(switchVariants({ checked, size }), className)}
      {...props}
    >
      <span className={cn(switchThumbVariants({ checked, size }))} />
    </button>
  );
}