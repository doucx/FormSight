export interface QuestionData {
  id: string;
  difficultyLevel: number;
  targetH: number;
  targetS: number;
  targetV: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userHSV: [number, number, number];
  targetHSV: [number, number, number];
  deltaEError: number;
  tolerance: number;
}