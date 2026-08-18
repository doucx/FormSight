我们将把各个设置表单中重复的“滑块感应区按钮组”、“设置开关项”以及“弱点靶向扇区多选器”抽取为通用的原子表单组件，并重构 4 个领域的设置表单。

## [WIP] refactor: 提取设置表单原子组件 SliderMarginGroup、SettingToggleItem 与 TargetingSection

### 用户需求
将 `ColorSettingsForm`、`StarSettingsForm`、`NegativeSpaceSettingsForm` 以及 `RelativeColorSettingsForm` 中高度重复的滑块外延感应区选择器、功能开关项和弱点靶向扇区多选器抽象为通用的原子 UI 组件。

### 评论
当前 4 个领域的设置表单在 UI 布局和交互逻辑上高度同质化（例如：相同的 0/8/12/20px 感应区按钮、相同的 `ToggleRight` / `ToggleLeft` 图标开关、相同的 8/12 扇区多选切换）。抽取为可复用原子组件后，不仅各表单代码量可精简 60% 以上，后续若调整主题风格或交互样式也只需在一个地方修改。

### 目标
1. 新建 `src/components/settings/common/SliderMarginGroup.tsx`：吸附外延感应区按钮组。
2. 新建 `src/components/settings/common/SettingToggleItem.tsx`：通用行内标题/描述开关项。
3. 新建 `src/components/settings/common/TargetingSection.tsx`：弱点专项靶向多选器。
4. 重构 `ColorSettingsForm`、`StarSettingsForm`、`NegativeSpaceSettingsForm` 与 `RelativeColorSettingsForm`。

### 基本原理
- **原子设计模式 (Atomic Design)**：将基础输入控件拆分为无副作用、纯展示受控组件。
- **声明式配置驱动**：各领域表单只需向通用组件传递字段、扇区标签数组与变更回调。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/dx #scope/ux #ai/instruct #task/domain/ui #task/object/settings-atomic-components #task/action/refactor #task/state/continue #task/status/active

---

### Script

#### Acts 1: 创建滑块感应区按钮组组件 `SliderMarginGroup.tsx`

~~~~~act
write_file
src/components/settings/common/SliderMarginGroup.tsx
~~~~~
~~~~~typescript
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
~~~~~

#### Acts 2: 创建通用行内开关项组件 `SettingToggleItem.tsx`

~~~~~act
write_file
src/components/settings/common/SettingToggleItem.tsx
~~~~~
~~~~~typescript
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
        <div className="text-sm font-semibold text-slate-700">{title}</div>
        {description && <div className="text-xs text-slate-400">{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="text-indigo-600 hover:opacity-80 transition-opacity"
      >
        {checked ? (
          <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
        ) : (
          <ToggleLeft className="w-8 h-8 text-slate-300" />
        )}
      </button>
    </div>
  );
}
~~~~~

#### Acts 3: 创建弱点专项靶向组件 `TargetingSection.tsx`

~~~~~act
write_file
src/components/settings/common/TargetingSection.tsx
~~~~~
~~~~~typescript
import { Crosshair } from 'lucide-preact';
import type { TargetingMode } from '../../../utils/settings';

interface TargetingSectionProps {
  title?: string;
  subTitle?: string;
  mode: TargetingMode;
  onModeChange: (mode: TargetingMode) => void;
  sectors: string[];
  selectedSectors: number[];
  onToggleSector: (sectorIdx: number) => void;
  gridCols?: 'grid-cols-3' | 'grid-cols-4';
}

export function TargetingSection({
  title = '弱点专项靶向强化',
  subTitle = '选择需要靶向强化的扇区：',
  mode,
  onModeChange,
  sectors,
  selectedSectors,
  onToggleSector,
  gridCols = 'grid-cols-4',
}: TargetingSectionProps) {
  return (
    <div className="space-y-2 pt-2 border-t border-slate-100">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
        <Crosshair className="w-4 h-4 text-indigo-600" />
        {title}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { id: 'off', label: '关闭 (全随机)' },
          { id: 'manual', label: '手动指定' },
        ].map((m) => (
          <button
            type="button"
            key={m.id}
            onClick={() => onModeChange(m.id as TargetingMode)}
            className={`py-2 text-xs font-bold rounded-xl border transition-all ${
              mode === m.id
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'manual' && (
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
          <div className="text-[11px] font-semibold text-slate-500">{subTitle}</div>
          <div className={`grid ${gridCols} gap-1.5`}>
            {sectors.map((name, idx) => {
              const selected = selectedSectors.includes(idx);
              return (
                <button
                  type="button"
                  key={name}
                  onClick={() => onToggleSector(idx)}
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
  );
}
~~~~~

#### Acts 4: 使用原子组件重构 `ColorSettingsForm.tsx`

~~~~~act
write_file
src/components/settings/ColorSettingsForm.tsx
~~~~~
~~~~~typescript
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
~~~~~

#### Acts 5: 使用原子组件重构 `StarSettingsForm.tsx`

~~~~~act
write_file
src/components/settings/StarSettingsForm.tsx
~~~~~
~~~~~typescript
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
~~~~~

#### Acts 6: 使用原子组件重构 `NegativeSpaceSettingsForm.tsx` 与 `RelativeColorSettingsForm.tsx`

~~~~~act
write_file
src/components/settings/NegativeSpaceSettingsForm.tsx
~~~~~
~~~~~typescript
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
~~~~~

~~~~~act
write_file
src/components/settings/RelativeColorSettingsForm.tsx
~~~~~
~~~~~typescript
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
~~~~~

### 下一步建议

1. **执行自动化测试与质量审查**：运行 `npm test` 与 `npm run check`，确保整体重构后单元测试全量通过且无代码格式问题。
2. **分析模态框接入**：如果需要，可以进一步将 `AnalyticsModal` 和 `ColorAnalyticsModal` 接入 `ModalShell`，统一弱点分析弹窗的外观交互。
