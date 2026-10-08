import type { ColorSenseSettings } from '@formsight/card-sdk';

export interface ColorLightnessQuestionData {
  id: string;
  difficultyLevel: number; // 1..35
  targetH: number; // 0..359
  targetS: number; // 0..100
  targetV: number; // 0..100
  targetL: number; // 0..1 (OKLab Lightness)
  truthPercentage: number; // 0..100 (四舍五入真实百分比)
  neutralGrayHex: string; // 去色后的对应真实中性灰 HEX
  tolerance: number; // 允许的百分比误差阈值 (如 12% -> 2%)
}

export interface ColorLightnessHitResult {
  isHit: boolean;
  userValue: number; // 0..100
  targetValue: number; // 0..100
  errorValue: number; // 绝对误差百分比
  tolerance: number;
}

export type ColorLightnessSettings = ColorSenseSettings;
