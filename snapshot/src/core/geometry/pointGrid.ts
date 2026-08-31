import type { Point } from '../../types';

/**
 * 计算两点间的欧氏距离
 */
export function calcPointDistance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
}

export interface NearestGridPointResult {
  nearestPoint: Point;
  minDistance: number;
  isWithinRange: boolean;
}

/**
 * 通用：在离散点阵中寻找距离点击位置最近的网格点，并判定是否落在有效感应范围内
 */
export function findNearestPointInGrid(
  clickPoint: Point,
  gridPoints: Point[],
  fallbackRadius = 20,
): NearestGridPointResult {
  if (!gridPoints || gridPoints.length === 0) {
    return { nearestPoint: clickPoint, minDistance: 0, isWithinRange: false };
  }

  let nearestPoint = gridPoints[0];
  let minDistance = calcPointDistance(clickPoint, nearestPoint);

  for (let i = 1; i < gridPoints.length; i++) {
    const dist = calcPointDistance(clickPoint, gridPoints[i]);
    if (dist < minDistance) {
      minDistance = dist;
      nearestPoint = gridPoints[i];
    }
  }

  let minNeighborDist = Number.MAX_VALUE;
  for (let i = 0; i < Math.min(5, gridPoints.length - 1); i++) {
    const d = calcPointDistance(gridPoints[i], gridPoints[i + 1]);
    if (d > 0 && d < minNeighborDist) minNeighborDist = d;
  }
  const maxRadius = Math.max(fallbackRadius, minNeighborDist * 0.75);

  return {
    nearestPoint,
    minDistance,
    isWithinRange: minDistance <= maxRadius,
  };
}

/** 兼容别名导出 */
export const findNearestGridPoint = findNearestPointInGrid;

export interface PointHitDetectionResult {
  isHit: boolean;
  nearestGridPoint: Point;
  errorDistance: number;
  isWithinRange: boolean;
}

/**
 * 通用：基于离散网格的点击定点命中检测
 */
export function evaluatePointGridHit(
  clickPoint: Point,
  targetPoint: Point,
  gridPoints: Point[],
  hitTolerance = 0.5,
): PointHitDetectionResult {
  const { nearestPoint, isWithinRange } = findNearestPointInGrid(clickPoint, gridPoints);
  const errorDistance = calcPointDistance(nearestPoint, targetPoint);
  const isHit = errorDistance <= hitTolerance;

  return {
    isHit,
    nearestGridPoint: nearestPoint,
    errorDistance,
    isWithinRange,
  };
}
