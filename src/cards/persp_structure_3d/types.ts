import type { Point } from '@formsight/card-sdk';
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface PerspStructure3DQuestion {
  id: string;
  difficultyLevel: number;
  gridDim3D: number;
  targetPoint3D: Point3D;
  projectedGridPoints: Point[];
  targetProjectedPoint: Point;
  tolerance: number;
}

export interface PerspStructure3DHitResult {
  isHit: boolean;
  userValue: Point;
  targetValue?: Point;
  errorValue: number;
  tolerance: number;
}
