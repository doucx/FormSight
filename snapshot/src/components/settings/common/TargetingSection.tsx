import { Crosshair } from 'lucide-preact';
import { useTranslation } from '../../../core/i18n';
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
          <button
            type="button"
            key={m.id}
            onClick={() => onModeChange(m.id as TargetingMode)}
            className={`py-2 text-xs font-bold rounded-xl border transition-all ${
              mode === m.id
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-white dark:bg-muted text-muted-foreground border-border hover:bg-accent'
            }`}
          >
            {m.label}
          </button>
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
                <button
                  type="button"
                  key={name}
                  onClick={() => onToggleSector(idx)}
                  className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border transition-all ${
                    selected
                      ? 'bg-accent text-primary border-border dark:border-border shadow-sm'
                      : 'bg-white dark:bg-muted text-muted-foreground border-border hover:bg-accent'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
