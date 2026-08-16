import type { Point } from '../../types';

export const CANVAS_SIZE = 500;
export const CX = CANVAS_SIZE / 2; // 250
export const CY = CANVAS_SIZE / 2; // 250
export const DEFAULT_GRID_DIM = 3; // 默认 3x3 网格

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