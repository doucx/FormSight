修复构建时的 TypeScript 未使用导入和变量错误。

## [WIP] fix(components): 移除多个视图组件中的未使用导入和变量

### 错误分析

在之前的重构中移除了对诊断栏 (`AnswerDiagnosticBar`) 和错误/成功图标 (`Check`, `X`) 的引用，以及部分组件未使用的 `userAnswer` 参数，导致 TypeScript 严格模式下编译报错（TS6133: 声明但从未读取）。

### 用户需求

修复所有 13 个 TypeScript 编译错误，确保 `npm run build` 能够干净、成功地通过。

### 评论

这是一个标准的清理性修复任务，确保类型检查通过。

### 目标
1. 移除 `TopDown2AfcView.tsx` 中未使用的 `AnswerDiagnosticBar`。
2. 移除 `TopDownPatternView.tsx` 中未使用的 `X`。
3. 移除 `AreaComparison2AfcView.tsx` 中未使用的 `X` 和 `userAnswer`。
4. 移除 `ShapeMemory2AfcView.tsx` 中未使用的 `X`。
5. 移除 `VertexFittingView.tsx` 中未使用的 `Check` 和 `X`。
6. 移除 `AlbersInductionView.tsx` 中未使用的 `Check` 和 `X`。
7. 移除 `Decontextual2AfcView.tsx` 中未使用的 `AnswerDiagnosticBar` 和 `userAnswer`。
8. 移除 `HueInductionView.tsx` 中未使用的 `X` 和 `userAnswer`。

### 基本原理
直接对相关 `.tsx` 文件执行精确的 `patch_file` 操作，剔除那些被 TypeScript 判定为 TS6133 的多余代码。

### 标签
#intent/fix #flow/ready #priority/high #comp/tests #scope/core #ai/instruct #task/domain/testing #task/object/typescript-errors #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 TopDown2AfcView 与 TopDownPatternView 的未使用导入

~~~~~act
patch_file
src/components/abstraction/TopDown2AfcView.tsx
~~~~~
~~~~~typescript.old
import { AnswerDiagnosticBar } from '../common/AnswerDiagnosticBar';
import { Choice2AfcContainer } from '../common/Choice2AfcContainer';
~~~~~
~~~~~typescript.new
import { Choice2AfcContainer } from '../common/Choice2AfcContainer';
~~~~~

~~~~~act
patch_file
src/components/abstraction/TopDownPatternView.tsx
~~~~~
~~~~~typescript.old
import { Check, Sparkles, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
~~~~~
~~~~~typescript.new
import { Check, Sparkles } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
~~~~~

#### Acts 2: 修复 AreaComparison2AfcView 与 ShapeMemory2AfcView 的未使用导入和参数

~~~~~act
patch_file
src/components/negativeSpace/AreaComparison2AfcView.tsx
~~~~~
~~~~~typescript.old
import { Check, Columns, X } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { drawPolygonCanvas } from '../../utils/canvas/drawPolygon';
import {
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
  TWO_AFC_CANVAS_SIZE,
} from '../../utils/negativeSpace';

interface AreaComparison2AfcViewProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}
~~~~~
~~~~~typescript.new
import { Check, Columns } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { drawPolygonCanvas } from '../../utils/canvas/drawPolygon';
import {
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
  TWO_AFC_CANVAS_SIZE,
} from '../../utils/negativeSpace';

interface AreaComparison2AfcViewProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer?: NegativeSpaceHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}
~~~~~

~~~~~act
patch_file
src/components/negativeSpace/ShapeMemory2AfcView.tsx
~~~~~
~~~~~typescript.old
import { Check, Sparkles, X } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
~~~~~
~~~~~typescript.new
import { Check, Sparkles } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
~~~~~

#### Acts 3: 修复 VertexFittingView 与 AlbersInductionView 的未使用导入

~~~~~act
patch_file
src/components/negativeSpace/VertexFittingView.tsx
~~~~~
~~~~~typescript.old
import { Check, Columns, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
~~~~~
~~~~~typescript.new
import { Columns } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
~~~~~

~~~~~act
patch_file
src/components/relativeColor/AlbersInductionView.tsx
~~~~~
~~~~~typescript.old
import { Check, Eye, X } from 'lucide-preact';
import { hsvToHex } from '../../utils/colorUtils';
~~~~~
~~~~~typescript.new
import { Eye } from 'lucide-preact';
import { hsvToHex } from '../../utils/colorUtils';
~~~~~

#### Acts 4: 修复 Decontextual2AfcView 与 HueInductionView 的未使用导入和参数

~~~~~act
patch_file
src/components/relativeColor/Decontextual2AfcView.tsx
~~~~~
~~~~~typescript.old
import { Eye } from 'lucide-preact';
import { hsvToHex } from '../../utils/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../../utils/relativeColor';
import { AnswerDiagnosticBar } from '../common/AnswerDiagnosticBar';
import { Choice2AfcContainer } from '../common/Choice2AfcContainer';

interface Decontextual2AfcViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
  selectedChoice: 'A' | 'B' | null;
  onSelectChoice: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}
~~~~~
~~~~~typescript.new
import { Eye } from 'lucide-preact';
import { hsvToHex } from '../../utils/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../../utils/relativeColor';
import { Choice2AfcContainer } from '../common/Choice2AfcContainer';

interface Decontextual2AfcViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer?: RelativeColorHitResult | null;
  selectedChoice: 'A' | 'B' | null;
  onSelectChoice: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}
~~~~~

~~~~~act
patch_file
src/components/relativeColor/HueInductionView.tsx
~~~~~
~~~~~typescript.old
import { Check, Sparkles, X } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { hsvToHex } from '../../utils/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../../utils/relativeColor';

interface HueInductionViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
  onAnswer: (chosenColor: [number, number, number]) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}
~~~~~
~~~~~typescript.new
import { Check, Sparkles } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { hsvToHex } from '../../utils/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../../utils/relativeColor';

interface HueInductionViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer?: RelativeColorHitResult | null;
  onAnswer: (chosenColor: [number, number, number]) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}
~~~~~

### 下一步建议

- 运行 `npm run build` 验证所有 TypeScript 错误已完全消除。
