import type { Point } from '../../types';

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface PerspPropDivisionQuestion {
  id: string;
  difficultyLevel: number;
  divisionLine: LineSegment;
  targetRatio: number;
  targetRatioName: string;
  targetDivisionPoint: Point;
  tolerance: number;
}

export interface PerspPropDivisionHitResult {
  isHit: boolean;
  userValue: Point;
  targetValue: Point;
  errorValue: number;
  tolerance: number;
  ratioProgress: number;
}
