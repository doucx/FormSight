import { useEffect, useState } from 'preact/hooks';
import { type TrainingDomain, getTrialRecords } from '../utils/db';

export function useTodayStats(domain?: TrainingDomain) {
  const [todayStats, setTodayStats] = useState<Record<string, { count: number; timeMs: number }>>(
    {},
  );

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      const records = await getTrialRecords(domain);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const stats: Record<string, { count: number; timeMs: number }> = {};

      for (const r of records) {
        if (r.timestamp >= startOfToday) {
          const key = r.cardId || r.mode;
          if (!stats[key]) {
            stats[key] = { count: 0, timeMs: 0 };
          }
          stats[key].count += 1;
          stats[key].timeMs += (r.responseTimeMs as number) || 0;
        }
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
