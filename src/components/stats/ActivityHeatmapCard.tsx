import { useTranslation } from '../../core/i18n';

interface ActivityHeatmapCardProps {
  heatmapData: { date: string; count: number }[];
}

export function ActivityHeatmapCard({ heatmapData }: ActivityHeatmapCardProps) {
  const { t } = useTranslation();

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-slate-100';
    if (count < 10) return 'bg-indigo-200';
    if (count < 25) return 'bg-indigo-400';
    if (count < 50) return 'bg-indigo-600';
    return 'bg-indigo-800';
  };

  return (
    <div className="bg-white border border-slate-200/80 shadow-sm p-6 rounded-3xl flex flex-col gap-4">
      <div className="text-sm font-bold text-slate-800 flex items-center justify-between">
        <span>{t('stats.heatmapTitle')}</span>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-normal">
          {t('stats.heatmapLess')} <div className="w-3 h-3 rounded-sm bg-slate-100" />
          <div className="w-3 h-3 rounded-sm bg-indigo-200" />
          <div className="w-3 h-3 rounded-sm bg-indigo-400" />
          <div className="w-3 h-3 rounded-sm bg-indigo-600" />
          <div className="w-3 h-3 rounded-sm bg-indigo-800" /> {t('stats.heatmapMore')}
        </div>
      </div>
      <div className="grid grid-cols-12 gap-2 self-center py-2">
        {heatmapData.map((day) => (
          <div
            key={day.date}
            title={t('stats.heatmapTooltip', { date: day.date, count: day.count })}
            className={`w-4 h-4 rounded-[4px] transition-transform hover:scale-125 cursor-help ${getHeatmapColor(
              day.count,
            )}`}
          />
        ))}
      </div>
    </div>
  );
}
