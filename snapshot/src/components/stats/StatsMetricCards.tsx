import { Activity, Calendar, Target, TrendingUp } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';
import type { TimeTierStats } from '../../hooks/useGlobalStatsData';
import { MetricCard } from '../ui/metric-card';

interface StatsMetricCardsProps {
  stats: {
    today: TimeTierStats;
    week: TimeTierStats;
    year: TimeTierStats;
    allTime: TimeTierStats;
  };
  streakDays: number;
}

export function StatsMetricCards({ stats, streakDays }: StatsMetricCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* 1. 今日刷题与日挑战峰值 */}
      <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
          <Calendar className="w-4 h-4 text-primary" />
          {t('stats.todayTrials')}
        </div>
        <div className="text-3xl font-black text-foreground font-mono">
          {stats.today.total}{' '}
          <span className="text-xs font-semibold text-muted-foreground font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-primary font-semibold mt-1 flex items-center gap-1">
          <span>{t('stats.todayPeakLevel')}:</span>
          <span className="font-mono font-black">
            {stats.today.peakLevel > 0 ? `Lvl ${stats.today.peakLevel}` : '--'}
          </span>
        </div>
      </MetricCard>

      {/* 2. 7天刷题与活跃均阶 */}
      <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
          <Target className="w-4 h-4 text-emerald-500" />
          {t('stats.weekTrials')}
        </div>
        <div className="text-3xl font-black text-foreground font-mono">
          {stats.week.total}{' '}
          <span className="text-xs font-semibold text-muted-foreground font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
          <span>{t('stats.weekAvgLevel')}:</span>
          <span className="font-mono font-black">
            {stats.week.avgLevel > 0 ? `Lvl ${stats.week.avgLevel}` : '--'}
          </span>
        </div>
      </MetricCard>

      {/* 3. 年度累计与年度突破峰值 */}
      <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
          <Activity className="w-4 h-4 text-amber-500" />
          {t('stats.yearTrials')}
        </div>
        <div className="text-3xl font-black text-foreground font-mono">
          {stats.year.total}{' '}
          <span className="text-xs font-semibold text-muted-foreground font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1 flex items-center gap-1">
          <span>{t('stats.yearPeakLevel')}:</span>
          <span className="font-mono font-black">
            {stats.year.peakLevel > 0 ? `Lvl ${stats.year.peakLevel}` : '--'}
          </span>
        </div>
      </MetricCard>

      {/* 4. 生涯总计与生涯巅峰 */}
      <MetricCard variant="default" padding="default" className="rounded-3xl space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          {t('stats.allTimeTrials')}
        </div>
        <div className="text-3xl font-black text-foreground font-mono">
          {stats.allTime.total}{' '}
          <span className="text-xs font-semibold text-muted-foreground font-normal">
            {t('common.trialsUnit')}
          </span>
        </div>
        <div className="text-xs text-muted-foreground font-semibold mt-1 flex items-center justify-between">
          <span>{t('stats.streakDays', { days: streakDays })}</span>
          <span className="font-mono font-bold text-foreground">
            {stats.allTime.peakLevel > 0 ? `Peak L${stats.allTime.peakLevel}` : ''}
          </span>
        </div>
      </MetricCard>
    </div>
  );
}
