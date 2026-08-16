import type {
  RelativeColorHitResult,
  RelativeColorMode,
  RelativeColorQuestionData,
} from '../types';
import { hsvToHex } from './colorUtils';
import { calcDeltaEOk, getTargetDeltaEForLevel, hsvToOkLab } from './oklchUtils';

/**
 * OKLab (L: 0..1, a: -0.4..0.4, b: -0.4..0.4) -> sRGB (0..1) -> HSV (0..360, 0..100, 0..100)
 */
export function okLabToHsv(lab: [number, number, number]): [number, number, number] | null {
  const [L, a, bLab] = lab;

  // 1. OKLab -> LMS
  const lCbrt = L + 0.3963377774 * a + 0.2158037573 * bLab;
  const mCbrt = L - 0.1055613458 * a - 0.0638541728 * bLab;
  const sCbrt = L - 0.0894841775 * a - 1.291485548 * bLab;

  const lCone = lCbrt ** 3;
  const mCone = mCbrt ** 3;
  const sCone = sCbrt ** 3;

  // 2. LMS -> Linear RGB
  const rLin = +4.0767416621 * lCone - 3.3077115913 * mCone + 0.2309699292 * sCone;
  const gLin = -1.2684380046 * lCone + 2.6097574011 * mCone - 0.3413193965 * sCone;
  const bLin = -0.0041960863 * lCone - 0.7034186147 * mCone + 1.707614701 * sCone;

  // 3. Linear RGB -> sRGB
  const toSrgb = (val: number) =>
    val <= 0.0031308 ? 12.92 * val : 1.055 * Math.abs(val) ** (1 / 2.4) - 0.055;

  const rSrgb = toSrgb(rLin);
  const gSrgb = toSrgb(gLin);
  const bSrgb = toSrgb(bLin);

  // 检查是否在 RGB 色域内 (允许极小越界保护)
  if (
    rSrgb < -0.02 ||
    rSrgb > 1.02 ||
    gSrgb < -0.02 ||
    gSrgb > 1.02 ||
    bSrgb < -0.02 ||
    bSrgb > 1.02
  ) {
    return null;
  }

  const r = Math.max(0, Math.min(1, rSrgb));
  const g = Math.max(0, Math.min(1, gSrgb));
  const b = Math.max(0, Math.min(1, bSrgb));

  // 4. sRGB -> HSV
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(v * 100)];
}

/**
 * 校验 HSV 在 CSS hex 中是否有效呈现
 */
export function isHsvValid(hsv: [number, number, number]): boolean {
  try {
    const hex = hsvToHex(hsv[0], hsv[1], hsv[2]);
    return /^#[0-9A-F]{6}$/i.test(hex);
  } catch {
    return false;
  }
}

/**
 * 生成色彩矢量迁移 (Vector Shift) 题目
 */
export function generateRelativeColorQuestion(
  mode: RelativeColorMode = 'VECTOR_SHIFT',
  level: number = 5,
): RelativeColorQuestionData {
  const id = `rcq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const tolerance = getTargetDeltaEForLevel(clampedLevel) * 1.2; // 相对推移适度放宽 20% 容错

  let colorA: [number, number, number] = [0, 0, 0];
  let colorB: [number, number, number] = [0, 0, 0];
  let colorC: [number, number, number] = [0, 0, 0];
  let targetD: [number, number, number] = [0, 0, 0];

  let attempts = 0;
  while (attempts < 100) {
    attempts++;

    // 随机生成色块 A
    const hA = Math.floor(Math.random() * 360);
    const sA = Math.floor(Math.random() * 61) + 20; // 20..80
    const vA = Math.floor(Math.random() * 61) + 20; // 20..80
    colorA = [hA, sA, vA];

    // 生成受光/暗部偏移色块 B
    const hB = (hA + (Math.floor(Math.random() * 61) - 30) + 360) % 360;
    const sB = Math.max(10, Math.min(90, sA + (Math.floor(Math.random() * 41) - 20)));
    const vB = Math.max(10, Math.min(90, vA + (Math.floor(Math.random() * 41) - 20)));
    colorB = [hB, sB, vB];

    // 生成全新固有色 C
    const hC = (hA + Math.floor(Math.random() * 180) + 90) % 360; // 离 A 有一定色相距离
    const sC = Math.floor(Math.random() * 61) + 20;
    const vC = Math.floor(Math.random() * 61) + 20;
    colorC = [hC, sC, vC];

    // 计算 OKLab 矢量: v_AB = Lab(B) - Lab(A)
    const labA = hsvToOkLab(colorA[0], colorA[1], colorA[2]);
    const labB = hsvToOkLab(colorB[0], colorB[1], colorB[2]);
    const labC = hsvToOkLab(colorC[0], colorC[1], colorC[2]);

    const vAB: [number, number, number] = [
      labB[0] - labA[0],
      labB[1] - labA[1],
      labB[2] - labA[2],
    ];

    // 理论推移 D = Lab(C) + v_AB
    const labDTarget: [number, number, number] = [
      labC[0] + vAB[0],
      labC[1] + vAB[1],
      labC[2] + vAB[2],
    ];

    // 校验 D 的色域安全性
    const hsvD = okLabToHsv(labDTarget);
    if (hsvD && isHsvValid(hsvD)) {
      targetD = hsvD;
      break;
    }
  }

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    colorA,
    colorB,
    colorC,
    targetD,
    tolerance,
  };
}

/**
 * 相对色感答题判定算子 (解构欧氏色差 ΔE、矢量模长误差与方向夹角误差)
 */
export function checkRelativeColorHit(
  userHSV: [number, number, number],
  question: RelativeColorQuestionData,
): RelativeColorHitResult {
  const { colorA, colorB, colorC, targetD, tolerance } = question;

  const labA = hsvToOkLab(colorA[0], colorA[1], colorA[2]);
  const labB = hsvToOkLab(colorB[0], colorB[1], colorB[2]);
  const labC = hsvToOkLab(colorC[0], colorC[1], colorC[2]);
  const labDTarget = hsvToOkLab(targetD[0], targetD[1], targetD[2]);
  const labDUser = hsvToOkLab(userHSV[0], userHSV[1], userHSV[2]);

  // 1. 欧氏总色差 ΔE
  const deltaEError = Math.round(calcDeltaEOk(labDTarget, labDUser) * 1000) / 1000;
  const isHit = deltaEError <= tolerance;

  // 2. 基准矢量 v_AB 与 用户矢量 v_CD_user
  const vAB = [labB[0] - labA[0], labB[1] - labA[1], labB[2] - labA[2]];
  const vCDUser = [labDUser[0] - labC[0], labDUser[1] - labC[1], labDUser[2] - labC[2]];

  const magAB = Math.sqrt(vAB[0] ** 2 + vAB[1] ** 2 + vAB[2] ** 2);
  const magCDUser = Math.sqrt(vCDUser[0] ** 2 + vCDUser[1] ** 2 + vCDUser[2] ** 2);

  // 模长误差 (跨度偏离)
  const magnitudeError = Math.round(Math.abs(magCDUser - magAB) * 1000) / 1000;

  // 方向夹角误差 (色温偏向度)
  let angleErrorDeg = 0;
  if (magAB > 1e-4 && magCDUser > 1e-4) {
    const dot = vAB[0] * vCDUser[0] + vAB[1] * vCDUser[1] + vAB[2] * vCDUser[2];
    const cosTheta = Math.max(-1, Math.min(1, dot / (magAB * magCDUser)));
    angleErrorDeg = Math.round(((Math.acos(cosTheta) * 180) / Math.PI) * 10) / 10;
  }

  return {
    isHit,
    userHSV,
    targetHSV: targetD,
    deltaEError,
    magnitudeError,
    angleErrorDeg,
    tolerance,
  };
}