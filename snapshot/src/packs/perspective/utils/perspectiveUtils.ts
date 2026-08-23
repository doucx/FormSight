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
export function project3DTo2D(p: Point3D, center: Point, scale: number): Point {
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
    const angleRad = Math.random() * Math.PI * 2;
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
