export interface QuestionData {
  id: string;
  difficultyLevel: number;
  colorA: [number, number, number];
  colorB: [number, number, number];
  colorC: [number, number, number];
  targetD: [number, number, number];
  options: [number, number, number][];
  correctIndex: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  userColor: [number, number, number];
  targetColor: [number, number, number];
  deltaEError: number;
  magnitudeError: number;
  angleErrorDeg: number;
  tolerance: number;
  selectedIndex: number;
}