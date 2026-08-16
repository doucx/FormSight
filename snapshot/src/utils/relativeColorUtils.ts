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
 * 带有色域边缘检测与反射的加点辅助函数
 */
function applyOffsetWithGamutCheck(
  baseLab: [number, number, number],
  directionVector: [number, number, number],
  distance: number,
): [number, number, number] {
  // 试探正向偏移
  const candidateLab1: [number, number, number] = [
    baseLab[0] + directionVector[0] * distance,
    baseLab[1] + directionVector[1] * distance,
    baseLab[2] + directionVector[2] * distance,
  ];

  const hsv1 = okLabToHsv(candidateLab1);
  const reprojectedLab1 = hsvToOkLab(...hsv1);
  const actualDist1 = calcDeltaEOk(baseLab, reprojectedLab1);

  // 如果正向偏移转换回 HSV 后未发生严重的色域裁剪 (有效感知距离保留了至少 70%)
  if (actualDist1 >= distance * 0.7) {
    return hsv1;
  }

  // 否则尝试反方向（反弹机制），避免撞墙被裁剪导致颜色重合
  const candidateLab2: [number, number, number] = [
    baseLab[0] - directionVector[0] * distance,
    baseLab[1] - directionVector[1] * distance,
    baseLab[2] - directionVector[2] * distance,
  ];

  return okLabToHsv(candidateLab2);
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

  let attempts = 0;
  let colorA: [number, number, number] = [0, 0, 0];
  let colorB: [number, number, number] = [0, 0, 0];
  let colorC: [number, number, number] = [0, 0, 0];
  let targetD: [number, number, number] = [0, 0, 0];
  let labTargetD: [number, number, number] = [0, 0, 0];
  let vAB: [number, number, number] = [0, 0, 0];

  while (attempts < 100) {
    attempts++;
    // 生成 A (固有色 1)
    const hA = Math.floor(Math.random() * 360);
    const sA = Math.floor(Math.random() * 60) + 30; // 30..90
    const vA = Math.floor(Math.random() * 60) + 30; // 30..90
    colorA = [hA, sA, vA];

    // 生成 B (在 A 基础上有明暗与色相矢量推移)
    const hB = (hA + (Math.floor(Math.random() * 60) - 30) + 360) % 360;
    const sB = Math.max(10, Math.min(100, sA + (Math.floor(Math.random() * 40) - 20)));
    const vB = Math.max(10, Math.min(100, vA + (Math.floor(Math.random() * 50) - 25)));
    colorB = [hB, sB, vB];

    // 生成 C (全新的固有色 2)
    const hC = Math.floor(Math.random() * 360);
    const sC = Math.floor(Math.random() * 60) + 30;
    const vC = Math.floor(Math.random() * 60) + 30;
    colorC = [hC, sC, vC];

    const labA = hsvToOkLab(...colorA);
    const labB = hsvToOkLab(...colorB);
    const labC = hsvToOkLab(...colorC);

    vAB = [labB[0] - labA[0], labB[1] - labA[1], labB[2] - labA[2]];
    const vMag = Math.sqrt(vAB[0] ** 2 + vAB[1] ** 2 + vAB[2] ** 2);

    // 确保基准推移矢量 vAB 具备足够的感知长度，避免矢量过短
    if (vMag < 0.03) continue;

    labTargetD = [labC[0] + vAB[0], labC[1] + vAB[1], labC[2] + vAB[2]];

    if (labTargetD[0] >= 0.1 && labTargetD[0] <= 0.9) {
      targetD = okLabToHsv(labTargetD);
      break;
    }
  }

  // 计算正交单位向量
  const vMag = Math.sqrt(vAB[0] ** 2 + vAB[1] ** 2 + vAB[2] ** 2);
  const uV: [number, number, number] = [vAB[0] / vMag, vAB[1] / vMag, vAB[2] / vMag];

  // 1. 矢量方向干扰项 D1 (在推移矢量方向上做绝对距离 R 的偏移)
  const hsvD1 = applyOffsetWithGamutCheck(labTargetD, uV, R);

  // 2. 明度方向干扰项 D2 (纯 L 轴向量方向上做绝对距离 R 的偏移)
  const uL: [number, number, number] = [1, 0, 0];
  const hsvD2 = applyOffsetWithGamutCheck(labTargetD, uL, R);

  // 3. 色相/色偏法向干扰项 D3 (在 a-b 平面上寻找与 vAB 正交的方向向量)
  let uOrth: [number, number, number] = [0, -uV[2], uV[1]];
  const uOrthMag = Math.sqrt(uOrth[1] ** 2 + uOrth[2] ** 2);
  if (uOrthMag < 1e-4) {
    uOrth = [0, 1, 0];
  } else {
    uOrth = [0, uOrth[1] / uOrthMag, uOrth[2] / uOrthMag];
  }
  const hsvD3 = applyOffsetWithGamutCheck(labTargetD, uOrth, R);

  const rawOptions: [number, number, number][] = [targetD, hsvD1, hsvD2, hsvD3];

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