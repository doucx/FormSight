import type { Point } from '../../types';

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface PerspVpQuestion {
  id: string;
  difficultyLevel: number;
  tolerance: number;
  vpPoint: Point;
  referenceLines: [LineSegment, LineSegment];
  testLineAnchor: Point;
  testLineLength: number;
  targetAngleDeg: number;
}

export interface PerspVpHitResult {
  isHit: boolean;
  userValue: number;
  targetValue: number;
  errorValue: number;
  tolerance: number;
}