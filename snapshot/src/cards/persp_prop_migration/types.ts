import type { Point } from '../../types';

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface PerspPropMigrationQuestion {
  id: string;
  difficultyLevel: number;
  divisionLine: LineSegment;
  targetRatio: number;
  targetDivisionPoint: Point;
  tolerance: number;
}

export interface PerspPropMigrationHitResult {
  isHit: boolean;
  userValue: Point;
  targetValue: Point;
  errorValue: number;
  tolerance: number;
  ratioProgress: number;
}
