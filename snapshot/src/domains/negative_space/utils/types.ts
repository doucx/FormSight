import type { Point } from '../../../types';

export type NegativeSpaceMode =
  | 'RATIO_ESTIMATION'
  | 'AREA_COMPARISON_2AFC'
  | 'NEGATIVE_VERTEX_FITTING'
  | 'SHAPE_MATCH_2AFC';

export const NEGATIVE_SPACE_CANVAS_SIZE = 400;
export const TWO_AFC_CANVAS_SIZE = 280;
export const FITTING_CANVAS_SIZE = 340;

export interface NegativeSpaceQuestionData {
  id: string;
  mode: NegativeSpaceMode;
  difficultyLevel: number;

  // 单图滑块估算模式字段
  vertices?: Point[];
  canvasArea: number;
  positiveArea?: number;
  negativeArea?: number;
  targetNegativeRatio?: number;
  tolerance: number;

  // 2AFC 二分判别模式字段
  verticesA?: Point[];
  verticesB?: Point[];
  negAreaA?: number;
  negAreaB?: number;
  negRatioA?: number;
  negRatioB?: number;
  largerSide?: 'A' | 'B';
  areaDeltaPercent?: number;

  // 负形反切定点模式字段
  targetVertexIndex?: number;
  targetPoint?: Point;
  truncatedVertices?: Point[];
  distractorPoints?: Point[];
  gridDim?: number;

  // 记忆匹配 2AFC 模式字段
  targetPolygon?: Point[];
  optionsPolygons?: Point[][];
  correctOptionIndex?: number;
  correctChoice?: 'A' | 'B';
  displayTimeMs?: number;
}

export interface NegativeSpaceHitResult {
  isHit: boolean;
  userRatio?: number;
  targetRatio?: number;
  errorValue: number;
  tolerance: number;

  // 2AFC 结果字段
  userChoice?: 'A' | 'B';
  correctChoice?: 'A' | 'B';
  negRatioA?: number;
  negRatioB?: number;

  // 定点模式结果字段
  clickPoint?: Point;
  nearestGridPoint?: Point;
  isWithinRange?: boolean;

  // 记忆匹配 2AFC 结果字段
  userChoiceIndex?: number;
  correctOptionIndex?: number;
}
