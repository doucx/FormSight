import type { TrainingDomain } from '../../utils/db/index';
import type { TargetingMode } from '../../utils/settings';
import { SettingToggleItem } from './common/SettingToggleItem';
import { SliderMarginGroup } from './common/SliderMarginGroup';
import { TargetingSection } from './common/TargetingSection';

export type SettingFieldSchema =
  | {
      type: 'sliderMargin';
      key: string;
      title?: string;
    }
  | {
      type: 'toggle';
      key: string;
      title: string;
      description?: string;
    }
  | {
      type: 'buttonGroup';
      key: string;
      title: string;
      options: { label: string; value: unknown }[];
      gridCols?: string;
    }
  | {
      type: 'targeting';
      modeKey: string;
      sectorsKey: string;
      title: string;
      subTitle: string;
      sectors: string[];
      gridCols?: 'grid-cols-3' | 'grid-cols-4';
    };

export const STAR_SECTORS = [
  '正东(0°)',
  '东北(45°)',
  '正北(90°)',
  '西北(135°)',
  '正西(180°)',
  '西南(225°)',
  '正南(270°)',
  '东南(315°)',
];

export const COLOR_SECTORS = [
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

interface DynamicDomainSettingsProps {
  schemas: SettingFieldSchema[];
  values: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}

export function DynamicDomainSettings({ schemas, values, onChange }: DynamicDomainSettingsProps) {
  const handleSectorToggle = (sectorsKey: string, sectorIdx: number) => {
    const currentSectors = (values[sectorsKey] as number[] | undefined) || [];
    const exists = currentSectors.includes(sectorIdx);
    const updated = exists
      ? currentSectors.filter((s) => s !== sectorIdx)
      : [...currentSectors, sectorIdx];

    onChange({ [sectorsKey]: updated });
  };

  return (
    <div className="space-y-4">
      {schemas.map((field) => {
        if (field.type === 'sliderMargin') {
          return (
            <SliderMarginGroup
              key={field.key}
              title={field.title}
              value={(values[field.key] as number | undefined) ?? 12}
              onChange={(val) => onChange({ [field.key]: val })}
            />
          );
        }

        if (field.type === 'toggle') {
          return (
            <SettingToggleItem
              key={field.key}
              title={field.title}
              description={field.description}
              checked={Boolean(values[field.key])}
              onChange={(checked) => onChange({ [field.key]: checked })}
            />
          );
        }

        if (field.type === 'buttonGroup') {
          const currentVal = values[field.key];
          return (
            <div key={field.key} className="space-y-2">
              <div className="text-sm font-semibold text-slate-700">{field.title}</div>
              <div className={`grid ${field.gridCols || 'grid-cols-4'} gap-1.5`}>
                {field.options.map((opt) => (
                  <button
                    type="button"
                    key={String(opt.value)}
                    onClick={() => onChange({ [field.key]: opt.value })}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      currentVal === opt.value
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

        if (field.type === 'targeting') {
          const mode = (values[field.modeKey] as TargetingMode | undefined) || 'off';
          const selectedSectors = (values[field.sectorsKey] as number[] | undefined) || [];

          return (
            <TargetingSection
              key={`${field.modeKey}-${field.sectorsKey}`}
              title={field.title}
              subTitle={field.subTitle}
              mode={mode}
              onModeChange={(m) => onChange({ [field.modeKey]: m })}
              sectors={field.sectors}
              selectedSectors={selectedSectors}
              onToggleSector={(idx) => handleSectorToggle(field.sectorsKey, idx)}
              gridCols={field.gridCols}
            />
          );
        }

        return null;
      })}
    </div>
  );
}
