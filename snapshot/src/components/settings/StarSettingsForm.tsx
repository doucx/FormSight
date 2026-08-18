import type { StarSettings } from '../../utils/settings';
import { TargetingSection } from './common/TargetingSection';

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

      <TargetingSection
        title="弱点专项靶向强化"
        subTitle="选择需要靶向强化的角度扇区："
        mode={settings.targetingMode}
        onModeChange={(mode) => onChange({ targetingMode: mode })}
        sectors={SECTOR_NAMES}
        selectedSectors={settings.manualTargetSectors || []}
        onToggleSector={handleSectorToggle}
        gridCols="grid-cols-4"
      />
    </div>
  );
}