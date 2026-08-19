我们将为正负形感知模块增加“负形轮廓记忆匹配 (SHAPE_MATCH_4AFC)”模式，涵盖自适应曝光倒计时、基于几何顶点微扰的相似干扰项生成算法、双阶段（展示与回忆）视图切换及键盘 1-4 快捷作答。

## [WIP] feat(negative-space): 实现负形轮廓瞬时记忆匹配 4AFC 模式

### 用户需求
在正负形空间感知训练中新增“负形轮廓记忆匹配 (SHAPE_MATCH_4AFC)”模式：
1. 先呈现一个负形剪影，经历一段时间后自动隐藏（曝光时间随难度递减）。
2. 展示 4 个极度相似的备选形状（其中 3 个为对目标顶点做微小扰动生成的干扰项）。
3. 支持通过点击或按键 (1-4) 进行选择，并根据结果反馈正确答案与命中状态。

### 评论
该功能的加入将 FormSight 的正负形训练维度从“比例估算”与“空间反切”扩展到了“视觉短期工作记忆（Visual Working Memory）”与“形态微差辨识”，能够极大地强化用户的视觉轮廓瞬时捕捉与留白感知力。

### 目标
1. 在 `src/config/domains.ts` 中注册 `SHAPE_MATCH_4AFC` 模式元数据。
2. 在 `src/utils/negativeSpaceUtils.ts` 中扩展类型定义，实现基于难度指数递减的顶点扰动生成器（`perturbPolygon`）与题目/命中评估逻辑。
3. 在 `src/config/trainingPlugins.tsx` 中适配该模式的徽标与做答记录提取逻辑。
4. 在 `src/components/NegativeSpaceCanvas.tsx` 中实现双阶段状态机（`stimulus` -> `recall`）、曝光计时器、4 个选项画布渲染及 1-4 键盘快捷键。

### 基本原理
- **自适应曝光时间**: 随 Level 从 2500ms（宽松观察）指数缩短至 400ms（极速闪视），对视觉工作记忆形成阶段性压迫。
- **微扰干扰项生成**: 避免使用随机完全不同的形状作为干扰项，而是对原始正形多边形的各个顶点施加微小随机位移（扰动半径随 Level 缩减至 5px 级别），迫使大脑关注细微的曲率与长宽比特征。
- **纯净双阶段交互**: 题目切换时立即进入 `stimulus` 阶段并启动倒计时，倒计时结束后无缝过渡至 `recall` 4 选 1 阶段，揭晓答案时清晰高亮正确与错误卡片。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/negative-space #task/object/shape-match-4afc #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 注册新模式元数据

在 `src/config/domains.ts` 中添加 `SHAPE_MATCH_4AFC` 模式定义与图标引入。

~~~~~act
patch_file
src/config/domains.ts
~~~~~
~~~~~typescript.old
import {
  Columns,
  Compass,
  Crosshair,
  Droplet,
  Maximize2,
  Palette,
  RotateCw,
  Shuffle,
  Sun,
  Target,
} from 'lucide-preact';
~~~~~
~~~~~typescript.new
import {
  Columns,
  Compass,
  Crosshair,
  Droplet,
  Maximize2,
  Palette,
  RotateCw,
  Shuffle,
  Sparkles,
  Sun,
  Target,
} from 'lucide-preact';
~~~~~
~~~~~act
patch_file
src/config/domains.ts
~~~~~
~~~~~typescript.old
      {
        id: 'NEGATIVE_VERTEX_FITTING',
        title: '负形边界反切定点',
        desc: '观察被负形空隙挤压的转折形态，从局部点阵中精准定位被遮挡的关键顶点。',
        icon: Crosshair,
      },
    ],
  },
};
~~~~~
~~~~~typescript.new
      {
        id: 'NEGATIVE_VERTEX_FITTING',
        title: '负形边界反切定点',
        desc: '观察被负形空隙挤压的转折形态，从局部点阵中精准定位被遮挡的关键顶点。',
        icon: Crosshair,
      },
      {
        id: 'SHAPE_MATCH_4AFC',
        title: '负形轮廓记忆匹配',
        desc: '瞬时记忆负形空隙轮廓，在相似干扰项中快速识别出与之完全一致的形状。',
        icon: Sparkles,
      },
    ],
  },
};
~~~~~

#### Acts 2: 扩展负形工具库与生成算法

在 `src/utils/negativeSpaceUtils.ts` 中新增类型定义、干扰项扰动生成算法 `perturbPolygon`、曝光时间计算及结果校验。

~~~~~act
patch_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~typescript.old
export type NegativeSpaceMode =
  | 'RATIO_ESTIMATION'
  | 'AREA_COMPARISON_2AFC'
  | 'NEGATIVE_VERTEX_FITTING';

export const NEGATIVE_SPACE_CANVAS_SIZE = 400;
export const TWO_AFC_CANVAS_SIZE = 280;
export const FITTING_CANVAS_SIZE = 340;

export interface NegativeSpaceQuestionData {
  id: string;
  mode: NegativeSpaceMode;
  difficultyLevel: number;
  // 单图滑块估算模式字段
  vertices?: Point[];
  canvasArea: number;
  positiveArea?: number;
  negativeArea?: number;
  targetNegativeRatio?: number;
  tolerance: number;

  // 2AFC 二分判别模式字段
  verticesA?: Point[];
  verticesB?: Point[];
  negAreaA?: number;
  negAreaB?: number;
  negRatioA?: number;
  negRatioB?: number;
  largerSide?: 'A' | 'B';
  areaDeltaPercent?: number; // 相对面积差异百分比 (例如 12.5%)

  // 负形反切定点模式字段
  targetVertexIndex?: number;
  targetPoint?: Point;
  truncatedVertices?: Point[]; // 右侧截断残缺多边形
  distractorPoints?: Point[]; // 围绕 targetPoint 的干扰网格点
  gridDim?: number;
}

export interface NegativeSpaceHitResult {
  isHit: boolean;
  userRatio?: number;
  targetRatio?: number;
  errorValue: number;
  tolerance: number;

  // 2AFC 结果字段
  userChoice?: 'A' | 'B';
  correctChoice?: 'A' | 'B';
  negRatioA?: number;
  negRatioB?: number;

  // 定点模式结果字段
  clickPoint?: Point;
  nearestGridPoint?: Point;
  isWithinRange?: boolean;
}
~~~~~
~~~~~typescript.new
export type NegativeSpaceMode =
  | 'RATIO_ESTIMATION'
  | 'AREA_COMPARISON_2AFC'
  | 'NEGATIVE_VERTEX_FITTING'
  | 'SHAPE_MATCH_4AFC';

export const NEGATIVE_SPACE_CANVAS_SIZE = 400;
export const TWO_AFC_CANVAS_SIZE = 280;
export const FITTING_CANVAS_SIZE = 340;

export interface NegativeSpaceQuestionData {
  id: string;
  mode: NegativeSpaceMode;
  difficultyLevel: number;
  // 单图滑块估算模式字段
  vertices?: Point[];
  canvasArea: number;
  positiveArea?: number;
  negativeArea?: number;
  targetNegativeRatio?: number;
  tolerance: number;

  // 2AFC 二分判别模式字段
  verticesA?: Point[];
  verticesB?: Point[];
  negAreaA?: number;
  negAreaB?: number;
  negRatioA?: number;
  negRatioB?: number;
  largerSide?: 'A' | 'B';
  areaDeltaPercent?: number; // 相对面积差异百分比 (例如 12.5%)

  // 负形反切定点模式字段
  targetVertexIndex?: number;
  targetPoint?: Point;
  truncatedVertices?: Point[]; // 右侧截断残缺多边形
  distractorPoints?: Point[]; // 围绕 targetPoint 的干扰网格点
  gridDim?: number;

  // 4AFC 记忆匹配模式字段
  targetPolygon?: Point[];
  optionsPolygons?: Point[][];
  correctOptionIndex?: number;
  displayTimeMs?: number;
}

export interface NegativeSpaceHitResult {
  isHit: boolean;
  userRatio?: number;
  targetRatio?: number;
  errorValue: number;
  tolerance: number;

  // 2AFC 结果字段
  userChoice?: 'A' | 'B';
  correctChoice?: 'A' | 'B';
  negRatioA?: number;
  negRatioB?: number;

  // 定点模式结果字段
  clickPoint?: Point;
  nearestGridPoint?: Point;
  isWithinRange?: boolean;

  // 4AFC 结果字段
  userChoiceIndex?: number;
  correctOptionIndex?: number;
}
~~~~~
~~~~~act
patch_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~typescript.old
/**
 * 生成负形空间练习题目 (支持 RATIO_ESTIMATION 与 AREA_COMPARISON_2AFC)
 */
export function generateNegativeSpaceQuestion(
  mode: NegativeSpaceMode,
  level: number,
): NegativeSpaceQuestionData {
~~~~~
~~~~~typescript.new
/**
 * 对多边形顶点施加微小扰动生成高相似干扰项
 */
export function perturbPolygon(
  baseVertices: Point[],
  level: number,
  canvasSize = NEGATIVE_SPACE_CANVAS_SIZE,
): Point[] {
  const clamped = Math.max(1, Math.min(35, level));
  const t = (clamped - 1) / 34;
  const maxPerturb = 36;
  const minPerturb = 6;
  const perturbAmount = maxPerturb * (minPerturb / maxPerturb) ** t;

  return baseVertices.map((p) => {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * perturbAmount + 2;
    const x = Math.max(15, Math.min(canvasSize - 15, Math.round(p.x + Math.cos(angle) * dist)));
    const y = Math.max(15, Math.min(canvasSize - 15, Math.round(p.y + Math.sin(angle) * dist)));
    return { x, y };
  });
}

/**
 * 生成负形空间练习题目 (支持 RATIO_ESTIMATION, AREA_COMPARISON_2AFC, NEGATIVE_VERTEX_FITTING, SHAPE_MATCH_4AFC)
 */
export function generateNegativeSpaceQuestion(
  mode: NegativeSpaceMode,
  level: number,
): NegativeSpaceQuestionData {
~~~~~
~~~~~act
patch_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~typescript.old
    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      canvasArea,
      vertices,
      targetVertexIndex,
      targetPoint,
      truncatedVertices,
      distractorPoints,
      gridDim,
      tolerance: S / 2,
    };
  }

  // 默认 RATIO_ESTIMATION 滑块评估模式
~~~~~
~~~~~typescript.new
    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      canvasArea,
      vertices,
      targetVertexIndex,
      targetPoint,
      truncatedVertices,
      distractorPoints,
      gridDim,
      tolerance: S / 2,
    };
  }

  if (mode === 'SHAPE_MATCH_4AFC') {
    const canvasArea = NEGATIVE_SPACE_CANVAS_SIZE * NEGATIVE_SPACE_CANVAS_SIZE;
    const targetPolygon = generateRandomPolygon(clampedLevel, NEGATIVE_SPACE_CANVAS_SIZE);

    const distractors = [
      perturbPolygon(targetPolygon, clampedLevel, NEGATIVE_SPACE_CANVAS_SIZE),
      perturbPolygon(targetPolygon, clampedLevel, NEGATIVE_SPACE_CANVAS_SIZE),
      perturbPolygon(targetPolygon, clampedLevel, NEGATIVE_SPACE_CANVAS_SIZE),
    ];

    const rawOptions = [targetPolygon, ...distractors];
    const indexedOptions = rawOptions.map((opt, index) => ({ opt, isTarget: index === 0 }));
    for (let i = indexedOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexedOptions[i], indexedOptions[j]] = [indexedOptions[j], indexedOptions[i]];
    }

    const optionsPolygons = indexedOptions.map((o) => o.opt);
    const correctOptionIndex = indexedOptions.findIndex((o) => o.isTarget);

    const t = (clampedLevel - 1) / 34;
    const maxDisplayMs = 2400;
    const minDisplayMs = 450;
    const displayTimeMs = Math.round(maxDisplayMs * (minDisplayMs / maxDisplayMs) ** t);

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      canvasArea,
      targetPolygon,
      optionsPolygons,
      correctOptionIndex,
      displayTimeMs,
      tolerance: 0,
    };
  }

  // 默认 RATIO_ESTIMATION 滑块评估模式
~~~~~
~~~~~act
patch_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~typescript.old
  if (question.mode === 'AREA_COMPARISON_2AFC') {
    const userChoice = userAnswer as 'A' | 'B';
    const isHit = userChoice === question.largerSide;

    return {
      isHit,
      userChoice,
      correctChoice: question.largerSide,
      negRatioA: question.negRatioA,
      negRatioB: question.negRatioB,
      errorValue: isHit ? 0 : (question.areaDeltaPercent ?? 0),
      tolerance: question.tolerance,
    };
  }

  const userRatio = typeof userAnswer === 'number' ? userAnswer : 50;
~~~~~
~~~~~typescript.new
  if (question.mode === 'AREA_COMPARISON_2AFC') {
    const userChoice = userAnswer as 'A' | 'B';
    const isHit = userChoice === question.largerSide;

    return {
      isHit,
      userChoice,
      correctChoice: question.largerSide,
      negRatioA: question.negRatioA,
      negRatioB: question.negRatioB,
      errorValue: isHit ? 0 : (question.areaDeltaPercent ?? 0),
      tolerance: question.tolerance,
    };
  }

  if (question.mode === 'SHAPE_MATCH_4AFC') {
    const userChoiceIndex = typeof userAnswer === 'number' ? userAnswer : 0;
    const isHit = userChoiceIndex === question.correctOptionIndex;

    return {
      isHit,
      userChoiceIndex,
      correctOptionIndex: question.correctOptionIndex,
      errorValue: isHit ? 0 : 1,
      tolerance: 0,
    };
  }

  const userRatio = typeof userAnswer === 'number' ? userAnswer : 50;
~~~~~

#### Acts 3: 适配插件记录与标签提取

在 `src/config/trainingPlugins.tsx` 中添加 `SHAPE_MATCH_4AFC` 的模式徽标与历史记录提取逻辑。

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript.old
  getModeBadge: (mode) =>
    mode === 'AREA_COMPARISON_2AFC'
      ? '负形面积二分判别'
      : mode === 'NEGATIVE_VERTEX_FITTING'
        ? '负形边界反切定点'
        : '负形占比估算',
~~~~~
~~~~~typescript.new
  getModeBadge: (mode) =>
    mode === 'AREA_COMPARISON_2AFC'
      ? '负形面积二分判别'
      : mode === 'NEGATIVE_VERTEX_FITTING'
        ? '负形边界反切定点'
        : mode === 'SHAPE_MATCH_4AFC'
          ? '负形轮廓记忆匹配'
          : '负形占比估算',
~~~~~
~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript.old
    if (mode === 'AREA_COMPARISON_2AFC') {
      return {
        mode: 'AREA_COMPARISON_2AFC',
        userChoice: userVal,
        correctChoice: q.largerSide,
        negRatioA: q.negRatioA,
        negRatioB: q.negRatioB,
        areaDeltaPercent: q.areaDeltaPercent,
        errorValue: hitResult.errorValue,
      };
    }
    return {
      targetNegativeRatio: q.targetNegativeRatio,
      userRatio: userVal,
      errorValue: hitResult.errorValue,
      positiveArea: q.positiveArea,
      negativeArea: q.negativeArea,
    };
~~~~~
~~~~~typescript.new
    if (mode === 'AREA_COMPARISON_2AFC') {
      return {
        mode: 'AREA_COMPARISON_2AFC',
        userChoice: userVal,
        correctChoice: q.largerSide,
        negRatioA: q.negRatioA,
        negRatioB: q.negRatioB,
        areaDeltaPercent: q.areaDeltaPercent,
        errorValue: hitResult.errorValue,
      };
    }
    if (mode === 'SHAPE_MATCH_4AFC') {
      return {
        mode: 'SHAPE_MATCH_4AFC',
        userChoiceIndex: userVal,
        correctOptionIndex: q.correctOptionIndex,
        displayTimeMs: q.displayTimeMs,
        errorValue: hitResult.errorValue,
      };
    }
    return {
      targetNegativeRatio: q.targetNegativeRatio,
      userRatio: userVal,
      errorValue: hitResult.errorValue,
      positiveArea: q.positiveArea,
      negativeArea: q.negativeArea,
    };
~~~~~

#### Acts 4: 实现交互画布与双阶段状态机

在 `src/components/NegativeSpaceCanvas.tsx` 中引入倒计时状态机、4 选项画布渲染及键盘 1-4 响应。

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
import { Check, Columns, X } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../hooks/useTrackPointer';
import type { Point } from '../types';
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
~~~~~typescript.new
import { Check, Columns, Eye, Sparkles, X } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../hooks/useTrackPointer';
import type { Point } from '../types';
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
~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
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
  const isFitting = question.mode === 'NEGATIVE_VERTEX_FITTING';

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

  // === 3. 定点反切模式专属画布与状态 ===
  const leftFittingRef = useRef<HTMLCanvasElement | null>(null);
  const rightFittingRef = useRef<HTMLCanvasElement | null>(null);
  const [fittingHoverPoint, setFittingHoverPoint] = useState<Point | null>(null);

  // 切换题目时重置状态
  useEffect(() => {
    if (question.id) {
      setCurrentVal(50.0);
      setHoverVal(null);
      setSelectedChoice(null);
      setFittingHoverPoint(null);
    }
  }, [question.id, setHoverVal]);
~~~~~
~~~~~typescript.new
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
  const isFitting = question.mode === 'NEGATIVE_VERTEX_FITTING';
  const is4AFC = question.mode === 'SHAPE_MATCH_4AFC';

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

  // === 3. 定点反切模式专属画布与状态 ===
  const leftFittingRef = useRef<HTMLCanvasElement | null>(null);
  const rightFittingRef = useRef<HTMLCanvasElement | null>(null);
  const [fittingHoverPoint, setFittingHoverPoint] = useState<Point | null>(null);

  // === 4. 4AFC 记忆匹配模式专属画布与状态 ===
  const [matchPhase, setMatchPhase] = useState<'stimulus' | 'recall'>('stimulus');
  const [selected4AfcIndex, setSelected4AfcIndex] = useState<number | null>(null);
  const option0Ref = useRef<HTMLCanvasElement | null>(null);
  const option1Ref = useRef<HTMLCanvasElement | null>(null);
  const option2Ref = useRef<HTMLCanvasElement | null>(null);
  const option3Ref = useRef<HTMLCanvasElement | null>(null);
  const optionRefs = [option0Ref, option1Ref, option2Ref, option3Ref];

  // 切换题目时重置状态
  useEffect(() => {
    if (question.id) {
      setCurrentVal(50.0);
      setHoverVal(null);
      setSelectedChoice(null);
      setFittingHoverPoint(null);
      setMatchPhase('stimulus');
      setSelected4AfcIndex(null);
    }
  }, [question.id, setHoverVal]);

  // 4AFC 曝光倒计时处理
  useEffect(() => {
    if (is4AFC && matchPhase === 'stimulus' && !showAnswer) {
      const timer = setTimeout(() => {
        setMatchPhase('recall');
      }, question.displayTimeMs || 1500);
      return () => clearTimeout(timer);
    }
  }, [is4AFC, matchPhase, question.displayTimeMs, showAnswer]);
~~~~~
~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
  // 渲染单图滑块 Canvas 与 4AFC 刺激图
  useEffect(() => {
    if (!is2AFC && !isFitting && !is4AFC && question.vertices) {
      drawPolygonCanvas(
        canvasRef.current,
        question.vertices,
        NEGATIVE_SPACE_CANVAS_SIZE,
        showAnswer && userAnswer?.isHit,
      );
    } else if (is4AFC && matchPhase === 'stimulus' && question.targetPolygon) {
      drawPolygonCanvas(
        canvasRef.current,
        question.targetPolygon,
        NEGATIVE_SPACE_CANVAS_SIZE,
      );
    }
  }, [is2AFC, isFitting, is4AFC, matchPhase, question.vertices, question.targetPolygon, showAnswer, userAnswer]);

  // 渲染 4AFC 候选画布
  useEffect(() => {
    if (is4AFC && (matchPhase === 'recall' || showAnswer) && question.optionsPolygons) {
      question.optionsPolygons.forEach((poly, idx) => {
        drawPolygonCanvas(optionRefs[idx].current, poly, TWO_AFC_CANVAS_SIZE);
      });
    }
  }, [is4AFC, matchPhase, showAnswer, question.optionsPolygons]);
~~~~~
~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
  // 处理 2AFC 点击选择
  const handleSelectChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelectedChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );
~~~~~
~~~~~typescript.new
  // 处理 2AFC 点击选择
  const handleSelectChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelectedChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );

  // 处理 4AFC 点击选择
  const handleSelect4Afc = useCallback(
    (index: number) => {
      if (disabled || showAnswer || matchPhase !== 'recall') return;
      setSelected4AfcIndex(index);
      onAnswer(index);
    },
    [disabled, showAnswer, matchPhase, onAnswer],
  );
~~~~~
~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
      if (is2AFC) {
        if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          handleSelectChoice('A');
        } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          handleSelectChoice('B');
        }
      } else if (!isFitting) {
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          onAnswer(currentVal);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [is2AFC, isFitting, disabled, showAnswer, currentVal, onAnswer, handleSelectChoice]);
~~~~~
~~~~~typescript.new
      if (is2AFC) {
        if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          handleSelectChoice('A');
        } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          handleSelectChoice('B');
        }
      } else if (is4AFC && matchPhase === 'recall') {
        if (['1', '2', '3', '4'].includes(e.key)) {
          e.preventDefault();
          handleSelect4Afc(Number.parseInt(e.key, 10) - 1);
        } else if (e.code.startsWith('Digit') || e.code.startsWith('Numpad')) {
          const num = Number.parseInt(e.code.replace(/\D/g, ''), 10);
          if (num >= 1 && num <= 4) {
            e.preventDefault();
            handleSelect4Afc(num - 1);
          }
        }
      } else if (!isFitting && !is4AFC) {
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          onAnswer(currentVal);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [is2AFC, isFitting, is4AFC, matchPhase, disabled, showAnswer, currentVal, onAnswer, handleSelectChoice, handleSelect4Afc]);
~~~~~
~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
  // =========================================================================
  // 模式 B：单图滑块评估视图 (RATIO_ESTIMATION)
  // =========================================================================
~~~~~
~~~~~typescript.new
  // =========================================================================
  // 模式 D：SHAPE_MATCH_4AFC 负形轮廓记忆匹配视图
  // =========================================================================
  if (is4AFC) {
    const isRevealed = showAnswer;

    return (
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
        <div className="text-center space-y-1">
          <div className="text-base font-black text-slate-800 flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            {matchPhase === 'stimulus' && !isRevealed
              ? '观察并瞬时记忆负形空隙轮廓特征'
              : '匹配回忆：选择与刚才展示完全相同的形状'}
          </div>
          <p className="text-xs text-slate-400">
            {matchPhase === 'stimulus' && !isRevealed
              ? `曝光记忆倒计时中 (${question.displayTimeMs}ms)`
              : '按按键 1、2、3、4 或直接点击卡片选择'}
          </p>
        </div>

        {matchPhase === 'stimulus' && !isRevealed ? (
          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 shadow-inner flex flex-col items-center gap-3">
            <canvas
              ref={canvasRef}
              width={NEGATIVE_SPACE_CANVAS_SIZE}
              height={NEGATIVE_SPACE_CANVAS_SIZE}
              className="w-full max-w-[320px] aspect-square rounded-2xl border border-slate-200 shadow-sm"
            />
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all ease-linear"
                style={{
                  width: '100%',
                  animation: `shrinkWidth ${question.displayTimeMs}ms linear forwards`,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 w-full">
            {[0, 1, 2, 3].map((idx) => {
              const isTarget = question.correctOptionIndex === idx;
              const isSelected = selected4AfcIndex === idx || userAnswer?.userChoiceIndex === idx;

              let cardStyle =
                'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]';

              if (isRevealed) {
                if (isTarget) {
                  cardStyle = 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20';
                } else if (isSelected) {
                  cardStyle = 'bg-rose-50/50 border-rose-400 shadow-sm';
                } else {
                  cardStyle = 'bg-slate-50/60 border-slate-200 opacity-50';
                }
              } else if (isSelected) {
                cardStyle = 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={disabled || showAnswer}
                  onClick={() => handleSelect4Afc(idx)}
                  className={`group relative flex flex-col items-center gap-2.5 p-3.5 rounded-3xl border transition-all duration-200 text-left ${cardStyle}`}
                >
                  <div className="flex items-center justify-between w-full px-1">
                    <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                      <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                        {idx + 1}
                      </span>
                      选项 {idx + 1}
                    </span>
                    {isRevealed && isTarget && (
                      <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-0.5">
                        <Check className="w-4 h-4" /> 真实目标
                      </span>
                    )}
                  </div>
                  <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
                    <canvas
                      ref={optionRefs[idx]}
                      width={TWO_AFC_CANVAS_SIZE}
                      height={TWO_AFC_CANVAS_SIZE}
                      className="w-full max-w-[170px] aspect-square rounded-xl shadow-sm"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {isRevealed && (
          <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-xl ${
                  userAnswer?.isHit
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {userAnswer?.isHit ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-800">
                  {userAnswer?.isHit ? '瞬时记忆与形态识别完全正确！' : '记忆形态判断出现偏差'}
                </span>
                <span className="text-slate-400 ml-2">
                  (正确选项为: 选项 {(question.correctOptionIndex ?? 0) + 1})
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 模式 B：单图滑块评估视图 (RATIO_ESTIMATION)
  // =========================================================================
~~~~~

### 下一步建议
1. 运行测试或构建脚本（如 `npm run build` 或 `npm run check`）确保类型系统和 linter 完全通过。
2. 在浏览器中打开正负形感知模块，进入“负形轮廓记忆匹配”卡片，体验曝光时间随难度递增缩短与相似微扰选项的辨析体验。
3. 验证结束后，可执行 Git 提交保存当前工作单元。
