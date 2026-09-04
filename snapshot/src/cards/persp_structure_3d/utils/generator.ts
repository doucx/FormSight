import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';
import type { PerspStructure3DHitResult, PerspStructure3DQuestion, Point3D } from '../types';

export const PERSPECTIVE_CANVAS_SIZE = 340;

export function project3DTo2D(p: Point3D, center: Point, scale: number): Point {
  const rad30 = (30 * Math.PI) / 180;
  const screenX = center.x + (p.x * Math.cos(rad30) - p.z * Math.cos(rad30)) * scale;
  const screenY = center.y - (p.y - p.x * Math.sin(rad30) - p.z * Math.sin(rad30)) * scale;

  return {
    x: Math.round(screenX * 10) / 10,
    y: Math.round(screenY * 10) / 10,
  };
}

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

  ctx.strokeStyle = CANVAS_THEME.axis.grid;
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

export function generateQuestion(level: number): PerspStructure3DQuestion {
  const id = `psp_3d_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

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
  const tolerance = Math.round(expDecayInterpolate(18.0, 5.0, clampedLevel) * 10) / 10;

  return {
    id,
    difficultyLevel: clampedLevel,
    gridDim3D,
    targetPoint3D,
    projectedGridPoints,
    targetProjectedPoint,
    tolerance,
  };
}

export function checkHit(
  clickPoint: Point,
  question: PerspStructure3DQuestion,
): PerspStructure3DHitResult {
  const target = question.targetProjectedPoint;
  const dist = target
    ? Math.sqrt((clickPoint.x - target.x) ** 2 + (clickPoint.y - target.y) ** 2)
    : 999;
  const isHit = dist <= question.tolerance;

  return {
    isHit,
    userValue: clickPoint,
    targetValue: target,
    errorValue: Math.round(dist * 10) / 10,
    tolerance: question.tolerance,
  };
}
