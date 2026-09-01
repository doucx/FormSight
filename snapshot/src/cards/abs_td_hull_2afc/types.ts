import type { Point } from '../../types';

export interface QuestionData {
  id: string;
  difficultyLevel: number;
  promptHull: Point[];
  hullDetailedA: Point[];
  hullDetailedB: Point[];
  correctHullChoice: 'A' | 'B';
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userChoice: 'A' | 'B';
  correctChoice: 'A' | 'B';
  errorValue: number;
  tolerance: number;
}
