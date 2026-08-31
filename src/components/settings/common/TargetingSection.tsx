import { Crosshair } from 'lucide-preact';
import { useTranslation } from '../../../core/i18n';
import type { TargetingMode } from '../../../storage/settings';
import { Button } from '../../ui/button';

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
  title,
  subTitle,
  mode,
  onModeChange,
  sectors,
  selectedSectors,
  onToggleSector,
  gridCols = 'grid-cols-4',
}: TargetingSectionProps) {
  const { t } = useTranslation();

  const effectiveTitle = title || t('settingsModal.targetingTitle');
  const effectiveSubTitle = subTitle || t('settingsModal.targetingSubTitle');

  return (
    <div className="space-y-2 pt-2 border-t border-border/60">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Crosshair className="w-4 h-4 text-primary" />
        {effectiveTitle}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { id: 'off', label: t('settingsModal.targetingOff') },
          { id: 'manual', label: t('settingsModal.targetingManual') },
        ].map((m) => (
          <Button
            key={m.id}
            variant={mode === m.id ? 'default' : 'outline'}
            onClick={() => onModeChange(m.id as TargetingMode)}
            className="py-2 h-auto"
          >
            {m.label}
          </Button>
        ))}
      </div>

      {mode === 'manual' && (
        <div className="bg-muted/60 p-3 rounded-2xl border border-border/60 space-y-2">
          <div className="text-[11px] font-semibold text-muted-foreground">{effectiveSubTitle}</div>
          <div className={`grid ${gridCols} gap-1.5`}>
            {sectors.map((name, idx) => {
              const selected = selectedSectors.includes(idx);
              const label = t(name) || name;
              return (
                <Button
                  key={name}
                  variant={selected ? 'accent' : 'outline'}
                  size="sm"
                  onClick={() => onToggleSector(idx)}
                  className="py-1.5 px-1 text-[10px] h-auto"
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
