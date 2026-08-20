这里是修复 TypeScript 编译报错的完整计划。

## [WIP] fix: 修复构建阶段 TypeScript 缺失导入及未使用变量错误

### 错误分析

在执行 `npm run build` (`tsc && vite build`) 时，TypeScript 编译器检查出 21 处错误，涉及 4 个组件文件：
1. **`src/components/AbstractionCanvas.tsx`**:
   - 缺少 `useTrackPointer` hook 导入及 `X` 图标导入。
   - `onCommit` 回调参数 `committedVal` 缺少显式类型注解。
   - 未使用的组件导入 `ContinuousTrackPanel`。
2. **`src/components/NegativeSpaceCanvas.tsx`**:
   - 缺少 `useTrackPointer` hook 导入及 `Check`, `X` 图标导入。
   - 未使用的组件导入 `AnswerDiagnosticBar`, `Choice2AfcContainer`, `ContinuousTrackPanel`。
3. **`src/components/RelativeColorCanvas.tsx`**:
   - 缺少 `Check` 与 `X` 图标导入。
4. **`src/components/StarCanvas.tsx`**:
   - 存在声明但未读取的局部变量 `hoverRadius`（因已在 `renderInteractivePointGrid` 内部统一处理）。

### 用户需求

修复所有 TypeScript 类型与语法错误，使 `npm run build` 可以顺利编译通过并生成构建产物。

### 评论

这些错误属于重构组件解耦过程中的残留引用与漏导符号问题，通过精准修正 import 声明、参数类型标注并移除冗余未使用项即可完全解决。

### 目标

1. 补齐 `AbstractionCanvas.tsx`、`NegativeSpaceCanvas.tsx`、`RelativeColorCanvas.tsx` 中的 Hook 与 Lucide 图标导入。
2. 为 `onCommit` 参数添加 `number` 类型标注。
3. 清理各组件中未使用的引用与变量声明。

### 基本原理

通过 `patch_file` 修正各组件顶部的 import 声明，补齐缺少的类型注解，并移除未使用的变量与模块导入，以满足 TypeScript 的 `strict` 及 `noUnusedLocals` 检查规则。

### 标签

#intent/fix #flow/ready #priority/high #comp/ui #concept/ui #scope/core #ai/instruct #task/domain/build #task/object/typescript-compilation #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 修复 `AbstractionCanvas.tsx` 的导入与类型

补齐 `useTrackPointer` 和 `X` 图标导入，添加 `committedVal: number` 类型注解，并移除未使用的 `ContinuousTrackPanel`。

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript.old
import { Check, Columns, Eye, Sparkles } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { Point } from '../types';
import {
  ABSTRACTION_2AFC_SIZE,
  ABSTRACTION_CANVAS_SIZE,
  ABSTRACTION_THUMB_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
  type NotanShape,
  type PaletteTile,
} from '../utils/abstractionUtils';
import { drawPolygonCanvas } from '../utils/canvas/drawPolygon';
import { hsvToHex } from '../utils/colorUtils';
import { AnswerDiagnosticBar } from './common/AnswerDiagnosticBar';
import { Choice2AfcContainer } from './common/Choice2AfcContainer';
import { ContinuousTrackPanel } from './common/ContinuousTrackPanel';
~~~~~
~~~~~typescript.new
import { Check, Columns, Eye, Sparkles, X } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../hooks/useTrackPointer';
import type { Point } from '../types';
import {
  ABSTRACTION_2AFC_SIZE,
  ABSTRACTION_CANVAS_SIZE,
  ABSTRACTION_THUMB_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
  type NotanShape,
  type PaletteTile,
} from '../utils/abstractionUtils';
import { drawPolygonCanvas } from '../utils/canvas/drawPolygon';
import { hsvToHex } from '../utils/colorUtils';
import { AnswerDiagnosticBar } from './common/AnswerDiagnosticBar';
import { Choice2AfcContainer } from './common/Choice2AfcContainer';
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript.old
  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: mode === 'GESTURE_AXIS' ? 180 : 100,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: setSliderVal,
    onCommit: (committedVal) => {
      if (mode === 'GESTURE_AXIS' && !disabled && !showAnswer) {
        onAnswer(committedVal);
      }
    },
  });
~~~~~
~~~~~typescript.new
  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: mode === 'GESTURE_AXIS' ? 180 : 100,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: setSliderVal,
    onCommit: (committedVal: number) => {
      if (mode === 'GESTURE_AXIS' && !disabled && !showAnswer) {
        onAnswer(committedVal);
      }
    },
  });
~~~~~

#### Acts 2: 修复 `NegativeSpaceCanvas.tsx` 的导入与未引用模块

补齐 `Check`, `X`, `useTrackPointer` 导入，并清理未使用的组件导入。

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
import { Columns, Sparkles } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { Point } from '../types';
import { drawPolygonCanvas } from '../utils/canvas/drawPolygon';
import {
  findNearestGridPoint,
  getDynamicCrosshairMetrics,
  getDynamicDotRadius,
} from '../utils/geometry';
import {
  FITTING_CANVAS_SIZE,
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
  TWO_AFC_CANVAS_SIZE,
} from '../utils/negativeSpaceUtils';
import { AnswerDiagnosticBar } from './common/AnswerDiagnosticBar';
import { Choice2AfcContainer } from './common/Choice2AfcContainer';
import { ContinuousTrackPanel } from './common/ContinuousTrackPanel';
~~~~~
~~~~~typescript.new
import { Check, Columns, Sparkles, X } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../hooks/useTrackPointer';
import type { Point } from '../types';
import { drawPolygonCanvas } from '../utils/canvas/drawPolygon';
import {
  findNearestGridPoint,
  getDynamicCrosshairMetrics,
  getDynamicDotRadius,
} from '../utils/geometry';
import {
  FITTING_CANVAS_SIZE,
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
  TWO_AFC_CANVAS_SIZE,
} from '../utils/negativeSpaceUtils';
~~~~~

#### Acts 3: 修复 `RelativeColorCanvas.tsx` 的图标导入

补齐 `Check`, `X` 图标导入。

~~~~~act
patch_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~typescript.old
import { ArrowRight, Eye } from 'lucide-preact';
~~~~~
~~~~~typescript.new
import { ArrowRight, Check, Eye, X } from 'lucide-preact';
~~~~~

#### Acts 4: 清理 `StarCanvas.tsx` 中的未使用变量

移除 `StarCanvas.tsx` 中声明但未读取的 `hoverRadius`。

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript.old
  // === 绘图主逻辑 ===
  useEffect(() => {
    const dotRadius = getDynamicDotRadius(question.distractorPoints);
    const hoverRadius = Math.max(2.5, dotRadius * 1.6);

    // 1. 渲染左侧参考图 (Reference Canvas)
~~~~~
~~~~~typescript.new
  // === 绘图主逻辑 ===
  useEffect(() => {
    const dotRadius = getDynamicDotRadius(question.distractorPoints);

    // 1. 渲染左侧参考图 (Reference Canvas)
~~~~~

### 下一步建议

1. **执行构建验证**: 运行 `npm run build`，确认 TypeScript 类型检查通过并成功完成 Vite 产物构建。
2. **运行测试套件**: 运行 `npm run test`，验证所有既有单元测试是否正常通过。
3. **提交变更**: 在验证构建与测试全部通过后，生成一个 `[COMMIT]` 计划以归档此次修复。
