import type { Point } from '../../types';

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface AngleParallelQuestion {
  id: string;
  difficultyLevel: number;
  promptLine: LineSegment;
  lineOptionA: LineSegment;
  lineOptionB: LineSegment;
  parallelSide: 'A' | 'B';
  angularDeviation: number;
  tolerance: number;
}

export interface AngleParallelHitResult {
  isHit: boolean;
  userChoice: 'A' | 'B';
  correctChoice: 'A' | 'B';
  errorValue: number;
  tolerance: number;
}