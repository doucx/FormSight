import type { Point } from '@formsight/card-sdk';
export const NEGATIVE_SPACE_CANVAS_SIZE = 400;

export interface QuestionData {
  id: string;
  difficultyLevel: number;
  canvasArea: number;
  targetPolygon: Point[];
  optionsPolygons: Point[][];
  correctOptionIndex: number;
  correctChoice: 'A' | 'B';
  displayTimeMs: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userChoice: 'A' | 'B';
  userChoiceIndex: number;
  correctChoice: 'A' | 'B';
  correctOptionIndex: number;
  errorValue: number;
  tolerance: number;
}
