import { Activity, Calendar, Target, TrendingUp } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';
import { MetricCard } from '../ui/metric-card';

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
      <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
          <Calendar className="w-4 h-4 text-primary" />
          {t('stats.todayTrials')}
        </div>
        <div className="text-3xl font-black text-foreground">
          {stats.today.total}{' '}
          <span className="text-xs font-semibold text-muted-foreground font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-primary font-semibold mt-1">
          {t('common.accuracy')} {calcAcc(stats.today.hits, stats.today.total)}%
        </div>
      </MetricCard>

      <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
          <Target className="w-4 h-4 text-emerald-500" />
          {t('stats.weekTrials')}
        </div>
        <div className="text-3xl font-black text-foreground">
          {stats.week.total}{' '}
          <span className="text-xs font-semibold text-muted-foreground font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
          {t('common.accuracy')} {calcAcc(stats.week.hits, stats.week.total)}%
        </div>
      </MetricCard>

      <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
          <Activity className="w-4 h-4 text-amber-500" />
          {t('stats.yearTrials')}
        </div>
        <div className="text-3xl font-black text-foreground">
          {stats.year.total}{' '}
          <span className="text-xs font-semibold text-muted-foreground font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1">
          {t('common.accuracy')} {calcAcc(stats.year.hits, stats.year.total)}%
        </div>
      </MetricCard>

      <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          {t('stats.allTimeTrials')}
        </div>
        <div className="text-3xl font-black text-foreground">
          {stats.allTime.total}{' '}
          <span className="text-xs font-semibold text-muted-foreground font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-muted-foreground font-semibold mt-1">
          {t('stats.streakDays', { days: streakDays })}
        </div>
      </MetricCard>
    </div>
  );
}
