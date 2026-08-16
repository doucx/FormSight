import { Crosshair, ToggleLeft, ToggleRight } from 'lucide-preact';
import type { ColorSenseSettings, TargetingMode } from '../../utils/settings';

const COLOR_SECTOR_NAMES = [
  '红 (0°-30°)',
  '橙 (30°-60°)',
  '黄 (60°-90°)',
  '黄绿 (90°-120°)',
  '绿 (120°-150°)',
  '青绿 (150°-180°)',
  '青 (180°-210°)',
  '蓝 (210°-240°)',
  '蓝紫 (240°-270°)',
  '紫 (270°-300°)',
  '品红 (300°-330°)',
  '紫红 (330°-360°)',
];

interface ColorSettingsFormProps {
  settings: ColorSenseSettings;
  onChange: (patch: Partial<ColorSenseSettings>) => void;
}

export function ColorSettingsForm({ settings, onChange }: ColorSettingsFormProps) {
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
        <div className="text-sm font-semibold text-slate-700">色感滑块极值吸附外延感应区</div>
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
          <div className="text-xs text-slate-400">在悬停光标两侧实时显示 ΔE 动态容错区间</div>
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

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-700">综合拾色悬停颜色实时联动</div>
          <div className="text-xs text-slate-400">鼠标悬停滑块时右侧色块实时跟随试探预览</div>
        </div>
        <button
          type="button"
          onClick={() => onChange({ enableHoverColorPreview: !settings.enableHoverColorPreview })}
          className="text-indigo-600 hover:opacity-80 transition-opacity"
        >
          {settings.enableHoverColorPreview ? (
            <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
          ) : (
            <ToggleLeft className="w-8 h-8 text-slate-300" />
          )}
        </button>
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Crosshair className="w-4 h-4 text-indigo-600" />
          色相弱点专项靶向强化
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
              选择需要靶向强化的色相扇区：
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {COLOR_SECTOR_NAMES.map((name, idx) => {
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