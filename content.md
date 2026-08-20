经分析，**非常适合**并且**强烈建议**在「调性基底归位」和「主调色群提炼」中使用色彩矢量迁移的四面体等距干扰色生成算法。

1. **感知空间各向同性**：原有的启发式加减规则（如固定 `±25°` 色相或降低饱和度）在 HSV 空间并不均匀（例如黄色与蓝色在相同角度差下的 $\Delta E$ 差异巨大）。而在 OKLab 感知均匀色彩空间中，四面体算法以真理主色为球心、以感知色差半径 $R(level)$ 产生 3 个外接顶点，保证了所有干扰项在感知距离上严格等距。
2. **候选多样性与防扎堆**：正四面体的三维顶角（两两夹角约 $109.5^\circ$）确保了 3 个干扰色在色相、明度、彩度三维空间中最大化散开，既有色偏又有明暗/纯度梯度，彻底消除了候选色重叠扎堆的问题。
3. **难度随等级平滑演进**：$R(level)$ 随能力层阶从 Level 1 的宏观调性差异（约 $40\text{ JND}$）指数衰减至 Level 35 的微小调性感知（约 $3\text{ JND}$），自适应阶梯更加平滑精准。

---

## [WIP] refactor(color): 在主调色群提炼与调性基底归位中引入 OKLab 四面体等距干扰色算法

### 用户需求
评估并决定「调性基底归位 (TD_PALETTE_2AFC)」与「主调色群提炼 (PALETTE_CLUSTERING)」是否适合使用色彩矢量迁移中的四面体等距干扰色算法；若适合则进行接入和重构。

### 评论
该重构将视知觉概括与细化模块中涉及 4AFC 调性辨识的题目生成算法，统一升级到了基于 OKLab 空间各向同性几何建模的标准上，大幅提升了题目的感知公平性、梯度细腻度与艺术科学性。

### 目标
1. 在 `src/utils/oklchUtils.ts` 中沉淀通用的 OKLab 空间色域检测、逆向转换及四面体等距干扰项生成器 `generateTetrahedralDistractors`。
2. 重构 `src/utils/relativeColorUtils.ts`，复用 `oklchUtils.ts` 的通用四面体几何算法。
3. 重构 `src/utils/abstractionUtils.ts`：在 `PALETTE_CLUSTERING` 与 `TD_PALETTE_2AFC` 题型生成中，使用四面体等距采样算法生成 3 个高质量感知等距干扰色。

### 基本原理
正四面体顶点生成算法以目标色在 OKLab 空间的坐标为原点，构建外接球半径为 $R$ 的三维正四面体顶点，再施加三维随机轴向与旋转角 $\theta$，并在必要时对色域边缘进行安全裁剪与重试，最终将生成的 3 个干扰点映射回 HSV 空间。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #concept/executor #scope/core #ai/instruct #task/domain/color #task/object/tetrahedral-distractors #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 在 `oklchUtils.ts` 中封装 OKLab 逆转换与四面体等距干扰项算法

~~~~~act
patch_file
src/utils/oklchUtils.ts
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
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

#### Acts 2: 在 `relativeColorUtils.ts` 中复用 `oklchUtils.ts` 中的四面体生成器

~~~~~act
patch_file
src/utils/relativeColorUtils.ts
~~~~~
~~~~~typescript
import { calcDeltaEOk, getTargetDeltaEForLevel, hsvToOkLab } from './oklchUtils';
~~~~~
~~~~~typescript
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
~~~~~

~~~~~act
patch_file
src/utils/relativeColorUtils.ts
~~~~~
~~~~~typescript
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
  const t = (clampedLevel - 1) / 34;
  const maxR = 0.14;
  const minR = 0.015;
  return maxR * (minR / maxR) ** t;
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
~~~~~
~~~~~typescript
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
~~~~~

~~~~~act
patch_file
src/utils/relativeColorUtils.ts
~~~~~
~~~~~typescript
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

    if (validCount === 3) break;
  }

  const rawOptions: [number, number, number][] = [targetD, ...bestDistractors];
~~~~~
~~~~~typescript
  const bestDistractors = generateTetrahedralDistractors(labTargetD, R);
  const rawOptions: [number, number, number][] = [targetD, ...bestDistractors];
~~~~~

#### Acts 3: 在 `abstractionUtils.ts` 的 `PALETTE_CLUSTERING` 和 `TD_PALETTE_2AFC` 中引入四面体等距干扰色生成

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript
import type { Point } from '../types';
import { expDecayInterpolate } from './mathUtils';
~~~~~
~~~~~typescript
import type { Point } from '../types';
import { expDecayInterpolate } from './mathUtils';
import { generateTetrahedralDistractors, hsvToOkLab } from './oklchUtils';
import { getDistractorDistanceForLevel } from './relativeColorUtils';
~~~~~

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript
    // 生成 3 个干扰色
    const distractorDeltaE = 0.12 * (0.018 / 0.12) ** t;
    const distractors: [number, number, number][] = [
      [(baseH + 25 + Math.floor(Math.random() * 15)) % 360, baseS, baseV],
      [(baseH - 25 - Math.floor(Math.random() * 15) + 360) % 360, baseS, baseV],
      [baseH, Math.max(10, baseS - 35), Math.max(20, baseV - 30)],
    ];

    const rawOptions = [dominantColorHsv, ...distractors];
~~~~~
~~~~~typescript
    // 使用 OKLab 四面体等距算法生成 3 个感知等距干扰色
    const distractorDeltaE = getDistractorDistanceForLevel(clampedLevel);
    const labDom = hsvToOkLab(...dominantColorHsv);
    const distractors = generateTetrahedralDistractors(labDom, distractorDeltaE);

    const rawOptions = [dominantColorHsv, ...distractors];
~~~~~

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript
  // 生成 3 个干扰图案主调 (随 Level 逼近)
  const distractorDeltaH = 35 * (1 - t * 0.65);
  const distractorsDom: [number, number, number][] = [
    [(baseH + distractorDeltaH + 360) % 360, baseS, baseV],
    [(baseH - distractorDeltaH + 360) % 360, baseS, baseV],
    [baseH, Math.max(15, baseS - 35), Math.max(20, baseV - 30)],
  ];

  const rawPatterns: PaletteTile[][] = [
    makePatternTiles(baseH, baseS, baseV),
    makePatternTiles(...distractorsDom[0]),
    makePatternTiles(...distractorsDom[1]),
    makePatternTiles(...distractorsDom[2]),
  ];
~~~~~
~~~~~typescript
  // 使用 OKLab 四面体等距算法生成 3 个干扰图案主调 (随 Level 逼近)
  const distractorDeltaE = getDistractorDistanceForLevel(clampedLevel);
  const labDom = hsvToOkLab(...promptDominantColor);
  const distractorsDom = generateTetrahedralDistractors(labDom, distractorDeltaE);

  const rawPatterns: PaletteTile[][] = [
    makePatternTiles(baseH, baseS, baseV),
    makePatternTiles(...distractorsDom[0]),
    makePatternTiles(...distractorsDom[1]),
    makePatternTiles(...distractorsDom[2]),
  ];
~~~~~

### 下一步建议
1. 运行 `npm run check` 或 `npx biome check .` 检查代码格式与 Lint 规范。
2. 运行 `npm test` 验证单元测试套件。
3. 可在浏览器中进入「概括感知 -> 主调色群提炼」以及「细化感知 -> 调性基底归位」体验升级后的平滑阶梯难度与感知均匀性。
