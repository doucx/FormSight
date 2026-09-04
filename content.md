下面生成针对类别 A、B 的重构与类别 C 源码读取的执行计划。

## [WIP] refactor: 重构残留的题目生命周期与多语言依赖并审查系统级 ignore

### 用户需求

消除代码库中残留的卡片换题 reset effect 与统计图表中的虚假依赖，移除不必要的 `biome-ignore` 注释，使架构与代码规范保持一致。

### 评论

这次清理将使所有卡片完全统一到基于 `key` 的生命周期重置体系下，并简化图表组件中的多语言响应计算。

### 目标

1. 在 `persp_prop_migration/index.tsx` 与 `persp_prop_division/index.tsx` 中补全 `key={question.id}`。
2. 从 `PerspPropMigrationView.tsx` 与 `PerspPropDivisionView.tsx` 中彻底删除重置 `useEffect` 与 `biome-ignore`。
3. 重构 `ActivityHeatmapCard.tsx` 中 `monthNames` 的解析方式，清除其 `biome-ignore`。
4. 读取 `src/hooks/useAppBootstrap.ts` 源码以便在下一步彻底修复其依赖声明。

### 基本原理

通过消除多余的命令式 Effect 与过度优化的 `useMemo`，恢复纯粹声明式的数据流，让静态分析器无需依赖任何 ignore 规则即可验证通过。

### 标签

#intent/refine #flow/ready #priority/high #comp/build #concept/state #scope/core #ai/instruct #task/domain/quality #task/object/biome-ignore-cleanup #task/action/refactor #task/state/continue #task/status/active

---

### Script

#### Acts 1: 重构 `persp_prop_division` 与 `persp_prop_migration`

为两张卡片赋予 `key={question.id}`，并从对应视图组件中彻底删除命令式 reset `useEffect` 及 `biome-ignore`。

~~~~~act
patch_file
src/cards/persp_prop_division/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <PerspPropDivisionView
        question={question}
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <PerspPropDivisionView
        key={question.id}
        question={question}
~~~~~

~~~~~act
patch_file
src/cards/persp_prop_division/PerspPropDivisionView.tsx
~~~~~
~~~~~typescript
  const [userClickedPoint, setUserClickedPoint] = useState<Point | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setUserClickedPoint(null);
    setHoverPoint(null);
  }, [question.id]);

  const getProjectedPoint = useCallback(
~~~~~
~~~~~typescript
  const [userClickedPoint, setUserClickedPoint] = useState<Point | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  const getProjectedPoint = useCallback(
~~~~~

~~~~~act
patch_file
src/cards/persp_prop_migration/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <PerspPropMigrationView
        question={question}
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <PerspPropMigrationView
        key={question.id}
        question={question}
~~~~~

~~~~~act
patch_file
src/cards/persp_prop_migration/PerspPropMigrationView.tsx
~~~~~
~~~~~typescript
  const [userClickedPoint, setUserClickedPoint] = useState<Point | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setUserClickedPoint(null);
    setHoverPoint(null);
  }, [question.id]);

  const getProjectedPoint = useCallback(
~~~~~
~~~~~typescript
  const [userClickedPoint, setUserClickedPoint] = useState<Point | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  const getProjectedPoint = useCallback(
~~~~~

#### Acts 2: 重构 `ActivityHeatmapCard.tsx` 的多语言月份计算

移除伪依赖 `[t, locale]` 与不必要的局部 `useMemo`，直接在渲染时以轻量纯函数形式解析多语言月份，清除 `biome-ignore`。

~~~~~act
patch_file
src/components/stats/ActivityHeatmapCard.tsx
~~~~~
~~~~~typescript
  // 2. 解析多语言月份数组
  // biome-ignore lint/correctness/useExhaustiveDependencies: recalculate month translations on locale switch
  const monthNames = useMemo(() => {
    const raw = t<string[]>('stats.heatmapMonths');
    if (Array.isArray(raw)) return raw;
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }, [t, locale]);
~~~~~
~~~~~typescript
  // 2. 解析多语言月份数组
  const rawMonths = t<string[]>('stats.heatmapMonths');
  const monthNames = useMemo(() => {
    if (Array.isArray(rawMonths)) return rawMonths;
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }, [rawMonths]);
~~~~~

#### Acts 3: 读取 `useAppBootstrap.ts` 源码

读取 `src/hooks/useAppBootstrap.ts` 文件以分析标题监听副作用的具体实现。

~~~~~act
read_file
src/hooks/useAppBootstrap.ts
~~~~~

### 下一步建议

1. 根据 `useAppBootstrap.ts` 的读取结果，消除该 hook 内部的 `biome-ignore`，使其符合完整的响应式依赖声明。
2. 再次执行 `rg biome-ignore`，确认全工程仅保留 `CanvasView.tsx`（底层桥接组件）这一处正当封装注释。
