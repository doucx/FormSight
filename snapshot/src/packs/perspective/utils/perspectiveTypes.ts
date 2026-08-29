import type { Point } from '../../../types';

export type PerspectiveMode =
  | 'VP_CONVERGENCE'
  | 'PROPORTION_DIVISION'
  | 'PROPORTION_MIGRATION'
  | 'GESTALT_CONTINUATION_2AFC'
  | 'STRUCTURE_PROJECTION_3D';

export const PERSPECTIVE_CANVAS_SIZE = 340;
export const PERSPECTIVE_2AFC_SIZE = 240;

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface ProportionTarget {
  name: string;
  ratio: number;
}

export interface PerspectiveQuestionData {
  id: string;
  mode: PerspectiveMode;
  difficultyLevel: number;
  tolerance: number;

  // 1. 灭点汇聚参数
  vpPoint?: Point;
  referenceLines?: [LineSegment, LineSegment];
  targetAngleDeg?: number;
  testLineAnchor?: Point;
  testLineLength?: number;

  // 2. 比例盲切参数
  divisionLine?: LineSegment;
  targetRatio?: number;
  targetRatioName?: string;
  targetDivisionPoint?: Point;

  // 3. 良好连续性 2AFC 参数
  obstacle?: {
    type: 'circle' | 'rect';
    cx: number;
    cy: number;
    size: number;
  };
  incomingLine?: LineSegment;
  lineOptionA?: LineSegment;
  lineOptionB?: LineSegment;
  correctChoice?: 'A' | 'B';
  parallelOffset?: number;

  // 4. 3D 结构翻转参数
  gridDim3D?: number;
  targetPoint3D?: Point3D;
  projectedGridPoints?: Point[];
  targetProjectedPoint?: Point;
}

export interface PerspectiveHitResult {
  isHit: boolean;
  userValue?: number | 'A' | 'B' | Point;
  targetValue?: number | 'A' | 'B' | Point;
  errorValue: number;
  tolerance: number;
  ratioProgress?: number;
}