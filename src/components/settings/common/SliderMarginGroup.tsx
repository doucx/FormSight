import { useTranslation } from '../../../core/i18n';

interface SliderMarginGroupProps {
  title?: string;
  value: number;
  onChange: (val: number) => void;
  options?: { label: string; value: number }[];
}

export function SliderMarginGroup({ title, value, onChange, options }: SliderMarginGroupProps) {
  const { t } = useTranslation();

  const effectiveTitle = title || t('settingsModal.sliderMarginTitle');
  const defaultOptions = options || [
    { label: t('settingsModal.marginOff'), value: 0 },
    { label: '8px', value: 8 },
    { label: '12px', value: 12 },
    { label: '20px', value: 20 },
  ];

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {effectiveTitle}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {defaultOptions.map((opt) => (
          <button
            type="button"
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`py-2 text-xs font-bold rounded-xl border transition-all ${
              value === opt.value
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
