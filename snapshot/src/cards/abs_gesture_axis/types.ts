import type { Point } from '@formsight/card-sdk';

export interface QuestionData {
  id: string;
  difficultyLevel: number;
  particles: Point[];
  targetAngleDeg: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userValue: number;
  targetValue: number;
  errorValue: number;
  tolerance: number;
}
