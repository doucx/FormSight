import type { Point } from '../../types';

export interface QuestionData {
  id: string;
  difficultyLevel: number;
  detailedPolygon: Point[];
  simplifiedOptions: Point[][];
  correctPolyIndex: number;
  correctPolyChoice: 'A' | 'B';
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userChoice: 'A' | 'B';
  correctChoice: 'A' | 'B';
  errorValue: number;
  tolerance: number;
}
