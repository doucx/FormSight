import {
  calcDeltaEOk,
  generateTetrahedralDistractors,
  getTargetDeltaEForLevel,
  hasGamutMargin,
  hsvToOkLab,
  isOkLabInGamut,
  okLabToHsv,
} from './oklchUtils';
export { okLabToHsv, isOkLabInGamut };

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

  // Lab_R * (1 + intensity) = perceivedL + intensity * bgRightLab
  const factor = 1 + intensity;
  const idealLabR: [number, number, number] = [
    (perceivedL[0] + intensity * bgRightLab[0]) / factor,
    (perceivedL[1] + intensity * bgRightLab[1]) / factor,
    (perceivedL[2] + intensity * bgRightLab[2]) / factor,
  ];

  return idealLabR;
}

/**
 * 随机生成色彩矢量迁移题目
 */
export function generateVectorShiftQuestion(level: number): RelativeColorQuestionData {
  const id = `rcq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const tolerance = getTargetDeltaEForLevel(clampedLevel);
  const R = getDistractorDistanceForLevel(clampedLevel);
  const t = (clampedLevel - 1) / 34;

  let attempts = 0;
  let colorA: [number, number, number] = [0, 0, 0];
  let colorB: [number, number, number] = [0, 0, 0];
  let colorC: [number, number, number] = [0, 0, 0];
  let targetD: [number, number, number] = [0, 0, 0];
  let labTargetD: [number, number, number] = [0, 0, 0];
  let vAB: [number, number, number] = [0, 0, 0];

  while (attempts < 200) {
    attempts++;
    const hA = Math.floor(Math.random() * 360);
    const sA = Math.floor(Math.random() * 55) + 25;
    const vA = Math.floor(Math.random() * 55) + 30;
    colorA = [hA, sA, vA];

    const hB = (hA + (Math.floor(Math.random() * 60) - 30) + 360) % 360;
    const sB = Math.max(15, Math.min(90, sA + (Math.floor(Math.random() * 40) - 20)));
    const vB = Math.max(20, Math.min(95, vA + (Math.floor(Math.random() * 50) - 25)));
    colorB = [hB, sB, vB];

    const maxHueOffset = 10 + t * 170;
    const maxSatOffset = 5 + t * 35;
    const maxValOffset = 5 + t * 35;

    const hC_jitter = (Math.random() * 2 - 1) * maxHueOffset;
    const sC_jitter = (Math.random() * 2 - 1) * maxSatOffset;
    const vC_jitter = (Math.random() * 2 - 1) * maxValOffset;

    const hC = (hA + hC_jitter + 360) % 360;
    const sC = Math.max(15, Math.min(90, sA + sC_jitter));
    const vC = Math.max(20, Math.min(95, vA + vC_jitter));
    colorC = [Math.round(hC), Math.round(sC), Math.round(vC)];

    const labA = hsvToOkLab(...colorA);
    const labB = hsvToOkLab(...colorB);
    const labC = hsvToOkLab(...colorC);

    vAB = [labB[0] - labA[0], labB[1] - labA[1], labB[2] - labA[2]];
    const vMag = Math.sqrt(vAB[0] ** 2 + vAB[1] ** 2 + vAB[2] ** 2);
    if (vMag < 0.03) continue;

    labTargetD = [labC[0] + vAB[0], labC[1] + vAB[1], labC[2] + vAB[2]];
    if (hasGamutMargin(labTargetD, R * 0.95)) {
      targetD = okLabToHsv(labTargetD);
      break;
    }
  }

  if (!targetD || (targetD[0] === 0 && targetD[1] === 0 && targetD[2] === 0 && attempts >= 200)) {
    targetD = okLabToHsv(labTargetD);
  }

  const bestDistractors = generateTetrahedralDistractors(labTargetD, R);
  const rawOptions: [number, number, number][] = [targetD, ...bestDistractors];
  const indexedOptions = rawOptions.map((opt, index) => ({ opt, isTarget: index === 0 }));
  for (let i = indexedOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexedOptions[i], indexedOptions[j]] = [indexedOptions[j], indexedOptions[i]];
  }

  const options = indexedOptions.map((o) => o.opt);
  const correctIndex = indexedOptions.findIndex((o) => o.isTarget);

  return {
    id,
    mode: 'VECTOR_SHIFT',
    difficultyLevel: clampedLevel,
    colorA,
    colorB,
    colorC,
    targetD,
    tolerance,
    options,
    correctIndex,
  };
}

/**
 * 生成阿尔伯斯明度反差补偿题目 (LIGHTNESS_INDUCTION)
 */
export function generateLightnessInductionQuestion(level: number): RelativeColorQuestionData {
  const id = `ali_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const tolerance = getTargetDeltaEForLevel(clampedLevel);

  // 左右背景明暗反差
  const isLeftBright = Math.random() < 0.5;
  const bgLVal = isLeftBright
    ? Math.floor(Math.random() * 20) + 75
    : Math.floor(Math.random() * 20) + 10;
  const bgRVal = isLeftBright
    ? Math.floor(Math.random() * 20) + 10
    : Math.floor(Math.random() * 20) + 75;

  const baseHue = Math.floor(Math.random() * 360);
  const baseSat = Math.floor(Math.random() * 15); // 近中性灰或微带色相

  const bgLeft: [number, number, number] = [baseHue, baseSat, bgLVal];
  const bgRight: [number, number, number] = [baseHue, baseSat, bgRVal];

  // 左侧固定中心色明度中等
  const centerLVal = Math.floor(Math.random() * 20) + 40;
  const targetLeftCenter: [number, number, number] = [baseHue, baseSat, centerLVal];

  const labBgL = hsvToOkLab(...bgLeft);
  const labCenterL = hsvToOkLab(...targetLeftCenter);
  const labBgR = hsvToOkLab(...bgRight);

  const idealLabR = calcCompensatedRightColor(labBgL, labCenterL, labBgR, 0.25);
  const idealRightCenter = okLabToHsv(idealLabR);

  return {
    id,
    mode: 'LIGHTNESS_INDUCTION',
    difficultyLevel: clampedLevel,
    colorA: bgLeft,
    colorB: targetLeftCenter,
    colorC: bgRight,
    targetD: idealRightCenter,
    bgLeft,
    bgRight,
    targetLeftCenter,
    idealRightCenter,
    tolerance,
  };
}

/**
 * 生成补色残像与色相诱导补偿题目 (HUE_INDUCTION)
 */
export function generateHueInductionQuestion(level: number): RelativeColorQuestionData {
  const id = `ahi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const tolerance = getTargetDeltaEForLevel(clampedLevel);

  // 左侧强背景色相 (高饱和)
  const bgLHue = Math.floor(Math.random() * 360);
  const bgLSat = Math.floor(Math.random() * 30) + 70;
  const bgLVal = Math.floor(Math.random() * 30) + 50;
  const bgLeft: [number, number, number] = [bgLHue, bgLSat, bgLVal];

  // 右侧对比/中性背景
  const bgRHue = (bgLHue + 180 + (Math.floor(Math.random() * 40) - 20)) % 360;
  const bgRSat = Math.floor(Math.random() * 25);
  const bgRVal = Math.floor(Math.random() * 30) + 50;
  const bgRight: [number, number, number] = [bgRHue, bgRSat, bgRVal];

  // 左侧中心色 (中等纯度)
  const centerHue = (bgLHue + 60 + Math.floor(Math.random() * 120)) % 360;
  const centerSat = Math.floor(Math.random() * 30) + 30;
  const centerVal = Math.floor(Math.random() * 30) + 45;
  const targetLeftCenter: [number, number, number] = [centerHue, centerSat, centerVal];

  const labBgL = hsvToOkLab(...bgLeft);
  const labCenterL = hsvToOkLab(...targetLeftCenter);
  const labBgR = hsvToOkLab(...bgRight);

  const idealLabR = calcCompensatedRightColor(labBgL, labCenterL, labBgR, 0.22);
  const idealRightCenter = okLabToHsv(idealLabR);

  return {
    id,
    mode: 'HUE_INDUCTION',
    difficultyLevel: clampedLevel,
    colorA: bgLeft,
    colorB: targetLeftCenter,
    colorC: bgRight,
    targetD: idealRightCenter,
    bgLeft,
    bgRight,
    targetLeftCenter,
    idealRightCenter,
    tolerance,
  };
}

/**
 * 生成环境穿透判别二选一题目 (DECONTEXTUAL_2AFC)
 */
export function generateDecontextual2AfcQuestion(level: number): RelativeColorQuestionData {
  const id = `adc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  // 物理明度差异：Level 1 为 18%，Level 35 为 1.5%
  const t = (clampedLevel - 1) / 34;
  const diffPercent = Math.max(1.5, Math.round(18 * (1.5 / 18) ** t * 10) / 10);

  const largerPhysicalSide: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B';

  // 随机化陷阱/对照分布：50% 概率为陷阱题（更亮放更亮背景），50% 概率为对照题（更亮放更暗背景）
  // 彻底解耦背景明暗与目标答案，防止通过选亮背景作弊
  const isTrapTrial = Math.random() < 0.5;
  const sideForBrightBg: 'A' | 'B' = isTrapTrial
    ? largerPhysicalSide
    : largerPhysicalSide === 'A'
      ? 'B'
      : 'A';

  const brightBgVal = Math.floor(Math.random() * 15) + 80;
  const darkBgVal = Math.floor(Math.random() * 15) + 10;

  const bgLeftVal = sideForBrightBg === 'A' ? brightBgVal : darkBgVal;
  const bgRightVal = sideForBrightBg === 'B' ? brightBgVal : darkBgVal;

  const baseHue = Math.floor(Math.random() * 360);
  const baseSat = Math.floor(Math.random() * 20);

  const bgLeft: [number, number, number] = [baseHue, baseSat, bgLeftVal];
  const bgRight: [number, number, number] = [baseHue, baseSat, bgRightVal];

  const baseCenterVal = Math.floor(Math.random() * 20) + 40;
  const valA =
    largerPhysicalSide === 'A' ? baseCenterVal + diffPercent : baseCenterVal - diffPercent;
  const valB =
    largerPhysicalSide === 'B' ? baseCenterVal + diffPercent : baseCenterVal - diffPercent;

  const centerColorA: [number, number, number] = [baseHue, baseSat, Math.round(valA)];
  const centerColorB: [number, number, number] = [baseHue, baseSat, Math.round(valB)];

  return {
    id,
    mode: 'DECONTEXTUAL_2AFC',
    difficultyLevel: clampedLevel,
    colorA: bgLeft,
    colorB: centerColorA,
    colorC: bgRight,
    targetD: centerColorB,
    bgLeft,
    bgRight,
    centerColorA,
    centerColorB,
    largerPhysicalSide,
    physicalValueDiff: diffPercent,
    tolerance: diffPercent,
  };
}

/**
 * 统一根据模式生成题目
 */
export function generateRelativeColorQuestion(
  mode: RelativeColorMode,
  level: number,
): RelativeColorQuestionData {
  switch (mode) {
    case 'LIGHTNESS_INDUCTION':
      return generateLightnessInductionQuestion(level);
    case 'HUE_INDUCTION':
      return generateHueInductionQuestion(level);
    case 'DECONTEXTUAL_2AFC':
      return generateDecontextual2AfcQuestion(level);
    default:
      return generateVectorShiftQuestion(level);
  }
}

/**
 * 答题判定
 */
export function checkRelativeColorHit(
  mode: RelativeColorMode,
  userAnswer: [number, number, number] | 'A' | 'B',
  question: RelativeColorQuestionData,
): RelativeColorHitResult {
  if (mode === 'DECONTEXTUAL_2AFC') {
    const userChoice = userAnswer as 'A' | 'B';
    const isHit = userChoice === question.largerPhysicalSide;
    return {
      isHit,
      userChoice,
      correctChoice: question.largerPhysicalSide,
      physicalValueDiff: question.physicalValueDiff,
      deltaEError: isHit ? 0 : (question.physicalValueDiff ?? 0),
      tolerance: question.tolerance,
    };
  }

  const userD = userAnswer as [number, number, number];
  const { colorA, colorB, colorC, targetD, difficultyLevel, options, correctIndex } = question;

  const labTargetD = hsvToOkLab(...targetD);
  const labUserD = hsvToOkLab(...userD);

  const selectedIndex = options?.findIndex(
    (opt) => opt[0] === userD[0] && opt[1] === userD[1] && opt[2] === userD[2],
  );

  const deltaEError = calcDeltaEOk(labTargetD, labUserD);
  const tolerance = getTargetDeltaEForLevel(difficultyLevel);
  const isHit =
    selectedIndex !== undefined && selectedIndex !== -1
      ? selectedIndex === correctIndex
      : deltaEError <= tolerance;

  const labA = hsvToOkLab(...colorA);
  const labB = hsvToOkLab(...colorB);
  const labC = hsvToOkLab(...colorC);

  const vRef: [number, number, number] = [labB[0] - labA[0], labB[1] - labA[1], labB[2] - labA[2]];
  const vUser: [number, number, number] = [
    labUserD[0] - labC[0],
    labUserD[1] - labC[1],
    labUserD[2] - labC[2],
  ];

  const magRef = Math.sqrt(vRef[0] ** 2 + vRef[1] ** 2 + vRef[2] ** 2);
  const magUser = Math.sqrt(vUser[0] ** 2 + vUser[1] ** 2 + vUser[2] ** 2);
  const magnitudeError = Math.abs(magUser - magRef);

  let angleErrorDeg = 0;
  if (magRef > 1e-4 && magUser > 1e-4) {
    const dot = vRef[0] * vUser[0] + vRef[1] * vUser[1] + vRef[2] * vUser[2];
    const cosTheta = Math.max(-1, Math.min(1, dot / (magRef * magUser)));
    angleErrorDeg = Math.round((Math.acos(cosTheta) * 180) / Math.PI);
  }

  return {
    isHit,
    userD,
    targetD,
    deltaEError: Math.round(deltaEError * 1000) / 1000,
    magnitudeError: Math.round(magnitudeError * 1000) / 1000,
    angleErrorDeg,
    tolerance,
    selectedIndex,
  };
}
