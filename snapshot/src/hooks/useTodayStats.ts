import { useCallback, useEffect, useState } from 'preact/hooks';
import { getTodaySummaries } from '../utils/db/index';

export function useTodayStats() {
  const [todayStats, setTodayStats] = useState<Record<string, { count: number; timeMs: number }>>(
    {},
  );

  const refreshTodayStats = useCallback(async () => {
    const summaries = await getTodaySummaries();
    const stats: Record<string, { count: number; timeMs: number }> = {};

    for (const s of summaries) {
      const key = s.cardId || s.mode;
      if (!stats[key]) {
        stats[key] = { count: 0, timeMs: 0 };
      }
      stats[key].count += s.totalCount;
      stats[key].timeMs += s.totalTimeMs;
    }

    setTodayStats(stats);
  }, []);

  useEffect(() => {
    refreshTodayStats();
  }, [refreshTodayStats]);

  return { todayStats, refreshTodayStats };
}
