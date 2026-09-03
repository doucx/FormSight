import type { Point } from '../../types';

export interface QuestionData {
  id: string;
  anchorA: Point;
  targetB: Point;
  gridStart: Point;
  difficultyLevel: number;
  gridDim: number;
  distractorPoints: Point[];
  angleDegree: number;
  distanceRatio: number;
}

export interface HitResult {
  isHit: boolean;
  nearestGridPoint: Point;
  errorDistance: number;
}