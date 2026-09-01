import type { Point } from '../../types';

export const TWO_AFC_CANVAS_SIZE = 280;

export interface QuestionData {
  id: string;
  difficultyLevel: number;
  canvasArea: number;
  verticesA: Point[];
  verticesB: Point[];
  negAreaA: number;
  negAreaB: number;
  negRatioA: number;
  negRatioB: number;
  largerSide: 'A' | 'B';
  areaDeltaPercent: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userChoice: 'A' | 'B';
  correctChoice: 'A' | 'B';
  negRatioA: number;
  negRatioB: number;
  errorValue: number;
  tolerance: number;
}