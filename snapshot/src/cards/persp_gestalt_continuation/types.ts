

import { Point } from '@formsight/card-sdk';
export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface Obstacle {
  type: 'circle' | 'rect';
  cx: number;
  cy: number;
  size: number;
}

export interface PerspGestaltQuestion {
  id: string;
  difficultyLevel: number;
  obstacle: Obstacle;
  incomingLine: LineSegment;
  lineOptionA: LineSegment;
  lineOptionB: LineSegment;
  correctChoice: 'A' | 'B';
  parallelOffset: number;
  tolerance: number;
}

export interface PerspGestaltHitResult {
  isHit: boolean;
  userChoice: 'A' | 'B';
  correctChoice: 'A' | 'B';
  errorValue: number;
  tolerance: number;
}
