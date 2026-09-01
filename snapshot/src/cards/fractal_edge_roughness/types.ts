export interface QuestionData {
  id: string;
  difficultyLevel: number;
  targetH: number; // 目标 Hurst 指数 [0.10, 1.00]
  targetSeed: number; // 目标折线随机种子
  userSeed: number; // 用户折线独立随机种子（防作弊）
  tolerance: number; // 当前难度等级下的允许误差 ΔH
  sectorIdx: number; // 粗糙度频段：0: 高碎裂 (0.1~0.4), 1: 中度纹理 (0.4~0.7), 2: 平滑流线 (0.7~1.0)
}

export interface HitResult {
  isHit: boolean;
  userH: number;
  targetH: number;
  errorValue: number; // 绝对误差 |userH - targetH|
  signedBias: number; // 符号偏置 userH - targetH (正为偏平滑/低估粗糙度，负为过度敏感)
  tolerance: number;
}
