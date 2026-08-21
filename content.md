好的，我们将系统性地把纯算法、色彩模型、图形学通用计算和自适应引擎等底层核心资产沉淀整理到 `src/core/` 下，建立高内聚、高复用、无业务污染的算法核心基底（Core Foundation），并通过 `src/core/index.ts` 提供统一出口，同时保持现有 `src/utils/` 的向下兼容性。

## [WIP] refactor: 整理公共工具库与通用算法至 src/core/

### 用户需求
将通用基础算法（数学、噪声、OKLab 色彩空间计算、通用 Canvas 绘制、自适应算子、声音与存储）从松散的 `src/utils/` 整理归纳至结构清晰的 `src/core/` 目录树中，形成独立的算法与基建核心包。

### 评论
把通用算法与业务逻辑剥离是模块化单体（Modular Monolith）最核心的一步。这不仅使得所有垂直领域（Domain Packs）能以统一、规范的方式引用底层能力，而且使这些纯算法成为可以直接进行单元测试与独立迁移的核心数字资产。

### 目标
1. 在 `src/core/math/` 下建立 `mathUtils.ts` 与 `noiseUtils.ts`。
2. 在 `src/core/color/` 下建立 `oklchUtils.ts` 与 `colorUtils.ts`。
3. 在 `src/core/canvas/` 下建立 `hidpi.ts`、`drawPointGrid.ts`、`drawPolygon.ts` 与 `drawTrendChart.ts`。
4. 在 `src/core/engine/` 下建立 `adaptiveEngine.ts`、`sound.ts`、`settings.ts` 与 `planStorage.ts`。
5. 创建 `src/core/index.ts` 作为统一导入出口，并更新 `src/utils/` 转发引用以保证向后兼容。

### 基本原理
通过分层架构原则（Layered Architecture），将“纯计算逻辑（Core）”与“领域业务装配（Domains）”彻底解耦。`src/core/` 内部不依赖任何具体业务 card 或 domain，所有领域模块依赖 `src/core/`。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #comp/runtime #concept/state #concept/executor #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/core-library #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 沉淀数学与噪声核心工具 `src/core/math/`

创建包含指数衰减插值、洗牌算法、2D FBM 梯度噪声和大津阈值法的核心数学模块。

~~~~~act
write_file
src/core/math/mathUtils.ts
~~~~~
~~~~~typescript
/**
 * 基于当前等级 (1..maxLevel) 对最大与最小边界值执行指数衰减插值
 * @param maxVal Level 1 时的初始宽松值
 * @param minVal Level maxLevel 时的极限精细值
 * @param level 当前等级 (1..maxLevel)
 * @param maxLevel 最大等级，默认 35
 */
export function expDecayInterpolate(
  maxVal: number,
  minVal: number,
  level: number,
  maxLevel = 35,
): number {
  const clamped = Math.max(1, Math.min(maxLevel, level));
  const t = (clamped - 1) / (maxLevel - 1);
  return maxVal * (minVal / maxVal) ** t;
}

/**
 * 将真理项与干扰项组合并随机洗牌 (Fisher-Yates)，返回乱序数组与真理项索引
 */
export function createShuffledChoices<T>(
  targetItem: T,
  distractors: T[],
): { options: T[]; correctIndex: number } {
  const rawOptions = [targetItem, ...distractors];
  const indexed = rawOptions.map((opt, i) => ({ opt, isTarget: i === 0 }));

  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }

  return {
    options: indexed.map((item) => item.opt),
    correctIndex: indexed.findIndex((item) => item.isTarget),
  };
}
~~~~~

~~~~~act
write_file
src/core/math/noiseUtils.ts
~~~~~
~~~~~typescript
/**
 * 轻量 2D 梯度噪声与分形布朗运动 (FBM) 工具集
 * 用于纯过程生成连续灰度场与视知觉噪波
 */

export type Noise2DFunction = (x: number, y: number) => number;

/**
 * 构造轻量确定性 2D 伪随机梯度噪声
 */
export function createNoise2D(seed = Math.random()): Noise2DFunction {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;

  let s = Math.floor(seed * 2147483647);
  if (s <= 0) s += 2147483646;

  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const n = s % (i + 1);
    const temp = p[i];
    p[i] = p[n];
    p[n] = temp;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  const grad = [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + t * (b - a);

  return (x: number, y: number): number => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = fade(xf);
    const v = fade(yf);

    const g00 = grad[perm[X + perm[Y]] % 8];
    const g10 = grad[perm[X + 1 + perm[Y]] % 8];
    const g01 = grad[perm[X + perm[Y + 1]] % 8];
    const g11 = grad[perm[X + 1 + perm[Y + 1]] % 8];

    const n00 = g00[0] * xf + g00[1] * yf;
    const n10 = g10[0] * (xf - 1) + g10[1] * yf;
    const n01 = g01[0] * xf + g01[1] * (yf - 1);
    const n11 = g11[0] * (xf - 1) + g11[1] * (yf - 1);

    const x1 = lerp(n00, n10, u);
    const x2 = lerp(n01, n11, u);
    return (lerp(x1, x2, v) + 1) / 2; // 归一化到 0..1
  };
}

/**
 * 分形布朗运动 (FBM - Fractional Brownian Motion)
 */
export function fbm2D(
  x: number,
  y: number,
  octaves: number,
  noiseFunc: Noise2DFunction,
  gain = 0.5,
  lacunarity = 2.0,
): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1.0;
  let totalAmp = 0;

  for (let i = 0; i < octaves; i++) {
    value += noiseFunc(x * frequency, y * frequency) * amplitude;
    totalAmp += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return totalAmp > 0 ? value / totalAmp : 0;
}

/**
 * 使用大津法 (Otsu's Method) 计算灰度图的最优二值化分割阈值 (0..255)
 */
export function calculateOtsuThreshold(buffer: Uint8Array | number[]): number {
  const histogram = new Int32Array(256);
  const total = buffer.length;

  for (let i = 0; i < total; i++) {
    const val = buffer[i];
    histogram[val]++;
  }

  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let optimalThreshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    wF = total - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    // 类间方差
    const variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > maxVariance) {
      maxVariance = variance;
      optimalThreshold = t;
    }
  }

  return optimalThreshold;
}
~~~~~

#### Acts 2: 沉淀感知色彩核心工具 `src/core/color/`

建立 OKLab 色彩感知模型、色差计算、正四面体对抗干扰生成与 HSV 工具集。

~~~~~act
write_file
src/core/color/oklchUtils.ts
~~~~~
~~~~~typescript
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
~~~~~

~~~~~act
write_file
src/core/color/colorUtils.ts
~~~~~
~~~~~typescript
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
  const normH = ((h % 360) + 360) % 360;
  const normS = s / 100;
  const normV = v / 100;
  const c = normV * normS;
  const x = c * (1 - Math.abs(((normH / 60) % 2) - 1));
  const m = normV - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (normH >= 0 && normH < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (normH >= 60 && normH < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (normH >= 120 && normH < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (normH >= 180 && normH < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (normH >= 240 && normH < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
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
  while (attempts < 30) {
    attempts++;
    if (mode === 'H' || mode === 'ALL') {
      targetS = Math.floor(Math.random() * 71) + 30; // 30..100
      targetV = Math.floor(Math.random() * 71) + 30; // 30..100

      // 检验 OKLab 彩度：必须保证彩度足够大，否则色相被低 S/V 遮蔽不可辩
      const lab = hsvToOkLab(targetH, targetS, targetV);
      if (getOkChroma(lab) >= Math.min(0.04, tolerance * 1.5)) {
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
 * 范化容错计算函数：支持直接传入 targetHSV 数组与 difficultyLevel
 */
export function getToleranceSpan(
  dimension: 'H' | 'S' | 'V',
  val: number,
  targetHSV: [number, number, number],
  difficultyLevel: number,
  currentHSV?: [number, number, number],
): ToleranceSpan {
  const [targetH, targetS, targetV] = targetHSV;
  const targetDeltaE = getTargetDeltaEForLevel(difficultyLevel);

  const curH = currentHSV ? currentHSV[0] : dimension === 'H' ? val : targetH;
  const curS = currentHSV ? currentHSV[1] : dimension === 'S' ? val : targetS;
  const curV = currentHSV ? currentHSV[2] : dimension === 'V' ? val : targetV;
  const baseLab = hsvToOkLab(curH, curS, curV);

  const maxValLimit = dimension === 'H' ? 360 : 100;
  const step = dimension === 'H' ? 0.5 : 0.2;

  // 向左探索界限
  let leftVal = val;
  while (leftVal > (dimension === 'H' ? val - 180 : 0)) {
    const testVal = leftVal - step;
    const testH = dimension === 'H' ? (testVal + 360) % 360 : curH;
    const testS = dimension === 'S' ? Math.max(0, testVal) : curS;
    const testV = dimension === 'V' ? Math.max(0, testVal) : curV;
    const testLab = hsvToOkLab(testH, testS, testV);

    if (calcDeltaEOk(baseLab, testLab) > targetDeltaE) break;
    leftVal = testVal;
  }

  // 向右探索界限
  let rightVal = val;
  while (rightVal < (dimension === 'H' ? val + 180 : 100)) {
    const testVal = rightVal + step;
    const testH = dimension === 'H' ? testVal % 360 : curH;
    const testS = dimension === 'S' ? Math.min(100, testVal) : curS;
    const testV = dimension === 'V' ? Math.min(100, testVal) : curV;
    const testLab = hsvToOkLab(testH, testS, testV);

    if (calcDeltaEOk(baseLab, testLab) > targetDeltaE) break;
    rightVal = testVal;
  }

  const halfSpan = (rightVal - leftVal) / 2;
  return {
    minVal: Math.max(0, val - halfSpan),
    maxVal: Math.min(maxValLimit, val + halfSpan),
    halfSpan: Math.round(halfSpan * 10) / 10,
  };
}
~~~~~

#### Acts 3: 沉淀通用 Canvas 绘制基建 `src/core/canvas/`

收拢 HiDPI 适配层、点阵渲染、多边形路径与趋势统计图表。

~~~~~act
write_file
src/core/canvas/hidpi.ts
~~~~~
~~~~~typescript
/**
 * 配置 Canvas 支持 Retina / HiDPI 屏幕高清渲染
 * @param canvas HTML Canvas 元素
 * @param logicalWidth 逻辑宽度 (CSS 像素)
 * @param logicalHeight 逻辑高度 (CSS 像素)
 * @returns 预设好 scale 的 2D 绘图上下文
 */
export function setupHiDpiCanvas(
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number,
): CanvasRenderingContext2D | null {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = Math.round(logicalWidth * dpr);
  canvas.height = Math.round(logicalHeight * dpr);
  canvas.style.width = `${logicalWidth}px`;
  canvas.style.height = `${logicalHeight}px`;

  ctx.resetTransform?.();
  ctx.scale(dpr, dpr);

  return ctx;
}
~~~~~

~~~~~act
write_file
src/core/canvas/drawPointGrid.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';
import { getDynamicCrosshairMetrics, getDynamicDotRadius } from '../../utils/geometry';

/**
 * 绘制单个圆点
 */
export function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  radius: number,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

export interface RenderInteractivePointGridOptions {
  ctx: CanvasRenderingContext2D;
  canvasSize: number;
  gridPoints: Point[];
  targetPoint?: Point;
  userNearestPoint?: Point;
  hoverPoint?: Point | null;
  anchors?: (Point | null | undefined)[];
  showAnswer: boolean;
  isHit?: boolean;
  disabled?: boolean;
}

/**
 * 统一渲染可交互点阵、锚点、悬停高亮与答案揭晓视觉反馈
 */
export function renderInteractivePointGrid({
  ctx,
  canvasSize,
  gridPoints,
  targetPoint,
  userNearestPoint,
  hoverPoint,
  anchors = [],
  showAnswer,
  isHit = false,
  disabled = false,
}: RenderInteractivePointGridOptions): void {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  const dotRadius = getDynamicDotRadius(gridPoints);
  const hoverRadius = Math.max(2.5, dotRadius * 1.6);

  for (const p of gridPoints) {
    drawDot(ctx, p.x, p.y, '#888888', dotRadius);
  }

  if (!disabled && !showAnswer && hoverPoint) {
    drawDot(ctx, hoverPoint.x, hoverPoint.y, '#4F46E5', hoverRadius);
  }

  for (const anchor of anchors) {
    if (anchor) {
      drawDot(ctx, anchor.x, anchor.y, '#000000', dotRadius);
    }
  }

  if (showAnswer && targetPoint) {
    const { size: chSize, lineWidth: chLineWidth } = getDynamicCrosshairMetrics(gridPoints);

    drawDot(ctx, targetPoint.x, targetPoint.y, '#000000', dotRadius);

    ctx.strokeStyle = '#00AA00';
    ctx.lineWidth = chLineWidth;
    ctx.beginPath();
    ctx.moveTo(targetPoint.x - chSize, targetPoint.y);
    ctx.lineTo(targetPoint.x + chSize, targetPoint.y);
    ctx.moveTo(targetPoint.x, targetPoint.y - chSize);
    ctx.lineTo(targetPoint.x, targetPoint.y + chSize);
    ctx.stroke();

    if (userNearestPoint && !isHit) {
      const dashLength = Math.max(2, Math.min(4, chSize * 0.4));
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = Math.max(1, chLineWidth * 0.85);
      ctx.setLineDash([dashLength, dashLength]);
      ctx.beginPath();
      ctx.moveTo(userNearestPoint.x, userNearestPoint.y);
      ctx.lineTo(targetPoint.x, targetPoint.y);
      ctx.stroke();
      ctx.setLineDash([]);

      drawDot(ctx, userNearestPoint.x, userNearestPoint.y, '#FF0000', dotRadius);
    }
  }
}
~~~~~

~~~~~act
write_file
src/core/canvas/drawPolygon.ts
~~~~~
~~~~~typescript
import type { Point } from '../../types';

export interface DrawPolygonOptions {
  canvas: HTMLCanvasElement | null;
  vertices?: Point[];
  size: number;
  fillColor?: string;
  strokeColor?: string;
  lineWidth?: number;
  bgColor?: string;
  isHighlighted?: boolean;
  highlightColor?: string;
}

/**
 * 在 Canvas 上清屏并绘制多边形
 */
export function drawPolygonCanvas({
  canvas,
  vertices,
  size,
  fillColor = '#0F172A',
  strokeColor = '#1E293B',
  lineWidth = 2,
  bgColor = '#FFFFFF',
  isHighlighted = false,
  highlightColor = '#22C55E',
}: DrawPolygonOptions): void {
  if (!canvas || !vertices || vertices.length < 3) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);

  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    ctx.lineTo(vertices[i].x, vertices[i].y);
  }
  ctx.closePath();

  ctx.fillStyle = fillColor;
  ctx.fill();

  ctx.strokeStyle = isHighlighted ? highlightColor : strokeColor;
  ctx.lineWidth = isHighlighted ? lineWidth + 1.5 : lineWidth;
  ctx.stroke();
}
~~~~~

#### Acts 4: 沉淀运行时引擎 `src/core/engine/` 与统一出口 `src/core/index.ts`

将自适应难度引擎、音频反馈与统一设置引擎沉淀至核心引擎层，并创建 `src/core/index.ts`。

~~~~~act
write_file
src/core/engine/adaptiveEngine.ts
~~~~~
~~~~~typescript
import type { AdaptiveMode } from '../../utils/settings';

export const MAX_LEVEL = 35;

export type AdaptiveChange = 'up' | 'down' | 'same';

export interface AdaptiveProgress {
  current: number;
  total: number;
  hits: number;
}

export interface RecordResultOutput {
  newLevel: number;
  change: AdaptiveChange;
  isBlockComplete?: boolean;
  progress?: AdaptiveProgress;
}

export class AdaptiveEngine {
  private maxLevel: number = MAX_LEVEL;
  private currentLevel: number;
  private mode: AdaptiveMode;
  private targetAccuracy: number;
  private blockSize: number;
  private step: number;

  private consecutiveCorrect = 0;
  private blockHistory: boolean[] = [];

  constructor(
    initialLevel = 5,
    isFineGranularity = false,
    mode: AdaptiveMode = 'block',
    targetAccuracy = 0.8,
    blockSize = 10,
  ) {
    this.step = isFineGranularity ? 1 : 3;
    this.mode = mode;
    this.targetAccuracy = targetAccuracy;
    this.blockSize = blockSize;
    this.currentLevel = Math.max(1, Math.min(initialLevel, this.maxLevel));
  }

  public getCurrentLevel(): number {
    return this.currentLevel;
  }

  public getBlockProgress(): AdaptiveProgress | null {
    if (this.mode !== 'block') return null;
    const hits = this.blockHistory.filter(Boolean).length;
    return {
      current: this.blockHistory.length,
      total: this.blockSize,
      hits,
    };
  }

  public recordResult(isHit: boolean): RecordResultOutput {
    if (this.mode === 'staircase') {
      return this.recordStaircase(isHit);
    }
    return this.recordBlock(isHit);
  }

  private recordStaircase(isHit: boolean): RecordResultOutput {
    if (isHit) {
      this.consecutiveCorrect += 1;
      if (this.consecutiveCorrect >= 3) {
        this.consecutiveCorrect = 0;
        if (this.currentLevel < this.maxLevel) {
          this.currentLevel = Math.min(this.maxLevel, this.currentLevel + this.step);
          return { newLevel: this.getCurrentLevel(), change: 'up' };
        }
      }
    } else {
      this.consecutiveCorrect = 0;
      if (this.currentLevel > 1) {
        this.currentLevel = Math.max(1, this.currentLevel - this.step);
        return { newLevel: this.getCurrentLevel(), change: 'down' };
      }
    }

    return { newLevel: this.getCurrentLevel(), change: 'same' };
  }

  private recordBlock(isHit: boolean): RecordResultOutput {
    this.blockHistory.push(isHit);
    const count = this.blockHistory.length;
    const hits = this.blockHistory.filter(Boolean).length;

    if (count < this.blockSize) {
      return {
        newLevel: this.getCurrentLevel(),
        change: 'same',
        isBlockComplete: false,
        progress: { current: count, total: this.blockSize, hits },
      };
    }

    const accuracy = hits / this.blockSize;
    let change: AdaptiveChange = 'same';

    if (accuracy >= this.targetAccuracy) {
      if (this.currentLevel < this.maxLevel) {
        this.currentLevel = Math.min(this.maxLevel, this.currentLevel + this.step);
        change = 'up';
      }
    } else if (accuracy < 0.5) {
      if (this.currentLevel > 1) {
        this.currentLevel = Math.max(1, this.currentLevel - this.step);
        change = 'down';
      }
    }

    this.blockHistory = [];

    return {
      newLevel: this.getCurrentLevel(),
      change,
      isBlockComplete: true,
      progress: { current: 0, total: this.blockSize, hits: 0 },
    };
  }

  public setLevel(level: number): void {
    this.currentLevel = Math.max(1, Math.min(level, this.maxLevel));
    this.consecutiveCorrect = 0;
    this.blockHistory = [];
  }
}
~~~~~

~~~~~act
write_file
src/core/index.ts
~~~~~
~~~~~typescript
// 导出契约与注册器
export * from './contracts';
export * from './registry';

// 导出数学与噪声
export * from './math/mathUtils';
export * from './math/noiseUtils';

// 导出色彩模型
export * from './color/oklchUtils';
export * from './color/colorUtils';

// 导出图形绘制
export * from './canvas/hidpi';
export * from './canvas/drawPointGrid';
export * from './canvas/drawPolygon';

// 导出引擎能力
export * from './engine/adaptiveEngine';
~~~~~

#### Acts 5: 优化 `src/utils/` 保持对 `src/core/` 的整洁代理

让 `src/utils/mathUtils.ts`、`src/utils/oklchUtils.ts`、`src/utils/colorUtils.ts` 等直接从 `src/core/` 转发，保证既有代码无缝运行。

~~~~~act
write_file
src/utils/mathUtils.ts
~~~~~
~~~~~typescript
export * from '../core/math/mathUtils';
~~~~~

~~~~~act
write_file
src/utils/noiseUtils.ts
~~~~~
~~~~~typescript
export * from '../core/math/noiseUtils';
~~~~~

~~~~~act
write_file
src/utils/oklchUtils.ts
~~~~~
~~~~~typescript
export * from '../core/color/oklchUtils';
~~~~~

~~~~~act
write_file
src/utils/adaptiveEngine.ts
~~~~~
~~~~~typescript
export * from '../core/engine/adaptiveEngine';
~~~~~

### 下一步建议
1. **收敛各领域的专属生成与评估算法**：将 `src/utils/angleUtils.ts`、`src/utils/negativeSpace/` 等直接归并至各自的 `src/domains/<domain>/` 目录下。
2. **将各领域专用 View 移动至 Domain 目录**：例如将 `AngleEstimationView.tsx` 移至 `src/domains/angle/views/`，进一步净化顶层 `components/`。
3. **运行测试套件与类型检查**：确认构建流程无任何丢失或破坏性改动。
