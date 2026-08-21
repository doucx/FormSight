import {
  getDynamicCrosshairMetrics,
  getDynamicDotRadius,
  getGridMinSpacing,
} from '../../../core/canvas/drawPointGrid';
import {
  evaluatePointGridHit,
  findNearestPointInGrid,
} from '../../../core/geometry/pointGrid';
import type { HitResult, Point } from '../../../types';

export { getGridMinSpacing, getDynamicDotRadius, getDynamicCrosshairMetrics };

/**
 * 寻找最近的网格点及感应范围判定 (兼容旧别名)
 */
export function findNearestGridPoint(
  clickPoint: Point,
  gridPoints: Point[],
): { nearestPoint: Point; minDistance: number; isWithinRange: boolean } {
  return findNearestPointInGrid(clickPoint, gridPoints);
}

/**
 * 点击作答 Hit Detection
 */
export function checkHit(clickPoint: Point, targetB: Point, gridPoints: Point[]): HitResult {
  return evaluatePointGridHit(clickPoint, targetB, gridPoints);
}