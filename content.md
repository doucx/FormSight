我已经定位了 `biome check` 报出的 8 处 `useExhaustiveDependencies` 语法检查错误。

问题主要是两类：
1. 部分视图组件在题目变更（`question.id` 变化）时需重置选中状态，但闭包内未直接读取 `question.id`，导致 Biome 判定为冗余依赖。我们将添加显式的 `biome-ignore` 解释注释。
2. `TopDownPatternView.tsx` 中在组件作用域定义的 `patternRefs` 数组在 `useEffect` 中被引用，导致 Biome 提示未捕获依赖。我们将引用逻辑收敛至 effect 内部解析。

## [WIP] fix: 修复组件中 React Hook Exhaustive Dependencies 的 Linter 报错

### 错误分析

在运行 `npm run checkf` 时，Biome 抛出 8 处 `lint/correctness/useExhaustiveDependencies` 错误：
1. `PaletteClusteringView.tsx`、`TopDown2AfcView.tsx`、`TopDownPatternView.tsx`、`AreaComparison2AfcView.tsx`、`RatioEstimationView.tsx`、`ShapeMemory2AfcView.tsx`、`VertexFittingView.tsx` 中，`useEffect` 依赖项包含 `question.id` 用于在切题时重置本地状态，但 effect 内部没有直接引用 `question.id` 标识符，被 linter 判定为多余依赖。
2. `TopDownPatternView.tsx` 的第二个 `useEffect` 访问了在组件顶层构造的 `patternRefs` 临时数组中的 `.current`，导致依赖分析链未能正确识别。

### 用户需求

修复所有 `biome check` 报错，确保 `npm run checkf` 能够顺利通过且不破坏状态重置逻辑。

### 评论

在 React/Preact 中，利用 `[question.id]` 作为 trigger 重置子组件内部状态是常见模式。通过补充规范的 `// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>` 注释，并优化 ref 数组在 effect 内部的访问方式，既能保留业务逻辑意图，又符合 Biome 的严格代码质量规范。

### 目标

1. 在 `PaletteClusteringView.tsx`、`TopDown2AfcView.tsx`、`TopDownPatternView.tsx` 中修复 hook 依赖。
2. 在 `AreaComparison2AfcView.tsx`、`RatioEstimationView.tsx`、`ShapeMemory2AfcView.tsx`、`VertexFittingView.tsx` 中修复 hook 依赖。
3. 确保所有 8 处 linter 错误被彻底解决。

### 基本原理

1. 针对“以属性变更触发状态重置”但内部未显式消费属性值的 `useEffect`，添加 Biome 标准的 `// biome-ignore lint/correctness/useExhaustiveDependencies` 注释，说明重置意图。
2. 针对 `TopDownPatternView.tsx` 中的 Canvas 渲染 effect，在 effect 回调内部组织 ref 数组，避免捕获外部每次 render 生成的数组引用。

### 标签

#intent/fix #flow/ready #priority/high #comp/interfaces #concept/executor #scope/core #ai/instruct #task/domain/testing #task/object/linter-compliance #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 修复 abstraction 目录下各视图组件的 Hook 依赖

~~~~~act
patch_file
src/components/abstraction/PaletteClusteringView.tsx
~~~~~
~~~~~typescript.old
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    setSelectedIdx(null);
  }, [question.id]);

  useEffect(() => {
~~~~~
~~~~~typescript.new
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection when question changes
  useEffect(() => {
    setSelectedIdx(null);
  }, [question.id]);

  useEffect(() => {
~~~~~

~~~~~act
patch_file
src/components/abstraction/TopDown2AfcView.tsx
~~~~~
~~~~~typescript.old
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  useEffect(() => {
~~~~~
~~~~~typescript.new
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection when question changes
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  useEffect(() => {
~~~~~

~~~~~act
patch_file
src/components/abstraction/TopDownPatternView.tsx
~~~~~
~~~~~typescript.old
  const patternRefs = [patternCanvasRef0, patternCanvasRef1, patternCanvasRef2, patternCanvasRef3];

  useEffect(() => {
    setSelectedIdx(null);
  }, [question.id]);

  useEffect(() => {
    if (question.palettePatternOptions) {
      question.palettePatternOptions.forEach((pat, i) => {
        if (patternRefs[i].current) {
          drawPaletteTilesCanvas(patternRefs[i].current, pat, ABSTRACTION_2AFC_SIZE);
        }
      });
    }
  }, [question.palettePatternOptions]);
~~~~~
~~~~~typescript.new
  const patternRefs = [patternCanvasRef0, patternCanvasRef1, patternCanvasRef2, patternCanvasRef3];

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection when question changes
  useEffect(() => {
    setSelectedIdx(null);
  }, [question.id]);

  useEffect(() => {
    if (question.palettePatternOptions) {
      const refs = [patternCanvasRef0, patternCanvasRef1, patternCanvasRef2, patternCanvasRef3];
      question.palettePatternOptions.forEach((pat, i) => {
        const canvas = refs[i]?.current;
        if (canvas) {
          drawPaletteTilesCanvas(canvas, pat, ABSTRACTION_2AFC_SIZE);
        }
      });
    }
  }, [question.palettePatternOptions]);
~~~~~

#### Acts 2: 修复 negativeSpace 目录下各视图组件的 Hook 依赖

~~~~~act
patch_file
src/components/negativeSpace/AreaComparison2AfcView.tsx
~~~~~
~~~~~typescript.old
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  useEffect(() => {
~~~~~
~~~~~typescript.new
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection when question changes
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  useEffect(() => {
~~~~~

~~~~~act
patch_file
src/components/negativeSpace/RatioEstimationView.tsx
~~~~~
~~~~~typescript.old
    onValChange: setCurrentVal,
  });

  useEffect(() => {
    setCurrentVal(50.0);
    setHoverVal(null);
  }, [question.id, setHoverVal]);

  useEffect(() => {
~~~~~
~~~~~typescript.new
    onValChange: setCurrentVal,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset slider values when question changes
  useEffect(() => {
    setCurrentVal(50.0);
    setHoverVal(null);
  }, [question.id, setHoverVal]);

  useEffect(() => {
~~~~~

~~~~~act
patch_file
src/components/negativeSpace/ShapeMemory2AfcView.tsx
~~~~~
~~~~~typescript.old
  const matchOptionRefB = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setMatchPhase('stimulus');
    setSelectedMatchChoice(null);
  }, [question.id]);

  useEffect(() => {
~~~~~
~~~~~typescript.new
  const matchOptionRefB = useRef<HTMLCanvasElement | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset phase and selection when question changes
  useEffect(() => {
    setMatchPhase('stimulus');
    setSelectedMatchChoice(null);
  }, [question.id]);

  useEffect(() => {
~~~~~

~~~~~act
patch_file
src/components/negativeSpace/VertexFittingView.tsx
~~~~~
~~~~~typescript.old
  const [fittingHoverPoint, setFittingHoverPoint] = useState<Point | null>(null);

  useEffect(() => {
    setFittingHoverPoint(null);
  }, [question.id]);

  useEffect(() => {
~~~~~
~~~~~typescript.new
  const [fittingHoverPoint, setFittingHoverPoint] = useState<Point | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset hover point when question changes
  useEffect(() => {
    setFittingHoverPoint(null);
  }, [question.id]);

  useEffect(() => {
~~~~~

### 下一步建议

执行完上述改动后，建议重新运行校验：
- 执行 `npm run checkf` 或 `npx biome check .`，确认所有 8 处 lint 错误均已解决且零警告。
- 确认无误后，可在后续步骤提交本次改动。
