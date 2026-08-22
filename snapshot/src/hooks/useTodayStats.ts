import { useEffect, useState } from 'preact/hooks';
import { type TrainingDomain, getTodaySummaries } from '../utils/db/index';

export function useTodayStats(domain?: TrainingDomain) {
  const [todayStats, setTodayStats] = useState<Record<string, { count: number; timeMs: number }>>(
    {},
  );

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      const summaries = await getTodaySummaries(domain);
      const stats: Record<string, { count: number; timeMs: number }> = {};

      for (const s of summaries) {
        const key = s.cardId || s.mode;
        if (!stats[key]) {
          stats[key] = { count: 0, timeMs: 0 };
        }
        stats[key].count += s.totalCount;
        stats[key].timeMs += s.totalTimeMs;
      }

      if (isMounted) {
        setTodayStats(stats);
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [domain]);

  return todayStats;
}
