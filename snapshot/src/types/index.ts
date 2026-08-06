export type TrainingMode = 'single' | 'double_h' | 'double_r';

export interface Point {
  x: number;
  y: number;
}

export interface QuestionData {
  id: string;
  mode: TrainingMode;
  anchorA: Point;
  anchorC: Point | null;
  targetB: Point;
  gridStart: Point;
  difficultyLevel: number; // 统一抽象难度等级 (1..N)
  gridDim: number; // 默认 5 (5x5 网格)
  distractorPoints: Point[]; // 25 个非线性干扰点阵数组

  // 衍生分析指标 (用于后续弱点分析)
  angleDegree: number; // 极角 (0~360°)
  distanceRatio: number; // 极径/距离
  rotationAngle?: number; // 整体画布旋转倾角
}

export interface HitResult {
  isHit: boolean; // 是否选中正确的网格点
  nearestGridPoint: Point; // 用户点击位置对应的网格点
  errorDistance: number; // 点击位置与真理点的像素误差
  isWithinRange?: boolean; // 是否落在有效点击感应范围内
}

export interface TrialRecord {
  id: string;
  sessionId: string;
  mode: TrainingMode;
  timestamp: number;
  difficultyLevel: number; // 存入 Level 等级
  anchorA: [number, number];
  anchorC?: [number, number];
  targetB: [number, number];
  userClick: [number, number];
  angleDegree: number;
  distanceRatio: number;
  isHit: boolean;
  errorPixelDistance: number;
  responseTimeMs: number;
}
