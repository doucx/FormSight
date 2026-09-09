export interface PaletteTile {
  x: number;
  y: number;
  w: number;
  h: number;
  hsv: [number, number, number];
  weight: number;
}

export interface QuestionData {
  id: string;
  difficultyLevel: number;
  promptDominantColor: [number, number, number];
  palettePatternOptions: PaletteTile[][];
  correctPatternIndex: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userChoiceIndex: number;
  correctIndex: number;
  errorValue: number;
  tolerance: number;
}
