import type { Point } from '../../types';

export interface QuestionData {
  id: string;
  difficultyLevel: number;
  promptSpine: Point[];
  particlesA: Point[];
  particlesB: Point[];
  correctParticleChoice: 'A' | 'B';
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userChoice: 'A' | 'B';
  correctChoice: 'A' | 'B';
  errorValue: number;
  tolerance: number;
}
