好的，我们将正式实施阿尔伯斯同时对比（Simultaneous Contrast）训练体系，将其拆分为三个独立模式并集成至“相对色感”模块中。

## [WIP] feat(relative-color): 集成阿尔伯斯同时对比与视错觉对抗训练系列

### 用户需求
在现有的“相对色感 (Relative Color)”模块中，扩展并落地阿尔伯斯（Josef Albers）同时对比与视错觉对抗理论，拆解为三个结构清晰、认知梯度明确的训练模式卡片：
1. **明度反差补偿 (`LIGHTNESS_INDUCTION`)**：在强明暗对比背景下，调整中心色块物理明度以抵消环境诱导，实现感知一致。
2. **补色残像调和 (`HUE_INDUCTION`)**：在强色相与饱和度背景下，调整中心色块色相与饱和度，实现感知色差调和。
3. **环境穿透判别 (`DECONTEXTUAL_2AFC`)**：在左右干扰背景下，穿透视错觉陷阱，快速二选一判别哪个色块具有更高的客观物理明度或纯度。

### 评论
这是一个将艺术感知心理学（Gestalt & Albers）与计算机视觉色彩空间（OKLab）深度结合的核心特性。通过将复杂的视错觉任务解耦为单维度（明度）、多维度（色相/纯度）与二选一穿透识别（2AFC），不仅降低了单任务认知负荷，而且极大丰富了 FormSight 在高阶色彩感知训练维度的专业深度。

### 目标
1. **扩展领域配置与元数据**：在 `domains.ts` 中为 `relative_color` 注册新增的 3 个训练模式。
2. **数学与色彩模型实现**：在 `relativeColorUtils.ts` 中实现基于 OKLab 局部侧抑制感知的诱导偏移矢量计算（Induction Shift）、题目生成函数与判定算法。
3. **交互画布渲染升级**：重构 `RelativeColorCanvas.tsx`，支持双背景隔离视口、明度/色相调谐滑块以及 2AFC 快捷键选择与揭晓对比动效。
4. **插件与数据链路打通**：在 `trainingPlugins.tsx` 中适配各模式的题型分发、等级判定与做答记录提取。

### 基本原理
1. **侧抑制与感知诱导计算**：背景色在 OKLab 空间对中心色产生的感知偏移矢量 $\vec{v}_{shift} \approx -k \cdot (Lab_{bg} - Lab_{c})$，系统以此为基准建立理想物理补偿值与动态容错门限。
2. **防边缘作弊隔离设计**：分屏展示时设置充足的中性灰（#808080）物理安全带，并在揭晓答案时提供“去背景统一对比”反馈，给用户直观的视错觉震撼。
3. **复用 2AFC 模式范式**：穿透判别采用与正负形模块一致的 `1` / `2` 键极速判别，保障交互的一致性与高心流体验。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #comp/interfaces #concept/ui #concept/state #scope/core #scope/ux #ai/instruct #task/domain/color #task/object/albers-contrast-modes #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 更新领域配置 `domains.ts`

在 `relative_color` 模块下注册 3 个新增的训练模式。

~~~~~act
patch_file
src/config/domains.ts
~~~~~
~~~~~typescript
    modes: [
      {
        id: 'VECTOR_SHIFT',
        title: '色彩矢量迁移',
        desc: '保持固有色推移矢量 v_AB 在全场施加统一推移，建立光影相对偏转直觉。',
        icon: Shuffle,
      },
    ],
~~~~~
~~~~~typescript
    modes: [
      {
        id: 'VECTOR_SHIFT',
        title: '色彩矢量迁移',
        desc: '保持固有色推移矢量 v_AB 在全场施加统一推移，建立光影相对偏转直觉。',
        icon: Shuffle,
      },
      {
        id: 'LIGHTNESS_INDUCTION',
        title: '明度反差补偿',
        desc: '在强明暗对比背景下，微调中心色物理明度以抵消环境视错觉，达成感知一致。',
        icon: Sun,
      },
      {
        id: 'HUE_INDUCTION',
        title: '补色残像调和',
        desc: '在强色相与饱和度背景下，逆向补偿色彩推移，训练环境光色感知调和力。',
        icon: Palette,
      },
      {
        id: 'DECONTEXTUAL_2AFC',
        title: '环境穿透判别',
        desc: '穿透强对比背景的视错觉陷阱，快速二选一判别色块的客观物理明度真理。',
        icon: Columns,
      },
    ],
~~~~~

#### Acts 2: 扩展 `relativeColorUtils.ts` 算法与题型生成

实现诱导矢量计算、明度补偿题型、色相补偿题型与 2AFC 穿透判别题型。

~~~~~act
write_file
src/utils/relativeColorUtils.ts
~~~~~
~~~~~typescript
import { calcDeltaEOk, getTargetDeltaEForLevel, hsvToOkLab } from './oklchUtils';

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
  const bgLVal = isLeftBright ? Math.floor(Math.random() * 20) + 75 : Math.floor(Math.random() * 20) + 10;
  const bgRVal = isLeftBright ? Math.floor(Math.random() * 20) + 10 : Math.floor(Math.random() * 20) + 75;

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
  const diffPercent = Math.max(1.5, Math.round((18 * (1.5 / 18) ** t) * 10) / 10);

  const largerPhysicalSide: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B';

  // 构造视错觉陷阱：物理更亮的一侧放在更亮的背景上（被压暗），物理更暗的一侧放在暗背景上（被提亮）
  const brightBgVal = Math.floor(Math.random() * 15) + 80;
  const darkBgVal = Math.floor(Math.random() * 15) + 10;

  const bgLeftVal = largerPhysicalSide === 'A' ? brightBgVal : darkBgVal;
  const bgRightVal = largerPhysicalSide === 'B' ? brightBgVal : darkBgVal;

  const baseHue = Math.floor(Math.random() * 360);
  const baseSat = Math.floor(Math.random() * 20);

  const bgLeft: [number, number, number] = [baseHue, baseSat, bgLeftVal];
  const bgRight: [number, number, number] = [baseHue, baseSat, bgRightVal];

  const baseCenterVal = Math.floor(Math.random() * 20) + 40;
  const valA = largerPhysicalSide === 'A' ? baseCenterVal + diffPercent : baseCenterVal - diffPercent;
  const valB = largerPhysicalSide === 'B' ? baseCenterVal + diffPercent : baseCenterVal - diffPercent;

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
    case 'VECTOR_SHIFT':
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
~~~~~

#### Acts 3: 升级 `RelativeColorCanvas.tsx` 支持阿尔伯斯多种交互

实现包含色彩矢量迁移、阿尔伯斯双背景明暗/色相对抗、以及 2AFC 穿透判别的完整画布。

~~~~~act
write_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~typescript
import { ArrowRight, Check, Eye, X } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { hsvToHex } from '../utils/colorUtils';
import type {
  RelativeColorHitResult,
  RelativeColorQuestionData,
} from '../utils/relativeColorUtils';
import { HsvTrackSlider } from './HsvTrackSlider';

interface RelativeColorCanvasProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
  onAnswer: (userD: [number, number, number] | 'A' | 'B') => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  enableHoverColorPreview?: boolean;
}

export function RelativeColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
}: RelativeColorCanvasProps) {
  const { mode } = question;

  // === 1. VECTOR_SHIFT 模式状态 ===
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // === 2. 阿尔伯斯诱导补偿模式状态 (调节右侧中心色) ===
  const [userRightH, setUserRightH] = useState<number>(180);
  const [userRightS, setUserRightS] = useState<number>(50);
  const [userRightV, setUserRightV] = useState<number>(50);

  // === 3. DECONTEXTUAL_2AFC 模式状态 ===
  const [selected2AfcChoice, setSelected2AfcChoice] = useState<'A' | 'B' | null>(null);

  // 题目切换时重置状态
  useEffect(() => {
    if (question.id) {
      setSelectedIndex(0);
      setSelected2AfcChoice(null);

      if (question.targetLeftCenter) {
        setUserRightH(question.targetLeftCenter[0]);
        setUserRightS(question.targetLeftCenter[1]);
        setUserRightV(question.targetLeftCenter[2]);
      }
    }
  }, [question.id, question.targetLeftCenter]);

  // 2AFC 选择处理
  const handleSelect2Afc = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelected2AfcChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );

  // 提交调制结果
  const handleSubmitInduction = useCallback(() => {
    if (disabled || showAnswer) return;
    onAnswer([userRightH, userRightS, userRightV]);
  }, [disabled, showAnswer, userRightH, userRightS, userRightV, onAnswer]);

  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (disabled || showAnswer) return;

      if (mode === 'DECONTEXTUAL_2AFC') {
        if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          handleSelect2Afc('A');
        } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          handleSelect2Afc('B');
        }
        return;
      }

      if (mode === 'VECTOR_SHIFT') {
        let targetIdx: number | null = null;
        if (['1', '2', '3', '4'].includes(e.key)) {
          targetIdx = Number.parseInt(e.key, 10) - 1;
        } else if (e.code.startsWith('Digit') || e.code.startsWith('Numpad')) {
          const num = Number.parseInt(e.code.replace(/\D/g, ''), 10);
          if (num >= 1 && num <= 4) {
            targetIdx = num - 1;
          }
        }

        if (targetIdx !== null && question.options && targetIdx < question.options.length) {
          e.preventDefault();
          setSelectedIndex(targetIdx);
          return;
        }

        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          const chosenColor = question.options?.[selectedIndex] ?? question.targetD;
          onAnswer(chosenColor);
        }
        return;
      }

      // 明度/色相对抗模式下的 Space 确认
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleSubmitInduction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    mode,
    showAnswer,
    disabled,
    selectedIndex,
    question.options,
    question.targetD,
    onAnswer,
    handleSelect2Afc,
    handleSubmitInduction,
  ]);

  // =========================================================================
  // 视图 A：DECONTEXTUAL_2AFC 环境穿透判别
  // =========================================================================
  if (mode === 'DECONTEXTUAL_2AFC') {
    const isAHit = question.largerPhysicalSide === 'A';
    const isBHit = question.largerPhysicalSide === 'B';

    const hexBgA = hsvToHex(...(question.bgLeft ?? [0, 0, 90]));
    const hexBgB = hsvToHex(...(question.bgRight ?? [0, 0, 10]));
    const hexCenterA = hsvToHex(...(question.centerColorA ?? [0, 0, 50]));
    const hexCenterB = hsvToHex(...(question.centerColorB ?? [0, 0, 50]));

    return (
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
        <div className="text-center space-y-1">
          <div className="text-base font-black text-slate-800 flex items-center justify-center gap-2">
            <Eye className="w-5 h-5 text-indigo-600" />
            穿透背景视错觉：哪一侧的中心色块【物理明度更高】？
          </div>
          <p className="text-xs text-slate-400">
            按快捷键{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">
              1
            </kbd>{' '}
            选择 A，按{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">
              2
            </kbd>{' '}
            选择 B
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          {/* 卡片 A */}
          <button
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => handleSelect2Afc('A')}
            className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
              showAnswer
                ? isAHit
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : selected2AfcChoice === 'A'
                    ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                : selected2AfcChoice === 'A'
                  ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                  A
                </span>
                区域 A (键 1)
              </span>
              {showAnswer && (
                <span
                  className={`text-xs font-extrabold flex items-center gap-1 ${
                    isAHit ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {isAHit ? '物理明度更高' : '物理更暗'} (V: {question.centerColorA?.[2]}%)
                </span>
              )}
            </div>

            {/* 视口展示 */}
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
              style={{ backgroundColor: showAnswer ? '#808080' : hexBgA }}
            >
              <div
                className="w-16 h-16 rounded-xl shadow-md border-2 border-white/60"
                style={{ backgroundColor: hexCenterA }}
              />
            </div>
          </button>

          {/* 卡片 B */}
          <button
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => handleSelect2Afc('B')}
            className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${
              showAnswer
                ? isBHit
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : selected2AfcChoice === 'B'
                    ? 'bg-rose-50/50 border-rose-400 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                : selected2AfcChoice === 'B'
                  ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                  B
                </span>
                区域 B (键 2)
              </span>
              {showAnswer && (
                <span
                  className={`text-xs font-extrabold flex items-center gap-1 ${
                    isBHit ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {isBHit ? '物理明度更高' : '物理更暗'} (V: {question.centerColorB?.[2]}%)
                </span>
              )}
            </div>

            {/* 视口展示 */}
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
              style={{ backgroundColor: showAnswer ? '#808080' : hexBgB }}
            >
              <div
                className="w-16 h-16 rounded-xl shadow-md border-2 border-white/60"
                style={{ backgroundColor: hexCenterB }}
              />
            </div>
          </button>
        </div>

        {showAnswer && (
          <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-xl ${
                  userAnswer?.isHit
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {userAnswer?.isHit ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-800">
                  {userAnswer?.isHit ? '成功穿透背景视错觉！' : '受背景诱导产生了认知偏差'}
                </span>
                <span className="text-slate-400 ml-2">
                  (已统一切换至中性灰背景对比，物理明度差 ΔV ={' '}
                  <strong className="font-mono text-slate-700">{question.physicalValueDiff}%</strong>)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 视图 B：阿尔伯斯诱导补偿模式 (LIGHTNESS_INDUCTION / HUE_INDUCTION)
  // =========================================================================
  if (mode === 'LIGHTNESS_INDUCTION' || mode === 'HUE_INDUCTION') {
    const isLightnessMode = mode === 'LIGHTNESS_INDUCTION';

    const bgLeftHex = hsvToHex(...(question.bgLeft ?? [0, 0, 100]));
    const bgRightHex = hsvToHex(...(question.bgRight ?? [0, 0, 0]));
    const centerLeftHex = hsvToHex(...(question.targetLeftCenter ?? [0, 0, 50]));

    const userRightHex = hsvToHex(userRightH, userRightS, userRightV);
    const idealRightHex = hsvToHex(...(question.idealRightCenter ?? question.targetD));

    const rightSatGradient = `linear-gradient(to right, ${hsvToHex(userRightH, 0, userRightV)}, ${hsvToHex(userRightH, 100, userRightV)})`;
    const rightValGradient = `linear-gradient(to right, #000000, ${hsvToHex(userRightH, 100, 100)})`;
    const hueGradient =
      'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';

    return (
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
        <div className="text-center space-y-1">
          <div className="text-base font-black text-slate-800 flex items-center justify-center gap-2">
            {isLightnessMode ? '阿尔伯斯明度反差补偿' : '阿尔伯斯补色残像调和'}
          </div>
          <p className="text-xs text-slate-400">
            {isLightnessMode
              ? '调整右侧中心色块的物理明度，使得左右两块在不同背景下【感知明度看起来完全一致】。'
              : '调整右侧中心色块的色相与饱和度，反向补偿背景诱导，达成视觉感知色差调和。'}
          </p>
        </div>

        {/* 左右双背景对照视口 (带中间安全隔离带) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
          {/* 左侧固定参考 */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              左侧参考 (固定基准)
            </span>
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
              style={{ backgroundColor: bgLeftHex }}
            >
              <div
                className="w-16 h-16 rounded-xl shadow-md border-2 border-white/60 transition-all"
                style={{ backgroundColor: centerLeftHex }}
              />
            </div>
          </div>

          {/* 右侧作答与调制 */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              右侧作答 (调制以达成感知一致)
            </span>
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
              style={{ backgroundColor: bgRightHex }}
            >
              <div
                className="w-16 h-16 rounded-xl shadow-md border-2 border-white/60 transition-all"
                style={{ backgroundColor: showAnswer ? idealRightHex : userRightHex }}
              />
            </div>
          </div>
        </div>

        {/* 调节滑块面板 */}
        <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          {!isLightnessMode && (
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={userRightH}
              max={360}
              unit="°"
              targetHSV={question.targetD}
              difficultyLevel={question.difficultyLevel}
              showAnswer={showAnswer}
              targetVal={question.idealRightCenter?.[0] ?? question.targetD[0]}
              userVal={userRightH}
              isHit={userAnswer?.isHit}
              onValChange={setUserRightH}
              disabled={disabled}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
            />
          )}

          {!isLightnessMode && (
            <HsvTrackSlider
              label="S"
              gradient={rightSatGradient}
              val={userRightS}
              max={100}
              unit="%"
              targetHSV={question.targetD}
              difficultyLevel={question.difficultyLevel}
              showAnswer={showAnswer}
              targetVal={question.idealRightCenter?.[1] ?? question.targetD[1]}
              userVal={userRightS}
              isHit={userAnswer?.isHit}
              onValChange={setUserRightS}
              disabled={disabled}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
            />
          )}

          <HsvTrackSlider
            label="V"
            gradient={rightValGradient}
            val={userRightV}
            max={100}
            unit="%"
            targetHSV={question.targetD}
            difficultyLevel={question.difficultyLevel}
            showAnswer={showAnswer}
            targetVal={question.idealRightCenter?.[2] ?? question.targetD[2]}
            userVal={userRightV}
            isHit={userAnswer?.isHit}
            onValChange={setUserRightV}
            disabled={disabled}
            hitMargin={hitMargin}
            showToleranceBand={showToleranceBand}
          />
        </div>

        {/* 答案揭晓诊断 */}
        {showAnswer && (
          <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-xl ${
                  userAnswer?.isHit
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {userAnswer?.isHit ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-800">
                  {userAnswer?.isHit ? '精准补偿环境视错觉！' : '环境补偿偏转出现误差'}
                </span>
                <span className="text-slate-400 ml-2">
                  (色差 ΔE ={' '}
                  <strong className="font-mono text-slate-700">{userAnswer?.deltaEError}</strong>)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 确认提交按钮 */}
        {!showAnswer && (
          <button
            type="button"
            onClick={handleSubmitInduction}
            disabled={disabled}
            className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
          >
            确认提交 (Space)
          </button>
        )}
      </div>
    );
  }

  // =========================================================================
  // 视图 C：VECTOR_SHIFT 原有色彩矢量迁移
  // =========================================================================
  const { colorA, colorB, colorC, targetD, options, correctIndex, difficultyLevel } = question;
  const activeColor = options?.[selectedIndex] ?? targetD;
  const userH = activeColor[0];
  const userS = activeColor[1];
  const userV = activeColor[2];

  const handleSubmit = () => {
    if (disabled || showAnswer) return;
    onAnswer(activeColor);
  };

  const hexA = hsvToHex(...colorA);
  const hexB = hsvToHex(...colorB);
  const hexC = hsvToHex(...colorC);

  const hexSelectedD = hsvToHex(userH, userS, userV);
  const hexTargetD = hsvToHex(...targetD);

  const cH = colorC[0];
  const cS = colorC[1];
  const cV = colorC[2];

  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
  const satGradient = `linear-gradient(to right, ${hsvToHex(userH, 0, userV)}, ${hsvToHex(userH, 100, userV)})`;
  const valGradient = `linear-gradient(to right, #000000, ${hsvToHex(userH, 100, 100)})`;

  const cSatGradient = `linear-gradient(to right, ${hsvToHex(cH, 0, cV)}, ${hsvToHex(cH, 100, cV)})`;
  const cValGradient = `linear-gradient(to right, #000000, ${hsvToHex(cH, 100, 100)})`;

  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 对比展示区 (2x2 网格: 上 A -> B，下 C -> D) */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 w-full flex flex-col items-center gap-4">
        {/* 上排: 基准推移组 (A -> B) */}
        <div className="flex items-center justify-center gap-4">
          <div
            className="w-24 h-24 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexA }}
          />
          <ArrowRight className="w-5 h-5 text-indigo-400" />
          <div
            className="w-24 h-24 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexB }}
          />
        </div>

        {/* 下排: 目标推移组 (C -> D) */}
        <div className="flex items-center justify-center gap-4">
          <div
            className="w-24 h-24 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexC }}
          />
          <ArrowRight className="w-5 h-5 text-indigo-400" />
          <div
            className="w-24 h-24 rounded-2xl border-2 border-white shadow-md transition-all duration-150 relative overflow-hidden"
            style={{ backgroundColor: hexSelectedD }}
          >
            {showAnswer && (
              <div
                className="absolute bottom-0 left-0 right-0 h-1/2"
                style={{ backgroundColor: hexTargetD }}
              />
            )}
          </div>
        </div>
      </div>

      {/* 轨道面板 */}
      <div className="w-full space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 左侧：C 节点颜色 */}
          <div className="space-y-3 md:pr-4 md:border-r border-slate-200/60">
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={cH}
              max={360}
              unit="°"
              targetHSV={colorC}
              difficultyLevel={difficultyLevel}
              showAnswer={false}
              targetVal={cH}
              userVal={cH}
              allUserHSV={colorC}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={false}
              onValChange={() => {}}
            />
            <HsvTrackSlider
              label="S"
              gradient={cSatGradient}
              val={cS}
              max={100}
              unit="%"
              targetHSV={colorC}
              difficultyLevel={difficultyLevel}
              showAnswer={false}
              targetVal={cS}
              userVal={cS}
              allUserHSV={colorC}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={false}
              onValChange={() => {}}
            />
            <HsvTrackSlider
              label="V"
              gradient={cValGradient}
              val={cV}
              max={100}
              unit="%"
              targetHSV={colorC}
              difficultyLevel={difficultyLevel}
              showAnswer={false}
              targetVal={cV}
              userVal={cV}
              allUserHSV={colorC}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={false}
              onValChange={() => {}}
            />
          </div>

          {/* 右侧：D 节点颜色 */}
          <div className="space-y-3">
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={userH}
              max={360}
              unit="°"
              targetHSV={targetD}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetD[0]}
              userVal={userAnswer?.userD?.[0] ?? userH}
              isHit={userAnswer?.isHit}
              onValChange={() => {}}
              allUserHSV={[userH, userS, userV]}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
            />
            <HsvTrackSlider
              label="S"
              gradient={satGradient}
              val={userS}
              max={100}
              unit="%"
              targetHSV={targetD}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetD[1]}
              userVal={userAnswer?.userD?.[1] ?? userS}
              isHit={userAnswer?.isHit}
              onValChange={() => {}}
              allUserHSV={[userH, userS, userV]}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
            />
            <HsvTrackSlider
              label="V"
              gradient={valGradient}
              val={userV}
              max={100}
              unit="%"
              targetHSV={targetD}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetD[2]}
              userVal={userAnswer?.userD?.[2] ?? userV}
              isHit={userAnswer?.isHit}
              onValChange={() => {}}
              allUserHSV={[userH, userS, userV]}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
            />
          </div>
        </div>
      </div>

      {/* 候选色块卡片区 */}
      <div className="grid grid-cols-4 gap-3 w-full">
        {options?.map((opt, idx) => {
          const isSelected = selectedIndex === idx;
          const isTarget = idx === correctIndex;
          const hexVal = hsvToHex(...opt);

          let borderStyle = 'border-slate-200 hover:border-slate-300';
          let ringStyle = '';

          if (showAnswer) {
            if (isTarget) {
              borderStyle = 'border-emerald-500';
              ringStyle = 'ring-2 ring-emerald-500/40';
            } else if (isSelected && !isTarget) {
              borderStyle = 'border-rose-400';
              ringStyle = 'ring-1 ring-rose-400/40 opacity-80';
            } else {
              borderStyle = 'border-slate-200 opacity-40';
            }
          } else if (isSelected) {
            borderStyle = 'border-indigo-600';
            ringStyle = 'ring-2 ring-indigo-500/30 shadow-sm';
          }

          return (
            <button
              key={`${idx}-${hexVal}`}
              type="button"
              disabled={disabled || showAnswer}
              onClick={() => setSelectedIndex(idx)}
              className={`p-1.5 rounded-2xl border bg-white transition-all duration-150 active:scale-95 cursor-pointer ${borderStyle} ${ringStyle}`}
            >
              <div
                className="w-full aspect-[4/3] rounded-xl shadow-inner border border-white/60"
                style={{ backgroundColor: hexVal }}
              />
            </button>
          );
        })}
      </div>

      {/* 确认提交按钮 */}
      {!showAnswer && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
        >
          确认提交 (Space)
        </button>
      )}
    </div>
  );
}
~~~~~

#### Acts 4: 适配插件定义 `trainingPlugins.tsx`

完善 `relativeColorPlugin`，支持新模式的模式 Badge 与做答数据记录提取。

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript
// 3. 相对色感插件
export const relativeColorPlugin: TrainingPlugin<
  RelativeColorQuestionData,
  RelativeColorHitResult,
  [number, number, number],
  RelativeColorSettings
> = {
  domain: 'relative_color',
  title: '相对色感',
  getModeBadge: () => '色彩矢量迁移',
  generateQuestion: (mode, level) =>
    generateRelativeColorQuestion(mode as RelativeColorMode, level),
  evaluateAnswer: (userD, q, mode) => checkRelativeColorHit(mode as RelativeColorMode, userD, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal) => ({
    colorA: q.colorA,
    colorB: q.colorB,
    colorC: q.colorC,
    targetD: q.targetD,
    userD: userVal,
    deltaEError: hitResult.deltaEError,
  }),
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <RelativeColorCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
      enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
    />
  ),
};
~~~~~
~~~~~typescript
// 3. 相对色感插件
export const relativeColorPlugin: TrainingPlugin<
  RelativeColorQuestionData,
  RelativeColorHitResult,
  [number, number, number] | 'A' | 'B',
  RelativeColorSettings
> = {
  domain: 'relative_color',
  title: '相对色感',
  getModeBadge: (mode) =>
    mode === 'LIGHTNESS_INDUCTION'
      ? '明度反差补偿'
      : mode === 'HUE_INDUCTION'
        ? '补色残像调和'
        : mode === 'DECONTEXTUAL_2AFC'
          ? '环境穿透判别'
          : '色彩矢量迁移',
  generateQuestion: (mode, level) =>
    generateRelativeColorQuestion(mode as RelativeColorMode, level),
  evaluateAnswer: (userVal, q, mode) =>
    checkRelativeColorHit(mode as RelativeColorMode, userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => {
    if (mode === 'DECONTEXTUAL_2AFC') {
      return {
        mode,
        userChoice: userVal,
        correctChoice: q.largerPhysicalSide,
        physicalValueDiff: q.physicalValueDiff,
      };
    }
    if (mode === 'LIGHTNESS_INDUCTION' || mode === 'HUE_INDUCTION') {
      return {
        mode,
        bgLeft: q.bgLeft,
        bgRight: q.bgRight,
        targetLeftCenter: q.targetLeftCenter,
        idealRightCenter: q.idealRightCenter,
        userRightColor: userVal,
        deltaEError: hitResult.deltaEError,
      };
    }
    return {
      mode: 'VECTOR_SHIFT',
      colorA: q.colorA,
      colorB: q.colorB,
      colorC: q.colorC,
      targetD: q.targetD,
      userD: userVal,
      deltaEError: hitResult.deltaEError,
    };
  },
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <RelativeColorCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
      enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
    />
  ),
};
~~~~~

### 下一步建议
1. **测试与类型审查**：运行 `npm run check` 和 `npm run test`，验证新增模式的题目生成逻辑、OKLab 诱导算法与组件渲染。
2. **偏好设置微调**：可考虑在“相对色感偏好设置”中，添加针对同时对比模式的特定调节参数（如背景诱导反差系数或是否在答完后自动合并背景）。
3. **验证后提交**：由用户进行体验确认后，可生成独立的 `[COMMIT]` 计划将此次视错觉训练套件固化到版本库。
