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

/**
 * 将 OKLab 坐标逆向近似换算为可显示 sRGB / HSV (0..360, 0..100, 0..100)
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
    rLin >= -eps &&
    rLin <= 1 + eps &&
    gLin >= -eps &&
    gLin <= 1 + eps &&
    bLin >= -eps &&
    bLin <= 1 + eps
  );
}

export function hasGamutMargin(lab: [number, number, number], margin: number): boolean {
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

function getRandomAxis(): [number, number, number] {
  const z = Math.random() * 2 - 1;
  const phi = Math.random() * 2 * Math.PI;
  const r = Math.sqrt(1 - z * z);
  return [r * Math.cos(phi), r * Math.sin(phi), z];
}

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
 * 在 OKLab 色彩空间中以 targetLab 为基准生成 3 个正四面体等距分布的干扰色 (HSV 格式)
 * @param targetLab 基准目标色的 OKLab 坐标
 * @param R 目标感知色差半径 (ΔE)
 * @returns 3 个干扰色 HSV 数组
 */
export function generateTetrahedralDistractors(
  targetLab: [number, number, number],
  R: number,
): [number, number, number][] {
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
      targetLab[0] + rotV1[0] * R,
      targetLab[1] + rotV1[1] * R,
      targetLab[2] + rotV1[2] * R,
    ];
    const lab2: [number, number, number] = [
      targetLab[0] + rotV2[0] * R,
      targetLab[1] + rotV2[1] * R,
      targetLab[2] + rotV2[2] * R,
    ];
    const lab3: [number, number, number] = [
      targetLab[0] + rotV3[0] * R,
      targetLab[1] + rotV3[1] * R,
      targetLab[2] + rotV3[2] * R,
    ];

    const hsv1 = okLabToHsv(lab1);
    const hsv2 = okLabToHsv(lab2);
    const hsv3 = okLabToHsv(lab3);

    const rep1 = hsvToOkLab(...hsv1);
    const rep2 = hsvToOkLab(...hsv2);
    const rep3 = hsvToOkLab(...hsv3);

    const dist1 = calcDeltaEOk(targetLab, rep1);
    const dist2 = calcDeltaEOk(targetLab, rep2);
    const dist3 = calcDeltaEOk(targetLab, rep3);

    let validCount = 0;
    if (dist1 >= R * 0.7) validCount++;
    if (dist2 >= R * 0.7) validCount++;
    if (dist3 >= R * 0.7) validCount++;

    if (validCount > bestValidCount) {
      bestValidCount = validCount;
      bestDistractors = [hsv1, hsv2, hsv3];
    }

    if (validCount === 3) break;
  }

  return bestDistractors;
}