import type { Point } from '@formsight/card-sdk';
export const NEGATIVE_SPACE_CANVAS_SIZE = 400;

export interface QuestionData {
  id: string;
  difficultyLevel: number;
  vertices: Point[];
  canvasArea: number;
  positiveArea: number;
  negativeArea: number;
  targetNegativeRatio: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userRatio: number;
  targetRatio: number;
  errorValue: number;
  tolerance: number;
}
