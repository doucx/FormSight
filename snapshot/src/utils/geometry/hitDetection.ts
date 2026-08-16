import type { HitResult, Point } from '../../types';
import { calcDistance } from './pointMath';

/**
 * 寻找最近的网格点及感应范围判定
 */
export function findNearestGridPoint(
  clickPoint: Point,
  gridPoints: Point[],
): { nearestPoint: Point; minDistance: number; isWithinRange: boolean } {
  if (!gridPoints || gridPoints.length === 0) {
    return { nearestPoint: clickPoint, minDistance: 0, isWithinRange: false };
  }

  let nearestPoint = gridPoints[0];
  let minDistance = calcDistance(clickPoint, nearestPoint);

  for (let i = 1; i < gridPoints.length; i++) {
    const dist = calcDistance(clickPoint, gridPoints[i]);
    if (dist < minDistance) {
      minDistance = dist;
      nearestPoint = gridPoints[i];
    }
  }

  let minNeighborDist = Number.MAX_VALUE;
  for (let i = 0; i < Math.min(5, gridPoints.length - 1); i++) {
    const d = calcDistance(gridPoints[i], gridPoints[i + 1]);
    if (d > 0 && d < minNeighborDist) minNeighborDist = d;
  }
  const maxRadius = Math.max(20, minNeighborDist * 0.75);

  return {
    nearestPoint,
    minDistance,
    isWithinRange: minDistance <= maxRadius,
  };
}

/**
 * 点击作答 Hit Detection
 */
export function checkHit(clickPoint: Point, targetB: Point, gridPoints: Point[]): HitResult {
  const { nearestPoint, isWithinRange } = findNearestGridPoint(clickPoint, gridPoints);
  const errorDistance = calcDistance(nearestPoint, targetB);
  const isHit = errorDistance < 0.5;

  return {
    isHit,
    nearestGridPoint: nearestPoint,
    errorDistance,
    isWithinRange,
  };
}

/**
 * 根据点阵间距动态计算渲染圆点的半径
 */
export function getDynamicDotRadius(gridPoints: Point[]): number {
  if (!gridPoints || gridPoints.length < 2) return 3.5;
  let minDist = Number.MAX_VALUE;
  for (let i = 0; i < gridPoints.length; i++) {
    for (let j = i + 1; j < gridPoints.length; j++) {
      const d = calcDistance(gridPoints[i], gridPoints[j]);
      if (d > 0 && d < minDist) {
        minDist = d;
      }
    }
  }
  if (minDist === Number.MAX_VALUE) return 3.5;
  return Math.max(1.2, Math.min(3.5, minDist * 0.25));
}