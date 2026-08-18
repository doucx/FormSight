interface SliderMarginGroupProps {
  title?: string;
  value: number;
  onChange: (val: number) => void;
  options?: { label: string; value: number }[];
}

const DEFAULT_MARGIN_OPTIONS = [
  { label: '关闭 (0px)', value: 0 },
  { label: '8px', value: 8 },
  { label: '12px', value: 12 },
  { label: '20px', value: 20 },
];

export function SliderMarginGroup({
  title = '滑块极值吸附外延感应区',
  value,
  onChange,
  options = DEFAULT_MARGIN_OPTIONS,
}: SliderMarginGroupProps) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      <div className="grid grid-cols-4 gap-1.5">
        {options.map((opt) => (
          <button
            type="button"
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`py-2 text-xs font-bold rounded-xl border transition-all ${
              value === opt.value
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}