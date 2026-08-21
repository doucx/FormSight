export type RelativeColorMode =
  | 'VECTOR_SHIFT'
  | 'LIGHTNESS_INDUCTION'
  | 'HUE_INDUCTION'
  | 'DECONTEXTUAL_2AFC';

export interface RelativeColorQuestionData {
  id: string;
  mode: RelativeColorMode;
  difficultyLevel: number;

  // VECTOR_SHIFT 模式字段
  colorA: [number, number, number]; // [H, S, V]
  colorB: [number, number, number]; // [H, S, V]
  colorC: [number, number, number]; // [H, S, V]
  targetD: [number, number, number]; // [H, S, V]
  options?: [number, number, number][]; // 4 个候选 HSV tuple
  correctIndex?: number; // 正确选项的索引 (0~3)

  // 阿尔伯斯同时对比共有字段
  bgLeft?: [number, number, number]; // 左侧背景 HSV
  bgRight?: [number, number, number]; // 右侧背景 HSV
  targetLeftCenter?: [number, number, number]; // 左侧固定中心色 HSV
  idealRightCenter?: [number, number, number]; // 右侧理想补偿中心色 HSV

  // DECONTEXTUAL_2AFC 模式字段
  centerColorA?: [number, number, number]; // 实际物理中心色 A
  centerColorB?: [number, number, number]; // 实际物理中心色 B
  largerPhysicalSide?: 'A' | 'B'; // 物理上更亮的一侧
  physicalValueDiff?: number; // 物理明度差异百分比

  tolerance: number; // 允许误差
}

export interface RelativeColorHitResult {
  isHit: boolean;
  userD?: [number, number, number];
  targetD?: [number, number, number];
  deltaEError: number;
  magnitudeError?: number;
  angleErrorDeg?: number;
  tolerance: number;
  selectedIndex?: number;

  // 2AFC 结果
  userChoice?: 'A' | 'B';
  correctChoice?: 'A' | 'B';
  physicalValueDiff?: number;
}