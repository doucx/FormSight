import { Crosshair } from 'lucide-preact';
import type { StarSettings, TargetingMode } from '../../utils/settings';

const SECTOR_NAMES = [
  '正东(0°)',
  '东北(45°)',
  '正北(90°)',
  '西北(135°)',
  '正西(180°)',
  '西南(225°)',
  '正南(270°)',
  '东南(315°)',
];

interface StarSettingsFormProps {
  settings: StarSettings;
  onChange: (patch: Partial<StarSettings>) => void;
}

export function StarSettingsForm({ settings, onChange }: StarSettingsFormProps) {
  const handleSectorToggle = (sectorIdx: number) => {
    const currentSectors = settings.manualTargetSectors || [];
    const exists = currentSectors.includes(sectorIdx);
    const updated = exists
      ? currentSectors.filter((s) => s !== sectorIdx)
      : [...currentSectors, sectorIdx];

    onChange({ manualTargetSectors: updated });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-sm font-semibold text-slate-700">干扰点网格大小</div>
        <div className="grid grid-cols-4 gap-1.5">
          {[2, 3, 4, 5].map((size) => (
            <button
              type="button"
              key={size}
              onClick={() => onChange({ gridSize: size })}
              className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                settings.gridSize === size
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {size}x{size}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Crosshair className="w-4 h-4 text-indigo-600" />
          弱点专项靶向强化
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: 'off', label: '关闭 (全随机)' },
            { id: 'manual', label: '手动指定' },
          ].map((m) => (
            <button
              type="button"
              key={m.id}
              onClick={() => onChange({ targetingMode: m.id as TargetingMode })}
              className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                settings.targetingMode === m.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {settings.targetingMode === 'manual' && (
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
            <div className="text-[11px] font-semibold text-slate-500">
              选择需要靶向强化的角度扇区：
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {SECTOR_NAMES.map((name, idx) => {
                const selected = (settings.manualTargetSectors || []).includes(idx);
                return (
                  <button
                    type="button"
                    key={name}
                    onClick={() => handleSectorToggle(idx)}
                    className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border transition-all ${
                      selected
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
