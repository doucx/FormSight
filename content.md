已定位问题所在。在 `GlobalStatsModal.tsx` 中，`dailyData` 是在组件函数作用域中每次渲染时重新构造的普通局部对象，而不是由 `useMemo` 缓存的引用。Biome 的 `useExhaustiveDependencies` 规则检测到该局部变量作为依赖传入了 `useEffect`，因而判定其为多余且无效的依赖项。

将 `stats` 与 `dailyData` 的统计聚合计算封装进 `useMemo`，不仅可以修复该 Lint 错误，还能避免组件每次重新渲染时不必要的重计算，并在筛选条件改变时正确触发趋势图重绘。

## [WIP] fix: 将 dailyData 与 stats 封装进 useMemo 以修复 linter 依赖告警

### 错误分析

Biome 在执行静态检查时报告 `useExhaustiveDependencies` 错误：
- **原因**：在组件体中，`dailyData` 是每次渲染都会被重新初始化的局部对象变量（非 state/hook/prop）。
- **影响**：将未被 memoize 的局部变量置于 `useEffect` 的依赖数组 `[loading, dailyData]` 中，导致 Biome 认为该依赖项多余且不合规；同时每次组件重渲染都会产生新的引用，导致依赖失去缓存比较的意义。

### 用户需求

修复 `GlobalStatsModal.tsx` 中的 Biome linter `useExhaustiveDependencies` 检查错误，确保代码符合质量规范且图表响应逻辑正常。

### 评论

这是一个典型的 React/Preact hook 依赖管理优化。通过将派生数据计算逻辑移入 `useMemo`，既满足了静态检查规则，又提升了组件的渲染性能。

### 目标

1. 使用 `useMemo` 封装 `filteredSummaries` 到 `stats` 与 `dailyData` 的聚合计算过程。
2. 消除 `GlobalStatsModal.tsx` 中的 linter 报错。

### 基本原理

通过 `useMemo` 将 `stats` 与 `dailyData` 绑定到 `[filteredSummaries, todayStr, startOfWeekStr, startOfYearStr]`，使得 `dailyData` 成为稳定的 memoized 引用。这样 `useEffect` 监听 `[loading, dailyData]` 符合静态分析规则，并在筛选条件变化时按需重绘 Canvas。

### 标签

#intent/fix #flow/ready #priority/medium #comp/ui #concept/executor #scope/dx #ai/instruct #task/domain/ui #task/object/global-stats-modal #task/action/fix-lint #task/state/begin

---

### Script

#### Acts 1: 使用 `useMemo` 缓存 stats 与 dailyData 计算

我们将 `stats` 和 `dailyData` 的计算逻辑迁移到 `useMemo` 中。

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript.old
  const stats = {
    today: { total: 0, hits: 0 },
    week: { total: 0, hits: 0 },
    year: { total: 0, hits: 0 },
    allTime: { total: 0, hits: 0 },
  };

  const dailyData: Record<string, { total: number; maxLevel: number }> = {};

  for (const s of filteredSummaries) {
    stats.allTime.total += s.totalCount;
    stats.allTime.hits += s.hitCount;

    if (s.date === todayStr) {
      stats.today.total += s.totalCount;
      stats.today.hits += s.hitCount;
    }
    if (s.date >= startOfWeekStr) {
      stats.week.total += s.totalCount;
      stats.week.hits += s.hitCount;
    }
    if (s.date >= startOfYearStr) {
      stats.year.total += s.totalCount;
      stats.year.hits += s.hitCount;
    }

    if (!dailyData[s.date]) {
      dailyData[s.date] = { total: 0, maxLevel: s.maxLevel };
    }
    dailyData[s.date].total += s.totalCount;
    dailyData[s.date].maxLevel = Math.max(dailyData[s.date].maxLevel, s.maxLevel);
  }
~~~~~
~~~~~typescript.new
  const { stats, dailyData } = useMemo(() => {
    const statsObj = {
      today: { total: 0, hits: 0 },
      week: { total: 0, hits: 0 },
      year: { total: 0, hits: 0 },
      allTime: { total: 0, hits: 0 },
    };

    const data: Record<string, { total: number; maxLevel: number }> = {};

    for (const s of filteredSummaries) {
      statsObj.allTime.total += s.totalCount;
      statsObj.allTime.hits += s.hitCount;

      if (s.date === todayStr) {
        statsObj.today.total += s.totalCount;
        statsObj.today.hits += s.hitCount;
      }
      if (s.date >= startOfWeekStr) {
        statsObj.week.total += s.totalCount;
        statsObj.week.hits += s.hitCount;
      }
      if (s.date >= startOfYearStr) {
        statsObj.year.total += s.totalCount;
        statsObj.year.hits += s.hitCount;
      }

      if (!data[s.date]) {
        data[s.date] = { total: 0, maxLevel: s.maxLevel };
      }
      data[s.date].total += s.totalCount;
      data[s.date].maxLevel = Math.max(data[s.date].maxLevel, s.maxLevel);
    }

    return { stats: statsObj, dailyData: data };
  }, [filteredSummaries, todayStr, startOfWeekStr, startOfYearStr]);
~~~~~

### 下一步建议

1. 重新运行代码检查命令（如 `pnpm check` 或 `biome check .`）验证告警是否完全消除。
2. 若检查全部通过且测试无误，可以生成 `[COMMIT]` 计划提交本次变更。
