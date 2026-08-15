/**
 * OKLab / OKLCH 均匀色彩空间工具集
 * 用于实现符合人眼视觉感知的色差 (ΔE_OK) 计算与难度梯度映射
 */

/**
 * HSV (0..360, 0..100, 0..100) -> OKLab (L: 0..1, a: -0.4..0.4, b: -0.4..0.4)
 */
export function hsvToOkLab(h: number, s: number, v: number): [number, number, number] {
  // 1. HSV -> sRGB (0..1)
  const normH = ((h % 360) + 360) % 360;
  const normS = s / 100;
  const normV = v / 100;
  const c = normV * normS;
  const x = c * (1 - Math.abs(((normH / 60) % 2) - 1));
  const m = normV - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (normH < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (normH < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (normH < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (normH < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (normH < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const rSrgb = r + m;
  const gSrgb = g + m;
  const bSrgb = b + m;

  // 2. sRGB -> Linear RGB
  const toLinear = (val: number) => (val <= 0.04045 ? val / 12.92 : ((val + 0.055) / 1.055) ** 2.4);
  const rLin = toLinear(rSrgb);
  const gLin = toLinear(gSrgb);
  const bLin = toLinear(bSrgb);

  // 3. Linear RGB -> LMS
  const lCone = 0.4122214708 * rLin + 0.5363325363 * gLin + 0.0514459929 * bLin;
  const mCone = 0.2119034982 * rLin + 0.6806995451 * gLin + 0.1073969566 * bLin;
  const sCone = 0.0883024619 * rLin + 0.2817188376 * gLin + 0.6299787005 * bLin;

  // 4. Non-linear cube root
  const lCbrt = Math.cbrt(lCone);
  const mCbrt = Math.cbrt(mCone);
  const sCbrt = Math.cbrt(sCone);

  // 5. LMS -> OKLab
  const L = 0.2104542553 * lCbrt + 0.793617785 * mCbrt - 0.0040720468 * sCbrt;
  const a = 1.9779984951 * lCbrt - 2.428592205 * mCbrt + 0.4505937099 * sCbrt;
  const bLab = 0.0259040371 * lCbrt + 0.7827717662 * mCbrt - 0.808675766 * sCbrt;

  return [L, a, bLab];
}

/**
 * 计算 OKLab 空间中的欧氏色差 ΔE_OK
 */
export function calcDeltaEOk(
  lab1: [number, number, number],
  lab2: [number, number, number],
): number {
  const dL = lab1[0] - lab2[0];
  const da = lab1[1] - lab2[1];
  const db = lab1[2] - lab2[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * 计算 OKLab 中的彩度 Chroma
 */
export function getOkChroma(lab: [number, number, number]): number {
  return Math.sqrt(lab[1] * lab[1] + lab[2] * lab[2]);
}

/**
 * 根据 Level (1..35) 计算允许的感知色差阈值 ΔE_target
 */
export function getTargetDeltaEForLevel(level: number): number {
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34; // 0..1
  const maxDeltaE = 0.12; // Level 1 容错 (宽松，约为 40 JND)
  const minDeltaE = 0.008; // Level 35 容错 (精细，约为 2.5 JND)

  return maxDeltaE * (minDeltaE / maxDeltaE) ** t;
}
