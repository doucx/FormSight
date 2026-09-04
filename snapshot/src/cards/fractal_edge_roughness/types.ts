import type { UnifiedTrialRecord } from '@formsight/card-sdk';

export interface HitResult {
  isHit: boolean;
  userH: number;
  targetH: number;
  errorValue: number; // 绝对误差 |userH - targetH|
  signedBias: number; // 符号偏置 userH - targetH (正为偏平滑/低估粗糙度，负为过度敏感)
  tolerance: number;
}

export interface FractalEdgeRoughnessTrialRecord extends UnifiedTrialRecord {
  targetH: number;
  userH: number;
  errorValue: number;
  signedBias: number;
}
