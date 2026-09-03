export interface QuestionData {
  id: string;
  difficultyLevel: number;
  bgLeft: [number, number, number];
  bgRight: [number, number, number];
  targetLeftCenter: [number, number, number];
  idealRightCenter: [number, number, number];
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userColor: [number, number, number];
  targetColor: [number, number, number];
  deltaEError: number;
  tolerance: number;
}
