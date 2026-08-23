这是一个非常精妙且系统化的空间与几何认知训练模块。透视灭点、比例盲切、视知觉完形延伸与 3D 轴测/透视结构翻转是传统绘画形体与透视感知能力的核心训练法。

我将按照 FormSight 的插件与扩展包架构标准（基于 Preact、HTML5 Canvas、点阵拾取与 2AFC 体系），为您完整实现 `perspective` 扩展包及其 4 个核心训练卡片。

## [WIP] feat: 实现透视与空间几何感知扩展包 (perspective pack)

### 用户需求
在 FormSight 中新增全新的 `perspective`（透视与空间几何感知）扩展包，包含以下四张训练卡片：
1. **透视灭点汇聚感 (VP Convergence)**：给定两条已交汇透视线，通过滑块调制第三条线段的倾角使其精确交汇于同一灭点。
2. **比例盲切 (Proportion & Ratio Division)**：在任意角度倾斜线段上，单次点击估测 1/2、1/3、1/4、2/3 或黄金分割点 (0.618)。
3. **断线良好连续性盲接 (Gestalt Good Continuation)**：基于格式塔完形心理学，穿过障碍物进行 2AFC 断线延伸辨识。
4. **3D 结构投影翻转 (Structure 3D Projection)**：左侧提供顶视/正视/侧视三视图标注，右侧在 3D 透视线框立方体的离散点阵中找出对应的三维空间坐标点。

### 评论
透视与空间几何是造型基础中最依赖感知校准的部分。这四种玩法覆盖了灭点直觉、比例分割感、隐蔽线条穿透直觉以及二维正交到三维透视的心理空间旋转能力，架构设计清晰，对艺术家的形体直觉提升价值极高。

### 目标
1. 在 `src/types/card.ts` 中补充 `perspective` 领域标签，在 `src/config/trainingPlugins.tsx` 中注册 `PerspectivePlugin` 类型契约。
2. 在 `src/packs/perspective/utils/perspectiveUtils.ts` 中实现完整的灭点几何投影、线段比例插值与拾取检测、障碍物遮挡穿透以及 3D 立方体透视矩阵投影算法。
3. 创建 4 个专属的视图组件：
   - `PerspectiveVpView.tsx` (滑块调制灭点交汇)
   - `ProportionDivisionView.tsx` (线段点击盲切)
   - `GestaltContinuation2AfcView.tsx` (2AFC 完形断线延伸)
   - `StructureProjection3DView.tsx` (三视图 + 3D 立方体点阵交互)
4. 创建统一的分发视图 `PerspectiveCanvas.tsx`、插件契约实现 `plugin.tsx` 与扩展包注册清单 `index.ts`。

### 基本原理
- **灭点汇聚**：通过在画布可视范围之外或边缘生成随机灭点 $VP$，由 $VP$ 引出两条基准射线及一条待调线段。利用指数衰减控制灭点距离与允许的角度误差 $\pm\Delta\theta$。
- **比例划分**：生成任意倾斜角度和长度的线段，根据目标分割比例 $r \in \{0.5, 0.333, 0.25, 0.667, 0.618\}$ 计算靶点位置。用户在线段附近点击后，计算正交投影参数 $t_{user} = \frac{(P_{user}-A)\cdot(B-A)}{\|B-A\|^2}$，评估百分比误差。
- **断线完形**：生成一条贯穿中心遮挡图形的真实现段，并在出射侧生成平移微小垂直位移 $\Delta d$ 的干扰线段，以 2AFC 呈现供用户辨识真理延伸线。
- **3D 结构投影**：构建归一化 $N\times N\times N$ 的 3D 立方体网格，使用等角透视矩阵投射到 2D Canvas。左侧三视图投影展示正交切面坐标 $(x, y, z)$，右侧将 3D 点阵投射并复用 `findNearestPointInGrid` 算法实现精准定点交互。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/executor #scope/core #scope/ux #ai/instruct #task/domain/geometry #task/object/perspective-pack #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 扩展类型定义与插件契约

更新 `card.ts` 增加 `'perspective'` 目标标签，并在 `trainingPlugins.tsx` 中注入 `PerspectivePlugin`。

~~~~~act
patch_file
src/types/card.ts
~~~~~
~~~~~typescript
export type SensoryTargetTag =
  | 'geometry'
  | 'color'
  | 'relative_color'
  | 'negative_space'
  | 'abstraction'
  | 'concretization'
  | 'angle';
~~~~~
~~~~~typescript
export type SensoryTargetTag =
  | 'geometry'
  | 'color'
  | 'relative_color'
  | 'negative_space'
  | 'abstraction'
  | 'concretization'
  | 'angle'
  | 'perspective';
~~~~~

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript
export type AnglePlugin = TrainingPlugin<unknown, unknown, number | 'A' | 'B', BaseModuleSettings>;

export type AnyDomainPlugin =
  | StarPlugin
  | ColorPlugin
  | RelativeColorPlugin
  | NegativeSpacePlugin
  | AbstractionPlugin
  | AnglePlugin;
~~~~~
~~~~~typescript
export type AnglePlugin = TrainingPlugin<unknown, unknown, number | 'A' | 'B', BaseModuleSettings>;

export type PerspectivePlugin = TrainingPlugin<
  unknown,
  unknown,
  number | 'A' | 'B' | Point,
  BaseModuleSettings
>;

export type AnyDomainPlugin =
  | StarPlugin
  | ColorPlugin
  | RelativeColorPlugin
  | NegativeSpacePlugin
  | AbstractionPlugin
  | AnglePlugin
  | PerspectivePlugin;
~~~~~

#### Acts 2: 创建透视数学与图形算法库

在 `src/packs/perspective/utils/perspectiveUtils.ts` 中实现灭点生成、比例划分与投影、断线连续性、3D 轴测透视矩阵及网格拾取算法。

~~~~~act
write_file
src/packs/perspective/utils/perspectiveUtils.ts
~~~~~
~~~~~typescript
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';

export type PerspectiveMode =
  | 'VP_CONVERGENCE'
  | 'PROPORTION_DIVISION'
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
  if (!canvas || !referenceLines || !anchor) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // 1. 绘制两条已有参考线
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
  showAnswer = false,
  size = PERSPECTIVE_CANVAS_SIZE,
): void {
  if (!canvas || !line) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // 主干线段
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(line.p1.x, line.p1.y);
  ctx.lineTo(line.p2.x, line.p2.y);
  ctx.stroke();

  // 两端端点
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(line.p1.x, line.p1.y, 4, 0, Math.PI * 2);
  ctx.arc(line.p2.x, line.p2.y, 4, 0, Math.PI * 2);
  ctx.fill();

  // 显示用户点击点与真理点
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
 * 绘制良好连续性断线与障碍物
 */
export function drawGestaltCanvas(
  canvas: HTMLCanvasElement | null,
  obstacle: PerspectiveQuestionData['obstacle'],
  incomingLine: LineSegment | undefined,
  outgoingLine: LineSegment | undefined,
  size = PERSPECTIVE_2AFC_SIZE,
): void {
  if (!canvas || !obstacle || !incomingLine || !outgoingLine) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // 入射与出射线段
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

  // 绘制中心遮挡物
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
export function project3DTo2D(
  p: Point3D,
  center: Point,
  scale: number,
): Point {
  // 简易等角/透视投影：x轴向右下 30°，y轴向上 90°，z轴向左下 30°
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
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];

  for (const [start, end] of edges) {
    ctx.beginPath();
    ctx.moveTo(p2d[start].x, p2d[start].y);
    ctx.lineTo(p2d[end].x, p2d[end].y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

const PROPORTION_PRESETS: ProportionTarget[] = [
  { name: '1/2 处 (中心中点)', ratio: 0.5 },
  { name: '1/3 处', ratio: 1 / 3 },
  { name: '2/3 处', ratio: 2 / 3 },
  { name: '1/4 处', ratio: 0.25 },
  { name: '黄金分割点 (0.618)', ratio: 0.618 },
];

/**
 * 题目生成器
 */
export function generatePerspectiveQuestion(
  mode: PerspectiveMode,
  level: number,
): PerspectiveQuestionData {
  const id = `psp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  if (mode === 'VP_CONVERGENCE') {
    // 灭点距离：Level 1 约 400px (近距离灭点)，Level 35 约 1800px (超远长焦透视)
    const vpDist = expDecayInterpolate(400, 1800, clampedLevel);
    const vpAngle = (Math.floor(Math.random() * 360) * Math.PI) / 180;
    const center = PERSPECTIVE_CANVAS_SIZE / 2;

    const vpPoint: Point = {
      x: center + vpDist * Math.cos(vpAngle),
      y: center + vpDist * Math.sin(vpAngle),
    };

    // 参考线 1 和 2
    const refLine1: LineSegment = {
      p1: { x: center - 110, y: center - 80 + Math.random() * 20 },
      p2: { x: 0, y: 0 },
    };
    const ang1 = Math.atan2(vpPoint.y - refLine1.p1.y, vpPoint.x - refLine1.p1.x);
    refLine1.p2 = {
      x: refLine1.p1.x + 90 * Math.cos(ang1),
      y: refLine1.p1.y + 90 * Math.sin(ang1),
    };

    const refLine2: LineSegment = {
      p1: { x: center - 100, y: center + 70 + Math.random() * 20 },
      p2: { x: 0, y: 0 },
    };
    const ang2 = Math.atan2(vpPoint.y - refLine2.p1.y, vpPoint.x - refLine2.p1.x);
    refLine2.p2 = {
      x: refLine2.p1.x + 90 * Math.cos(ang2),
      y: refLine2.p1.y + 90 * Math.sin(ang2),
    };

    // 待调测试线段
    const testAnchor: Point = {
      x: center - 90 + Math.random() * 20,
      y: center + (Math.random() * 40 - 20),
    };
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
      testLineLength: 95,
      targetAngleDeg,
      tolerance,
    };
  }

  if (mode === 'PROPORTION_DIVISION') {
    const preset = PROPORTION_PRESETS[Math.floor(Math.random() * PROPORTION_PRESETS.length)];
    const angleRad = (Math.random() * Math.PI * 2);
    const lineLen = 190 + Math.random() * 60;
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
      x: Math.round(p1.x + (p2.x - p1.x) * preset.ratio),
      y: Math.round(p1.y + (p2.y - p1.y) * preset.ratio),
    };

    const tolerance = Math.round(expDecayInterpolate(0.08, 0.015, clampedLevel) * 1000) / 1000;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      divisionLine: { p1, p2 },
      targetRatio: preset.ratio,
      targetRatioName: preset.name,
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

    const lineAngle = (Math.random() * 80 + 10) * (Math.PI / 180); // 10°~90°
    const dirX = Math.cos(lineAngle);
    const dirY = Math.sin(lineAngle);

    // 入射起点与穿入点
    const inStart: Point = {
      x: center - 90 * dirX,
      y: center - 90 * dirY,
    };
    const inEnd: Point = {
      x: center - 35 * dirX,
      y: center - 35 * dirY,
    };

    // 正确出射点与干扰出射点 (垂直平移 offset)
    const outStart: Point = {
      x: center + 35 * dirX,
      y: center + 35 * dirY,
    };
    const outEnd: Point = {
      x: center + 90 * dirX,
      y: center + 90 * dirY,
    };

    const parallelOffset = Math.round(expDecayInterpolate(20, 2.5, clampedLevel) * 10) / 10;
    const perpX = -dirY * parallelOffset;
    const perpY = dirX * parallelOffset;

    const distractorStart: Point = {
      x: outStart.x + perpX,
      y: outStart.y + perpY,
    };
    const distractorEnd: Point = {
      x: outEnd.x + perpX,
      y: outEnd.y + perpY,
    };

    const isACorrect = Math.random() < 0.5;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      obstacle,
      incomingLine: { p1: inStart, p2: inEnd },
      lineOptionA: isACorrect ? { p1: outStart, p2: outEnd } : { p1: distractorStart, p2: distractorEnd },
      lineOptionB: isACorrect ? { p1: distractorStart, p2: distractorEnd } : { p1: outStart, p2: outEnd },
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

/**
 * 判定答案
 */
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

  if (mode === 'PROPORTION_DIVISION') {
    const clickPoint = userVal as Point;
    const line = question.divisionLine;
    if (!line) {
      return { isHit: false, errorValue: 1, tolerance: question.tolerance };
    }

    // 正交投影计算 t: (P - A)·(B - A) / |B - A|^2
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
  const isHit = dist <= 12; // 点击判定半径

  return {
    isHit,
    userValue: clickPoint,
    targetValue: target,
    errorValue: Math.round(dist * 10) / 10,
    tolerance: question.tolerance,
  };
}
~~~~~

#### Acts 3: 实现 4 张卡片的专属交互视图组件

1. `PerspectiveVpView.tsx`（灭点滑块调制）
2. `ProportionDivisionView.tsx`（线段比例点击盲切）
3. `GestaltContinuation2AfcView.tsx`（2AFC 格式塔断线延续）
4. `StructureProjection3DView.tsx`（三视图正交切面 + 3D 立方体点阵拾取）

~~~~~act
write_file
src/packs/perspective/components/PerspectiveVpView.tsx
~~~~~
~~~~~typescript
import { Sliders } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import {
  drawVpConvergenceCanvas,
  PERSPECTIVE_CANVAS_SIZE,
  type PerspectiveHitResult,
  type PerspectiveQuestionData,
} from '../utils/perspectiveUtils';

interface PerspectiveVpViewProps {
  question: PerspectiveQuestionData;
  showAnswer: boolean;
  userAnswer: PerspectiveHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function PerspectiveVpView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: PerspectiveVpViewProps) {
  const targetVal = question.targetAngleDeg ?? 0;
  const tolerance = question.tolerance;
  const isHit = Boolean(userAnswer?.isHit);
  const userVal = userAnswer?.userValue as number | undefined;

  return (
    <StandardSliderView
      questionId={question.id}
      hintText="观察已有透视基准线，调制滑块旋转第三条射线使其交汇于同一灭点 (0°~360°)"
      hintIcon={Sliders}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label="射线倾角:"
      max={360}
      step={0.5}
      initialValue={180}
      unit="°"
      targetValue={targetVal}
      tolerance={tolerance}
      showToleranceBand={showToleranceBand}
      showAnswer={showAnswer}
      isHit={isHit}
      userValue={userVal}
      disabled={disabled}
      hitMargin={hitMargin}
      submitMode="commit_on_release"
      onAnswer={onAnswer}
      preview={
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
          <CanvasView
            width={PERSPECTIVE_CANVAS_SIZE}
            height={PERSPECTIVE_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white"
            draw={(canvas) => {
              drawVpConvergenceCanvas(
                canvas,
                question.referenceLines,
                question.testLineAnchor,
                userVal ?? 180,
                question.testLineLength ?? 95,
                PERSPECTIVE_CANVAS_SIZE,
                showAnswer,
                targetVal,
              );
            }}
            deps={[question.referenceLines, userVal, showAnswer]}
          />
        </div>
      }
      footerDetails={
        showAnswer && userVal !== undefined ? (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              精准交汇角: <span className="font-bold text-slate-800 font-mono">{targetVal}°</span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              误差: {userAnswer?.errorValue}° (容错: ±{tolerance}°)
            </span>
          </div>
        ) : null
      }
    />
  );
}
~~~~~

~~~~~act
write_file
src/packs/perspective/components/ProportionDivisionView.tsx
~~~~~
~~~~~typescript
import { Disc } from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import type { Point } from '../../../types';
import {
  drawProportionCanvas,
  PERSPECTIVE_CANVAS_SIZE,
  type PerspectiveHitResult,
  type PerspectiveQuestionData,
} from '../utils/perspectiveUtils';

interface ProportionDivisionViewProps {
  question: PerspectiveQuestionData;
  showAnswer: boolean;
  userAnswer: PerspectiveHitResult | null;
  onAnswer: (point: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function ProportionDivisionView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: ProportionDivisionViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [userClickedPoint, setUserClickedPoint] = useState<Point | null>(null);

  const handleClick = (e: MouseEvent) => {
    if (disabled || showAnswer) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scale = PERSPECTIVE_CANVAS_SIZE / rect.width;
    const clickX = Math.round((e.clientX - rect.left) * scale);
    const clickY = Math.round((e.clientY - rect.top) * scale);

    const pt: Point = { x: clickX, y: clickY };
    setUserClickedPoint(pt);
    onAnswer(pt);
  };

  const isHit = Boolean(userAnswer?.isHit);

  return (
    <QuestionCardShell
      hintText={`在线段上直接点击标出：【${question.targetRatioName ?? ''}】`}
      hintIcon={Disc}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      footer={
        showAnswer ? (
          <div className="w-full pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              目标比例: <span className="font-bold text-slate-800 font-mono">{((question.targetRatio ?? 0) * 100).toFixed(1)}%</span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              作答位置: {((userAnswer?.ratioProgress ?? 0) * 100).toFixed(1)}% (误差: ±{(((userAnswer?.errorValue ?? 0) * 100)).toFixed(1)}%)
            </span>
          </div>
        ) : null
      }
    >
      <div className="w-full bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={PERSPECTIVE_CANVAS_SIZE}
          height={PERSPECTIVE_CANVAS_SIZE}
          onClick={handleClick}
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white transition-all ${
            disabled || showAnswer ? 'cursor-default' : 'cursor-crosshair hover:border-indigo-300'
          }`}
          ref={(el) => {
            canvasRef.current = el;
            if (el) {
              drawProportionCanvas(
                el,
                question.divisionLine,
                question.targetDivisionPoint,
                userClickedPoint,
                showAnswer,
                PERSPECTIVE_CANVAS_SIZE,
              );
            }
          }}
        />
      </div>
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/packs/perspective/components/GestaltContinuation2AfcView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import {
  drawGestaltCanvas,
  PERSPECTIVE_2AFC_SIZE,
  type PerspectiveHitResult,
  type PerspectiveQuestionData,
} from '../utils/perspectiveUtils';

interface GestaltContinuation2AfcViewProps {
  question: PerspectiveQuestionData;
  showAnswer: boolean;
  userAnswer: PerspectiveHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function GestaltContinuation2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: GestaltContinuation2AfcViewProps) {
  const isAHit = question.correctChoice === 'A';
  const isBHit = question.correctChoice === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText="观察穿入线段，二选一辨识哪一侧保持了绝对真实的贯穿延伸 (键 1 / 2)"
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      optionA={{
        title: '选项 A',
        isCorrect: isAHit,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={PERSPECTIVE_2AFC_SIZE}
              height={PERSPECTIVE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              draw={(canvas) =>
                drawGestaltCanvas(
                  canvas,
                  question.obstacle,
                  question.incomingLine,
                  question.lineOptionA,
                  PERSPECTIVE_2AFC_SIZE,
                )
              }
              deps={[question.incomingLine, question.lineOptionA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: '选项 B',
        isCorrect: isBHit,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={PERSPECTIVE_2AFC_SIZE}
              height={PERSPECTIVE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              draw={(canvas) =>
                drawGestaltCanvas(
                  canvas,
                  question.obstacle,
                  question.incomingLine,
                  question.lineOptionB,
                  PERSPECTIVE_2AFC_SIZE,
                )
              }
              deps={[question.incomingLine, question.lineOptionB]}
            />
          </div>
        ),
      }}
    />
  );
}
~~~~~

~~~~~act
write_file
src/packs/perspective/components/StructureProjection3DView.tsx
~~~~~
~~~~~typescript
import { Box } from 'lucide-preact';
import { PointClickCanvas } from '../../../components/common/PointClickCanvas';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import type { Point } from '../../../types';
import {
  draw3DCubeWireframe,
  PERSPECTIVE_CANVAS_SIZE,
  type PerspectiveHitResult,
  type PerspectiveQuestionData,
} from '../utils/perspectiveUtils';

interface StructureProjection3DViewProps {
  question: PerspectiveQuestionData;
  showAnswer: boolean;
  userAnswer: PerspectiveHitResult | null;
  onAnswer: (point: Point) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function StructureProjection3DView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: StructureProjection3DViewProps) {
  const isHit = Boolean(userAnswer?.isHit);
  const targetPt3D = question.targetPoint3D;
  const dim = question.gridDim3D ?? 3;

  return (
    <QuestionCardShell
      hintText="观察左侧正交三视图标点，在右侧 3D 立方体透视点阵中选出对应空间坐标点"
      hintIcon={Box}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full items-center">
        {/* 左侧三视图正交切面预览 */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
            三视图正交坐标 (Top / Front / Side)
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-slate-600">
            {/* 顶视图 (X-Z) */}
            <div className="flex flex-col items-center gap-1 bg-white p-2 rounded-xl border border-slate-200">
              <span className="text-slate-400 font-bold">顶视图 (Top)</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 rounded grid relative bg-slate-50"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.x + 0.5) / dim) * 100}%`,
                      top: `${((targetPt3D.z + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* 正视图 (X-Y) */}
            <div className="flex flex-col items-center gap-1 bg-white p-2 rounded-xl border border-slate-200">
              <span className="text-slate-400 font-bold">正视图 (Front)</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 rounded grid relative bg-slate-50"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.x + 0.5) / dim) * 100}%`,
                      top: `${(((dim - 1 - targetPt3D.y) + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* 侧视图 (Z-Y) */}
            <div className="flex flex-col items-center gap-1 bg-white p-2 rounded-xl border border-slate-200">
              <span className="text-slate-400 font-bold">侧视图 (Side)</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 rounded grid relative bg-slate-50"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.z + 0.5) / dim) * 100}%`,
                      top: `${(((dim - 1 - targetPt3D.y) + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧 3D 立方体透视交互点阵 */}
        <div className="flex justify-center">
          <PointClickCanvas
            canvasSize={PERSPECTIVE_CANVAS_SIZE}
            gridPoints={question.projectedGridPoints || []}
            targetPoint={question.targetProjectedPoint}
            showAnswer={showAnswer}
            isHit={isHit}
            disabled={disabled}
            onCommitPoint={onAnswer}
            customOverlayRender={(ctx) => {
              const center = {
                x: PERSPECTIVE_CANVAS_SIZE / 2,
                y: PERSPECTIVE_CANVAS_SIZE / 2 + 10,
              };
              const scale = dim === 4 ? 42 : 55;
              draw3DCubeWireframe(ctx, center, scale, dim);
            }}
          />
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

#### Acts 4: 实现统一视图路由、插件驱动与 Pack 清单注册

1. `PerspectiveCanvas.tsx`
2. `plugin.tsx`
3. `index.ts`

~~~~~act
write_file
src/packs/perspective/views/PerspectiveCanvas.tsx
~~~~~
~~~~~typescript
import type { Point } from '../../../types';
import { GestaltContinuation2AfcView } from '../components/GestaltContinuation2AfcView';
import { PerspectiveVpView } from '../components/PerspectiveVpView';
import { ProportionDivisionView } from '../components/ProportionDivisionView';
import { StructureProjection3DView } from '../components/StructureProjection3DView';
import type { PerspectiveHitResult, PerspectiveQuestionData } from '../utils/perspectiveUtils';

export interface PerspectiveCanvasProps {
  question: PerspectiveQuestionData;
  showAnswer: boolean;
  userAnswer: PerspectiveHitResult | null;
  onAnswer: (val: number | 'A' | 'B' | Point) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function PerspectiveCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: PerspectiveCanvasProps) {
  const { mode } = question;

  if (mode === 'VP_CONVERGENCE') {
    return (
      <PerspectiveVpView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer as (val: number) => void}
        disabled={disabled}
        hitMargin={hitMargin}
        showToleranceBand={showToleranceBand}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'PROPORTION_DIVISION') {
    return (
      <ProportionDivisionView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer as (point: Point) => void}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'GESTALT_CONTINUATION_2AFC') {
    return (
      <GestaltContinuation2AfcView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer as (choice: 'A' | 'B') => void}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  return (
    <StructureProjection3DView
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer as (point: Point) => void}
      disabled={disabled}
      showCanvasHints={showCanvasHints}
    />
  );
}
~~~~~

~~~~~act
write_file
src/packs/perspective/plugin.tsx
~~~~~
~~~~~typescript
import type { TrainingPlugin } from '../../config/trainingPlugins';
import type { Point } from '../../types';
import type { BaseModuleSettings } from '../../utils/settings';
import {
  checkPerspectiveHit,
  generatePerspectiveQuestion,
  type PerspectiveHitResult,
  type PerspectiveMode,
  type PerspectiveQuestionData,
} from './utils/perspectiveUtils';
import { PerspectiveCanvas } from './views/PerspectiveCanvas';

export const perspectivePlugin: TrainingPlugin<
  PerspectiveQuestionData,
  PerspectiveHitResult,
  number | 'A' | 'B' | Point,
  BaseModuleSettings
> = {
  packId: 'perspective',
  title: '透视空间感知',
  getModeBadge: (mode) => {
    const map: Record<string, string> = {
      VP_CONVERGENCE: '透视灭点汇聚',
      PROPORTION_DIVISION: '比例盲切划分',
      GESTALT_CONTINUATION_2AFC: '格式塔完形断线',
      STRUCTURE_PROJECTION_3D: '3D 结构空间翻转',
    };
    return map[mode] || mode;
  },
  generateQuestion: (mode, level) => generatePerspectiveQuestion(mode as PerspectiveMode, level),
  evaluateAnswer: (userVal, q) => checkPerspectiveHit(userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (_q, hitResult, userVal, mode) => ({
    mode,
    userAnswer: userVal,
    errorValue: hitResult.errorValue,
    tolerance: hitResult.tolerance,
  }),
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <PerspectiveCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={(settings.sliderHitMargin as number) ?? 12}
      showToleranceBand={(settings.showToleranceBand as boolean) ?? true}
      showCanvasHints={(settings.showCanvasHints as boolean) ?? true}
    />
  ),
};
~~~~~

~~~~~act
write_file
src/packs/perspective/index.ts
~~~~~
~~~~~typescript
import { Box, Eye, Layers, Sliders } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { perspectivePlugin } from './plugin';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const perspectiveCards: CardDefinition[] = [
  {
    id: 'perspective_vp_convergence',
    packId: 'perspective',
    mode: 'VP_CONVERGENCE',
    title: '透视灭点汇聚感',
    desc: '观察已有倾角透视线，通过滑块调制第三条线段倾斜度，使其精准延长交汇于同一灭点 (VP)。',
    instruction: '观察已有透视线，调制滑块旋转第三条线使其交汇于同一灭点',
    icon: Sliders,
    tags: {
      target: ['geometry', 'perspective'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'perspective_proportion_division',
    packId: 'perspective',
    mode: 'PROPORTION_DIVISION',
    title: '平面比例与黄金分割盲切',
    desc: '观察倾斜线段，单次点击盲切估测 1/2、1/3、1/4 或黄金分割点 (0.618)。',
    instruction: '观察线段并在指定比例位置单次点击',
    icon: Layers,
    tags: {
      target: ['geometry', 'perspective'],
      skill: ['proportion', 'spatial_orientation'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'perspective_gestalt_continuation_2afc',
    packId: 'perspective',
    mode: 'GESTALT_CONTINUATION_2AFC',
    title: '断线完形连续性辨识',
    desc: '基于格式塔完形心理学，二选一快速辨识穿透中间障碍物的真实延续线段 (2AFC)。',
    instruction: '二选一选出保持绝对连续贯穿的延伸线 (键 1 / 2)',
    icon: Eye,
    tags: {
      target: ['geometry', 'perspective'],
      skill: ['illusion_invariance', 'spatial_orientation'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'perspective_structure_3d',
    packId: 'perspective',
    mode: 'STRUCTURE_PROJECTION_3D',
    title: '3D 结构空间翻转',
    desc: '观察正交三视图标点，在 3D 透视立方体点阵中定位对应的三维空间坐标点。',
    instruction: '结合三视图坐标，在 3D 立方体点阵中点选对应点',
    icon: Box,
    tags: {
      target: ['geometry', 'perspective'],
      skill: ['spatial_orientation', 'visual_memory'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const perspectivePack: PackManifest = {
  packId: 'perspective',
  meta: {
    id: 'perspective',
    title: '透视空间感知',
    subTitle: 'Perspective & Spatial Perception',
    desc: '涵盖灭点统一感、比例黄金分割盲切、格式塔穿透遮挡完形延续与 3D 轴测结构空间翻转，全方位锤炼硬核空间素描起形直觉。',
    themeColor: 'purple',
    icon: Box,
  },
  cards: perspectiveCards,
  trainingPlugin: perspectivePlugin,
};

export default perspectivePack;
~~~~~

### 下一步建议
1. **自动注册验证**：系统在 `SystemDomainRegistry` 中通过 `import.meta.glob('../packs/*/index.ts')` 会自动发现并注册新包。建议在主界面启动并验证透视扩展包的 4 张卡片是否正常加载并能流畅答题。
2. **三维弱点分析视图 (Analytics)**：后续可为 `perspective_vp_convergence` 和 `perspective_proportion_division` 编写专属的分析诊断面板，在雷达图/散点图中呈现用户在不同倾斜角度下对灭点汇聚与比例判断的系统性系统偏移偏差（如经常偏长或偏短）。
