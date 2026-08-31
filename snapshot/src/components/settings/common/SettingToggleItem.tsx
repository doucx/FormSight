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
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="text-primary hover:opacity-80 transition-opacity cursor-pointer"
      >
        {checked ? (
          <ToggleRight className="w-8 h-8 fill-indigo-600 text-primary dark:fill-indigo-500 dark:text-primary" />
        ) : (
          <ToggleLeft className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
        )}
      </button>
    </div>
  );
}
