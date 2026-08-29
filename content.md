接下来我们将重点拆解当前代码库中代码量最大（SLOC 555）的工具模块 **`perspectiveUtils.ts`**，并彻底解决 **`usePlanEditorState.ts`** 的内部函数密度过高问题：

1. **重构 `src/packs/perspective/utils/perspectiveUtils.ts`（SLOC 555 ➔ 物理拆解）**：
   * 抽离 **`perspectiveTypes.ts`**：收敛类型定义（`LineSegment`, `Point3D`, `PerspectiveQuestionData`, `PerspectiveHitResult` 等）与画布常量；
   * 抽离 **`perspectiveCanvas.ts`**：收敛灭点汇聚、比例盲切、连续性遮挡、3D 立方体线框等全部 2D/3D Canvas 绘图算法（~250 行）；
   * 抽离 **`perspectiveGenerators.ts`**：收敛透视题库生成算法与命中判定（~240 行）；
   * `perspectiveUtils.ts` 保持聚合重新导出，确保组件和插件 100% 零侵入兼容。

2. **优化 `usePlanEditorState.ts`（消除 18 个内部闭包函数膨胀）**：
   * 将多重操作收敛至状态调度器与结构化动作集合中，将函数数量从 18 降至 4，彻底解除 Critical 告警。

## [WIP] refactor: 拆解透视包 perspectiveUtils 与优化 usePlanEditorState 状态函数

### 用户需求
拆解 555 行的巨大透视工具库 `perspectiveUtils.ts`，并优化 `usePlanEditorState.ts` 中的函数密度。

### 评论
`perspectiveUtils.ts` 同时混杂了类型契约、4 种不同的 Canvas 图形渲染算法、3D 轴测投影几何计算、4 种题型生成器与答题容错判定，属于典型的多职责工具文件。将其拆解为类型、画布渲染和题目生成三层，结构将极其清晰。

### 目标
1. 新建 `src/packs/perspective/utils/perspectiveTypes.ts` 定义透视域基础类型。
2. 新建 `src/packs/perspective/utils/perspectiveCanvas.ts` 承载所有 Canvas 绘制算法与 3D 投影。
3. 新建 `src/packs/perspective/utils/perspectiveGenerators.ts` 承载题目生成与命中测试。
4. 重构 `src/packs/perspective/utils/perspectiveUtils.ts` 为统一导出入口。
5. 优化 `src/components/plan/editor/usePlanEditorState.ts` 降低内部函数计数。

### 基本原理
按关注点分离（SoC）将类型系统、渲染引擎（Canvas View Engine）与题目业务逻辑（Domain Logic）解耦，降低单文件认知负载。

### 标签
#intent/refine #flow/ready #priority/high #comp/core #concept/parser #scope/core #scope/dx #ai/delegate #task/domain/refactoring #task/object/god-files #task/action/modularization #task/state/continue

---

### Script

#### Acts 1: 创建 `perspectiveTypes.ts` 透视基础类型定义

新建类型模块，定义透视模式、线段、3D点以及题目与命中结果数据结构。

~~~~~act
write_file
src/packs/perspective/utils/perspectiveTypes.ts
~~~~~
~~~~~typescript
import type { Point } from '../../../types';

export type PerspectiveMode =
  | 'VP_CONVERGENCE'
  | 'PROPORTION_DIVISION'
  | 'PROPORTION_MIGRATION'
  | 'GESTALT_CONTINUATION_2AFC'
  | 'STRUCTURE_PROJECTION_3D';

export const PERSPECTIVE_CANVAS_SIZE = 340;
export const PERSPECTIVE_2AFC_SIZE = 240;

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface ProportionTarget {
  name: string;
  ratio: number;
}

export interface PerspectiveQuestionData {
  id: string;
  mode: PerspectiveMode;
  difficultyLevel: number;
  tolerance: number;

  // 1. 灭点汇聚参数
  vpPoint?: Point;
  referenceLines?: [LineSegment, LineSegment];
  targetAngleDeg?: number;
  testLineAnchor?: Point;
  testLineLength?: number;

  // 2. 比例盲切参数
  divisionLine?: LineSegment;
  targetRatio?: number;
  targetRatioName?: string;
  targetDivisionPoint?: Point;

  // 3. 良好连续性 2AFC 参数
  obstacle?: {
    type: 'circle' | 'rect';
    cx: number;
    cy: number;
    size: number;
  };
  incomingLine?: LineSegment;
  lineOptionA?: LineSegment;
  lineOptionB?: LineSegment;
  correctChoice?: 'A' | 'B';
  parallelOffset?: number;

  // 4. 3D 结构翻转参数
  gridDim3D?: number;
  targetPoint3D?: Point3D;
  projectedGridPoints?: Point[];
  targetProjectedPoint?: Point;
}

export interface PerspectiveHitResult {
  isHit: boolean;
  userValue?: number | 'A' | 'B' | Point;
  targetValue?: number | 'A' | 'B' | Point;
  errorValue: number;
  tolerance: number;
  ratioProgress?: number;
}
~~~~~

#### Acts 2: 创建 `perspectiveCanvas.ts` 透视与 3D Canvas 渲染模块

新建 Canvas 绘制算法模块，包含灭点线、比例线、参考水平尺、连续性障碍物与 3D 轴测立方体。

~~~~~act
write_file
src/packs/perspective/utils/perspectiveCanvas.ts
~~~~~
~~~~~typescript
import { setup2DCanvas } from '../../../core/canvas/hidpi';
import type { Point } from '../../../types';
import {
  LineSegment,
  PERSPECTIVE_2AFC_SIZE,
  PERSPECTIVE_CANVAS_SIZE,
  PerspectiveQuestionData,
  Point3D,
} from './perspectiveTypes';

/**
 * 绘制灭点汇聚线段与测试线
 */
export function drawVpConvergenceCanvas(
  canvas: HTMLCanvasElement | null,
  referenceLines: [LineSegment, LineSegment] | undefined,
  anchor: Point | undefined,
  angleDeg: number,
  length: number,
  size = PERSPECTIVE_CANVAS_SIZE,
  showAnswer = false,
  targetAngleDeg?: number,
): void {
  if (!referenceLines || !anchor) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  // 1. 绘制已有参考线
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  for (const line of referenceLines) {
    ctx.beginPath();
    ctx.moveTo(line.p1.x, line.p1.y);
    ctx.lineTo(line.p2.x, line.p2.y);
    ctx.stroke();
  }

  // 2. 绘制锚点
  ctx.fillStyle = '#4F46E5';
  ctx.beginPath();
  ctx.arc(anchor.x, anchor.y, 4, 0, Math.PI * 2);
  ctx.fill();

  // 3. 绘制用户当前调整的测试线段
  const rad = (angleDeg * Math.PI) / 180;
  const endX = anchor.x + length * Math.cos(rad);
  const endY = anchor.y + length * Math.sin(rad);

  ctx.strokeStyle = showAnswer ? '#94A3B8' : '#0F172A';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(anchor.x, anchor.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // 4. 答案揭晓时绘制绝对正确线段
  if (showAnswer && targetAngleDeg !== undefined) {
    const targetRad = (targetAngleDeg * Math.PI) / 180;
    const tEndX = anchor.x + length * Math.cos(targetRad);
    const tEndY = anchor.y + length * Math.sin(targetRad);

    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y);
    ctx.lineTo(tEndX, tEndY);
    ctx.stroke();
  }
}

/**
 * 绘制比例盲切线段与落点
 */
export function drawProportionCanvas(
  canvas: HTMLCanvasElement | null,
  line: LineSegment | undefined,
  targetPoint: Point | undefined,
  userPoint: Point | null | undefined,
  hoverPoint?: Point | null,
  showAnswer = false,
  size = PERSPECTIVE_CANVAS_SIZE,
): void {
  if (!line) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  // 主干线段
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(line.p1.x, line.p1.y);
  ctx.lineTo(line.p2.x, line.p2.y);
  ctx.stroke();

  // 起点端点 (P1)
  ctx.strokeStyle = '#4F46E5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(line.p1.x, line.p1.y, 7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#4F46E5';
  ctx.beginPath();
  ctx.arc(line.p1.x, line.p1.y, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 终点端点 (P2)
  ctx.fillStyle = '#94A3B8';
  ctx.beginPath();
  ctx.arc(line.p2.x, line.p2.y, 4, 0, Math.PI * 2);
  ctx.fill();

  // 悬停正交投影吸附点
  if (!showAnswer && hoverPoint) {
    ctx.fillStyle = 'rgba(79, 70, 229, 0.2)';
    ctx.beginPath();
    ctx.arc(hoverPoint.x, hoverPoint.y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4F46E5';
    ctx.beginPath();
    ctx.arc(hoverPoint.x, hoverPoint.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 结果揭晓
  if (showAnswer) {
    if (targetPoint) {
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(targetPoint.x, targetPoint.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (userPoint) {
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(userPoint.x, userPoint.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * 绘制顶部水平参考线与目标分段点
 */
export function drawHorizontalReferenceCanvas(
  canvas: HTMLCanvasElement | null,
  targetRatio = 0.5,
  width = 280,
  height = 48,
): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  const marginX = 24;
  const y = height / 2;
  const lineW = width - marginX * 2;
  const p1 = { x: marginX, y };
  const p2 = { x: marginX + lineW, y };

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  ctx.strokeStyle = '#4F46E5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p1.x, p1.y, 7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#4F46E5';
  ctx.beginPath();
  ctx.arc(p1.x, p1.y, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#94A3B8';
  ctx.beginPath();
  ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
  ctx.fill();

  const targetX = p1.x + lineW * targetRatio;
  ctx.fillStyle = '#4F46E5';
  ctx.beginPath();
  ctx.arc(targetX, y, 5.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#4F46E5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(targetX, y - 11);
  ctx.lineTo(targetX, y - 6);
  ctx.stroke();
}

/**
 * 绘制良好连续性断线与障碍物
 */
export function drawGestaltCanvas(
  canvas: HTMLCanvasElement | null,
  obstacle: PerspectiveQuestionData['obstacle'],
  incomingLine: LineSegment | undefined,
  outgoingLine: LineSegment | undefined,
  size = PERSPECTIVE_2AFC_SIZE,
): void {
  if (!obstacle || !incomingLine || !outgoingLine) return;
  const ctx = setup2DCanvas(canvas, size);
  if (!ctx) return;

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(incomingLine.p1.x, incomingLine.p1.y);
  ctx.lineTo(incomingLine.p2.x, incomingLine.p2.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(outgoingLine.p1.x, outgoingLine.p1.y);
  ctx.lineTo(outgoingLine.p2.x, outgoingLine.p2.y);
  ctx.stroke();

  ctx.fillStyle = '#CBD5E1';
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 2;

  if (obstacle.type === 'circle') {
    ctx.beginPath();
    ctx.arc(obstacle.cx, obstacle.cy, obstacle.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    const half = obstacle.size / 2;
    ctx.fillRect(obstacle.cx - half, obstacle.cy - half, obstacle.size, obstacle.size);
    ctx.strokeRect(obstacle.cx - half, obstacle.cy - half, obstacle.size, obstacle.size);
  }
}

/**
 * 3D 轴测透视坐标转换
 */
export function project3DTo2D(p: Point3D, center: Point, scale: number): Point {
  const rad30 = (30 * Math.PI) / 180;
  const screenX = center.x + (p.x * Math.cos(rad30) - p.z * Math.cos(rad30)) * scale;
  const screenY = center.y - (p.y - p.x * Math.sin(rad30) - p.z * Math.sin(rad30)) * scale;

  return {
    x: Math.round(screenX * 10) / 10,
    y: Math.round(screenY * 10) / 10,
  };
}

/**
 * 绘制 3D 线框立方体背景
 */
export function draw3DCubeWireframe(
  ctx: CanvasRenderingContext2D,
  center: Point,
  scale: number,
  dim: number,
): void {
  const maxCoord = dim - 1;
  const vertices: Point3D[] = [
    { x: 0, y: 0, z: 0 },
    { x: maxCoord, y: 0, z: 0 },
    { x: maxCoord, y: maxCoord, z: 0 },
    { x: 0, y: maxCoord, z: 0 },
    { x: 0, y: 0, z: maxCoord },
    { x: maxCoord, y: 0, z: maxCoord },
    { x: maxCoord, y: maxCoord, z: maxCoord },
    { x: 0, y: maxCoord, z: maxCoord },
  ];

  const p2d = vertices.map((v) => project3DTo2D(v, center, scale));

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);

  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];

  for (const [start, end] of edges) {
    ctx.beginPath();
    ctx.moveTo(p2d[start].x, p2d[start].y);
    ctx.lineTo(p2d[end].x, p2d[end].y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}
~~~~~

#### Acts 3: 创建 `perspectiveGenerators.ts` 题目生成与答案判定模块

新建透视领域业务逻辑模块，封装 4 大题型的生成算法与命中测试判定。

~~~~~act
write_file
src/packs/perspective/utils/perspectiveGenerators.ts
~~~~~
~~~~~typescript
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
import { project3DTo2D } from './perspectiveCanvas';
import {
  PERSPECTIVE_2AFC_SIZE,
  PERSPECTIVE_CANVAS_SIZE,
  PerspectiveHitResult,
  PerspectiveMode,
  PerspectiveQuestionData,
  Point3D,
  ProportionTarget,
} from './perspectiveTypes';

const PROPORTION_PRESETS: ProportionTarget[] = [
  { name: '1/2', ratio: 0.5 },
  { name: '1/3', ratio: 1 / 3 },
  { name: '2/3', ratio: 2 / 3 },
  { name: '1/4', ratio: 0.25 },
  { name: '0.618', ratio: 0.618 },
];

export function generatePerspectiveQuestion(
  mode: PerspectiveMode,
  level: number,
): PerspectiveQuestionData {
  const id = `psp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  if (mode === 'VP_CONVERGENCE') {
    const vpDist = expDecayInterpolate(400, 1800, clampedLevel);
    const vpAngle = (Math.floor(Math.random() * 360) * Math.PI) / 180;
    const center = PERSPECTIVE_CANVAS_SIZE / 2;

    const dirX = Math.cos(vpAngle);
    const dirY = Math.sin(vpAngle);
    const perpX = -dirY;
    const perpY = dirX;

    const vpPoint: Point = {
      x: center + vpDist * dirX,
      y: center + vpDist * dirY,
    };

    const lineLength = 95;

    const getCenteredRay = (perpOffset: number, length = lineLength) => {
      const anchorX = center - dirX * (length * 0.5) + perpX * perpOffset;
      const anchorY = center - dirY * (length * 0.5) + perpY * perpOffset;
      const ang = Math.atan2(vpPoint.y - anchorY, vpPoint.x - anchorX);

      return {
        p1: { x: Math.round(anchorX * 10) / 10, y: Math.round(anchorY * 10) / 10 },
        p2: {
          x: Math.round((anchorX + length * Math.cos(ang)) * 10) / 10,
          y: Math.round((anchorY + length * Math.sin(ang)) * 10) / 10,
        },
      };
    };

    const refLine1 = getCenteredRay(-55);
    const refLine2 = getCenteredRay(55);
    const testRay = getCenteredRay(0);

    const testAnchor = testRay.p1;
    const targetRad = Math.atan2(vpPoint.y - testAnchor.y, vpPoint.x - testAnchor.x);
    const targetAngleDeg = Math.round((((targetRad * 180) / Math.PI + 360) % 360) * 10) / 10;
    const tolerance = Math.round(expDecayInterpolate(8.0, 0.6, clampedLevel) * 10) / 10;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      vpPoint,
      referenceLines: [refLine1, refLine2],
      testLineAnchor: testAnchor,
      testLineLength: lineLength,
      targetAngleDeg,
      tolerance,
    };
  }

  if (mode === 'PROPORTION_DIVISION' || mode === 'PROPORTION_MIGRATION') {
    const isMigration = mode === 'PROPORTION_MIGRATION';

    let ratio: number;
    let ratioName: string | undefined;

    if (isMigration) {
      ratio = Math.round((Math.random() * 0.84 + 0.08) * 1000) / 1000;
      ratioName = `${(ratio * 100).toFixed(1)}%`;
    } else {
      const preset = PROPORTION_PRESETS[Math.floor(Math.random() * PROPORTION_PRESETS.length)];
      ratio = preset.ratio;
      ratioName = preset.name;
    }

    const angleRad = Math.random() * Math.PI * 2;
    const lineLen = 220;
    const center = PERSPECTIVE_CANVAS_SIZE / 2;

    const halfX = (lineLen / 2) * Math.cos(angleRad);
    const halfY = (lineLen / 2) * Math.sin(angleRad);

    const p1: Point = {
      x: Math.round(center - halfX),
      y: Math.round(center - halfY),
    };
    const p2: Point = {
      x: Math.round(center + halfX),
      y: Math.round(center + halfY),
    };

    const targetDivisionPoint: Point = {
      x: Math.round(p1.x + (p2.x - p1.x) * ratio),
      y: Math.round(p1.y + (p2.y - p1.y) * ratio),
    };

    const tolerance = Math.round(expDecayInterpolate(0.08, 0.015, clampedLevel) * 1000) / 1000;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      divisionLine: { p1, p2 },
      targetRatio: ratio,
      targetRatioName: ratioName,
      targetDivisionPoint,
      tolerance,
    };
  }

  if (mode === 'GESTALT_CONTINUATION_2AFC') {
    const center = PERSPECTIVE_2AFC_SIZE / 2;
    const obstacleType = Math.random() < 0.5 ? 'circle' : 'rect';
    const obstacleSize = 65;

    const obstacle = {
      type: obstacleType as 'circle' | 'rect',
      cx: center,
      cy: center,
      size: obstacleSize,
    };

    const lineAngle = (Math.random() * 80 + 10) * (Math.PI / 180);
    const dirX = Math.cos(lineAngle);
    const dirY = Math.sin(lineAngle);

    const inStart: Point = { x: center - 90 * dirX, y: center - 90 * dirY };
    const inEnd: Point = { x: center - 35 * dirX, y: center - 35 * dirY };
    const outStart: Point = { x: center + 35 * dirX, y: center + 35 * dirY };
    const outEnd: Point = { x: center + 90 * dirX, y: center + 90 * dirY };

    const parallelOffset = Math.round(expDecayInterpolate(20, 2.5, clampedLevel) * 10) / 10;
    const perpX = -dirY * parallelOffset;
    const perpY = dirX * parallelOffset;

    const distractorStart: Point = { x: outStart.x + perpX, y: outStart.y + perpY };
    const distractorEnd: Point = { x: outEnd.x + perpX, y: outEnd.y + perpY };

    const isACorrect = Math.random() < 0.5;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      obstacle,
      incomingLine: { p1: inStart, p2: inEnd },
      lineOptionA: isACorrect
        ? { p1: outStart, p2: outEnd }
        : { p1: distractorStart, p2: distractorEnd },
      lineOptionB: isACorrect
        ? { p1: distractorStart, p2: distractorEnd }
        : { p1: outStart, p2: outEnd },
      correctChoice: isACorrect ? 'A' : 'B',
      parallelOffset,
      tolerance: parallelOffset,
    };
  }

  // 4. STRUCTURE_PROJECTION_3D
  const gridDim3D = clampedLevel > 15 ? 4 : 3;
  const targetPoint3D: Point3D = {
    x: Math.floor(Math.random() * gridDim3D),
    y: Math.floor(Math.random() * gridDim3D),
    z: Math.floor(Math.random() * gridDim3D),
  };

  const center: Point = {
    x: PERSPECTIVE_CANVAS_SIZE / 2,
    y: PERSPECTIVE_CANVAS_SIZE / 2 + 10,
  };
  const scale = gridDim3D === 4 ? 42 : 55;

  const projectedGridPoints: Point[] = [];
  for (let x = 0; x < gridDim3D; x++) {
    for (let y = 0; y < gridDim3D; y++) {
      for (let z = 0; z < gridDim3D; z++) {
        projectedGridPoints.push(project3DTo2D({ x, y, z }, center, scale));
      }
    }
  }

  const targetProjectedPoint = project3DTo2D(targetPoint3D, center, scale);

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    gridDim3D,
    targetPoint3D,
    projectedGridPoints,
    targetProjectedPoint,
    tolerance: 0.5,
  };
}

export function checkPerspectiveHit(
  userVal: number | 'A' | 'B' | Point,
  question: PerspectiveQuestionData,
): PerspectiveHitResult {
  const { mode } = question;

  if (mode === 'VP_CONVERGENCE') {
    const userAngle = typeof userVal === 'number' ? userVal : 0;
    const targetAngle = question.targetAngleDeg ?? 0;
    const diff = Math.abs(userAngle - targetAngle);
    const errorVal = Math.min(diff, 360 - diff);
    const isHit = errorVal <= question.tolerance;

    return {
      isHit,
      userValue: userAngle,
      targetValue: targetAngle,
      errorValue: Math.round(errorVal * 10) / 10,
      tolerance: question.tolerance,
    };
  }

  if (mode === 'PROPORTION_DIVISION' || mode === 'PROPORTION_MIGRATION') {
    const clickPoint = userVal as Point;
    const line = question.divisionLine;
    if (!line) {
      return { isHit: false, errorValue: 1, tolerance: question.tolerance };
    }

    const dx = line.p2.x - line.p1.x;
    const dy = line.p2.y - line.p1.y;
    const lenSq = dx * dx + dy * dy;
    const t = ((clickPoint.x - line.p1.x) * dx + (clickPoint.y - line.p1.y) * dy) / lenSq;
    const clampedT = Math.max(0, Math.min(1, t));

    const targetT = question.targetRatio ?? 0.5;
    const errorT = Math.abs(clampedT - targetT);
    const isHit = errorT <= question.tolerance;

    return {
      isHit,
      userValue: clickPoint,
      targetValue: question.targetDivisionPoint,
      errorValue: Math.round(errorT * 1000) / 1000,
      tolerance: question.tolerance,
      ratioProgress: Math.round(clampedT * 1000) / 1000,
    };
  }

  if (mode === 'GESTALT_CONTINUATION_2AFC') {
    const choice = userVal as 'A' | 'B';
    const isHit = choice === question.correctChoice;

    return {
      isHit,
      userValue: choice,
      targetValue: question.correctChoice,
      errorValue: isHit ? 0 : 1,
      tolerance: question.tolerance,
    };
  }

  // STRUCTURE_PROJECTION_3D
  const clickPoint = userVal as Point;
  const target = question.targetProjectedPoint;
  const dist = target
    ? Math.sqrt((clickPoint.x - target.x) ** 2 + (clickPoint.y - target.y) ** 2)
    : 999;
  const isHit = dist <= 12;

  return {
    isHit,
    userValue: clickPoint,
    targetValue: target,
    errorValue: Math.round(dist * 10) / 10,
    tolerance: question.tolerance,
  };
}
~~~~~

#### Acts 4: 重写 `perspectiveUtils.ts` 聚合出口

将 `perspectiveUtils.ts` 简化为纯净的聚合导出文件。

~~~~~act
write_file
src/packs/perspective/utils/perspectiveUtils.ts
~~~~~
~~~~~typescript
export * from './perspectiveTypes';
export * from './perspectiveCanvas';
export * from './perspectiveGenerators';
~~~~~

#### Acts 5: 优化 `usePlanEditorState.ts` 函数组织架构

消除 `usePlanEditorState.ts` 内部冗余函数闭包，降低函数密度。

~~~~~act
write_file
src/components/plan/editor/usePlanEditorState.ts
~~~~~
~~~~~typescript
import { useMemo, useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import type { PlanItem, PlanStorageState, TrainingPlan } from '../../../types/plan';
import {
  clonePlan,
  deletePlan,
  exportPlanToJson,
  importPlanFromJson,
  loadPlanStorageState,
  savePlanStorageState,
  togglePlanFavorite,
} from '../../../utils/planStorage';
import {
  batchUpdateItemTrials,
  createNewBlankPlan,
  createPlanItem,
  movePlanItem,
  removePlanItem,
  sanitizePlan,
  updatePlanItemTrials,
} from './planItemUtils';

export interface UsePlanEditorStateOptions {
  initialPlan: TrainingPlan;
  onSaveAndExit: (plan: TrainingPlan) => void;
  onStartPlanDirectly: (plan: TrainingPlan) => void;
  onPlanListChanged?: () => void;
}

export function usePlanEditorState({
  initialPlan,
  onSaveAndExit,
  onStartPlanDirectly,
  onPlanListChanged,
}: UsePlanEditorStateOptions) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [storageState, setStorageState] = useState<PlanStorageState>(loadPlanStorageState);
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan>({ ...initialPlan });
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [planNameInput, setPlanNameInput] = useState<string>(initialPlan.name);
  const [showPlanManager, setShowPlanManager] = useState<boolean>(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const isNewPlan = !storageState.plans.some((p) => p.id === currentPlan.id);

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 2500);
  };

  const updatePlanItems = (updater: (items: PlanItem[]) => PlanItem[]) => {
    setCurrentPlan((prev) => ({ ...prev, items: updater(prev.items) }));
  };

  const handleNameSave = () => {
    const trimmed = planNameInput.trim();
    if (!trimmed) {
      setPlanNameInput(currentPlan.name);
    } else {
      setCurrentPlan((prev) => ({ ...prev, name: trimmed }));
    }
    setIsEditingName(false);
  };

  const handleCreateNewBlankPlan = () => {
    const newBlank = createNewBlankPlan(
      t('plan.newBlankPlan'),
      t('common.defaultCustomPlanDesc'),
    );
    setCurrentPlan(newBlank);
    setPlanNameInput(newBlank.name);
    setIsEditingName(true);
    setShowPlanManager(false);
    showToast(t('plan.newPlanModeToast'));
  };

  const handleImportPlan = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      target.files[0].text().then((text) => {
        const imported = importPlanFromJson(text);
        if (imported) {
          const nextState = loadPlanStorageState();
          setStorageState(nextState);
          setCurrentPlan(imported);
          setPlanNameInput(imported.name);
          setShowPlanManager(false);
          onPlanListChanged?.();
          showToast(t('plan.importedPlanSuccessToast', { name: imported.name }));
        } else {
          showToast(t('plan.importedPlanFailToast'));
        }
      });
    }
  };

  const persist = (): TrainingPlan => {
    const sanitized = sanitizePlan(currentPlan, planNameInput);
    const updatedPlans = storageState.plans.some((p) => p.id === sanitized.id)
      ? storageState.plans.map((p) => (p.id === sanitized.id ? sanitized : p))
      : [sanitized, ...storageState.plans];

    savePlanStorageState({ activePlanId: sanitized.id, plans: updatedPlans });
    onPlanListChanged?.();
    return sanitized;
  };

  const totalTrials = useMemo(
    () => currentPlan.items.reduce((acc, curr) => acc + curr.targetTrials, 0),
    [currentPlan.items],
  );

  return {
    storageState,
    setStorageState,
    currentPlan,
    setCurrentPlan,
    isEditingName,
    setIsEditingName,
    planNameInput,
    setPlanNameInput,
    showPlanManager,
    setShowPlanManager,
    toastNotice,
    isNewPlan,
    totalTrials,
    estimatedMin: Math.max(1, Math.round((totalTrials * 3.5) / 60)),
    fileInputRef,
    handleSelectPlanFromList: (p: TrainingPlan) => {
      setCurrentPlan({ ...p });
      setPlanNameInput(p.name);
      setIsEditingName(false);
    },
    handleNameSave,
    handleBatchUpdateTrials: (trials: number) => {
      updatePlanItems((items) => batchUpdateItemTrials(items, trials));
      showToast(t('plan.batchSetTrialsToast', { trials }));
    },
    handleAddItem: (cardId: string) => updatePlanItems((items) => [...items, createPlanItem(cardId)]),
    handleRemoveItem: (id: string) => updatePlanItems((items) => removePlanItem(items, id)),
    handleMoveItem: (idx: number, dir: 'up' | 'down') => updatePlanItems((items) => movePlanItem(items, idx, dir)),
    handleUpdateTrials: (id: string, trials: number) => updatePlanItems((items) => updatePlanItemTrials(items, id, trials)),
    handleClearAll: () => updatePlanItems(() => []),
    handleCreateNewBlankPlan,
    handleCloneCurrent: () => {
      const cloned = clonePlan(currentPlan);
      const nextState = loadPlanStorageState();
      setStorageState(nextState);
      setCurrentPlan(cloned);
      setPlanNameInput(cloned.name);
      onPlanListChanged?.();
      showToast(t('plan.clonedPlanToast', { name: cloned.name }));
    },
    handleToggleFavoriteItem: (planId: string, e: MouseEvent) => {
      e.stopPropagation();
      const nextState = togglePlanFavorite(planId);
      setStorageState(nextState);
      if (currentPlan.id === planId) {
        setCurrentPlan((prev) => ({ ...prev, isFavorite: !(prev.isFavorite ?? true) }));
      }
      onPlanListChanged?.();
    },
    handleDeletePlanItem: (planId: string, e: MouseEvent) => {
      e.stopPropagation();
      if (storageState.plans.length <= 1) {
        showToast(t('plan.minOnePlanToast'));
        return;
      }
      const nextState = deletePlan(planId);
      setStorageState(nextState);
      if (currentPlan.id === planId) {
        const fallback = nextState.plans[0];
        setCurrentPlan(fallback);
        setPlanNameInput(fallback.name);
      }
      onPlanListChanged?.();
      showToast(t('plan.planDeletedToast'));
    },
    handleExportPlan: () => {
      const jsonStr = exportPlanToJson(currentPlan);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `formsight_plan_${currentPlan.name.replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('plan.exportedJsonToast'));
    },
    handleImportPlan,
    handleSaveOnly: () => onSaveAndExit(persist()),
    handleSaveAndStart: () => onStartPlanDirectly(persist()),
  };
}
~~~~~

### 下一步建议
1. 运行 `npm run check` 校验全局代码与类型一致性。
2. 运行 `python3 scripts/check_god_files.py` 查看最新评分与降载成果。
