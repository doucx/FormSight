import { Point, QuestionData, HitResult, TrainingMode } from '../types';

export const CANVAS_SIZE = 500;
export const CX = CANVAS_SIZE / 2; // 250
export const CY = CANVAS_SIZE / 2; // 250
export const DEFAULT_GRID_DIM = 5; // 5x5 网格

/**
 * 将点绕指定中心旋转指定角度 (角度制)
 */
export function rotatePoint(
  p: Point,
  center: Point,
  angleDeg: number
): Point {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - center.x;
  const dy = p.y - center.y;

  return {
    x: Math.round((center.x + dx * cos - dy * sin) * 100) / 100,
    y: Math.round((center.y + dx * sin + dy * cos) * 100) / 100,
  };
}

/**
 * 计算两点间的欧氏距离
 */
export function calcDistance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
}

/**
 * 根据真理点 B 以及目标在网格中的行列位置 (row, col)，推算网格左上角 GridStart 坐标
 */
export function calcGridStart(
  targetB: Point,
  rowIdx: number,
  colIdx: number,
  gridStep: number
): Point {
  return {
    x: Math.round((targetB.x - colIdx * gridStep) * 100) / 100,
    y: Math.round((targetB.y - rowIdx * gridStep) * 100) / 100,
  };
}

/**
 * 根据 GridStart、维度和步长生成全量干扰点阵坐标数组
 */
export function generateGridPoints(
  gridStart: Point,
  dim: number = DEFAULT_GRID_DIM,
  step: number
): Point[] {
  const points: Point[] = [];
  for (let r = 0; r < dim; r++) {
    for (let c = 0; c < dim; c++) {
      points.push({
        x: Math.round((gridStart.x + c * step) * 100) / 100,
        y: Math.round((gridStart.y + r * step) * 100) / 100,
      });
    }
  }
  return points;
}

/**
 * 点击作答 Hit Detection：判定用户的点击坐标是否击中了真理点 B 所在的网格
 */
export function checkHit(
  clickPoint: Point,
  targetB: Point,
  gridStart: Point,
  gridStep: number,
  dim: number = DEFAULT_GRID_DIM
): HitResult {
  const gridPoints = generateGridPoints(gridStart, dim, gridStep);

  // 1. 寻找离用户点击位置最近的网格点
  let nearestGridPoint = gridPoints[0];
  let minDistance = calcDistance(clickPoint, nearestGridPoint);

  for (let i = 1; i < gridPoints.length; i++) {
    const dist = calcDistance(clickPoint, gridPoints[i]);
    if (dist < minDistance) {
      minDistance = dist;
      nearestGridPoint = gridPoints[i];
    }
  }

  // 2. 判断该最近网格点是否与真理点 B 重合（极小误差范围内）
  const distToTarget = calcDistance(nearestGridPoint, targetB);
  const isHit = distToTarget < 0.5;

  // 3. 计算点击坐标与真理点 B 的直接像素偏差
  const errorDistance = calcDistance(clickPoint, targetB);

  return {
    isHit,
    nearestGridPoint,
    errorDistance,
  };
}

/**
 * 随机生成算法：根据模式与难度步长生成一道题目数据
 */
export function generateQuestion(
  mode: TrainingMode,
  gridStep: number
): QuestionData {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = DEFAULT_GRID_DIM;
  const randomRow = Math.floor(Math.random() * gridDim);
  const randomCol = Math.floor(Math.random() * gridDim);

  if (mode === 'single') {
    // === 1. 单锚点模式 ===
    const anchorA: Point = { x: CX, y: CY };
    const angle = Math.floor(Math.random() * 360);
    const distChoices = [60, 90, 120, 150, 180];
    const dist = distChoices[Math.floor(Math.random() * distChoices.length)];

    const rad = (angle * Math.PI) / 180;
    const targetB: Point = {
      x: Math.round((CX + dist * Math.cos(rad)) * 100) / 100,
      y: Math.round((CY + dist * Math.sin(rad)) * 100) / 100,
    };

    const gridStart = calcGridStart(targetB, randomRow, randomCol, gridStep);

    return {
      id,
      mode,
      anchorA,
      anchorC: null,
      targetB,
      gridStart,
      gridStep,
      gridDim,
      angleDegree: angle,
      distanceRatio: dist,
    };
  }

  // 双锚点基础拓扑 (相对于中心的偏移)
  const baseAx = -70;
  const baseAy = 0;
  const baseCx = 70;
  const baseCy = 0;

  const projChoices = [-90, -45, 0, 45, 90];
  const hgtChoices = [-90, -45, 45, 90];

  const px = projChoices[Math.floor(Math.random() * projChoices.length)];
  const py = hgtChoices[Math.floor(Math.random() * hgtChoices.length)];

  const rotAngle = mode === 'double_h' 
    ? 0 
    : [15, 30, 45, 60, 75, 90, 105, 120, 135, 150][Math.floor(Math.random() * 10)];

  const center: Point = { x: 0, y: 0 };
  const rotatedA = rotatePoint({ x: baseAx, y: baseAy }, center, rotAngle);
  const rotatedC = rotatePoint({ x: baseCx, y: baseCy }, center, rotAngle);
  const rotatedB = rotatePoint({ x: px, y: py }, center, rotAngle);

  // 平移到画布中心 (CX, CY)
  const anchorA: Point = { x: Math.round((rotatedA.x + CX) * 100) / 100, y: Math.round((rotatedA.y + CY) * 100) / 100 };
  const anchorC: Point = { x: Math.round((rotatedC.x + CX) * 100) / 100, y: Math.round((rotatedC.y + CY) * 100) / 100 };
  const targetB: Point = { x: Math.round((rotatedB.x + CX) * 100) / 100, y: Math.round((rotatedB.y + CY) * 100) / 100 };

  const gridStart = calcGridStart(targetB, randomRow, randomCol, gridStep);
  const angleDegree = Math.round((Math.atan2(py, px) * 180 / Math.PI + 360) % 360);

  return {
    id,
    mode,
    anchorA,
    anchorC,
    targetB,
    gridStart,
    gridStep,
    gridDim,
    angleDegree,
    distanceRatio: Math.round(Math.sqrt(px * px + py * py)),
    rotationAngle: rotAngle,
  };
}