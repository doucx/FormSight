import { hsvToOkLab } from '../oklchUtils';

/**
 * 根据难度等级 (Level 1..35) 计算干扰项的绝对 OKLab 距离 Radius R
 */
export function getDistractorDistanceForLevel(level: number): number {
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34;
  const maxR = 0.14;
  const minR = 0.015;
  return maxR * (minR / maxR) ** t;
}

/**
 * 计算背景对中心色的感知诱导偏移 (OKLab 空间侧抑制模型)
 * 诱导方向与背景相反，强度与色差成正比 (系数约 0.22)
 */
export function calcInductionShift(
  bgLab: [number, number, number],
  centerLab: [number, number, number],
  intensity = 0.22,
): [number, number, number] {
  const dL = bgLab[0] - centerLab[0];
  const da = bgLab[1] - centerLab[1];
  const db = bgLab[2] - centerLab[2];

  return [-dL * intensity, -da * intensity, -db * intensity];
}

/**
 * 计算右侧中心色需要的理论物理补偿值，使得左右在感知上完全一致：
 * Perceived(Left) = Lab_L + Shift(Bg_L, Lab_L)
 * Perceived(Right) = Lab_R + Shift(Bg_R, Lab_R)
 * 求解 Lab_R
 */
export function calcCompensatedRightColor(
  bgLeftLab: [number, number, number],
  centerLeftLab: [number, number, number],
  bgRightLab: [number, number, number],
  intensity = 0.22,
): [number, number, number] {
  const shiftL = calcInductionShift(bgLeftLab, centerLeftLab, intensity);
  const perceivedL: [number, number, number] = [
    centerLeftLab[0] + shiftL[0],
    centerLeftLab[1] + shiftL[1],
    centerLeftLab[2] + shiftL[2],
  ];

  const factor = 1 + intensity;
  const idealLabR: [number, number, number] = [
    (perceivedL[0] + intensity * bgRightLab[0]) / factor,
    (perceivedL[1] + intensity * bgRightLab[1]) / factor,
    (perceivedL[2] + intensity * bgRightLab[2]) / factor,
  ];

  return idealLabR;
}
