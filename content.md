好的，我们继续推进 P1 阶段任务：对正负形感知模块（`negativeSpaceUtils.ts` 和 `NegativeSpaceCanvas.tsx`）进行彻底的解耦与拆分。

## [WIP] refactor(negative-space): 模块化拆修正负形几何算法与多视图组件

### 用户需求
将正负形感知模块中承担了过多职责的 `src/utils/negativeSpaceUtils.ts`（几何算法、多边形生成、4类题型工厂、碰撞判定）与 `src/components/NegativeSpaceCanvas.tsx`（4种复杂交互界面）拆分为独立子模块，提升系统清晰度与扩展性。

### 评论
正负形感知模块涵盖了连续滑块估算、2AFC 留白面积二选一、基于点阵拾取的反切定点、以及带时序曝光倒计时的轮廓记忆匹配。将这些不同的几何计算与多模态交互界面分离，不仅消除了单个文件维护 4 套独立事件循环的耦合，还极大方便了后续对各题型算法的独立调优与单测。

### 目标
1. 将 `src/utils/negativeSpaceUtils.ts` 拆分至 `src/utils/negativeSpace/` 目录中（包含 `types.ts`、`polygonMath.ts`、`questionGenerator.ts`、`hitDetection.ts` 和 `index.ts`）。
2. 将 `src/components/NegativeSpaceCanvas.tsx` 拆分至 `src/components/negativeSpace/` 目录中，各题型提取为独立的子视图组件（`RatioEstimationView`、`AreaComparison2AfcView`、`VertexFittingView`、`ShapeMemory2AfcView`）。
3. 原文件保留向后兼容的代理导出，保证现有系统调用不受影响。

### 基本原理
- **数学与业务分层**：鞋带公式、多边形质心缩放与微扰属于纯几何数学层；题目生成与判定属于业务编排层。
- **状态域隔离**：时序倒计时动画（记忆匹配）、点阵鼠标追踪（定点反切）、连续滑块拖拽与 2AFC 快捷键互不干扰。
- **无缝过渡**：根入口组件作为路由分发层，保证接口规范完全统一。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #scope/core #scope/dx #ai/delegate #task/domain/negative_space #task/object/modular-refactoring #task/action/refactor #task/state/continue #task/status/active

---

### Script

#### Acts 1: 拆分 `src/utils/negativeSpace/` 几何算法与生成器模块

~~~~~act
write_file
src/utils/negativeSpace/types.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export type NegativeSpaceMode =
  | 'RATIO_ESTIMATION'
  | 'AREA_COMPARISON_2AFC'
  | 'NEGATIVE_VERTEX_FITTING'
  | 'SHAPE_MATCH_2AFC';

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
  areaDeltaPercent?: number;

  // 负形反切定点模式字段
  targetVertexIndex?: number;
  targetPoint?: Point;
  truncatedVertices?: Point[];
  distractorPoints?: Point[];
  gridDim?: number;

  // 记忆匹配 2AFC 模式字段
  targetPolygon?: Point[];
  optionsPolygons?: Point[][];
  correctOptionIndex?: number;
  correctChoice?: 'A' | 'B';
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

  // 记忆匹配 2AFC 结果字段
  userChoiceIndex?: number;
  correctOptionIndex?: number;
}
~~~~~

~~~~~act
write_file
src/utils/negativeSpace/polygonMath.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';
import { expDecayInterpolate } from '../mathUtils';
import { NEGATIVE_SPACE_CANVAS_SIZE, TWO_AFC_CANVAS_SIZE } from './types';

/**
 * 经典鞋带公式 (Shoelace Formula) 计算简单多边形面积
 */
export function calcPolygonArea(vertices: Point[]): number {
  const n = vertices.length;
  if (n < 3) return 0;

  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * 根据 Level (1..35) 计算允许的占比容错阈值 (百分比 Δ%)
 */
export function getNegativeSpaceToleranceForLevel(level: number): number {
  return Math.round(expDecayInterpolate(10.0, 1.2, level) * 10) / 10;
}

/**
 * 根据 Level (1..35) 计算 2AFC 负形面积相对差异率 delta
 */
export function get2AfcdeltaForLevel(level: number): number {
  return expDecayInterpolate(0.35, 0.02, level);
}

/**
 * 计算多边形质心
 */
export function calcPolygonCentroid(vertices: Point[]): Point {
  let cx = 0;
  let cy = 0;
  for (const p of vertices) {
    cx += p.x;
    cy += p.y;
  }
  return { x: cx / vertices.length, y: cy / vertices.length };
}

/**
 * 随机生成不自交的不规则正形多边形
 */
export function generateRandomPolygon(
  level: number,
  canvasSize = NEGATIVE_SPACE_CANVAS_SIZE,
): Point[] {
  const clamped = Math.max(1, Math.min(35, level));
  const t = (clamped - 1) / 34;

  const minVerts = 4 + Math.floor(t * 2);
  const maxVerts = 4 + Math.floor(t * 4);
  const vertexCount = Math.floor(Math.random() * (maxVerts - minVerts + 1)) + minVerts;

  const cx = canvasSize / 2 + (Math.random() - 0.5) * (canvasSize * 0.1);
  const cy = canvasSize / 2 + (Math.random() - 0.5) * (canvasSize * 0.1);

  const baseRadius = canvasSize * 0.28 + Math.random() * (canvasSize * 0.1);
  const irregularity = 0.2 + t * 0.45;

  const angles: number[] = [];
  const angleStep = (Math.PI * 2) / vertexCount;
  for (let i = 0; i < vertexCount; i++) {
    const rawA = i * angleStep + (Math.random() - 0.5) * angleStep * 0.7;
    angles.push((rawA + Math.PI * 2) % (Math.PI * 2));
  }
  angles.sort((a, b) => a - b);

  const vertices: Point[] = [];
  for (const a of angles) {
    const rJitter = 1 + (Math.random() * 2 - 1) * irregularity;
    const r = Math.max(canvasSize * 0.1, Math.min(canvasSize * 0.42, baseRadius * rJitter));
    const x = Math.round(Math.max(15, Math.min(canvasSize - 15, cx + r * Math.cos(a))));
    const y = Math.round(Math.max(15, Math.min(canvasSize - 15, cy + r * Math.sin(a))));
    vertices.push({ x, y });
  }

  return vertices;
}

/**
 * 将任意多边形围绕质心缩放，使其面积精准等于 targetArea
 */
export function scalePolygonToArea(
  vertices: Point[],
  targetArea: number,
  canvasSize = TWO_AFC_CANVAS_SIZE,
): Point[] {
  const currentArea = calcPolygonArea(vertices);
  if (currentArea <= 0) return vertices;

  const k = Math.sqrt(targetArea / currentArea);
  const centroid = calcPolygonCentroid(vertices);
  const canvasCenter = canvasSize / 2;

  return vertices.map((p) => {
    const scaledX = centroid.x + (p.x - centroid.x) * k;
    const scaledY = centroid.y + (p.y - centroid.y) * k;
    const centeredX = scaledX - centroid.x + canvasCenter;
    const centeredY = scaledY - centroid.y + canvasCenter;
    return {
      x: Math.round(Math.max(6, Math.min(canvasSize - 6, centeredX))),
      y: Math.round(Math.max(6, Math.min(canvasSize - 6, centeredY))),
    };
  });
}

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
~~~~~

~~~~~act
write_file
src/utils/negativeSpace/questionGenerator.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';
import {
  calcPolygonArea,
  generateRandomPolygon,
  get2AfcdeltaForLevel,
  getNegativeSpaceToleranceForLevel,
  perturbPolygon,
  scalePolygonToArea,
} from './polygonMath';
import {
  FITTING_CANVAS_SIZE,
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceMode,
  type NegativeSpaceQuestionData,
  TWO_AFC_CANVAS_SIZE,
} from './types';

export function generateNegativeSpaceQuestion(
  mode: NegativeSpaceMode,
  level: number,
): NegativeSpaceQuestionData {
  const id = `nsq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  if (mode === 'AREA_COMPARISON_2AFC') {
    const canvasArea = TWO_AFC_CANVAS_SIZE * TWO_AFC_CANVAS_SIZE;
    const delta = get2AfcdeltaForLevel(clampedLevel);

    const largerSide: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B';
    const baseNegRatio = 0.45 + Math.random() * 0.3;
    const halfDelta = delta / 2;

    const negRatioA =
      largerSide === 'A' ? baseNegRatio * (1 + halfDelta) : baseNegRatio * (1 - halfDelta);
    const negRatioB =
      largerSide === 'B' ? baseNegRatio * (1 + halfDelta) : baseNegRatio * (1 - halfDelta);

    const clampedRatioA = Math.max(0.2, Math.min(0.88, negRatioA));
    const clampedRatioB = Math.max(0.2, Math.min(0.88, negRatioB));

    const negAreaA = Math.round(canvasArea * clampedRatioA);
    const negAreaB = Math.round(canvasArea * clampedRatioB);

    const posAreaA = canvasArea - negAreaA;
    const posAreaB = canvasArea - negAreaB;

    const rawPolyA = generateRandomPolygon(clampedLevel);
    const rawPolyB = generateRandomPolygon(clampedLevel);

    const verticesA = scalePolygonToArea(rawPolyA, posAreaA, TWO_AFC_CANVAS_SIZE);
    const verticesB = scalePolygonToArea(rawPolyB, posAreaB, TWO_AFC_CANVAS_SIZE);

    const actualPosA = calcPolygonArea(verticesA);
    const actualPosB = calcPolygonArea(verticesB);
    const actualNegA = canvasArea - actualPosA;
    const actualNegB = canvasArea - actualPosB;

    const finalRatioA = Math.round((actualNegA / canvasArea) * 1000) / 10;
    const finalRatioB = Math.round((actualNegB / canvasArea) * 1000) / 10;
    const finalLarger: 'A' | 'B' = actualNegA >= actualNegB ? 'A' : 'B';
    const actualDeltaPercent =
      Math.round((Math.abs(actualNegA - actualNegB) / ((actualNegA + actualNegB) / 2)) * 1000) / 10;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      canvasArea,
      verticesA,
      verticesB,
      negAreaA: Math.round(actualNegA),
      negAreaB: Math.round(actualNegB),
      negRatioA: finalRatioA,
      negRatioB: finalRatioB,
      largerSide: finalLarger,
      areaDeltaPercent: actualDeltaPercent,
      tolerance: delta,
    };
  }

  if (mode === 'NEGATIVE_VERTEX_FITTING') {
    const canvasArea = FITTING_CANVAS_SIZE * FITTING_CANVAS_SIZE;
    const vertices = generateRandomPolygon(clampedLevel, FITTING_CANVAS_SIZE);
    const n = vertices.length;

    const targetVertexIndex = Math.floor(Math.random() * n);
    const targetPoint = vertices[targetVertexIndex];

    const prevIdx = (targetVertexIndex - 1 + n) % n;
    const nextIdx = (targetVertexIndex + 1) % n;
    const prevPoint = vertices[prevIdx];
    const nextPoint = vertices[nextIdx];

    const cutRatio = 0.45;
    const cutPrev: Point = {
      x: Math.round(prevPoint.x + (targetPoint.x - prevPoint.x) * (1 - cutRatio)),
      y: Math.round(prevPoint.y + (targetPoint.y - prevPoint.y) * (1 - cutRatio)),
    };
    const cutNext: Point = {
      x: Math.round(nextPoint.x + (targetPoint.x - nextPoint.x) * (1 - cutRatio)),
      y: Math.round(nextPoint.y + (targetPoint.y - nextPoint.y) * (1 - cutRatio)),
    };

    const truncatedVertices: Point[] = [];
    for (let i = 0; i < n; i++) {
      if (i === targetVertexIndex) {
        truncatedVertices.push(cutPrev);
        truncatedVertices.push(cutNext);
      } else {
        truncatedVertices.push(vertices[i]);
      }
    }

    const gridDim = 3;
    const S_MAX = 24;
    const S_MIN = 3.5;
    const t = (clampedLevel - 1) / 34;
    const S = S_MAX * (S_MIN / S_MAX) ** t;

    const targetRow = Math.floor(Math.random() * gridDim);
    const targetCol = Math.floor(Math.random() * gridDim);
    const distractorPoints: Point[] = [];

    for (let r = 0; r < gridDim; r++) {
      for (let c = 0; c < gridDim; c++) {
        const x = Math.round((targetPoint.x + (c - targetCol) * S) * 100) / 100;
        const y = Math.round((targetPoint.y + (r - targetRow) * S) * 100) / 100;
        distractorPoints.push({ x, y });
      }
    }

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

  if (mode === 'SHAPE_MATCH_2AFC') {
    const canvasArea = NEGATIVE_SPACE_CANVAS_SIZE * NEGATIVE_SPACE_CANVAS_SIZE;
    const targetPolygon = generateRandomPolygon(clampedLevel, NEGATIVE_SPACE_CANVAS_SIZE);
    const distractorPolygon = perturbPolygon(
      targetPolygon,
      clampedLevel,
      NEGATIVE_SPACE_CANVAS_SIZE,
    );

    const isTargetA = Math.random() < 0.5;
    const optionsPolygons = isTargetA
      ? [targetPolygon, distractorPolygon]
      : [distractorPolygon, targetPolygon];
    const correctOptionIndex = isTargetA ? 0 : 1;
    const correctChoice = isTargetA ? 'A' : 'B';

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
      correctChoice,
      displayTimeMs,
      tolerance: 0,
    };
  }

  // 默认 RATIO_ESTIMATION 滑块评估模式
  const tolerance = getNegativeSpaceToleranceForLevel(clampedLevel);
  const canvasArea = NEGATIVE_SPACE_CANVAS_SIZE * NEGATIVE_SPACE_CANVAS_SIZE;

  let vertices = generateRandomPolygon(clampedLevel);
  let posArea = calcPolygonArea(vertices);

  let attempts = 0;
  while ((posArea / canvasArea < 0.15 || posArea / canvasArea > 0.8) && attempts < 10) {
    attempts++;
    vertices = generateRandomPolygon(clampedLevel);
    posArea = calcPolygonArea(vertices);
  }

  const negArea = canvasArea - posArea;
  const targetNegativeRatio = Math.round((negArea / canvasArea) * 1000) / 10;

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    vertices,
    canvasArea,
    positiveArea: Math.round(posArea),
    negativeArea: Math.round(negArea),
    targetNegativeRatio,
    tolerance,
  };
}
~~~~~

~~~~~act
write_file
src/utils/negativeSpace/hitDetection.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';
import { checkHit } from '../geometry';
import type { NegativeSpaceHitResult, NegativeSpaceQuestionData } from './types';

export function checkNegativeSpaceHit(
  userAnswer: number | 'A' | 'B' | Point,
  question: NegativeSpaceQuestionData,
): NegativeSpaceHitResult {
  if (question.mode === 'NEGATIVE_VERTEX_FITTING') {
    const clickPoint = userAnswer as Point;
    const targetPoint = question.targetPoint ?? { x: 0, y: 0 };
    const distractorPoints = question.distractorPoints ?? [];

    const hitRes = checkHit(clickPoint, targetPoint, distractorPoints);
    return {
      isHit: hitRes.isHit,
      clickPoint,
      nearestGridPoint: hitRes.nearestGridPoint,
      errorValue: hitRes.errorDistance,
      tolerance: question.tolerance,
      isWithinRange: hitRes.isWithinRange,
    };
  }

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

  if (question.mode === 'SHAPE_MATCH_2AFC') {
    let userChoiceIndex: number;
    if (typeof userAnswer === 'number') {
      userChoiceIndex = userAnswer;
    } else if (userAnswer === 'A') {
      userChoiceIndex = 0;
    } else if (userAnswer === 'B') {
      userChoiceIndex = 1;
    } else {
      userChoiceIndex = 0;
    }

    const isHit = userChoiceIndex === question.correctOptionIndex;
    const userChoice = userChoiceIndex === 0 ? 'A' : 'B';

    return {
      isHit,
      userChoice,
      userChoiceIndex,
      correctChoice: question.correctChoice,
      correctOptionIndex: question.correctOptionIndex,
      errorValue: isHit ? 0 : 1,
      tolerance: 0,
    };
  }

  const userRatio = typeof userAnswer === 'number' ? userAnswer : 50;
  const targetRatio = question.targetNegativeRatio ?? 50;
  const errorValue = Math.round(Math.abs(userRatio - targetRatio) * 10) / 10;
  const isHit = errorValue <= question.tolerance;

  return {
    isHit,
    userRatio,
    targetRatio,
    errorValue,
    tolerance: question.tolerance,
  };
}
~~~~~

~~~~~act
write_file
src/utils/negativeSpace/index.ts
~~~~~
~~~~~typescript
export * from './types';
export * from './polygonMath';
export * from './questionGenerator';
export * from './hitDetection';
~~~~~

~~~~~act
write_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~typescript
export * from './negativeSpace/index';
~~~~~

#### Acts 2: 拆分 `src/components/negativeSpace/` 交互子视图组件

~~~~~act
write_file
src/components/negativeSpace/RatioEstimationView.tsx
~~~~~
~~~~~typescript
import { useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../../hooks/useTrackPointer';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../../utils/negativeSpace';
import { drawPolygonCanvas } from '../../utils/canvas/drawPolygon';

interface RatioEstimationViewProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function RatioEstimationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: RatioEstimationViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentVal, setCurrentVal] = useState<number>(50.0);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 100,
    step: 0.1,
    disabled: disabled || showAnswer,
    onValChange: setCurrentVal,
  });

  useEffect(() => {
    setCurrentVal(50.0);
    setHoverVal(null);
  }, [question.id, setHoverVal]);

  useEffect(() => {
    if (question.vertices) {
      drawPolygonCanvas({
        canvas: canvasRef.current,
        vertices: question.vertices,
        size: NEGATIVE_SPACE_CANVAS_SIZE,
        fillColor: '#0F172A',
        strokeColor: '#1E293B',
        isHighlighted: showAnswer && userAnswer?.isHit,
      });
    }
  }, [question.vertices, showAnswer, userAnswer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || showAnswer) return;
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        onAnswer(currentVal);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, showAnswer, currentVal, onAnswer]);

  const { targetNegativeRatio, tolerance } = question;
  const activeVal = hoverVal !== null ? hoverVal : currentVal;

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          估计白色留白 (负形) 占整幅画面的面积百分比
        </div>
      )}

      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={NEGATIVE_SPACE_CANVAS_SIZE}
          height={NEGATIVE_SPACE_CANVAS_SIZE}
          className="w-full max-w-[340px] aspect-square rounded-xl border border-slate-300 shadow-sm"
        />
      </div>

      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>负形空间占比估计:</span>
          <span className="font-mono text-base font-black text-indigo-600">
            {showAnswer ? `${userAnswer?.userRatio ?? currentVal}%` : `${activeVal}%`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-slate-400 text-xs">0%</span>

          <div
            {...pointerProps}
            style={
              hitMargin > 0
                ? {
                    paddingLeft: `${hitMargin}px`,
                    paddingRight: `${hitMargin}px`,
                    marginLeft: `-${hitMargin}px`,
                    marginRight: `-${hitMargin}px`,
                    paddingTop: '6px',
                    paddingBottom: '6px',
                    marginTop: '-6px',
                    marginBottom: '-6px',
                  }
                : undefined
            }
            className={`relative flex-1 flex items-center select-none touch-none ${
              !showAnswer && !disabled ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <div
              ref={trackRef}
              className="relative w-full h-7 rounded-xl bg-slate-200 border border-slate-300/80 shadow-inner flex items-center overflow-hidden"
            >
              <div
                className="absolute top-0 bottom-0 left-0 bg-indigo-500/20"
                style={{ width: `${activeVal}%` }}
              />

              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                  style={{ left: `${currentVal}%` }}
                />
              )}

              {!showAnswer && showToleranceBand && (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: `${Math.max(0, activeVal - tolerance)}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: `${Math.min(100, activeVal + tolerance)}%` }}
                  />
                </>
              )}

              {showAnswer && (
                <>
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                    style={{ left: `${targetNegativeRatio}%` }}
                  />
                  {userAnswer && (
                    <div
                      className={`absolute top-0 bottom-0 w-1 -translate-x-1/2 z-10 border-x border-white shadow-md ${
                        userAnswer.isHit ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ left: `${userAnswer.userRatio}%` }}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <span className="font-bold font-mono text-slate-400 text-xs">100%</span>
        </div>

        {showAnswer && (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              真实负形占比:{' '}
              <span className="font-bold text-slate-800 font-mono">{targetNegativeRatio}%</span>
            </span>
            <span
              className={
                userAnswer?.isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'
              }
            >
              误差: {userAnswer?.errorValue}% (容错: ±{tolerance}%)
            </span>
          </div>
        )}
      </div>

      {!showAnswer && (
        <button
          type="button"
          onClick={() => {
            if (!disabled && !showAnswer) onAnswer(currentVal);
          }}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
        >
          确认提交 (Space)
        </button>
      )}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/negativeSpace/AreaComparison2AfcView.tsx
~~~~~
~~~~~typescript
import { Check, Columns, X } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  TWO_AFC_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../../utils/negativeSpace';
import { drawPolygonCanvas } from '../../utils/canvas/drawPolygon';

interface AreaComparison2AfcViewProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AreaComparison2AfcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AreaComparison2AfcViewProps) {
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  useEffect(() => {
    drawPolygonCanvas({
      canvas: canvasRefA.current,
      vertices: question.verticesA,
      size: TWO_AFC_CANVAS_SIZE,
      fillColor: '#0F172A',
      strokeColor: '#1E293B',
    });
    drawPolygonCanvas({
      canvas: canvasRefB.current,
      vertices: question.verticesB,
      size: TWO_AFC_CANVAS_SIZE,
      fillColor: '#0F172A',
      strokeColor: '#1E293B',
    });
  }, [question.verticesA, question.verticesB]);

  const handleSelectChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelectedChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || showAnswer) return;
      if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
        e.preventDefault();
        handleSelectChoice('A');
      } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
        e.preventDefault();
        handleSelectChoice('B');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, showAnswer, handleSelectChoice]);

  const largerSide = question.largerSide;
  const isAHit = largerSide === 'A';
  const isBHit = largerSide === 'B';

  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          <Columns className="w-3.5 h-3.5 text-indigo-600" />
          判别哪一侧的白色留白 (负形) 面积更大 (键 1 / 2)
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
        {/* 卡片 A */}
        <button
          type="button"
          disabled={disabled || showAnswer}
          onClick={() => handleSelectChoice('A')}
          className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
            showAnswer
              ? isAHit
                ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                : selectedChoice === 'A'
                  ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                  : 'bg-slate-50/60 border-slate-200 opacity-60'
              : selectedChoice === 'A'
                ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
          }`}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
              <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                1
              </span>
              区域 A
            </span>

            {showAnswer && (
              <span
                className={`text-xs font-extrabold flex items-center gap-1 ${
                  isAHit ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {isAHit ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    留白更大 ({question.negRatioA}%)
                  </>
                ) : (
                  `留白 (${question.negRatioA}%)`
                )}
              </span>
            )}
          </div>

          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <canvas
              ref={canvasRefA}
              width={TWO_AFC_CANVAS_SIZE}
              height={TWO_AFC_CANVAS_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm"
            />
          </div>
        </button>

        {/* 卡片 B */}
        <button
          type="button"
          disabled={disabled || showAnswer}
          onClick={() => handleSelectChoice('B')}
          className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
            showAnswer
              ? isBHit
                ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                : selectedChoice === 'B'
                  ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                  : 'bg-slate-50/60 border-slate-200 opacity-60'
              : selectedChoice === 'B'
                ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
          }`}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
              <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                2
              </span>
              区域 B
            </span>

            {showAnswer && (
              <span
                className={`text-xs font-extrabold flex items-center gap-1 ${
                  isBHit ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {isBHit ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    留白更大 ({question.negRatioB}%)
                  </>
                ) : (
                  `留白 (${question.negRatioB}%)`
                )}
              </span>
            )}
          </div>

          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <canvas
              ref={canvasRefB}
              width={TWO_AFC_CANVAS_SIZE}
              height={TWO_AFC_CANVAS_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm"
            />
          </div>
        </button>
      </div>

      {showAnswer && (
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
                {userAnswer?.isHit ? '瞬时直觉判断正确！' : '直觉判断出现偏差'}
              </span>
              <span className="text-slate-400 ml-2">
                (留白实际差异率 Δ ={' '}
                <strong className="font-mono text-slate-700">{question.areaDeltaPercent}%</strong>)
              </span>
            </div>
          </div>

          <div className="text-xs font-mono font-bold text-slate-600">
            A: {question.negRatioA}% vs B: {question.negRatioB}%
          </div>
        </div>
      )}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/negativeSpace/VertexFittingView.tsx
~~~~~
~~~~~typescript
import { Check, Columns, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Point } from '../../types';
import {
  FITTING_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../../utils/negativeSpace';
import { drawPolygonCanvas } from '../../utils/canvas/drawPolygon';
import {
  findNearestGridPoint,
  getDynamicCrosshairMetrics,
  getDynamicDotRadius,
} from '../../utils/geometry';

interface VertexFittingViewProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (clickPoint: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  radius: number,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

export function VertexFittingView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: VertexFittingViewProps) {
  const leftFittingRef = useRef<HTMLCanvasElement | null>(null);
  const rightFittingRef = useRef<HTMLCanvasElement | null>(null);
  const [fittingHoverPoint, setFittingHoverPoint] = useState<Point | null>(null);

  useEffect(() => {
    setFittingHoverPoint(null);
  }, [question.id]);

  useEffect(() => {
    if (!question.vertices) return;

    drawPolygonCanvas({
      canvas: leftFittingRef.current,
      vertices: question.vertices,
      size: FITTING_CANVAS_SIZE,
      fillColor: '#0F172A',
      strokeColor: '#1E293B',
    });

    const rightCanvas = rightFittingRef.current;
    if (rightCanvas) {
      const ctx = rightCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, FITTING_CANVAS_SIZE, FITTING_CANVAS_SIZE);

        if (question.truncatedVertices && question.truncatedVertices.length >= 3) {
          ctx.beginPath();
          ctx.moveTo(question.truncatedVertices[0].x, question.truncatedVertices[0].y);
          for (let i = 1; i < question.truncatedVertices.length; i++) {
            ctx.lineTo(question.truncatedVertices[i].x, question.truncatedVertices[i].y);
          }
          ctx.closePath();
          ctx.fillStyle = '#0F172A';
          ctx.fill();
          ctx.strokeStyle = '#1E293B';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        const distractorPoints = question.distractorPoints || [];
        const dotRadius = getDynamicDotRadius(distractorPoints);
        const hoverRadius = Math.max(2.5, dotRadius * 1.6);

        for (const p of distractorPoints) {
          drawDot(ctx, p.x, p.y, '#888888', dotRadius);
        }

        if (!disabled && !showAnswer && fittingHoverPoint) {
          drawDot(ctx, fittingHoverPoint.x, fittingHoverPoint.y, '#4F46E5', hoverRadius);
        }

        if (showAnswer && question.targetPoint) {
          const { x: tx, y: ty } = question.targetPoint;
          const { size: chSize, lineWidth: chLineWidth } =
            getDynamicCrosshairMetrics(distractorPoints);

          ctx.beginPath();
          ctx.moveTo(question.vertices[0].x, question.vertices[0].y);
          for (let i = 1; i < question.vertices.length; i++) {
            ctx.lineTo(question.vertices[i].x, question.vertices[i].y);
          }
          ctx.closePath();
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.7)';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.strokeStyle = '#00AA00';
          ctx.lineWidth = chLineWidth;
          ctx.beginPath();
          ctx.moveTo(tx - chSize, ty);
          ctx.lineTo(tx + chSize, ty);
          ctx.moveTo(tx, ty - chSize);
          ctx.lineTo(tx, ty + chSize);
          ctx.stroke();
          drawDot(ctx, tx, ty, '#000000', dotRadius);

          if (userAnswer?.nearestGridPoint && !userAnswer.isHit) {
            const chosen = userAnswer.nearestGridPoint;
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = Math.max(1, chLineWidth * 0.85);
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(chosen.x, chosen.y);
            ctx.lineTo(tx, ty);
            ctx.stroke();
            ctx.setLineDash([]);
            drawDot(ctx, chosen.x, chosen.y, '#FF0000', dotRadius);
          }
        }
      }
    }
  }, [question, showAnswer, userAnswer, fittingHoverPoint, disabled]);

  const handleFittingMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer || !question.distractorPoints) {
      if (fittingHoverPoint) setFittingHoverPoint(null);
      return;
    }

    const canvas = rightFittingRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = FITTING_CANVAS_SIZE / rect.width;
    const scaleY = FITTING_CANVAS_SIZE / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX * 100) / 100;
    const clickY = Math.round((e.clientY - rect.top) * scaleY * 100) / 100;

    const { nearestPoint, isWithinRange } = findNearestGridPoint(
      { x: clickX, y: clickY },
      question.distractorPoints,
    );

    if (isWithinRange) {
      setFittingHoverPoint(nearestPoint);
    } else if (fittingHoverPoint) {
      setFittingHoverPoint(null);
    }
  };

  const handleFittingClick = (e: MouseEvent) => {
    if (disabled || showAnswer || !question.distractorPoints) return;

    const canvas = rightFittingRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = FITTING_CANVAS_SIZE / rect.width;
    const scaleY = FITTING_CANVAS_SIZE / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX * 100) / 100;
    const clickY = Math.round((e.clientY - rect.top) * scaleY * 100) / 100;

    const clickPoint: Point = { x: clickX, y: clickY };
    const { isWithinRange } = findNearestGridPoint(clickPoint, question.distractorPoints);

    if (!isWithinRange) return;

    setFittingHoverPoint(null);
    onAnswer(clickPoint);
  };

  return (
    <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          <Columns className="w-3.5 h-3.5 text-indigo-600" />
          对比左侧负形空间，在右侧点阵中点击定位被截断的顶点
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            完整剪影参考
          </span>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner">
            <canvas
              ref={leftFittingRef}
              width={FITTING_CANVAS_SIZE}
              height={FITTING_CANVAS_SIZE}
              className="w-full max-w-[300px] aspect-square rounded-xl border border-slate-100 shadow-sm"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
            交互定点画布 (点击定位)
          </span>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner">
            <canvas
              ref={rightFittingRef}
              width={FITTING_CANVAS_SIZE}
              height={FITTING_CANVAS_SIZE}
              onClick={handleFittingClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
              }}
              tabIndex={0}
              role="button"
              aria-label="右侧定点做答画布"
              onMouseMove={handleFittingMouseMove}
              onMouseLeave={() => setFittingHoverPoint(null)}
              className={`w-full max-w-[300px] aspect-square rounded-xl border border-slate-100 shadow-sm transition-all ${
                disabled || showAnswer
                  ? 'cursor-default'
                  : fittingHoverPoint
                    ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
                    : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
              }`}
            />
          </div>
        </div>
      </div>

      {showAnswer && (
        <div className="w-full max-w-xl bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in">
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
                {userAnswer?.isHit ? '精准命中目标顶点！' : '定点定位出现偏差'}
              </span>
              <span className="text-slate-400 ml-2">
                (像素误差:{' '}
                <strong className="font-mono text-slate-700">{userAnswer?.errorValue}px</strong>)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/negativeSpace/ShapeMemory2AfcView.tsx
~~~~~
~~~~~typescript
import { Check, Sparkles, X } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../../utils/negativeSpace';
import { drawPolygonCanvas } from '../../utils/canvas/drawPolygon';

interface ShapeMemory2AfcViewProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (choice: 0 | 1) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function ShapeMemory2AfcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: ShapeMemory2AfcViewProps) {
  const [matchPhase, setMatchPhase] = useState<'stimulus' | 'recall'>('stimulus');
  const [selectedMatchChoice, setSelectedMatchChoice] = useState<'A' | 'B' | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const matchOptionRefA = useRef<HTMLCanvasElement | null>(null);
  const matchOptionRefB = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setMatchPhase('stimulus');
    setSelectedMatchChoice(null);
  }, [question.id]);

  useEffect(() => {
    if (matchPhase === 'stimulus' && !showAnswer) {
      const timer = setTimeout(() => {
        setMatchPhase('recall');
      }, question.displayTimeMs || 1500);
      return () => clearTimeout(timer);
    }
  }, [matchPhase, question.displayTimeMs, showAnswer]);

  useEffect(() => {
    if (matchPhase === 'stimulus' && question.targetPolygon) {
      drawPolygonCanvas({
        canvas: canvasRef.current,
        vertices: question.targetPolygon,
        size: NEGATIVE_SPACE_CANVAS_SIZE,
      });
    }
  }, [matchPhase, question.targetPolygon]);

  useEffect(() => {
    if ((matchPhase === 'recall' || showAnswer) && question.optionsPolygons) {
      drawPolygonCanvas({
        canvas: matchOptionRefA.current,
        vertices: question.optionsPolygons[0],
        size: NEGATIVE_SPACE_CANVAS_SIZE,
      });
      drawPolygonCanvas({
        canvas: matchOptionRefB.current,
        vertices: question.optionsPolygons[1],
        size: NEGATIVE_SPACE_CANVAS_SIZE,
      });
    }
  }, [matchPhase, showAnswer, question.optionsPolygons]);

  const handleSelectMatchChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer || matchPhase !== 'recall') return;
      setSelectedMatchChoice(choice);
      onAnswer(choice === 'A' ? 0 : 1);
    },
    [disabled, showAnswer, matchPhase, onAnswer],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || showAnswer || matchPhase !== 'recall') return;
      if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
        e.preventDefault();
        handleSelectMatchChoice('A');
      } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
        e.preventDefault();
        handleSelectMatchChoice('B');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, showAnswer, matchPhase, handleSelectMatchChoice]);

  const isRevealed = showAnswer;
  const isTargetA = question.correctOptionIndex === 0;
  const isTargetB = question.correctOptionIndex === 1;

  const isSelectedA =
    selectedMatchChoice === 'A' ||
    userAnswer?.userChoice === 'A' ||
    userAnswer?.userChoiceIndex === 0;
  const isSelectedB =
    selectedMatchChoice === 'B' ||
    userAnswer?.userChoice === 'B' ||
    userAnswer?.userChoiceIndex === 1;

  return (
    <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          {matchPhase === 'stimulus' && !isRevealed
            ? `瞬时记忆负形轮廓特征 (${question.displayTimeMs}ms)`
            : '匹配回忆：哪一侧与刚才展示完全相同？(键 1 / 2)'}
        </div>
      )}

      {matchPhase === 'stimulus' && !isRevealed ? (
        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 shadow-inner flex flex-col items-center gap-3 w-full max-w-sm">
          <canvas
            ref={canvasRef}
            width={NEGATIVE_SPACE_CANVAS_SIZE}
            height={NEGATIVE_SPACE_CANVAS_SIZE}
            className="w-full aspect-square rounded-2xl border border-slate-200 shadow-sm"
          />
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              key={`${question.id}-${matchPhase}`}
              className="bg-indigo-600 h-full"
              style={{
                width: '100%',
                animation: `shrinkWidth ${question.displayTimeMs}ms linear forwards`,
              }}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          {/* 卡片 A */}
          <button
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => handleSelectMatchChoice('A')}
            className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
              isRevealed
                ? isTargetA
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : isSelectedA
                    ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                : isSelectedA
                  ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                  1
                </span>
                区域 A
              </span>

              {isRevealed && isTargetA && (
                <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
                  <Check className="w-4 h-4 text-emerald-600" />
                  真实目标
                </span>
              )}
            </div>

            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={matchOptionRefA}
                width={NEGATIVE_SPACE_CANVAS_SIZE}
                height={NEGATIVE_SPACE_CANVAS_SIZE}
                className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm"
              />
            </div>
          </button>

          {/* 卡片 B */}
          <button
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => handleSelectMatchChoice('B')}
            className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
              isRevealed
                ? isTargetB
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : isSelectedB
                    ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                : isSelectedB
                  ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                  2
                </span>
                区域 B
              </span>

              {isRevealed && isTargetB && (
                <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
                  <Check className="w-4 h-4 text-emerald-600" />
                  真实目标
                </span>
              )}
            </div>

            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={matchOptionRefB}
                width={NEGATIVE_SPACE_CANVAS_SIZE}
                height={NEGATIVE_SPACE_CANVAS_SIZE}
                className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm"
              />
            </div>
          </button>
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
                {userAnswer?.isHit ? '瞬时形态记忆完全正确！' : '记忆形态判断出现偏差'}
              </span>
              <span className="text-slate-400 ml-2">
                (正确目标为: 区域 {question.correctChoice})
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
~~~~~

#### Acts 3: 重构 `src/components/NegativeSpaceCanvas.tsx` 为顶层路由分发组件

~~~~~act
write_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript
import type { Point } from '../types';
import type { NegativeSpaceHitResult, NegativeSpaceQuestionData } from '../utils/negativeSpace';
import { AreaComparison2AfcView } from './negativeSpace/AreaComparison2AfcView';
import { RatioEstimationView } from './negativeSpace/RatioEstimationView';
import { ShapeMemory2AfcView } from './negativeSpace/ShapeMemory2AfcView';
import { VertexFittingView } from './negativeSpace/VertexFittingView';

interface NegativeSpaceCanvasProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (val: number | 'A' | 'B' | Point) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function NegativeSpaceCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: NegativeSpaceCanvasProps) {
  const { mode } = question;

  if (mode === 'AREA_COMPARISON_2AFC') {
    return (
      <AreaComparison2AfcView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(choice) => onAnswer(choice)}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'NEGATIVE_VERTEX_FITTING') {
    return (
      <VertexFittingView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(point) => onAnswer(point)}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'SHAPE_MATCH_2AFC') {
    return (
      <ShapeMemory2AfcView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(choiceIdx) => onAnswer(choiceIdx)}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  // 默认 RATIO_ESTIMATION 滑块评估模式
  return (
    <RatioEstimationView
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={(ratio) => onAnswer(ratio)}
      disabled={disabled}
      hitMargin={hitMargin}
      showToleranceBand={showToleranceBand}
      showCanvasHints={showCanvasHints}
    />
  );
}
~~~~~

### 下一步建议
- **执行构建与单元测试验证**：运行 `npm test` 和 `npm run build`，验证正负形模块的各项功能及向后兼容性。
- **继续拆分 P2 任务**：拆分全局插件配置中心 `src/config/trainingPlugins.tsx`，将各个领域的插件定义隔离到 `src/config/plugins/` 目录中。
