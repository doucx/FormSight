我已经定位并分析了报错原因：`NegativeSpaceCanvas.tsx` 中存在重复导入、未使用图标以及函数作用域导致 Biome lint 触发 hook 依赖警告；`negativeSpaceUtils.test.ts` 中存在可选字段的可空性类型检查问题。我将为你生成修复方案。

## [WIP] fix: 修复 NegativeSpace 相关的重复导入、Lint 与类型错误

### 错误分析

1. **`NegativeSpaceCanvas.tsx` 重复导入与未引用图标**:
   - `NEGATIVE_SPACE_CANVAS_SIZE`、`NegativeSpaceHitResult` 和 `NegativeSpaceQuestionData` 在头部被重复 `import` 两次，导致 TypeScript 报 `TS2300` 重复声明错误以及 Biome 的 `noRedeclare` 警告。
   - `Sparkles` 图标被导入但未在组件中使用，导致 `TS6133` 未使用声明警告。
2. **`NegativeSpaceCanvas.tsx` Hook 依赖警告**:
   - `drawPolygonCanvas` 作为组件内部未缓存的闭包函数，在 `useEffect` 中被调用触发 `useExhaustiveDependencies`。由于其不依赖任何组件内部 state，应直接提取至组件作用域之外作为纯函数。
   - `handleSelectChoice` 被 `useEffect` 引用但未包含在依赖列表中，需要使用 `useCallback` 包装并补充依赖项。
3. **`src/utils/__tests__/negativeSpaceUtils.test.ts` 可空类型检查报错**:
   - `NegativeSpaceQuestionData` 类型的 `positiveArea` 和 `negativeArea` 字段为可选属性（针对单图模式），在测试断言加法计算时未进行非空断言，导致 TypeScript 报 `TS18048`。

### 用户需求

修复 `npm run checkf` 与 `npm run build` 报告的所有 Lint 和 TypeScript 编译错误，确保代码检查与构建顺利通过。

### 评论

这是典型的重构合并遗留问题。清理冗余导入、将无状态绘图辅助函数提升至模块顶层、规范 Hook 依赖以及补全测试断言的类型安全保护，能显著提升模块的健壮性。

### 目标

1. 清理 `src/components/NegativeSpaceCanvas.tsx` 的冗余 import 与未使用变量。
2. 将 `drawPolygonCanvas` 提取为模块级纯函数，使用 `useCallback` 封装 `handleSelectChoice` 并补齐 Hook 依赖。
3. 修复 `src/utils/__tests__/negativeSpaceUtils.test.ts` 中的 `undefined` 类型保护。

### 基本原理

1. 合并 `../utils/negativeSpaceUtils` 模块的命名导入与类型导入，移除无用 `Sparkles`。
2. 将 Canvas 绘图辅助函数移至组件函数外部，避免闭包重分配与 hook 依赖漂移。
3. 对测试用例中的可选数值字段添加非空断言 `!`，确保 TypeScript 严格类型检查通过。

### 标签

#intent/fix #flow/ready #priority/high #comp/runtime #scope/core #ai/instruct #task/domain/testing #task/object/lint-and-typecheck #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 `NegativeSpaceCanvas.tsx` 的导入与组件内函数依赖

我们将清理重复的导入语句、移除未引用的 `Sparkles`，并将 `drawPolygonCanvas` 提取至组件外，同时使用 `useCallback` 规范化回调。

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
import { useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../hooks/useTrackPointer';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../utils/negativeSpaceUtils';

import { Check, Columns, Sparkles, X } from 'lucide-preact';
import type { Point } from '../types';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
  TWO_AFC_CANVAS_SIZE,
} from '../utils/negativeSpaceUtils';

interface NegativeSpaceCanvasProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (val: number | 'A' | 'B') => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
}

export function NegativeSpaceCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
}: NegativeSpaceCanvasProps) {
  const is2AFC = question.mode === 'AREA_COMPARISON_2AFC';

  // === 1. 单图滑块模式状态 ===
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentVal, setCurrentVal] = useState<number>(50.0);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 100,
    step: 0.1,
    disabled: disabled || showAnswer,
    onValChange: setCurrentVal,
  });

  // === 2. 2AFC 模式专属画布与状态 ===
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  // 切换题目时重置状态
  useEffect(() => {
    if (question.id) {
      setCurrentVal(50.0);
      setHoverVal(null);
      setSelectedChoice(null);
    }
  }, [question.id, setHoverVal]);

  // 辅助绘图函数：在给定 canvas 上绘制多边形正形与白色负形底
  const drawPolygonCanvas = (
    canvas: HTMLCanvasElement | null,
    vertices: Point[] | undefined,
    size: number,
    isHighlighted?: boolean,
  ) => {
    if (!canvas || !vertices || vertices.length < 3) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清屏绘制纯白底色（白色留白即负形）
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    // 绘制正形多边形
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = '#0F172A'; // Slate-900 黑色正形
    ctx.fill();

    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 高亮加粗外边框反馈
    if (isHighlighted) {
      ctx.strokeStyle = '#22C55E';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  // 渲染单图滑块 Canvas
  useEffect(() => {
    if (!is2AFC && question.vertices) {
      drawPolygonCanvas(
        canvasRef.current,
        question.vertices,
        NEGATIVE_SPACE_CANVAS_SIZE,
        showAnswer && userAnswer?.isHit,
      );
    }
  }, [is2AFC, question.vertices, showAnswer, userAnswer]);

  // 渲染 2AFC 双 Canvas
  useEffect(() => {
    if (is2AFC) {
      drawPolygonCanvas(canvasRefA.current, question.verticesA, TWO_AFC_CANVAS_SIZE);
      drawPolygonCanvas(canvasRefB.current, question.verticesB, TWO_AFC_CANVAS_SIZE);
    }
  }, [is2AFC, question.verticesA, question.verticesB]);

  // 处理 2AFC 点击选择
  const handleSelectChoice = (choice: 'A' | 'B') => {
    if (disabled || showAnswer) return;
    setSelectedChoice(choice);
    onAnswer(choice);
  };

  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || showAnswer) return;

      if (is2AFC) {
        if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          handleSelectChoice('A');
        } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          handleSelectChoice('B');
        }
      } else {
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          onAnswer(currentVal);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [is2AFC, disabled, showAnswer, currentVal, onAnswer]);
~~~~~
~~~~~typescript.new
import { Check, Columns, X } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../hooks/useTrackPointer';
import type { Point } from '../types';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
  TWO_AFC_CANVAS_SIZE,
} from '../utils/negativeSpaceUtils';

interface NegativeSpaceCanvasProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (val: number | 'A' | 'B') => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
}

// 辅助绘图函数：在给定 canvas 上绘制多边形正形与白色负形底
function drawPolygonCanvas(
  canvas: HTMLCanvasElement | null,
  vertices: Point[] | undefined,
  size: number,
  isHighlighted?: boolean,
) {
  if (!canvas || !vertices || vertices.length < 3) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 清屏绘制纯白底色（白色留白即负形）
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // 绘制正形多边形
  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    ctx.lineTo(vertices[i].x, vertices[i].y);
  }
  ctx.closePath();

  ctx.fillStyle = '#0F172A'; // Slate-900 黑色正形
  ctx.fill();

  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 高亮加粗外边框反馈
  if (isHighlighted) {
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

export function NegativeSpaceCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
}: NegativeSpaceCanvasProps) {
  const is2AFC = question.mode === 'AREA_COMPARISON_2AFC';

  // === 1. 单图滑块模式状态 ===
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentVal, setCurrentVal] = useState<number>(50.0);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 100,
    step: 0.1,
    disabled: disabled || showAnswer,
    onValChange: setCurrentVal,
  });

  // === 2. 2AFC 模式专属画布与状态 ===
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  // 切换题目时重置状态
  useEffect(() => {
    if (question.id) {
      setCurrentVal(50.0);
      setHoverVal(null);
      setSelectedChoice(null);
    }
  }, [question.id, setHoverVal]);

  // 渲染单图滑块 Canvas
  useEffect(() => {
    if (!is2AFC && question.vertices) {
      drawPolygonCanvas(
        canvasRef.current,
        question.vertices,
        NEGATIVE_SPACE_CANVAS_SIZE,
        showAnswer && userAnswer?.isHit,
      );
    }
  }, [is2AFC, question.vertices, showAnswer, userAnswer]);

  // 渲染 2AFC 双 Canvas
  useEffect(() => {
    if (is2AFC) {
      drawPolygonCanvas(canvasRefA.current, question.verticesA, TWO_AFC_CANVAS_SIZE);
      drawPolygonCanvas(canvasRefB.current, question.verticesB, TWO_AFC_CANVAS_SIZE);
    }
  }, [is2AFC, question.verticesA, question.verticesB]);

  // 处理 2AFC 点击选择
  const handleSelectChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelectedChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );

  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || showAnswer) return;

      if (is2AFC) {
        if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          handleSelectChoice('A');
        } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          handleSelectChoice('B');
        }
      } else {
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          onAnswer(currentVal);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [is2AFC, disabled, showAnswer, currentVal, onAnswer, handleSelectChoice]);
~~~~~

#### Acts 2: 修复 `negativeSpaceUtils.test.ts` 中的可选字段断言

为 `positiveArea` 和 `negativeArea` 添加非空断言，消除 TypeScript 编译错误。

~~~~~act
patch_file
src/utils/__tests__/negativeSpaceUtils.test.ts
~~~~~
~~~~~typescript.old
    expect(q.positiveArea + q.negativeArea).toBeCloseTo(q.canvasArea, -1);
~~~~~
~~~~~typescript.new
    expect(q.positiveArea! + q.negativeArea!).toBeCloseTo(q.canvasArea, -1);
~~~~~

### 下一步建议

1. 执行 `npm run checkf` 与 `npm run build` 验证全部 Lint 规则与 TypeScript 编译是否通过。
2. 运行 `npm run test` 确保所有单元测试用例均顺利通过。
3. 验证无误后，如需提交请告知，我将生成专门的 `[COMMIT]` 计划。
