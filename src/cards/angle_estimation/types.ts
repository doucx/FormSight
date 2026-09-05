import type { Point } from '@formsight/card-sdk';
export type AngleRangePreset = '0_45' | '45_90' | '90_135' | '135_180';

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface AngleEstimationGenerateOptions {
  angleRanges?: AngleRangePreset[];
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
