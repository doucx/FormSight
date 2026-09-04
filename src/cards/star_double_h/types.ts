import type { Point } from '@formsight/card-sdk';
export interface QuestionData {
  id: string;
  anchorA: Point;
  anchorC: Point;
  targetB: Point;
  gridStart: Point;
  difficultyLevel: number;
  gridDim: number;
  distractorPoints: Point[];
  angleDegree: number;
  distanceRatio: number;
  rotationAngle?: number;
}

export interface HitResult {
  isHit: boolean;
  nearestGridPoint: Point;
  errorDistance: number;
}
