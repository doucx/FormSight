import type { NegativeSpaceSettings } from '../../utils/settings';
import { SettingToggleItem } from './common/SettingToggleItem';
import { SliderMarginGroup } from './common/SliderMarginGroup';

interface NegativeSpaceSettingsFormProps {
  settings: NegativeSpaceSettings;
  onChange: (patch: Partial<NegativeSpaceSettings>) => void;
}

export function NegativeSpaceSettingsForm({ settings, onChange }: NegativeSpaceSettingsFormProps) {
  return (
    <div className="space-y-4">
      <SliderMarginGroup
        title="滑块极值吸附外延感应区"
        value={settings.sliderHitMargin}
        onChange={(val) => onChange({ sliderHitMargin: val })}
      />

      <SettingToggleItem
        title="显示滑块容错感应区"
        description="在悬停光标两侧实时显示 Δ% 动态容错区间"
        checked={settings.showToleranceBand}
        onChange={(checked) => onChange({ showToleranceBand: checked })}
      />
    </div>
  );
}