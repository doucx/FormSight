export type ColorMode = 'H' | 'S' | 'V';

export interface ColorQuestionData {
  id: string;
  mode: ColorMode;
  difficultyLevel: number; // 1..35
  targetH: number; // 0..359
  targetS: number; // 0..100
  targetV: number; // 0..100
  tolerance: number; // 允许的误差阈值 (角度或百分比)
}

export interface ColorHitResult {
  isHit: boolean;
  userValue: number;
  targetValue: number;
  errorValue: number; // 绝对误差
  tolerance: number;
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
 * 根据 Level (1..35) 计算允许的容错阈值
 */
export function getToleranceForLevel(mode: ColorMode, level: number): number {
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34; // 0..1

  if (mode === 'H') {
    // Hue 模式: Level 1 容错 ±30°，Level 35 缩紧至 ±4°
    return Math.max(4, Math.round(30 - t * 26));
  }
  // S / V 模式: Level 1 容错 ±15%，Level 35 缩紧至 ±2%
  return Math.max(2, Math.round(15 - t * 13));
}

export interface ColorQuestionGenerateOptions {
  targetingMode?: 'off' | 'auto' | 'manual';
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
      // 每个扇区 30度。例如 0号扇区是 0~30度，中心是 15度
      const sectorCenterAngle = chosenSector * 30 + 15;
      const jitter = (Math.random() - 0.5) * 30; // ±15° 范围抖动
      return Math.floor((sectorCenterAngle + jitter + 360) % 360);
    }
  }
  return Math.floor(Math.random() * 360);
}

/**
 * 生成色感练习题目 (包含锥形难度对齐策略)
 */
export function generateColorQuestion(mode: ColorMode, level: number, options?: ColorQuestionGenerateOptions): ColorQuestionData {
  const id = `cq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const tolerance = getToleranceForLevel(mode, level);
  const clampedLevel = Math.max(1, Math.min(35, level));

  const targetH = mode === 'H' ? selectHueWithTargeting(options) : Math.floor(Math.random() * 360);
  let targetS = 100;
  let targetV = 100;

  if (mode === 'H') {
    // 低 Level 限制在高鲜艳度区 (S/V 处于 75~100)；高 Level 逐渐下探至低 S/V 区
    const minSV = Math.max(15, Math.round(75 - ((clampedLevel - 1) / 34) * 60));
    targetS = Math.floor(Math.random() * (100 - minSV + 1)) + minSV;
    targetV = Math.floor(Math.random() * (100 - minSV + 1)) + minSV;
  } else if (mode === 'V') {
    // 考察 V 时，S 保持在 30 以上防止纯灰无明度变化感
    targetS = Math.floor(Math.random() * 71) + 30;
    targetV = Math.floor(Math.random() * 101);
  } else {
    // 考察 S 时，V 保持在 30 以上防止纯黑无饱和度感
    targetV = Math.floor(Math.random() * 71) + 30;
    targetS = Math.floor(Math.random() * 101);
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
 * 色感答题命中检测
 */
export function checkColorHit(
  mode: ColorMode,
  userVal: number,
  question: ColorQuestionData,
): ColorHitResult {
  let targetVal = question.targetH;
  let errorVal = 0;

  if (mode === 'H') {
    targetVal = question.targetH;
    // 环形 0..360° 最小角距离
    const diff = Math.abs(userVal - targetVal);
    errorVal = Math.min(diff, 360 - diff);
  } else if (mode === 'V') {
    targetVal = question.targetV;
    errorVal = Math.abs(userVal - targetVal);
  } else {
    targetVal = question.targetS;
    errorVal = Math.abs(userVal - targetVal);
  }

  const isHit = errorVal <= question.tolerance;

  return {
    isHit,
    userValue: userVal,
    targetValue: targetVal,
    errorValue: Math.round(errorVal * 10) / 10,
    tolerance: question.tolerance,
  };
}
