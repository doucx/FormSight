import { useTranslation } from '../../core/i18n';
import type { TargetingMode } from '../../storage/settings';
import { Button } from '../ui/button';
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

interface DynamicDomainSettingsProps {
  schemas: SettingFieldSchema[];
  values: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}

export function DynamicDomainSettings({ schemas, values, onChange }: DynamicDomainSettingsProps) {
  const { t } = useTranslation();

  const handleSectorToggle = (sectorsKey: string, sectorIdx: number) => {
    const currentSectors = (values[sectorsKey] as number[] | undefined) || [];
    const exists = currentSectors.includes(sectorIdx);
    const updated = exists
      ? currentSectors.filter((s) => s !== sectorIdx)
      : [...currentSectors, sectorIdx];

    onChange({ [sectorsKey]: updated });
  };

  const resolveText = (text?: string): string => {
    if (!text) return '';
    const translated = t(text);
    if (translated !== text) return translated;
    if (text.startsWith('cards.')) {
      const parts = text.split('.');
      if (parts.length >= 3) {
        return parts.slice(2).join('.');
      }
    }
    return text;
  };

  return (
    <div className="space-y-4">
      {schemas.map((field) => {
        if (field.type === 'sliderMargin') {
          return (
            <SliderMarginGroup
              key={field.key}
              title={field.title ? resolveText(field.title) : undefined}
              value={(values[field.key] as number | undefined) ?? 12}
              onChange={(val) => onChange({ [field.key]: val })}
            />
          );
        }

        if (field.type === 'toggle') {
          return (
            <SettingToggleItem
              key={field.key}
              title={resolveText(field.title)}
              description={field.description ? resolveText(field.description) : undefined}
              checked={Boolean(values[field.key])}
              onChange={(checked) => onChange({ [field.key]: checked })}
            />
          );
        }

        if (field.type === 'buttonGroup') {
          const currentVal = values[field.key];
          return (
            <div key={field.key} className="space-y-2">
              <div className="text-sm font-semibold text-foreground">
                {resolveText(field.title)}
              </div>
              <div className={`grid ${field.gridCols || 'grid-cols-4'} gap-1.5`}>
                {field.options.map((opt) => (
                  <Button
                    key={String(opt.value)}
                    variant={currentVal === opt.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onChange({ [field.key]: opt.value })}
                    className="py-2 h-auto"
                  >
                    {resolveText(opt.label)}
                  </Button>
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
              title={resolveText(field.title)}
              subTitle={resolveText(field.subTitle)}
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
