完成卡片训练返回主页时“今日刷题”未更新的问题，原因在于 `useTodayStats` 仅在初始化挂载时拉取了一次 `daily_summaries` 数据，未暴露刷新函数；且 `App` 在退出训练执行 `refreshProfiles` 时没有重新请求今日数据。我们将 `useTodayStats` 增强为返回 `{ todayStats, refreshTodayStats }`，并在 `refreshProfiles` 刷新全盘状态时同步拉取最新的今日刷题聚合统计。

## [WIP] fix(stats): 修复完成训练退出时今日刷题统计未自动刷新的问题

### 错误分析

1. **问题成因**：`useTodayStats` 的 `useEffect` 依赖数组为空（`[]`），仅在应用启动首次挂载时执行了一次 `getTodaySummaries()`，并且没有将获取统计数据的函数暴露给外部调用。
2. **状态脱节**：在单卡片自适应训练 (`GenericTrainingView`) 或定制训练流 (`PlanTrainingView`) 结束退出返回主页时，虽然触发了 `refreshProfiles()` 重新获取档案与总训练时长，但 `todayStats` 没有得到重新加载，导致卡片上显示的“今日题数”与“今日时长”仍停留在初次打开应用时的旧快照，必须手动刷新整个页面才能更新。

### 用户需求

完成训练或训练流返回主页后，主页卡片上的“今日刷题”数据（包含今日题量与今日用时）能够实时自动更新，无需手动刷新页面。

### 评论

这是一个影响用户体验的关键状态同步问题。及时反馈今日刷题成果是提升用户成就感和保持训练流闭环的重要环节。

### 目标

1. 改造 `src/hooks/useTodayStats.ts`，使其返回包含 `{ todayStats, refreshTodayStats }` 的对象，支持主动按需重新拉取最新的日聚合数据。
2. 在 `src/app.tsx` 中解构 `refreshTodayStats`，并在 `refreshProfiles` 回调中并发请求 `repository.getAppSummary()` 与 `refreshTodayStats()`，确保返回主页或数据重置时状态完全一致。

### 基本原理

通过 `useCallback` 封装 `refreshTodayStats` 并暴露给消费组件，在 `App.tsx` 的统一数据刷新通道 `refreshProfiles` 中通过 `Promise.all` 联动执行，保证退出训练、计划完成或全局重置时，生涯档案和今日指标都能在无感刷新下同步更新至视图层。

### 标签

#intent/fix #flow/ready #priority/high #comp/runtime #concept/state #scope/ux #ai/instruct #task/domain/stats #task/object/today-stats #task/action/bug-fix #task/state/begin #task/status/active

---

### Script

#### Acts 1: 更新 `useTodayStats` Hook 支持外部主动刷新

我们将为 `useTodayStats` 增加 `refreshTodayStats` 函数并向外导出。

~~~~~act
patch_file
src/hooks/useTodayStats.ts
~~~~~
~~~~~ts.old
import { useEffect, useState } from 'preact/hooks';
import { getTodaySummaries } from '../utils/db/index';

export function useTodayStats() {
  const [todayStats, setTodayStats] = useState<Record<string, { count: number; timeMs: number }>>(
    {},
  );

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
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

      if (isMounted) {
        setTodayStats(stats);
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  return todayStats;
}
~~~~~
~~~~~ts.new
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
~~~~~

#### Acts 2: 在 `App.tsx` 中联动刷新今日刷题数据

更新 `App.tsx` 中的 `useTodayStats` 解构，并在 `refreshProfiles` 中加入 `refreshTodayStats()` 调用。

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~tsx.old
export function App() {
  const { route, navigate } = useHashRoute();
  const todayStats = useTodayStats();
  const lastHomeRouteRef = useRef<RouteLocation>({ type: 'home' });
~~~~~
~~~~~tsx.new
export function App() {
  const { route, navigate } = useHashRoute();
  const { todayStats, refreshTodayStats } = useTodayStats();
  const lastHomeRouteRef = useRef<RouteLocation>({ type: 'home' });
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~tsx.old
  const refreshProfiles = useCallback(async () => {
    const summary = await repository.getAppSummary();

    setTotalTimeMs(summary.totalTimeMs);
    setProfiles(summary.profiles);
    setSettings(summary.settings);
    setTrainingPlan(summary.trainingPlan);
    setAllPlans(summary.allPlans);
    setProfilesLoaded(true);
  }, []);
~~~~~
~~~~~tsx.new
  const refreshProfiles = useCallback(async () => {
    const [summary] = await Promise.all([
      repository.getAppSummary(),
      refreshTodayStats(),
    ]);

    setTotalTimeMs(summary.totalTimeMs);
    setProfiles(summary.profiles);
    setSettings(summary.settings);
    setTrainingPlan(summary.trainingPlan);
    setAllPlans(summary.allPlans);
    setProfilesLoaded(true);
  }, [refreshTodayStats]);
~~~~~

### 下一步建议

1. **测试验证**：进入任意训练卡片或训练流，做完一组题后点击退出返回主页，确认卡片上的“今日刷题”题数和时长即时递增并呈现最新状态。
2. **计划完成确认**：验证通过后，可提交 Git 变更以保存修复。
