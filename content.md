收到报告的类型与静态分析错误信息。我们已完整分析了问题根源：包括 `SliderTrack` 中 `trackRef` 的类型声明与 Preact `Ref<HTMLDivElement>` 的类型不匹配导致 TypeScript 编译报错，以及 18 个卡片视图组件中用于在 `question.id` 发生变化时重置本地状态的 `useEffect` 被 Biome 的 `useExhaustiveDependencies` 规则判定为冗余依赖。

我将生成一个计划修复上述所有类型错误与 linter 校验报警。

## [WIP] fix: 修复 SliderTrack 类型签名与卡片组件 useEffect 依赖校验

### 错误分析

1. **TypeScript 类型错误 (`TS2322`)**:
   - 在 `src/components/common/SliderTrack.tsx` 中，`SliderTrackProps.trackRef` 被声明为 `RefObject<HTMLDivElement | null> | undefined`。
   - 但在 JSX 中传递给内部 `<div ref={trackRef}>` 时，Preact JSX 要求的属性类型为 `Ref<HTMLDivElement> | undefined`（其中 `RefObject<T>` 约定其 `current` 为 `T`，导致 `HTMLDivElement | null` 无法直接兼容 `RefObject<HTMLDivElement>`）。
   - 解决方案是将 `trackRef` 的类型改为 Preact 标准的 `Ref<HTMLDivElement>`。

2. **Biome 依赖项多余报错 (`useExhaustiveDependencies`)**:
   - 在 18 个卡片组件视图中，组件定义了仅用于在题目切换（`question.id` 变更）时重置选中项、滑块值及悬停状态的 `useEffect` 回调函数。
   - 由于函数体内并未直接读取 `question.id` 的值，Biome 静态分析器将其视为“不必要的依赖”，抛出 18 项阻塞性错误。
   - 遵照项目中 `PerspPropDivisionView` 和 `PerspPropMigrationView` 的既有规范，为这些重置用的 `useEffect` 添加 `// biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question` 抑制标注。

### 用户需求

消除代码库中的 1 个 TypeScript 编译错误与 18 个 Biome Linter 报错，保证 `tsc` 和 `biome check` 完全通过。

### 评论

这是一个典型的 React/Preact 生态中的“重置 Effect（Reset on key change）”模式。通过标准化 `SliderTrack` 的 Preact Ref 类型并统一添加规范的 biome 忽略声明，可以在不破坏现有卡片状态生命周期的情况下让 CI 检查绿标通过。

### 目标

1. 修改 `src/components/common/SliderTrack.tsx`，将 `trackRef` 类型由 `RefObject<HTMLDivElement | null>` 改为 `Ref<HTMLDivElement>`。
2. 为 18 个卡片视图组件中重置状态的 `useEffect` 统一添加 `// biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question`。

### 基本原理

通过改写 `SliderTrackProps` 中的属性类型使其与 Preact 的 DOM 节点 Ref 契约完全一致；同时通过明确标注 biome 规则忽略注释，告知代码检查器该依赖项是显式的“换题触发器”，保持状态生命周期的正确性。

### 标签

#intent/fix #flow/ready #priority/high #comp/build #concept/executor #scope/core #ai/instruct #task/domain/testing #task/object/lint-and-typecheck #task/action/bug-fix #task/state/begin #task/status/active

---

### Script

#### Acts 1: 修复 SliderTrack 组件的 Ref 类型签名

修改 `SliderTrack.tsx` 中的 `trackRef` 类型声明，使用 Preact 标准的 `Ref<HTMLDivElement>`。

~~~~~act
patch_file
src/components/common/SliderTrack.tsx
~~~~~
~~~~~typescript
import type { JSX, RefObject } from 'preact';

export interface SliderTrackProps {
  trackRef?: RefObject<HTMLDivElement | null>;
~~~~~
~~~~~typescript
import type { JSX, Ref } from 'preact';

export interface SliderTrackProps {
  trackRef?: Ref<HTMLDivElement>;
~~~~~

#### Acts 2: 修复节奏与黑白 (rhythm_and_notan) 相关卡片的依赖报警

为 `abs_gesture_axis`、`abs_notan_threshold`、`abs_td_gesture_2afc`、`abs_td_notan_2afc` 和 `fractal_edge_roughness` 卡片中的重置 hook 添加注释。

~~~~~act
patch_file
src/cards/abs_gesture_axis/AbsGestureAxisView.tsx
~~~~~
~~~~~typescript
  useEffect(() => {
    setCurrentVal(90);
    setHoverVal(null);
  }, [question.id, setHoverVal]);
~~~~~
~~~~~typescript
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setCurrentVal(90);
    setHoverVal(null);
  }, [question.id, setHoverVal]);
~~~~~

~~~~~act
patch_file
src/cards/abs_notan_threshold/AbsNotanThresholdView.tsx
~~~~~
~~~~~typescript
  useEffect(() => {
    setCurrentVal(50);
    setHoverVal(null);
  }, [question.id, setHoverVal]);
~~~~~
~~~~~typescript
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setCurrentVal(50);
    setHoverVal(null);
  }, [question.id, setHoverVal]);
~~~~~

~~~~~act
patch_file
src/cards/abs_td_gesture_2afc/AbsTdGesture2afcView.tsx
~~~~~
~~~~~typescript
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);
~~~~~
~~~~~typescript
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);
~~~~~

~~~~~act
patch_file
src/cards/abs_td_notan_2afc/AbsTdNotan2afcView.tsx
~~~~~
~~~~~typescript
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);
~~~~~
~~~~~typescript
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);
~~~~~

~~~~~act
patch_file
src/cards/fractal_edge_roughness/FractalEdgeRoughnessView.tsx
~~~~~
~~~~~typescript
  useEffect(() => {
    setCurrentH(0.5);
    setHoverVal(null);
  }, [question.id, setHoverVal]);
~~~~~
~~~~~typescript
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setCurrentH(0.5);
    setHoverVal(null);
  }, [question.id, setHoverVal]);
~~~~~

#### Acts 3: 修复色彩感知 (color_and_value) 相关卡片的依赖报警

为 `abs_palette_clustering`、`abs_td_palette_2afc`、`rel_decontextual_2afc` 添加注释。

~~~~~act
patch_file
src/cards/abs_palette_clustering/AbsPaletteClusteringView.tsx
~~~~~
~~~~~typescript
  useEffect(() => {
    setSelectedIndex(null);
  }, [question.id]);
~~~~~
~~~~~typescript
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setSelectedIndex(null);
  }, [question.id]);
~~~~~

~~~~~act
patch_file
src/cards/abs_td_palette_2afc/AbsTdPalette2afcView.tsx
~~~~~
~~~~~typescript
  useEffect(() => {
    setSelectedIndex(null);
  }, [question.id]);
~~~~~
~~~~~typescript
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setSelectedIndex(null);
  }, [question.id]);
~~~~~

~~~~~act
patch_file
src/cards/rel_decontextual_2afc/RelDecontextual2AfcView.tsx
~~~~~
~~~~~typescript
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);
~~~~~
~~~~~typescript
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);
~~~~~

#### Acts 4: 修复形体与比例 (form_and_proportion) 相关卡片的依赖报警

为 `abs_polygon_decimation`、`abs_td_hull_2afc`、`angle_comparison_2afc`、`angle_estimation`、`angle_parallel_2afc`、`neg_area_comparison_2afc`、`neg_ratio_estimation`、`neg_shape_match_2afc` 添加注释。

~~~~~act
patch_file
src/cards/abs_polygon_decimation/AbsPolygonDecimationView.tsx
~~~~~
~~~~~typescript
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);
~~~~~
~~~~~typescript
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);
~~~~~

~~~~~act
patch_file
src/cards/abs_td_hull_2afc/AbsTdHull2afcView.tsx
~~~~~
~~~~~typescript
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);
~~~~~
~~~~~typescript
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);
~~~~~

~~~~~act
patch_file
src/cards/angle_comparison_2afc/AngleComparison2AfcView.tsx
~~~~~
~~~~~typescript
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);
~~~~~
~~~~~typescript
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);
~~~~~

~~~~~act
patch_file
src/cards/angle_estimation/AngleEstimationView.tsx
~~~~~
~~~~~typescript
  useEffect(() => {
    setCurrentVal(90);
    setHoverVal(null);
  }, [question.id, setHoverVal]);
~~~~~
~~~~~typescript
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setCurrentVal(90);
    setHoverVal(null);
  }, [question.id, setHoverVal]);
~~~~~

~~~~~act
patch_file
src/cards/angle_parallel_2afc/AngleParallel2AfcView.tsx
~~~~~
~~~~~typescript
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);
~~~~~
~~~~~typescript
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);
~~~~~

~~~~~act
patch_file
src/cards/neg_area_comparison_2afc/NegAreaComparison2AfcView.tsx
~~~~~
~~~~~typescript
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);
~~~~~
~~~~~typescript
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);
~~~~~

~~~~~act
patch_file
src/cards/neg_ratio_estimation/NegRatioEstimationView.tsx
~~~~~
~~~~~typescript
  useEffect(() => {
    setCurrentVal(50.0);
    setHoverVal(null);
  }, [question.id, setHoverVal]);
~~~~~
~~~~~typescript
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setCurrentVal(50.0);
    setHoverVal(null);
  }, [question.id, setHoverVal]);
~~~~~

~~~~~act
patch_file
src/cards/neg_shape_match_2afc/NegShapeMatch2AfcView.tsx
~~~~~
~~~~~typescript
  useEffect(() => {
    setMatchPhase('stimulus');
    setSelectedChoice(null);
  }, [question.id]);
~~~~~
~~~~~typescript
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setMatchPhase('stimulus');
    setSelectedChoice(null);
  }, [question.id]);
~~~~~

#### Acts 5: 修复空间结构与透视 (spatial_structure) 相关卡片的依赖报警

为 `persp_gestalt_continuation` 与 `persp_vp_convergence` 添加注释。

~~~~~act
patch_file
src/cards/persp_gestalt_continuation/PerspGestaltContinuationView.tsx
~~~~~
~~~~~typescript
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);
~~~~~
~~~~~typescript
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);
~~~~~

~~~~~act
patch_file
src/cards/persp_vp_convergence/PerspVpConvergenceView.tsx
~~~~~
~~~~~typescript
  useEffect(() => {
    setCurrentVal(180);
    setHoverVal(null);
  }, [question.id, setHoverVal]);
~~~~~
~~~~~typescript
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset state on new question
  useEffect(() => {
    setCurrentVal(180);
    setHoverVal(null);
  }, [question.id, setHoverVal]);
~~~~~

### 下一步建议

1. **执行验证**: 执行 `pnpm run check` (或 `biome check` 与 `tsc --noEmit`) 确认所有 18 个 linter 报警以及 `SliderTrack.tsx` 的类型错误已完全消除。
2. **提交代码**: 确认验证通过后，可生成独立的 `[COMMIT]` 计划将此次修复提交到 git 仓库。
