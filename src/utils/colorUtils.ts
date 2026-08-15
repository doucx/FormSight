import { calcDeltaEOk, getOkChroma, getTargetDeltaEForLevel, hsvToOkLab } from './oklchUtils';

export type ColorMode = 'H' | 'S' | 'V' | 'ALL';

export interface ColorQuestionData {
  id: string;
  mode: ColorMode;
  difficultyLevel: number; // 1..35
  targetH: number; // 0..359
  targetS: number; // 0..100
  targetV: number; // 0..100
  tolerance: number; // 允许的感知色差阈值 ΔE_target
}

export interface ColorHitResult {
  isHit: boolean;
  userValue: number;
  targetValue: number;
  errorValue: number; // 绝对数值误差 (角度、百分比或 OKLab ΔE)
  tolerance: number;
  userHSV?: [number, number, number];
}

/**
 * HSV (0..360, 0..100, 0..100) 转 16 进制 Hex
 */
export function hsvToHex(h: number, s: number, v: number): string {
  const normS = s / 100;
  const normV = v / 100;
  const c = normV * normS;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = normV - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const rHex = Math.round((r + m) * 255)
    .toString(16)
    .padStart(2, '0');
  const gHex = Math.round((g + m) * 255)
    .toString(16)
    .padStart(2, '0');
  const bHex = Math.round((b + m) * 255)
    .toString(16)
    .padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`.toUpperCase();
}

/**
 * 根据 Level (1..35) 计算允许的容错阈值（感知色差 ΔE）
 */
export function getToleranceForLevel(_mode: ColorMode, level: number): number {
  return getTargetDeltaEForLevel(level);
}

export interface ColorQuestionGenerateOptions {
  targetingMode?: 'off' | 'manual';
  targetSectors?: number[]; // [0~11] 代表 12 个 30° 的色相扇区
}

/**
 * 色相加权生成：70% 概率落在指定弱点靶向区间内，30% 全局随机
 */
function selectHueWithTargeting(options?: ColorQuestionGenerateOptions): number {
  if (
    options?.targetingMode &&
    options.targetingMode !== 'off' &&
    options.targetSectors &&
    options.targetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        options.targetSectors[Math.floor(Math.random() * options.targetSectors.length)];
      const sectorCenterAngle = chosenSector * 30 + 15;
      const jitter = (Math.random() - 0.5) * 30; // ±15° 范围抖动
      return Math.floor((sectorCenterAngle + jitter + 360) % 360);
    }
  }
  return Math.floor(Math.random() * 360);
}

/**
 * 生成色感练习题目 (基于 OKLab 可观测彩度与感知难度对齐)
 */
export function generateColorQuestion(
  mode: ColorMode,
  level: number,
  options?: ColorQuestionGenerateOptions,
): ColorQuestionData {
  const id = `cq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const tolerance = getTargetDeltaEForLevel(clampedLevel);

  const targetH = mode === 'H' ? selectHueWithTargeting(options) : Math.floor(Math.random() * 360);
  let targetS = 100;
  let targetV = 100;

  // 题目生成过滤逻辑：确保抽取的色彩具备视觉可观测量
  let attempts = 0;
  while (attempts < 50) {
    attempts++;
    if (mode === 'H' || mode === 'ALL') {
      targetS = Math.floor(Math.random() * 81) + 20; // 20..100
      targetV = Math.floor(Math.random() * 81) + 20; // 20..100

      // 检验 OKLab 彩度：必须保证彩度足够大，否则色相被低 S/V 遮蔽不可辩
      const lab = hsvToOkLab(targetH, targetS, targetV);
      if (getOkChroma(lab) >= tolerance * 1.5) {
        break;
      }
    } else if (mode === 'V') {
      targetS = Math.floor(Math.random() * 71) + 30; // S >= 30% 防止纯灰无明度变化感
      targetV = Math.floor(Math.random() * 101);
      break;
    } else {
      // mode === 'S'
      targetV = Math.floor(Math.random() * 71) + 30; // V >= 30% 防止纯黑无饱和度感
      targetS = Math.floor(Math.random() * 101);
      break;
    }
  }

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    targetH,
    targetS,
    targetV,
    tolerance,
  };
}

/**
 * 基于 OKLab 色差 ΔE_OK 的色感答题命中检测
 */
export function checkColorHit(
  mode: ColorMode,
  userVal: number | [number, number, number],
  question: ColorQuestionData,
): ColorHitResult {
  const { targetH, targetS, targetV, difficultyLevel } = question;

  let userH: number;
  let userS: number;
  let userV: number;

  if (mode === 'ALL' && Array.isArray(userVal)) {
    [userH, userS, userV] = userVal;
  } else {
    const singleVal = typeof userVal === 'number' ? userVal : userVal[0];
    userH = mode === 'H' ? singleVal : targetH;
    userS = mode === 'S' ? singleVal : targetS;
    userV = mode === 'V' ? singleVal : targetV;
  }

  const targetLab = hsvToOkLab(targetH, targetS, targetV);
  const userLab = hsvToOkLab(userH, userS, userV);
  const realDeltaE = calcDeltaEOk(targetLab, userLab);

  const targetDeltaE = getTargetDeltaEForLevel(difficultyLevel);
  const isHit = realDeltaE <= targetDeltaE;

  let targetVal = targetH;
  let errorVal = 0;

  if (mode === 'ALL') {
    targetVal = 0;
    errorVal = Math.round(realDeltaE * 1000) / 1000;
  } else if (mode === 'H') {
    targetVal = targetH;
    const diff = Math.abs((userVal as number) - targetVal);
    errorVal = Math.min(diff, 360 - diff);
  } else if (mode === 'V') {
    targetVal = targetV;
    errorVal = Math.abs((userVal as number) - targetVal);
  } else {
    targetVal = targetS;
    errorVal = Math.abs((userVal as number) - targetVal);
  }

  return {
    isHit,
    userValue: typeof userVal === 'number' ? userVal : userH,
    targetValue: targetVal,
    errorValue: Math.round(errorVal * 10) / 10,
    tolerance: targetDeltaE,
    userHSV: [userH, userS, userV],
  };
}

export interface ToleranceSpan {
  minVal: number;
  maxVal: number;
  halfSpan: number;
}

/**
 * 根据悬停数值 hoverVal 和 OKLab 容错，计算滑块轨道上的容错数值跨度
 */
export function getToleranceSpan(
  mode: ColorMode,
  hoverVal: number,
  question: ColorQuestionData,
): ToleranceSpan {
  const { targetH, targetS, targetV, difficultyLevel } = question;
  const targetDeltaE = getTargetDeltaEForLevel(difficultyLevel);

  const curH = mode === 'H' ? hoverVal : targetH;
  const curS = mode === 'S' ? hoverVal : targetS;
  const curV = mode === 'V' ? hoverVal : targetV;
  const baseLab = hsvToOkLab(curH, curS, curV);

  const maxValLimit = mode === 'H' ? 360 : 100;
  const step = mode === 'H' ? 0.5 : 0.2;

  // 向左探索界限
  let leftVal = hoverVal;
  while (leftVal > (mode === 'H' ? hoverVal - 180 : 0)) {
    const testVal = leftVal - step;
    const testH = mode === 'H' ? (testVal + 360) % 360 : targetH;
    const testS = mode === 'S' ? Math.max(0, testVal) : targetS;
    const testV = mode === 'V' ? Math.max(0, testVal) : targetV;
    const testLab = hsvToOkLab(testH, testS, testV);

    if (calcDeltaEOk(baseLab, testLab) > targetDeltaE) break;
    leftVal = testVal;
  }

  // 向右探索界限
  let rightVal = hoverVal;
  while (rightVal < (mode === 'H' ? hoverVal + 180 : 100)) {
    const testVal = rightVal + step;
    const testH = mode === 'H' ? testVal % 360 : targetH;
    const testS = mode === 'S' ? Math.min(100, testVal) : targetS;
    const testV = mode === 'V' ? Math.min(100, testVal) : targetV;
    const testLab = hsvToOkLab(testH, testS, testV);

    if (calcDeltaEOk(baseLab, testLab) > targetDeltaE) break;
    rightVal = testVal;
  }

  const halfSpan = (rightVal - leftVal) / 2;
  return {
    minVal: Math.max(0, hoverVal - halfSpan),
    maxVal: Math.min(maxValLimit, hoverVal + halfSpan),
    halfSpan: Math.round(halfSpan * 10) / 10,
  };
}
