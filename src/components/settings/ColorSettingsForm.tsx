import type { ColorSenseSettings } from '../../utils/settings';
import { SettingToggleItem } from './common/SettingToggleItem';
import { SliderMarginGroup } from './common/SliderMarginGroup';
import { TargetingSection } from './common/TargetingSection';

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
      <SliderMarginGroup
        title="色感滑块极值吸附外延感应区"
        value={settings.sliderHitMargin}
        onChange={(val) => onChange({ sliderHitMargin: val })}
      />

      <SettingToggleItem
        title="显示滑块容错感应区"
        description="在悬停光标两侧实时显示 ΔE 动态容错区间"
        checked={settings.showToleranceBand}
        onChange={(checked) => onChange({ showToleranceBand: checked })}
      />

      <SettingToggleItem
        title="综合拾色悬停颜色实时联动"
        description="鼠标悬停滑块时右侧色块实时跟随试探预览"
        checked={settings.enableHoverColorPreview}
        onChange={(checked) => onChange({ enableHoverColorPreview: checked })}
      />

      <TargetingSection
        title="色相弱点专项靶向强化"
        subTitle="选择需要靶向强化的色相扇区："
        mode={settings.targetingMode}
        onModeChange={(mode) => onChange({ targetingMode: mode })}
        sectors={COLOR_SECTOR_NAMES}
        selectedSectors={settings.manualTargetSectors || []}
        onToggleSector={handleSectorToggle}
        gridCols="grid-cols-3"
      />
    </div>
  );
}
