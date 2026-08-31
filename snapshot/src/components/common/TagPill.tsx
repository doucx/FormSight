import { type VariantProps, cva } from 'class-variance-authority';
import { Check } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { cn } from '../../utils/cn';

export type TagPillThemeColor = 'indigo' | 'emerald' | 'rose' | 'amber' | 'purple';

export const tagPillVariants = cva(
  'inline-flex items-center gap-1 font-bold rounded-xl transition-all cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] whitespace-nowrap flex-shrink-0 border',
  {
    variants: {
      themeColor: {
        indigo: '',
        emerald: '',
        rose: '',
        amber: '',
        purple: '',
      },
      selected: {
        true: 'text-white shadow-xs border-transparent',
        false: 'bg-muted/80 hover:bg-accent text-muted-foreground border-border',
      },
      size: {
        sm: 'px-2 py-0.5 text-[11px]',
        md: 'px-2.5 py-1 text-xs',
      },
    },
    compoundVariants: [
      { themeColor: 'indigo', selected: true, className: 'bg-primary' },
      { themeColor: 'emerald', selected: true, className: 'bg-emerald-600' },
      { themeColor: 'rose', selected: true, className: 'bg-rose-600' },
      { themeColor: 'amber', selected: true, className: 'bg-amber-600' },
      { themeColor: 'purple', selected: true, className: 'bg-purple-600' },
    ],
    defaultVariants: {
      themeColor: 'indigo',
      selected: false,
      size: 'md',
    },
  },
);

export const tagPillBadgeVariants = cva('text-[10px] font-mono px-1 rounded', {
  variants: {
    themeColor: {
      indigo: '',
      emerald: '',
      rose: '',
      amber: '',
      purple: '',
    },
    selected: {
      true: '',
      false: 'bg-border text-muted-foreground',
    },
  },
  compoundVariants: [
    { themeColor: 'indigo', selected: true, className: 'bg-primary/90 text-indigo-100' },
    { themeColor: 'emerald', selected: true, className: 'bg-emerald-700 text-emerald-100' },
    { themeColor: 'rose', selected: true, className: 'bg-rose-700 text-rose-100' },
    { themeColor: 'amber', selected: true, className: 'bg-amber-700 text-amber-100' },
    { themeColor: 'purple', selected: true, className: 'bg-purple-700 text-purple-100' },
  ],
  defaultVariants: {
    themeColor: 'indigo',
    selected: false,
  },
});

export interface TagPillProps extends VariantProps<typeof tagPillVariants> {
  label: string;
  icon?: (props: { className?: string }) => ComponentChildren;
  count?: number | string;
  className?: string;
  onClick?: () => void;
}

export function TagPill({
  label,
  selected = false,
  themeColor = 'indigo',
  icon: Icon,
  count,
  size = 'md',
  className = '',
  onClick,
}: TagPillProps) {
  return (
    <button
      type="button"
      onPointerDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(tagPillVariants({ themeColor, selected, size }), className)}
    >
      {selected && <Check className="w-3 h-3 flex-shrink-0" />}
      {!selected && Icon && <Icon className="w-3 h-3 flex-shrink-0 text-muted-foreground" />}
      <span>{label}</span>
      {count !== undefined && (
        <span className={cn(tagPillBadgeVariants({ themeColor, selected }))}>{count}</span>
      )}
    </button>
  );
}