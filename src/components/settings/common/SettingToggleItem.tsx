import { ToggleLeft, ToggleRight } from 'lucide-preact';

interface SettingToggleItemProps {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function SettingToggleItem({
  title,
  description,
  checked,
  onChange,
}: SettingToggleItemProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</div>
        {description && <div className="text-xs text-slate-400">{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="text-indigo-600 dark:text-indigo-400 hover:opacity-80 transition-opacity cursor-pointer"
      >
        {checked ? (
          <ToggleRight className="w-8 h-8 fill-indigo-600 text-indigo-600 dark:fill-indigo-500 dark:text-indigo-500" />
        ) : (
          <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600" />
        )}
      </button>
    </div>
  );
}
