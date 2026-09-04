

import { Point } from '@formsight/card-sdk';
export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface AngleEstimationQuestion {
  id: string;
  difficultyLevel: number;
  tolerance: number;
  targetAngleDeg: number;
  startAngleDeg: number;
  lineA: LineSegment;
  lineB: LineSegment;
}

export interface AngleEstimationHitResult {
  isHit: boolean;
  userValue: number;
  targetValue: number;
  errorValue: number;
  tolerance: number;
}
