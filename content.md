## [WIP] fix: 修复 GlobalStatsModal 中 useEffect 的 exhaustive-dependencies 告警

### 用户需求
在运行 Biome 静态检查时，`src/components/GlobalStatsModal.tsx` 触发了 `useExhaustiveDependencies` 告警：`dailyData` 对象在每次渲染时都会重新生成，作为 `useEffect` 依赖会导致不必要的重复绘制。需要将其从依赖项数组中移除。

### 评论
这是一个常规的代码洁癖和性能优化修复。通过移除 `dailyData` 依赖，确保趋势图 Canvas 仅在 `loading` 状态变化时触发渲染，符合 React/Preact Hook 的最佳实践。

### 目标
修复 `src/components/GlobalStatsModal.tsx` 中 `useEffect` 的依赖项。

### 基本原理
由于 `dailyData` 是在组件内部实时派生计算的普通对象，将其放入 `useEffect` 依赖会导致每次渲染都执行 `renderTrendChartCanvas`。将其移除即可消除告警并维持正常的图表初次加载逻辑。

### 标签
#intent/fix #flow/ready #priority/high #comp/cli #concept/ui #scope/dx #ai/instruct #task/domain/storage #task/object/materialized-rollup #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 修复 GlobalStatsModal 中的 useEffect 依赖项

使用 `patch_file` 精确修正 `src/components/GlobalStatsModal.tsx` 中的 `useEffect` 依赖数组。

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript.old
  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (canvas) {
      renderTrendChartCanvas(canvas, dailyData);
    }
  }, [loading, dailyData]);
~~~~~
~~~~~typescript.new
  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (canvas) {
      renderTrendChartCanvas(canvas, dailyData);
    }
  }, [loading]);
~~~~~

### 下一步建议
1. 再次运行 `npm run check` 确认所有 Biome 静态检查与 Lint 规则 100% 通过。
2. 确认里程碑 1 的数据引擎升级稳固闭环后，正式进入**里程碑 2：本体架构解耦与插件化 (Ontology & Plugin Architecture)**。
