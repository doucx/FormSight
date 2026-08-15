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
 * OKLCH (L: 0..1, C: 0..0.4, H: 0..360) -> OKLab -> Linear RGB -> sRGB HEX
 */
export function oklchToHex(L: number, C: number, H: number): string {
  const rad = (H * Math.PI) / 180;
  const aLab = C * Math.cos(rad);
  const bLab = C * Math.sin(rad);

  // 1. OKLab -> LMS
  const l_ = L + 0.3963377774 * aLab + 0.2158037573 * bLab;
  const m_ = L - 0.1055613458 * aLab - 0.0638541728 * bLab;
  const s_ = L - 0.0894841775 * aLab - 1.291485548 * bLab;

  const lCone = l_ ** 3;
  const mCone = m_ ** 3;
  const sCone = s_ ** 3;

  // 2. LMS -> Linear RGB
  let rLin = +4.0767416621 * lCone - 3.3077115913 * mCone + 0.2309699292 * sCone;
  let gLin = -1.2684380046 * lCone + 2.6097574011 * mCone - 0.3413193965 * sCone;
  let bLin = -0.0041960863 * lCone - 0.7034186147 * mCone + 1.707614701 * sCone;

  // Gamut Clamping (剪裁至 sRGB [0, 1] 色域)
  rLin = Math.max(0, Math.min(1, rLin));
  gLin = Math.max(0, Math.min(1, gLin));
  bLin = Math.max(0, Math.min(1, bLin));

  // 3. Linear RGB -> Gamma Corrected sRGB
  const toSRGB = (val: number) =>
    val <= 0.0031308 ? val * 12.92 : 1.055 * val ** (1 / 2.4) - 0.055;

  const r = Math.round(toSRGB(rLin) * 255);
  const g = Math.round(toSRGB(gLin) * 255);
  const b = Math.round(toSRGB(bLin) * 255);

  const hex = ((1 << 24) + (r << 16) + (g << 8) + b)
    .toString(16)
    .slice(1)
    .toUpperCase();

  return `#${hex}`;
}

/**
 * 生成 12 节点基于 OKLCH 等明度/等彩度的感知均匀 CSS 色相渐变字符串
 */
export function getPerceptualHueGradient(): string {
  const L = 0.7;
  const C = 0.16;
  const stops: string[] = [];

  for (let h = 0; h <= 360; h += 30) {
    const hex = oklchToHex(L, C, h);
    const pct = Math.round((h / 360) * 100);
    stops.push(`${hex} ${pct}%`);
  }

  return `linear-gradient(to right, ${stops.join(', ')})`;
}
