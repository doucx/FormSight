import type { RelativeColorSettings } from '../../utils/settings';
import { SettingToggleItem } from './common/SettingToggleItem';
import { SliderMarginGroup } from './common/SliderMarginGroup';

interface RelativeColorSettingsFormProps {
  settings: RelativeColorSettings;
  onChange: (patch: Partial<RelativeColorSettings>) => void;
}

export function RelativeColorSettingsForm({ settings, onChange }: RelativeColorSettingsFormProps) {
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
        title="悬停推移色彩联动预览"
        description="鼠标悬停滑块时右侧色块实时跟随试探预览"
        checked={settings.enableHoverColorPreview}
        onChange={(checked) => onChange({ enableHoverColorPreview: checked })}
      />
    </div>
  );
}