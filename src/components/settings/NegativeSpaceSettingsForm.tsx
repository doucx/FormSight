import { ToggleLeft, ToggleRight } from 'lucide-preact';
import type { NegativeSpaceSettings } from '../../utils/settings';

interface NegativeSpaceSettingsFormProps {
  settings: NegativeSpaceSettings;
  onChange: (patch: Partial<NegativeSpaceSettings>) => void;
}

export function NegativeSpaceSettingsForm({ settings, onChange }: NegativeSpaceSettingsFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-sm font-semibold text-slate-700">滑块极值吸附外延感应区</div>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: '关闭 (0px)', value: 0 },
            { label: '8px', value: 8 },
            { label: '12px', value: 12 },
            { label: '20px', value: 20 },
          ].map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => onChange({ sliderHitMargin: opt.value })}
              className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                settings.sliderHitMargin === opt.value
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-700">显示滑块容错感应区</div>
          <div className="text-xs text-slate-400">在悬停光标两侧实时显示 Δ% 动态容错区间</div>
        </div>
        <button
          type="button"
          onClick={() => onChange({ showToleranceBand: !settings.showToleranceBand })}
          className="text-indigo-600 hover:opacity-80 transition-opacity"
        >
          {settings.showToleranceBand ? (
            <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
          ) : (
            <ToggleLeft className="w-8 h-8 text-slate-300" />
          )}
        </button>
      </div>
    </div>
  );
}
