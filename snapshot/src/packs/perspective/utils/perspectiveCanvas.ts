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