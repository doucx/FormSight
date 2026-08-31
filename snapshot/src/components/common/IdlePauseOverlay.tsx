import { Pause } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';
import { Button } from '../ui/button';

interface IdlePauseOverlayProps {
  onResume: () => void;
}

export function IdlePauseOverlay({ onResume }: IdlePauseOverlayProps) {
  const { t } = useTranslation();

  return (
    <div
      role="presentation"
      onClick={onResume}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onResume();
      }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/40 backdrop-blur-md rounded-3xl cursor-pointer select-none animate-in fade-in duration-150"
    >
      <div className="p-5 bg-card/95 text-foreground rounded-3xl shadow-2xl border border-white/60 dark:border-border flex flex-col items-center gap-2.5 max-w-xs text-center mx-4">
        <div className="p-3 bg-accent text-primary rounded-2xl">
          <Pause className="w-6 h-6 animate-pulse" />
        </div>
        <div className="text-base font-bold text-foreground">{t('common.idlePausedTitle')}</div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t('common.idlePausedDesc')}
        </p>
        <Button
          variant="default"
          onClick={onResume}
          className="mt-1 w-full py-2.5 h-auto"
        >
          {t('common.clickToResume')}
        </Button>
      </div>
    </div>
  );
}
