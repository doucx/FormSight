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
  paletteTiles: PaletteTile[];
  dominantColorHsv: [number, number, number];
  paletteOptions: [number, number, number][];
  correctPaletteIndex: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userChoiceIndex: number;
  correctIndex: number;
  errorValue: number;
  tolerance: number;
}
