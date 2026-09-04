import type { Point } from '@formsight/card-sdk';

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface AngleComparisonQuestion {
  id: string;
  difficultyLevel: number;
  angleA: number;
  angleB: number;
  linesA: [LineSegment, LineSegment];
  linesB: [LineSegment, LineSegment];
  largerSide: 'A' | 'B';
  tolerance: number;
}

export interface AngleComparisonHitResult {
  isHit: boolean;
  userChoice: 'A' | 'B';
  correctChoice: 'A' | 'B';
  errorValue: number;
  tolerance: number;
}
