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
        <div className="text-sm font-semibold text-slate-700">{title}</div>
        {description && <div className="text-xs text-slate-400">{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="text-indigo-600 hover:opacity-80 transition-opacity"
      >
        {checked ? (
          <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
        ) : (
          <ToggleLeft className="w-8 h-8 text-slate-300" />
        )}
      </button>
    </div>
  );
}
