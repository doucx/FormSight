import { Check } from 'lucide-preact';
import type { ComponentChildren } from 'preact';

export type TagPillThemeColor = 'indigo' | 'emerald' | 'rose' | 'amber' | 'purple';

export interface TagPillProps {
  label: string;
  selected?: boolean;
  themeColor?: TagPillThemeColor;
  icon?: (props: { className?: string }) => ComponentChildren;
  count?: number | string;
  size?: 'sm' | 'md';
  className?: string;
  onClick?: () => void;
}

const THEME_ACTIVE_CLASSES: Record<TagPillThemeColor, string> = {
  indigo: 'bg-indigo-600 text-white shadow-xs',
  emerald: 'bg-emerald-600 text-white shadow-xs',
  rose: 'bg-rose-600 text-white shadow-xs',
  amber: 'bg-amber-600 text-white shadow-xs',
  purple: 'bg-purple-600 text-white shadow-xs',
};

const THEME_BADGE_ACTIVE_CLASSES: Record<TagPillThemeColor, string> = {
  indigo: 'bg-indigo-700 text-indigo-100',
  emerald: 'bg-emerald-700 text-emerald-100',
  rose: 'bg-rose-700 text-rose-100',
  amber: 'bg-amber-700 text-amber-100',
  purple: 'bg-purple-700 text-purple-100',
};

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
  const activeClass = THEME_ACTIVE_CLASSES[themeColor] || THEME_ACTIVE_CLASSES.indigo;
  const activeBadgeClass =
    THEME_BADGE_ACTIVE_CLASSES[themeColor] || THEME_BADGE_ACTIVE_CLASSES.indigo;

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <button
      type="button"
      onPointerDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex items-center gap-1 font-bold rounded-xl transition-all cursor-pointer select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] whitespace-nowrap flex-shrink-0 ${sizeClass} ${
        selected
          ? activeClass
          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
      } ${className}`}
    >
      {selected && <Check className="w-3 h-3 flex-shrink-0" />}
      {!selected && Icon && <Icon className="w-3 h-3 flex-shrink-0 text-slate-400" />}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`text-[10px] font-mono px-1 rounded ${
            selected ? activeBadgeClass : 'bg-slate-200 text-slate-500'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
