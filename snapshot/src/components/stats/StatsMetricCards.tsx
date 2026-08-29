import { Activity, Calendar, Target, TrendingUp } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';

interface StatsMetricCardsProps {
  stats: {
    today: { total: number; hits: number };
    week: { total: number; hits: number };
    year: { total: number; hits: number };
    allTime: { total: number; hits: number };
  };
  streakDays: number;
}

export function StatsMetricCards({ stats, streakDays }: StatsMetricCardsProps) {
  const { t } = useTranslation();

  const calcAcc = (hits: number, total: number) =>
    total === 0 ? 0 : Math.round((hits / total) * 100);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white p-5 rounded-3xl border border-indigo-100 shadow-sm space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
          <Calendar className="w-4 h-4 text-indigo-500" />
          {t('stats.todayTrials')}
        </div>
        <div className="text-3xl font-black text-slate-800">
          {stats.today.total}{' '}
          <span className="text-xs font-semibold text-slate-400 font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-indigo-600 font-semibold mt-1">
          {t('common.accuracy')} {calcAcc(stats.today.hits, stats.today.total)}%
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
          <Target className="w-4 h-4 text-emerald-500" />
          {t('stats.weekTrials')}
        </div>
        <div className="text-3xl font-black text-slate-800">
          {stats.week.total}{' '}
          <span className="text-xs font-semibold text-slate-400 font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-emerald-600 font-semibold mt-1">
          {t('common.accuracy')} {calcAcc(stats.week.hits, stats.week.total)}%
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-amber-100 shadow-sm space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
          <Activity className="w-4 h-4 text-amber-500" />
          {t('stats.yearTrials')}
        </div>
        <div className="text-3xl font-black text-slate-800">
          {stats.year.total}{' '}
          <span className="text-xs font-semibold text-slate-400 font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-amber-600 font-semibold mt-1">
          {t('common.accuracy')} {calcAcc(stats.year.hits, stats.year.total)}%
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
          <TrendingUp className="w-4 h-4 text-slate-500" />
          {t('stats.allTimeTrials')}
        </div>
        <div className="text-3xl font-black text-slate-800">
          {stats.allTime.total}{' '}
          <span className="text-xs font-semibold text-slate-400 font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-slate-500 font-semibold mt-1">
          {t('stats.streakDays', { days: streakDays })}
        </div>
      </div>
    </div>
  );
}
