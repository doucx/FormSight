我们开始实施该架构重构方案。我们将通过在各卡片 `renderCanvas` 入口注入 `key={question.id}`，借助虚拟 DOM 声明式 Key 机制自动重置组件生命周期；同时彻底删除 18 个卡片视图中用于命令式重置状态的 `useEffect`，根除 Biome 报警，并修复 `SliderTrack.tsx` 的 Ref 类型声明。

## [WIP] refactor: 重构卡片题目生命周期机制并修复 SliderTrack 类型声明

### 用户需求

彻底移除利用 `useEffect` 手动重置卡片状态的反模式，改用声明式 `key={question.id}` 重置机制，完全消除 Biome 的 18 处 `useExhaustiveDependencies` 报警，且不新增任何 ignore 注释；同时修复 `SliderTrack` 的 TypeScript 类型编译报错。

### 评论

采用 `key` 进行组件状态重置是 React/Preact 的标准最佳实践。该重构不仅精简了代码，消除了换题时的状态污染风险，还避免了先用旧状态渲染一帧再触发 effect 触发二次重渲染的双重渲染开销。

### 目标

1. 修复 `src/components/common/SliderTrack.tsx` 中 `trackRef` 的类型签名，使其匹配 Preact `Ref<HTMLDivElement>`。
2. 在全部 18 个相关卡片的 `index.tsx` 中，为 `<*View>` 根节点赋予 `key={question.id}`。
3. 在全部 18 个卡片视图组件中，彻底删除监听 `question.id` 的重置 `useEffect` 及无用的导入与参数。

### 基本原理

1. **生命周期隔离**: 当 Preact 在同一个虚拟 DOM 槽位遇到不同的 `key` 时，会自动卸载旧组件实例并重新挂载新实例，所有 `useState` 自动回到纯净的初始值。
2. **零副作用与零标记**: 由于无需在 effect 内监听 `question.id`，根本不会触发 Biome 的依赖项分析规则，代码保持整洁标准。

### 标签

#intent/refine #flow/ready #priority/high #comp/build #concept/state #scope/core #ai/instruct #task/domain/testing #task/object/lint-and-typecheck #task/action/refactor #task/state/begin #task/status/active

---

### Script

#### Acts 1: 修复 SliderTrack 组件的 Ref 类型声明

将 `trackRef` 的属性类型修正为 Preact 的 `Ref<HTMLDivElement>`。

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

#### Acts 2: 重构节奏与黑白 (rhythm_and_notan) 领域卡片

为 `abs_gesture_axis`、`abs_notan_threshold`、`abs_td_gesture_2afc`、`abs_td_notan_2afc`、`fractal_edge_roughness` 注入 `key={question.id}` 并移除重置 hook。

~~~~~act
patch_file
src/cards/abs_gesture_axis/index.tsx
~~~~~
~~~~~typescript
      renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
        <AbsGestureAxisView
          question={question}
~~~~~
~~~~~typescript
      renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
        <AbsGestureAxisView
          key={question.id}
          question={question}
~~~~~

~~~~~act
patch_file
src/cards/abs_gesture_axis/AbsGestureAxisView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { useState } from 'preact/hooks';
~~~~~

~~~~~act
patch_file
src/cards/abs_gesture_axis/AbsGestureAxisView.tsx
~~~~~
~~~~~typescript
  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 180,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });

  useEffect(() => {
    setCurrentVal(90);
    setHoverVal(null);
  }, [question.id, setHoverVal]);

  const targetVal = question.targetAngleDeg;
~~~~~
~~~~~typescript
  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    max: 180,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });

  const targetVal = question.targetAngleDeg;
~~~~~

~~~~~act
patch_file
src/cards/abs_notan_threshold/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsNotanThresholdView
        question={question}
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsNotanThresholdView
        key={question.id}
        question={question}
~~~~~

~~~~~act
patch_file
src/cards/abs_notan_threshold/AbsNotanThresholdView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { useState } from 'preact/hooks';
~~~~~

~~~~~act
patch_file
src/cards/abs_notan_threshold/AbsNotanThresholdView.tsx
~~~~~
~~~~~typescript
  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 100,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });

  useEffect(() => {
    setCurrentVal(50);
    setHoverVal(null);
  }, [question.id, setHoverVal]);

  const targetVal = question.idealNotanThreshold;
~~~~~
~~~~~typescript
  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    max: 100,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });

  const targetVal = question.idealNotanThreshold;
~~~~~

~~~~~act
patch_file
src/cards/abs_td_gesture_2afc/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsTdGesture2afcView
        question={question}
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsTdGesture2afcView
        key={question.id}
        question={question}
~~~~~

~~~~~act
patch_file
src/cards/abs_td_gesture_2afc/AbsTdGesture2afcView.tsx
~~~~~
~~~~~typescript
import { Check, Columns } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
~~~~~
~~~~~typescript
import { Check, Columns } from 'lucide-preact';
import { useState } from 'preact/hooks';
~~~~~

~~~~~act
patch_file
src/cards/abs_td_gesture_2afc/AbsTdGesture2afcView.tsx
~~~~~
~~~~~typescript
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  const handleSelect = (choice: 'A' | 'B') => {
~~~~~
~~~~~typescript
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  const handleSelect = (choice: 'A' | 'B') => {
~~~~~

~~~~~act
patch_file
src/cards/abs_td_notan_2afc/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsTdNotan2afcView
        question={question}
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsTdNotan2afcView
        key={question.id}
        question={question}
~~~~~

~~~~~act
patch_file
src/cards/abs_td_notan_2afc/AbsTdNotan2afcView.tsx
~~~~~
~~~~~typescript
import { Check, Columns } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
~~~~~
~~~~~typescript
import { Check, Columns } from 'lucide-preact';
import { useState } from 'preact/hooks';
~~~~~

~~~~~act
patch_file
src/cards/abs_td_notan_2afc/AbsTdNotan2afcView.tsx
~~~~~
~~~~~typescript
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  const handleSelect = (choice: 'A' | 'B') => {
~~~~~
~~~~~typescript
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  const handleSelect = (choice: 'A' | 'B') => {
~~~~~

~~~~~act
patch_file
src/cards/fractal_edge_roughness/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <FractalEdgeRoughnessView
        question={question}
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <FractalEdgeRoughnessView
        key={question.id}
        question={question}
~~~~~

~~~~~act
patch_file
src/cards/fractal_edge_roughness/FractalEdgeRoughnessView.tsx
~~~~~
~~~~~typescript
  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 1.0,
    step: 0.01,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentH(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });

  useEffect(() => {
    setCurrentH(0.5);
    setHoverVal(null);
  }, [question.id, setHoverVal]);

  // 1. 绘制目标边缘波形
~~~~~
~~~~~typescript
  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    max: 1.0,
    step: 0.01,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentH(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });

  // 1. 绘制目标边缘波形
~~~~~

#### Acts 3: 重构色彩感知 (color_and_value) 领域卡片

为 `abs_palette_clustering`、`abs_td_palette_2afc`、`rel_decontextual_2afc` 注入 `key={question.id}` 并移除重置 hook。

~~~~~act
patch_file
src/cards/abs_palette_clustering/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsPaletteClusteringView
        question={question}
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsPaletteClusteringView
        key={question.id}
        question={question}
~~~~~

~~~~~act
patch_file
src/cards/abs_palette_clustering/AbsPaletteClusteringView.tsx
~~~~~
~~~~~typescript
import { Check, Sparkles } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
~~~~~
~~~~~typescript
import { Check, Sparkles } from 'lucide-preact';
import { useState } from 'preact/hooks';
~~~~~

~~~~~act
patch_file
src/cards/abs_palette_clustering/AbsPaletteClusteringView.tsx
~~~~~
~~~~~typescript
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedIndex(null);
  }, [question.id]);

  const handleSelect = (idx: number) => {
~~~~~
~~~~~typescript
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSelect = (idx: number) => {
~~~~~

~~~~~act
patch_file
src/cards/abs_td_palette_2afc/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsTdPalette2afcView
        question={question}
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsTdPalette2afcView
        key={question.id}
        question={question}
~~~~~

~~~~~act
patch_file
src/cards/abs_td_palette_2afc/AbsTdPalette2afcView.tsx
~~~~~
~~~~~typescript
import { Check, Sparkles } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
~~~~~
~~~~~typescript
import { Check, Sparkles } from 'lucide-preact';
import { useState } from 'preact/hooks';
~~~~~

~~~~~act
patch_file
src/cards/abs_td_palette_2afc/AbsTdPalette2afcView.tsx
~~~~~
~~~~~typescript
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedIndex(null);
  }, [question.id]);

  const handleSelect = (idx: number) => {
~~~~~
~~~~~typescript
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSelect = (idx: number) => {
~~~~~

~~~~~act
patch_file
src/cards/rel_decontextual_2afc/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <RelDecontextual2AfcView
        question={question}
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <RelDecontextual2AfcView
        key={question.id}
        question={question}
~~~~~

~~~~~act
patch_file
src/cards/rel_decontextual_2afc/RelDecontextual2AfcView.tsx
~~~~~
~~~~~typescript
import { Check, Eye } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
~~~~~
~~~~~typescript
import { Check, Eye } from 'lucide-preact';
import { useState } from 'preact/hooks';
~~~~~

~~~~~act
patch_file
src/cards/rel_decontextual_2afc/RelDecontextual2AfcView.tsx
~~~~~
~~~~~typescript
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  const handleSelect = (choice: 'A' | 'B') => {
~~~~~
~~~~~typescript
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  const handleSelect = (choice: 'A' | 'B') => {
~~~~~

#### Acts 4: 重构形体与比例 (form_and_proportion) 领域卡片

为 `abs_polygon_decimation`、`abs_td_hull_2afc`、`angle_comparison_2afc`、`angle_estimation`、`angle_parallel_2afc`、`neg_area_comparison_2afc`、`neg_ratio_estimation`、`neg_shape_match_2afc` 注入 `key={question.id}` 并移除重置 hook。

~~~~~act
patch_file
src/cards/abs_polygon_decimation/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsPolygonDecimationView
        question={question}
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsPolygonDecimationView
        key={question.id}
        question={question}
~~~~~

~~~~~act
patch_file
src/cards/abs_polygon_decimation/AbsPolygonDecimationView.tsx
~~~~~
~~~~~typescript
import { Check, Columns } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
~~~~~
~~~~~typescript
import { Check, Columns } from 'lucide-preact';
import { useState } from 'preact/hooks';
~~~~~

~~~~~act
patch_file
src/cards/abs_polygon_decimation/AbsPolygonDecimationView.tsx
~~~~~
~~~~~typescript
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  const handleSelect = (choice: 'A' | 'B') => {
~~~~~
~~~~~typescript
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  const handleSelect = (choice: 'A' | 'B') => {
~~~~~

~~~~~act
patch_file
src/cards/abs_td_hull_2afc/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsTdHull2afcView
        question={question}
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AbsTdHull2afcView
        key={question.id}
        question={question}
~~~~~

~~~~~act
patch_file
src/cards/abs_td_hull_2afc/AbsTdHull2afcView.tsx
~~~~~
~~~~~typescript
import { Check, Columns } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
~~~~~
~~~~~typescript
import { Check, Columns } from 'lucide-preact';
import { useState } from 'preact/hooks';
~~~~~

~~~~~act
patch_file
src/cards/abs_td_hull_2afc/AbsTdHull2afcView.tsx
~~~~~
~~~~~typescript
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  const handleSelect = (choice: 'A' | 'B') => {
~~~~~
~~~~~typescript
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  const handleSelect = (choice: 'A' | 'B') => {
~~~~~

~~~~~act
patch_file
src/cards/angle_comparison_2afc/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <AngleComparison2AfcView
        question={question}
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <AngleComparison2AfcView
        key={question.id}
        question={question}
~~~~~

~~~~~act
patch_file
src/cards/angle_comparison_2afc/AngleComparison2AfcView.tsx
~~~~~
~~~~~typescript
import { Check, Columns } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
~~~~~
~~~~~typescript
import { Check, Columns } from 'lucide-preact';
import { useState } from 'preact/hooks';
~~~~~

~~~~~act
patch_file
src/cards/angle_comparison_2afc/AngleComparison2AfcView.tsx
~~~~~
~~~~~typescript
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  const handleSelect = (choice: 'A' | 'B') => {
~~~~~
~~~~~typescript
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  const handleSelect = (choice: 'A' | 'B') => {
~~~~~

~~~~~act
patch_file
src/cards/angle_estimation/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AngleEstimationView
        question={question}
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AngleEstimationView
        key={question.id}
        question={question}
~~~~~

~~~~~act
patch_file
src/cards/angle_estimation/AngleEstimationView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { useState } from 'preact/hooks';
~~~~~

~~~~~act
patch_file
src/cards/angle_estimation/AngleEstimationView.tsx
~~~~~
~~~~~typescript
  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 180,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });

  useEffect(() => {
    setCurrentVal(90);
    setHoverVal(null);
  }, [question.id, setHoverVal]);

  const targetVal = question.targetAngleDeg ?? 90;
~~~~~
~~~~~typescript
  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    max: 180,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });

  const targetVal = question.targetAngleDeg ?? 90;
~~~~~

~~~~~act
patch_file
src/cards/angle_parallel_2afc/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <AngleParallel2AfcView
        question={question}
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <AngleParallel2AfcView
        key={question.id}
        question={question}
~~~~~

~~~~~act
patch_file
src/cards/angle_parallel_2afc/AngleParallel2AfcView.tsx
~~~~~
~~~~~typescript
import { Check, Split } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
~~~~~
~~~~~typescript
import { Check, Split } from 'lucide-preact';
import { useState } from 'preact/hooks';
~~~~~

~~~~~act
patch_file
src/cards/angle_parallel_2afc/AngleParallel2AfcView.tsx
~~~~~
~~~~~typescript
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  const handleSelect = (choice: 'A' | 'B') => {
~~~~~
~~~~~typescript
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  const handleSelect = (choice: 'A' | 'B') => {
~~~~~

~~~~~act
patch_file
src/cards/neg_area_comparison_2afc/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <NegAreaComparison2AfcView
        question={question}
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <NegAreaComparison2AfcView
        key={question.id}
        question={question}
~~~~~

~~~~~act
patch_file
src/cards/neg_area_comparison_2afc/NegAreaComparison2AfcView.tsx
~~~~~
~~~~~typescript
import { Check, Columns } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
~~~~~
~~~~~typescript
import { Check, Columns } from 'lucide-preact';
import { useState } from 'preact/hooks';
~~~~~

~~~~~act
patch_file
src/cards/neg_area_comparison_2afc/NegAreaComparison2AfcView.tsx
~~~~~
~~~~~typescript
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  const handleSelect = (choice: 'A' | 'B') => {
~~~~~
~~~~~typescript
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  const handleSelect = (choice: 'A' | 'B') => {
~~~~~

~~~~~act
patch_file
src/cards/neg_ratio_estimation/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <NegRatioEstimationView
        question={question}
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <NegRatioEstimationView
        key={question.id}
        question={question}
~~~~~

~~~~~act
patch_file
src/cards/neg_ratio_estimation/NegRatioEstimationView.tsx
~~~~~
~~~~~typescript
import { Maximize2 } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
~~~~~
~~~~~typescript
import { Maximize2 } from 'lucide-preact';
import { useState } from 'preact/hooks';
~~~~~

~~~~~act
patch_file
src/cards/neg_ratio_estimation/NegRatioEstimationView.tsx
~~~~~
~~~~~typescript
  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 100,
    step: 0.1,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
  });

  useEffect(() => {
    setCurrentVal(50.0);
    setHoverVal(null);
  }, [question.id, setHoverVal]);

  const handleSubmit = () => {
~~~~~
~~~~~typescript
  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    max: 100,
    step: 0.1,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
  });

  const handleSubmit = () => {
~~~~~

~~~~~act
patch_file
src/cards/neg_shape_match_2afc/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <NegShapeMatch2AfcView
        question={question}
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <NegShapeMatch2AfcView
        key={question.id}
        question={question}
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

  useEffect(() => {
    if (matchPhase === 'stimulus' && !showAnswer) {
~~~~~
~~~~~typescript
  useEffect(() => {
    if (matchPhase === 'stimulus' && !showAnswer) {
~~~~~

#### Acts 5: 重构空间结构与透视 (spatial_structure) 领域卡片

为 `persp_gestalt_continuation` 与 `persp_vp_convergence` 注入 `key={question.id}` 并移除重置 hook。

~~~~~act
patch_file
src/cards/persp_gestalt_continuation/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <PerspGestaltContinuationView
        question={question}
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <PerspGestaltContinuationView
        key={question.id}
        question={question}
~~~~~

~~~~~act
patch_file
src/cards/persp_gestalt_continuation/PerspGestaltContinuationView.tsx
~~~~~
~~~~~typescript
import { Check, Eye } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
~~~~~
~~~~~typescript
import { Check, Eye } from 'lucide-preact';
import { useState } from 'preact/hooks';
~~~~~

~~~~~act
patch_file
src/cards/persp_gestalt_continuation/PerspGestaltContinuationView.tsx
~~~~~
~~~~~typescript
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  const handleSelect = (choice: 'A' | 'B') => {
~~~~~
~~~~~typescript
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  const handleSelect = (choice: 'A' | 'B') => {
~~~~~

~~~~~act
patch_file
src/cards/persp_vp_convergence/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <PerspVpConvergenceView
        question={question}
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <PerspVpConvergenceView
        key={question.id}
        question={question}
~~~~~

~~~~~act
patch_file
src/cards/persp_vp_convergence/PerspVpConvergenceView.tsx
~~~~~
~~~~~typescript
import { Sliders } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
~~~~~
~~~~~typescript
import { Sliders } from 'lucide-preact';
import { useState } from 'preact/hooks';
~~~~~

~~~~~act
patch_file
src/cards/persp_vp_convergence/PerspVpConvergenceView.tsx
~~~~~
~~~~~typescript
  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 360,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });

  useEffect(() => {
    setCurrentVal(180);
    setHoverVal(null);
  }, [question.id, setHoverVal]);

  const targetVal = question.targetAngleDeg ?? 0;
~~~~~
~~~~~typescript
  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    max: 360,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: (val) => setCurrentVal(val),
    onCommit: (val) => {
      if (!disabled && !showAnswer) onAnswer(val);
    },
  });

  const targetVal = question.targetAngleDeg ?? 0;
~~~~~

### 下一步建议

1. **执行构建与检查**: 运行项目中的代码检查命令（如 `pnpm run check` 或 `pnpm check`），验证 `tsc` 类型编译错误与 Biome 的全部 18 个 hook 依赖报错均已被彻底清除，且无新增报警。
2. **卡片交互与切题验证**: 启动开发服务器（`pnpm dev`），试玩任意连续调节滑块类卡片（如 `abs_gesture_axis`、`angle_estimation`）与多选类卡片（如 `abs_palette_clustering`），验证在切题时组件能够无缝重置初态且无闪烁。
3. **提交更动**: 验证无误后，生成 `[COMMIT]` 计划归档本次架构优化。
