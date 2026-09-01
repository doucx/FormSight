import type { Point } from '../../types';

export const FITTING_CANVAS_SIZE = 340;

export interface QuestionData {
  id: string;
  difficultyLevel: number;
  canvasArea: number;
  vertices: Point[];
  targetVertexIndex: number;
  targetPoint: Point;
  truncatedVertices: Point[];
  distractorPoints: Point[];
  gridDim: number;
  tolerance: number;
}

export interface HitResult {
  isHit: boolean;
  clickPoint: Point;
  nearestGridPoint: Point;
  errorDistance: number;
  tolerance: number;
  isWithinRange?: boolean;
}