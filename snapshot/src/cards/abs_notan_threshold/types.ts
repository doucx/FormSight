export interface QuestionData {
  id: string;
  difficultyLevel: number;
  notanBuffer: number[];
  notanFieldDim: number;
  idealNotanThreshold: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userValue: number;
  targetValue: number;
  errorValue: number;
  tolerance: number;
}