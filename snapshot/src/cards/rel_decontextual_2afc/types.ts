export interface QuestionData {
  id: string;
  difficultyLevel: number;
  bgLeft: [number, number, number];
  bgRight: [number, number, number];
  centerColorA: [number, number, number];
  centerColorB: [number, number, number];
  largerPhysicalSide: 'A' | 'B';
  physicalValueDiff: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userChoice: 'A' | 'B';
  correctChoice: 'A' | 'B';
  physicalValueDiff: number;
  errorValue: number;
  tolerance: number;
}