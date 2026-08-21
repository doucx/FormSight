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
 * 计算点阵中任意两点间的最小欧氏间距
 */
export function getGridMinSpacing(gridPoints: Point[]): number {
  if (!gridPoints || gridPoints.length < 2) return 25;
  let minDist = Number.MAX_VALUE;
  for (let i = 0; i < gridPoints.length; i++) {
    for (let j = i + 1; j < gridPoints.length; j++) {
      const d = calcDistance(gridPoints[i], gridPoints[j]);
      if (d > 0 && d < minDist) {
        minDist = d;
      }
    }
  }
  return minDist === Number.MAX_VALUE ? 25 : minDist;
}

/**
 * 根据点阵间距动态计算渲染圆点的半径
 */
export function getDynamicDotRadius(gridPoints: Point[]): number {
  const minDist = getGridMinSpacing(gridPoints);
  return Math.max(1.2, Math.min(3.5, minDist * 0.25));
}

/**
 * 根据点阵间距动态计算十字准星的臂长与线宽
 */
export function getDynamicCrosshairMetrics(gridPoints: Point[]): {
  size: number;
  lineWidth: number;
} {
  const minDist = getGridMinSpacing(gridPoints);
  // 臂长控制在最小点间距的 42% 以内，绝不超过相邻点
  const size = Math.max(3.5, Math.min(12, minDist * 0.42));
  const lineWidth = Math.max(1, Math.min(2, minDist * 0.08));

  return { size, lineWidth };
}
