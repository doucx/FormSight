import type { HitResult, Point, QuestionData, TrainingMode } from '../types';

export const CANVAS_SIZE = 500;
export const CX = CANVAS_SIZE / 2; // 250
export const CY = CANVAS_SIZE / 2; // 250
export const DEFAULT_GRID_DIM = 5; // 5x5 网格

/**
 * 将点绕指定中心旋转指定角度 (角度制)
 */
export function rotatePoint(p: Point, center: Point, angleDeg: number): Point {
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
  gridStep: number,
): Point {
  return {
    x: Math.round((targetB.x - colIdx * gridStep) * 100) / 100,
    y: Math.round((targetB.y - rowIdx * gridStep) * 100) / 100,
  };
}

/**
 * 根据 GridStart、维度和步长生成全量干扰点阵坐标数组
 */
export function generateGridPoints(gridStart: Point, dim: number, step: number): Point[] {
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
 * 寻找最近的网格点及感应范围判定
 */
export function findNearestGridPoint(
  clickPoint: Point,
  gridStart: Point,
  gridStep: number,
  dim: number = DEFAULT_GRID_DIM,
): { nearestPoint: Point; minDistance: number; isWithinRange: boolean } {
  const gridPoints = generateGridPoints(gridStart, dim, gridStep);
  let nearestPoint = gridPoints[0];
  let minDistance = calcDistance(clickPoint, nearestPoint);

  for (let i = 1; i < gridPoints.length; i++) {
    const dist = calcDistance(clickPoint, gridPoints[i]);
    if (dist < minDistance) {
      minDistance = dist;
      nearestPoint = gridPoints[i];
    }
  }

  // 判定感应半径：网格步长的 55%
  const maxRadius = gridStep * 0.55;
  return {
    nearestPoint,
    minDistance,
    isWithinRange: minDistance <= maxRadius,
  };
}

/**
 * 点击作答 Hit Detection：判定用户的点击坐标是否击中了真理点 B 所在的网格
 */
export function checkHit(
  clickPoint: Point,
  targetB: Point,
  gridStart: Point,
  gridStep: number,
  dim: number = DEFAULT_GRID_DIM,
): HitResult {
  const { nearestPoint, isWithinRange } = findNearestGridPoint(
    clickPoint,
    gridStart,
    gridStep,
    dim,
  );

  // 1. 判断吸附后网格点与真理点 B 的直接偏差
  const errorDistance = calcDistance(nearestPoint, targetB);
  const isHit = errorDistance < 0.5;

  return {
    isHit,
    nearestGridPoint: nearestPoint,
    errorDistance,
    isWithinRange,
  };
}

export interface QuestionGenerateOptions {
  targetingMode?: 'off' | 'auto' | 'manual';
  targetSectors?: number[]; // [0~7]
}

/**
 * 加权随机生成极角：70% 概率落入靶向弱点扇区，30% 概率全盘均匀探索
 */
function selectAngleWithTargeting(options?: QuestionGenerateOptions): number {
  if (
    options?.targetingMode &&
    options.targetingMode !== 'off' &&
    options.targetSectors &&
    options.targetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        options.targetSectors[Math.floor(Math.random() * options.targetSectors.length)];
      const sectorCenterAngle = chosenSector * 45;
      const jitter = (Math.random() - 0.5) * 40; // ±20° 范围加权抖动
      return Math.floor((sectorCenterAngle + jitter + 360) % 360);
    }
  }
  return Math.floor(Math.random() * 360);
}

/**
 * 随机生成算法：根据模式与难度步长生成一道题目数据
 */
export function generateQuestion(
  mode: TrainingMode,
  gridStep: number,
  options?: QuestionGenerateOptions,
): QuestionData {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = DEFAULT_GRID_DIM;
  const randomRow = Math.floor(Math.random() * gridDim);
  const randomCol = Math.floor(Math.random() * gridDim);

  if (mode === 'single') {
    // === 1. 单锚点模式 ===
    const anchorA: Point = { x: CX, y: CY };
    const angle = selectAngleWithTargeting(options);
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

  // 1. 生成所有合法的 (px, py) 组合，并预计算其角度
  const validPairs: { px: number; py: number; angle: number }[] = [];
  for (const x of projChoices) {
    for (const y of hgtChoices) {
      const angle = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
      validPairs.push({ px: x, py: y, angle });
    }
  }

  let chosenPair = validPairs[Math.floor(Math.random() * validPairs.length)];

  // 2. 靶向强化逻辑拦截
  if (
    options?.targetingMode &&
    options.targetingMode !== 'off' &&
    options.targetSectors &&
    options.targetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        options.targetSectors[Math.floor(Math.random() * options.targetSectors.length)];
      const sectorCenterAngle = chosenSector * 45;

      const targetedPairs = validPairs.filter((p) => {
        const diff = Math.abs(p.angle - sectorCenterAngle);
        const minDiff = Math.min(diff, 360 - diff);
        return minDiff <= 22.5;
      });

      if (targetedPairs.length > 0) {
        chosenPair = targetedPairs[Math.floor(Math.random() * targetedPairs.length)];
      }
    }
  }

  const px = chosenPair.px;
  const py = chosenPair.py;

  const rotAngle =
    mode === 'double_h'
      ? 0
      : [15, 30, 45, 60, 75, 90, 105, 120, 135, 150][Math.floor(Math.random() * 10)];

  const center: Point = { x: 0, y: 0 };
  const rotatedA = rotatePoint({ x: baseAx, y: baseAy }, center, rotAngle);
  const rotatedC = rotatePoint({ x: baseCx, y: baseCy }, center, rotAngle);
  const rotatedB = rotatePoint({ x: px, y: py }, center, rotAngle);

  // 平移到画布中心 (CX, CY)
  const anchorA: Point = {
    x: Math.round((rotatedA.x + CX) * 100) / 100,
    y: Math.round((rotatedA.y + CY) * 100) / 100,
  };
  const anchorC: Point = {
    x: Math.round((rotatedC.x + CX) * 100) / 100,
    y: Math.round((rotatedC.y + CY) * 100) / 100,
  };
  const targetB: Point = {
    x: Math.round((rotatedB.x + CX) * 100) / 100,
    y: Math.round((rotatedB.y + CY) * 100) / 100,
  };

  const gridStart = calcGridStart(targetB, randomRow, randomCol, gridStep);
  const angleDegree = Math.round(((Math.atan2(py, px) * 180) / Math.PI + 360) % 360);

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
