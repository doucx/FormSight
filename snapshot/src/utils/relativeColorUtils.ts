import { calcDeltaEOk, getTargetDeltaEForLevel, hsvToOkLab } from './oklchUtils';

export type RelativeColorMode = 'VECTOR_SHIFT';

export interface RelativeColorQuestionData {
  id: string;
  mode: RelativeColorMode;
  difficultyLevel: number;
  colorA: [number, number, number]; // [H, S, V]
  colorB: [number, number, number]; // [H, S, V]
  colorC: [number, number, number]; // [H, S, V]
  targetD: [number, number, number]; // [H, S, V]
  tolerance: number; // ΔE_target
  options: [number, number, number][]; // 4 个候选 HSV tuple
  correctIndex: number; // 正确选项的索引 (0~3)
}

export interface RelativeColorHitResult {
  isHit: boolean;
  userD: [number, number, number];
  targetD: [number, number, number];
  deltaEError: number;
  magnitudeError: number;
  angleErrorDeg: number;
  tolerance: number;
  selectedIndex?: number;
}

/**
 * 将 OKLab 坐标逆向近似换算为可显示 sRGB / HSV
 */
export function okLabToHsv(lab: [number, number, number]): [number, number, number] {
  const [L, a, b] = lab;

  const lCbrt = L + 0.3963377774 * a + 0.2158037573 * b;
  const mCbrt = L - 0.1055613458 * a - 0.0638541728 * b;
  const sCbrt = L - 0.0894841775 * a - 1.291485548 * b;

  const lCone = lCbrt ** 3;
  const mCone = mCbrt ** 3;
  const sCone = sCbrt ** 3;

  let rLin = +4.0767416621 * lCone - 3.3077115913 * mCone + 0.2309699292 * sCone;
  let gLin = -1.2684380046 * lCone + 2.6097574011 * mCone - 0.3413193965 * sCone;
  let bLin = -0.0041960863 * lCone - 0.7034186147 * mCone + 1.707614701 * sCone;

  rLin = Math.max(0, Math.min(1, rLin));
  gLin = Math.max(0, Math.min(1, gLin));
  bLin = Math.max(0, Math.min(1, bLin));

  const toSrgb = (val: number) =>
    val <= 0.0031308 ? val * 12.92 : 1.055 * val ** (1 / 2.4) - 0.055;
  const rSrgb = Math.max(0, Math.min(1, toSrgb(rLin)));
  const gSrgb = Math.max(0, Math.min(1, toSrgb(gLin)));
  const bSrgb = Math.max(0, Math.min(1, toSrgb(bLin)));

  const max = Math.max(rSrgb, gSrgb, bSrgb);
  const min = Math.min(rSrgb, gSrgb, bSrgb);
  const delta = max - min;

  let h = 0;
  if (delta > 1e-5) {
    if (max === rSrgb) {
      h = 60 * (((gSrgb - bSrgb) / delta) % 6);
    } else if (max === gSrgb) {
      h = 60 * ((bSrgb - rSrgb) / delta + 2);
    } else {
      h = 60 * ((rSrgb - gSrgb) / delta + 4);
    }
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return [Math.round(h), Math.round(s * 100), Math.round(v * 100)];
}

/**
 * 根据难度等级 (Level 1..35) 计算干扰项的绝对 OKLab 距离 Radius R
 */
export function getDistractorDistanceForLevel(level: number): number {
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34; // 0..1
  const maxR = 0.14; // Level 1 干扰项距离目标 ΔE ≈ 0.14 (清晰可辨)
  const minR = 0.015; // Level 35 干扰项距离目标 ΔE ≈ 0.015 (极度精细)

  return maxR * (minR / maxR) ** t;
}

/**
 * 生成 3D 空间中的随机单位向量 (用于旋转轴)
 */
function getRandomAxis(): [number, number, number] {
  const z = Math.random() * 2 - 1;
  const phi = Math.random() * 2 * Math.PI;
  const r = Math.sqrt(1 - z * z);
  return [r * Math.cos(phi), r * Math.sin(phi), z];
}

/**
 * 罗德里格旋转公式：将向量 v 绕单位轴 axis 旋转 theta 角度
 */
function rotateVector(
  v: [number, number, number],
  axis: [number, number, number],
  theta: number,
): [number, number, number] {
  const [vx, vy, vz] = v;
  const [kx, ky, kz] = axis;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const dot = kx * vx + ky * vy + kz * vz;
  const crossX = ky * vz - kz * vy;
  const crossY = kz * vx - kx * vz;
  const crossZ = kx * vy - ky * vx;

  return [
    vx * cosT + crossX * sinT + kx * dot * (1 - cosT),
    vy * cosT + crossY * sinT + ky * dot * (1 - cosT),
    vz * cosT + crossZ * sinT + kz * dot * (1 - cosT),
  ];
}

/**
 * 判断 OKLab 坐标是否严格落在 sRGB 可显色域内部 (无截断)
 */
export function isOkLabInGamut(lab: [number, number, number]): boolean {
  const [L, a, b] = lab;
  if (L < 0 || L > 1) return false;

  const lCbrt = L + 0.3963377774 * a + 0.2158037573 * b;
  const mCbrt = L - 0.1055613458 * a - 0.0638541728 * b;
  const sCbrt = L - 0.0894841775 * a - 1.291485548 * b;

  const lCone = lCbrt ** 3;
  const mCone = mCbrt ** 3;
  const sCone = sCbrt ** 3;

  const rLin = +4.0767416621 * lCone - 3.3077115913 * mCone + 0.2309699292 * sCone;
  const gLin = -1.2684380046 * lCone + 2.6097574011 * mCone - 0.3413193965 * sCone;
  const bLin = -0.0041960863 * lCone - 0.7034186147 * mCone + 1.707614701 * sCone;

  const eps = 1e-4;
  return (
    rLin >= -eps && rLin <= 1 + eps &&
    gLin >= -eps && gLin <= 1 + eps &&
    bLin >= -eps && bLin <= 1 + eps
  );
}

/**
 * 校验 OKLab 目标点周围在指定 margin 距离内是否拥有充足的 sRGB 色域安全气囊
 */
function hasGamutMargin(lab: [number, number, number], margin: number): boolean {
  const [L, a, b] = lab;
  const testPoints: [number, number, number][] = [
    [L, a, b],
    [L + margin, a, b],
    [L - margin, a, b],
    [L, a + margin, b],
    [L, a - margin, b],
    [L, a, b + margin],
    [L, a, b - margin],
  ];

  return testPoints.every(isOkLabInGamut);
}

/**
 * 随机生成色彩矢量迁移题目与 4 个满足确定性绝对安全距离的 candidate 干扰选项
 */
export function generateRelativeColorQuestion(
  mode: RelativeColorMode,
  level: number,
): RelativeColorQuestionData {
  const id = `rcq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const tolerance = getTargetDeltaEForLevel(clampedLevel);
  const R = getDistractorDistanceForLevel(clampedLevel);

  // 难度归一化因子 (0.0 ~ 1.0)
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
    // 生成 A (固有色 1 - 适度收敛饱和度区间以保障 D 具有足够四面体舒展空间)
    const hA = Math.floor(Math.random() * 360);
    const sA = Math.floor(Math.random() * 55) + 25; // 25..80
    const vA = Math.floor(Math.random() * 55) + 30; // 30..85
    colorA = [hA, sA, vA];

    // 生成 B (在 A 基础上有明暗与色相矢量推移)
    const hB = (hA + (Math.floor(Math.random() * 60) - 30) + 360) % 360;
    const sB = Math.max(15, Math.min(90, sA + (Math.floor(Math.random() * 40) - 20)));
    const vB = Math.max(20, Math.min(95, vA + (Math.floor(Math.random() * 50) - 25)));
    colorB = [hB, sB, vB];

    // 生成 C (根据 level 动态控制与 A 的相似度)
    // Level 1 时偏置极小 (±10°, ±5%, ±5%)，Level 35 时全色域随机 (±180°, ±40%, ±40%)
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

    // 确保基准推移矢量 vAB 具备足够的感知长度，避免矢量过短
    if (vMag < 0.03) continue;

    labTargetD = [labC[0] + vAB[0], labC[1] + vAB[1], labC[2] + vAB[2]];

    // 方案二核心：检查目标点 D 是否在全方向上具备距离 R 的色域安全气囊
    if (hasGamutMargin(labTargetD, R * 0.95)) {
      targetD = okLabToHsv(labTargetD);
      break;
    }
  }

  // 若极端尝试后仍未打破循环，做平滑回退
  if (!targetD || (targetD[0] === 0 && targetD[1] === 0 && targetD[2] === 0 && attempts >= 200)) {
    targetD = okLabToHsv(labTargetD);
  }

  // ====================================================================
  // 基于正四面体 (Regular Tetrahedron) 生成干扰项
  // 保证 D 是四个顶点之一，且四个顶点两两间距严格等于 R
  // ====================================================================
  const baseV1: [number, number, number] = [1, 0, 0];
  const baseV2: [number, number, number] = [0.5, Math.sqrt(3) / 2, 0];
  const baseV3: [number, number, number] = [0.5, Math.sqrt(3) / 6, Math.sqrt(2 / 3)];

  let bestDistractors: [number, number, number][] = [];
  let bestValidCount = -1;

  for (let attempt = 0; attempt < 30; attempt++) {
    const axis = getRandomAxis();
    const theta = Math.random() * Math.PI * 2;

    const rotV1 = rotateVector(baseV1, axis, theta);
    const rotV2 = rotateVector(baseV2, axis, theta);
    const rotV3 = rotateVector(baseV3, axis, theta);

    const lab1: [number, number, number] = [
      labTargetD[0] + rotV1[0] * R,
      labTargetD[1] + rotV1[1] * R,
      labTargetD[2] + rotV1[2] * R,
    ];
    const lab2: [number, number, number] = [
      labTargetD[0] + rotV2[0] * R,
      labTargetD[1] + rotV2[1] * R,
      labTargetD[2] + rotV2[2] * R,
    ];
    const lab3: [number, number, number] = [
      labTargetD[0] + rotV3[0] * R,
      labTargetD[1] + rotV3[1] * R,
      labTargetD[2] + rotV3[2] * R,
    ];

    const hsv1 = okLabToHsv(lab1);
    const hsv2 = okLabToHsv(lab2);
    const hsv3 = okLabToHsv(lab3);

    const rep1 = hsvToOkLab(...hsv1);
    const rep2 = hsvToOkLab(...hsv2);
    const rep3 = hsvToOkLab(...hsv3);

    const dist1 = calcDeltaEOk(labTargetD, rep1);
    const dist2 = calcDeltaEOk(labTargetD, rep2);
    const dist3 = calcDeltaEOk(labTargetD, rep3);

    let validCount = 0;
    if (dist1 >= R * 0.7) validCount++;
    if (dist2 >= R * 0.7) validCount++;
    if (dist3 >= R * 0.7) validCount++;

    if (validCount > bestValidCount) {
      bestValidCount = validCount;
      bestDistractors = [hsv1, hsv2, hsv3];
    }

    if (validCount === 3) {
      break;
    }
  }

  const rawOptions: [number, number, number][] = [targetD, ...bestDistractors];

  // 打乱选项并记录正确选项索引
  const indexedOptions = rawOptions.map((opt, index) => ({ opt, isTarget: index === 0 }));
  for (let i = indexedOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexedOptions[i], indexedOptions[j]] = [indexedOptions[j], indexedOptions[i]];
  }

  const options = indexedOptions.map((o) => o.opt);
  const correctIndex = indexedOptions.findIndex((o) => o.isTarget);

  return {
    id,
    mode,
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
 * 基于 OKLab 空间色差与矢量特性的答题判定函数
 */
export function checkRelativeColorHit(
  _mode: RelativeColorMode,
  userD: [number, number, number],
  question: RelativeColorQuestionData,
): RelativeColorHitResult {
  const { colorA, colorB, colorC, targetD, difficultyLevel, options, correctIndex } = question;

  const labA = hsvToOkLab(...colorA);
  const labB = hsvToOkLab(...colorB);
  const labC = hsvToOkLab(...colorC);
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

  // 测量矢量模长误差与方向夹角
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
