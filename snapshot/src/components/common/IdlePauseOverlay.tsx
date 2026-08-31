import { Pause } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';

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
      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md rounded-3xl cursor-pointer select-none animate-in fade-in duration-150"
    >
      <div className="p-5 bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 rounded-3xl shadow-2xl border border-white/60 dark:border-slate-800 flex flex-col items-center gap-2.5 max-w-xs text-center mx-4">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
          <Pause className="w-6 h-6 animate-pulse" />
        </div>
        <div className="text-base font-bold text-slate-800 dark:text-slate-100">
          {t('common.idlePausedTitle')}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {t('common.idlePausedDesc')}
        </p>
        <button
          type="button"
          onClick={onResume}
          className="mt-1 w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95"
        >
          {t('common.clickToResume')}
        </button>
      </div>
    </div>
  );
}
