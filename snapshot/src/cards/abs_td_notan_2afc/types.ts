export interface QuestionData {
  id: string;
  difficultyLevel: number;
  promptNotanBuffer: number[];
  notanSceneBufferA: number[];
  notanSceneBufferB: number[];
  notanFieldDim: number;
  correctNotanChoice: 'A' | 'B';
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userChoice: 'A' | 'B';
  correctChoice: 'A' | 'B';
  errorValue: number;
  tolerance: number;
}
