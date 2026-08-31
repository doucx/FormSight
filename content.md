Biome 检查报告了两个代码质量与规范问题：
1. **`useExhaustiveDependencies`**：`useMemo` 回调函数体内部未直接引用变量 `locale`（通过全局单例 `t` 取值），被 linter 判定为多余的依赖项；
2. **`noArrayIndexKey`**：`weeks.map` 中使用了数组下标 `wIdx` 作为 React `key`（`key="week-${wIdx}"`），不符合 Biome 对列表项唯一稳定键的要求。

我将通过给每周对象提供基于首日日期的稳定唯一 ID（`week.id = days[0].dateStr`）以及为 `useMemo` 添加针对动态本地化切换的 biome-ignore 注释来修复这两个问题。

## [WIP] fix(stats): 修复 ActivityHeatmapCard 中的 Biome 校验与依赖告警

### 错误分析
1. **未直接引用的 Hook 依赖**：`monthNames` 计算依赖了 `locale` 以在切语言时触发重算，但因 `locale` 未在函数体内显式读取，触发了 `lint/correctness/useExhaustiveDependencies`。
2. **下标作为 React Key**：在遍历 53 周数据时使用了 `key={week-${wIdx}}`，触发了 `lint/suspicious/noArrayIndexKey` 警告。

### 用户需求
修复 `npm run checkf` 执行时的两处 Biome 报错，使代码完全通过静态检查与 TypeScript 类型检查。

### 评论
遵循严格的 linter 规则能有效避免由于不稳定的 Key 导致虚拟 DOM 重新比对效率下降，同时保持 Hook 依赖列表的规范性。

### 目标
1. 为 `HeatmapWeek` 增加基于该周第一天日期字符串构成的稳定唯一 `id` 属性，消除 `noArrayIndexKey` 告警。
2. 为 `monthNames` 的 `useMemo` 补充符合规范的 `biome-ignore` 注释，消除依赖项告警。

### 基本原理
- 每周的第 0 天日期（`days[0].dateStr`，如 `2025-08-24`）在时间序列上是唯一且持久不变的，作为 Key 既语义清晰又符合 React/Preact Diff 算法的最佳实践。

### 标签
#intent/fix #flow/ready #priority/medium #comp/ui #concept/ui #scope/dx #ai/instruct #task/domain/ui #task/object/activity-heatmap #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 修复依赖声明与唯一键定义

修改 `src/components/stats/ActivityHeatmapCard.tsx`。

~~~~~act
patch_file
src/components/stats/ActivityHeatmapCard.tsx
~~~~~
~~~~~typescript.old
interface HeatmapWeek {
  days: HeatmapDay[];
  monthLabel: string | null;
}
~~~~~
~~~~~typescript.new
interface HeatmapWeek {
  id: string;
  days: HeatmapDay[];
  monthLabel: string | null;
}
~~~~~

~~~~~act
patch_file
src/components/stats/ActivityHeatmapCard.tsx
~~~~~
~~~~~typescript.old
  // 2. 解析多语言月份数组
  const monthNames = useMemo(() => {
    const raw = t<string[]>('stats.heatmapMonths');
    if (Array.isArray(raw)) return raw;
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }, [t, locale]);

  // 3. 构建 53 周 x 7 天 (周日~周六) 矩阵
  const { weeks, totalTrialsPastYear } = useMemo(() => {
~~~~~
~~~~~typescript.new
  // 2. 解析多语言月份数组
  // biome-ignore lint/correctness/useExhaustiveDependencies: recalculate month translations on locale switch
  const monthNames = useMemo(() => {
    const raw = t<string[]>('stats.heatmapMonths');
    if (Array.isArray(raw)) return raw;
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }, [t, locale]);

  // 3. 构建 53 周 x 7 天 (周日~周六) 矩阵
  const { weeks, totalTrialsPastYear } = useMemo(() => {
~~~~~

~~~~~act
patch_file
src/components/stats/ActivityHeatmapCard.tsx
~~~~~
~~~~~typescript.old
      weeksList.push({
        days,
        monthLabel: weekMonthLabel,
      });
    }
~~~~~
~~~~~typescript.new
      weeksList.push({
        id: days[0]?.dateStr || `week-${w}`,
        days,
        monthLabel: weekMonthLabel,
      });
    }
~~~~~

~~~~~act
patch_file
src/components/stats/ActivityHeatmapCard.tsx
~~~~~
~~~~~typescript.old
          {/* 右侧：53 列按周排列的矩阵与顶部月份 */}
          <div className="flex gap-1" onMouseLeave={() => setHoveredDay(null)}>
            {weeks.map((week, wIdx) => (
              <div key={`week-${wIdx}`} className="flex flex-col gap-1 flex-shrink-0">
                {/* 顶部月份标记槽位：绝对定位避免挤占列宽，保证网格均匀紧凑 */}
~~~~~
~~~~~typescript.new
          {/* 右侧：53 列按周排列的矩阵与顶部月份 */}
          <div className="flex gap-1" onMouseLeave={() => setHoveredDay(null)}>
            {weeks.map((week) => (
              <div key={week.id} className="flex flex-col gap-1 flex-shrink-0">
                {/* 顶部月份标记槽位：绝对定位避免挤占列宽，保证网格均匀紧凑 */}
~~~~~

### 下一步建议
- 重新运行 `npm run checkf`，确认所有 Biome 规则与类型检查均已顺利通过。
