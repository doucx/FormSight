export interface Vec3Data {
  x: number;
  y: number;
  z: number;
}

export interface PlaneConfig {
  type: 'CORRECT' | 'DIST_DEPTH' | 'DIST_TILT' | 'DIST_COMPLEX';
  center: Vec3Data;
  u: Vec3Data;
  v: Vec3Data;
  norm: Vec3Data;
}

export interface QuestionData {
  id: string;
  difficultyLevel: number;
  seed: number;
  deltaZ: number;
  deltaTiltDeg: number;
  normal: Vec3Data;
  offset: number;
  planeCenter: Vec3Data;
  uVec: Vec3Data;
  vVec: Vec3Data;
  configs: PlaneConfig[];
  correctIdx: number;
}

export interface HitResult {
  isHit: boolean;
  chosenIdx: number;
  correctIdx: number;
}