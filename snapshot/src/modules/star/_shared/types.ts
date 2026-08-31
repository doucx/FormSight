import type { Point } from '../../../types';

export const CANVAS_SIZE = 500;
export const CX = CANVAS_SIZE / 2;
export const CY = CANVAS_SIZE / 2;
export const DEFAULT_GRID_DIM = 3;

export interface StarHitResult {
  isHit: boolean;
  nearestGridPoint: Point;
  errorDistance: number;
  isWithinRange?: boolean;
}
