好的，我将生成基于 **OKLCH 均匀色彩空间** 的色感难度评估与题目生成策略优化实施计划。

## [WIP] feat(color): 基于 OKLCH 均匀色彩空间优化色感难度与生成策略

### 用户需求
在 FormSight 色感训练中，消除在低饱和度（Saturation）或低明度（Value）时因 HSV 空间非线性导致的难度倾斜问题，实现同一难度 Level 下全色彩空间人眼主观感知的等敏锐度校验与题目生成优化。

### 评论
当前 HSV 色彩空间的绝对数值容错率（如色相固定 $\pm 4^\circ \sim 30^\circ$）未考虑人眼视觉感知特性（Chroma $C \approx S \times V$）。在低饱和/低明度区，色相差异被极大压缩，导致该区域难度陡增且训练缺乏科学性。引入 OKLab/OKLCH 均匀色彩空间并以欧氏色差 $\Delta E_{OK}$ 进行判定，是提升物理与心理感知一致性的关键重构。

### 目标
1. 新建 `src/utils/oklchUtils.ts` 模块，实现 HSV $\rightarrow$ OKLab 色彩空间转换算法及 $\Delta E_{OK}$ 色差计算。
2. 重构 `src/utils/colorUtils.ts` 中的 `checkColorHit` 判定函数，改用 OKLab 色差与难度 Level 对应的感知阈值 $\Delta E_{target}$ 进行命中评估。
3. 优化 `generateColorQuestion` 题目生成策略，增加基于 OKLab 彩度的“可观测量”筛选机制，避免生成死角题目。
4. 更新 `src/utils/__tests__/colorUtils.test.ts` 单元测试，验证 OKLab 色差计算与感知难度的正确性。

### 基本原理
通过 Linear RGB 与 LMS 锥体细胞响应矩阵，将 HSV 颜色精准映射到 OKLab 视觉均匀空间。在 OKLab 中，欧氏距离 $\Delta E_{OK} = \sqrt{(\Delta L)^2 + (\Delta a)^2 + (\Delta b)^2}$ 准确代表了人眼最小可察觉色差 (JND)。通过设定难度 Level 与 $\Delta E_{target}$ 的指数映射关系，使得高饱和下色相容错自动收紧、低饱和下自动放宽，从而实现跨色彩领域的均衡感知难度。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #concept/state #scope/core #scope/ux #ai/instruct #task/domain/color-recognition #task/object/perceptual-uniformity-oklch #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 创建 `src/utils/oklchUtils.ts` 模块

创建 OKLab/OKLCH 转换矩阵、$\Delta E_{OK}$ 色差计算与感知难度阈值映射函数。

~~~~~act
write_file
src/utils/oklchUtils.ts
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
  const normS = s / 100;
  const normV = v / 100;
  const c = normV * normS;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = normV - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
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
  const toLinear = (val: number) =>
    val <= 0.04045 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
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
  const L = 0.2104542553 * lCbrt + 0.7936177850 * mCbrt - 0.0040720468 * sCbrt;
  const a = 1.9779984951 * lCbrt - 2.4285922050 * mCbrt + 0.4505937099 * sCbrt;
  const bLab = 0.0259040371 * lCbrt + 0.7827717662 * mCbrt - 0.8086757660 * sCbrt;

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

  return maxDeltaE * Math.pow(minDeltaE / maxDeltaE, t);
}
~~~~~

#### Acts 2: 更新 `src/utils/colorUtils.ts` 实现基于 ΔE 的感知盲区与难度判定

接入 OKLab 算法重构命中检测与生成策略，保持 UI 显示所需的数值误差。

~~~~~act
write_file
src/utils/colorUtils.ts
~~~~~
~~~~~typescript
import {
  calcDeltaEOk,
  getOkChroma,
  getTargetDeltaEForLevel,
  hsvToOkLab,
} from './oklchUtils';

export type ColorMode = 'H' | 'S' | 'V';

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
  errorValue: number; // 绝对数值误差 (角度或百分比)
  tolerance: number;
}

/**
 * HSV (0..360, 0..100, 0..100) 转 16 进制 Hex
 */
export function hsvToHex(h: number, s: number, v: number): string {
  const normS = s / 100;
  const normV = v / 100;
  const c = normV * normS;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = normV - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
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

  let targetH = mode === 'H' ? selectHueWithTargeting(options) : Math.floor(Math.random() * 360);
  let targetS = 100;
  let targetV = 100;

  // 题目生成过滤逻辑：确保抽取的色彩具备视觉可观测量
  let attempts = 0;
  while (attempts < 50) {
    attempts++;
    if (mode === 'H') {
      targetS = Math.floor(Math.random() * 81) + 20; // 20..100
      targetV = Math.floor(Math.random() * 81) + 20; // 20..100

      // 检验 OKLab 彩度：必须保证彩度足够大，否则色相被低 S/V 遮蔽不可辩
      const lab = hsvToOkLab(targetH, targetS, targetV);
      if (getOkChroma(lab) >= tolerance * 1.5) {
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
  userVal: number,
  question: ColorQuestionData,
): ColorHitResult {
  const { targetH, targetS, targetV, difficultyLevel } = question;

  const userH = mode === 'H' ? userVal : targetH;
  const userS = mode === 'S' ? userVal : targetS;
  const userV = mode === 'V' ? userVal : targetV;

  const targetLab = hsvToOkLab(targetH, targetS, targetV);
  const userLab = hsvToOkLab(userH, userS, userV);
  const realDeltaE = calcDeltaEOk(targetLab, userLab);

  const targetDeltaE = getTargetDeltaEForLevel(difficultyLevel);
  const isHit = realDeltaE <= targetDeltaE;

  let targetVal = targetH;
  let errorVal = 0;

  if (mode === 'H') {
    targetVal = targetH;
    const diff = Math.abs(userVal - targetVal);
    errorVal = Math.min(diff, 360 - diff);
  } else if (mode === 'V') {
    targetVal = targetV;
    errorVal = Math.abs(userVal - targetVal);
  } else {
    targetVal = targetS;
    errorVal = Math.abs(userVal - targetVal);
  }

  return {
    isHit,
    userValue: userVal,
    targetValue: targetVal,
    errorValue: Math.round(errorVal * 10) / 10,
    tolerance: targetDeltaE,
  };
}
~~~~~

#### Acts 3: 更新 `src/utils/__tests__/colorUtils.test.ts` 单元测试

增加 OKLab 映射与感知色差判定的单体测试用例。

~~~~~act
write_file
src/utils/__tests__/colorUtils.test.ts
~~~~~
~~~~~typescript
import { describe, expect, it } from 'vitest';
import {
  checkColorHit,
  generateColorQuestion,
  getToleranceForLevel,
  hsvToHex,
} from '../colorUtils';
import { calcDeltaEOk, getTargetDeltaEForLevel, hsvToOkLab } from '../oklchUtils';

describe('colorUtils & oklchUtils', () => {
  it('hsvToHex - should correctly convert HSV to HEX string', () => {
    expect(hsvToHex(0, 100, 100)).toBe('#FF0000'); // Red
    expect(hsvToHex(120, 100, 100)).toBe('#00FF00'); // Green
    expect(hsvToHex(240, 100, 100)).toBe('#0000FF'); // Blue
    expect(hsvToHex(0, 0, 100)).toBe('#FFFFFF'); // White
    expect(hsvToHex(0, 0, 0)).toBe('#000000'); // Black
  });

  it('oklchUtils - should accurately convert HSV to OKLab and calculate perceptually uniform delta E', () => {
    const redLab = hsvToOkLab(0, 100, 100);
    const whiteLab = hsvToOkLab(0, 0, 100);
    const blackLab = hsvToOkLab(0, 0, 0);

    // Red vs White should have significant delta E
    const dE_RedWhite = calcDeltaEOk(redLab, whiteLab);
    expect(dE_RedWhite).toBeGreaterThan(0.3);

    // Black L should be close to 0, White L close to 1
    expect(blackLab[0]).toBeCloseTo(0, 1);
    expect(whiteLab[0]).toBeCloseTo(1, 1);
  });

  it('getTargetDeltaEForLevel - should return decreasing delta E tolerance as level increases', () => {
    const tolL1 = getTargetDeltaEForLevel(1);
    const tolL35 = getTargetDeltaEForLevel(35);

    expect(tolL1).toBeCloseTo(0.12, 2);
    expect(tolL35).toBeCloseTo(0.008, 3);
    expect(tolL1).toBeGreaterThan(tolL35);

    expect(getToleranceForLevel('H', 1)).toBe(tolL1);
  });

  it('checkColorHit - should dynamically adjust angular/value tolerance using OKLab delta E', () => {
    const questionH = generateColorQuestion('H', 10);
    questionH.targetH = 0;
    questionH.targetS = 100;
    questionH.targetV = 100;

    // Small hue shift at high S/V
    const hitSuccess = checkColorHit('H', 3, questionH);
    expect(hitSuccess.isHit).toBe(true);

    // Large hue shift at high S/V fails
    const hitFail = checkColorHit('H', 40, questionH);
    expect(hitFail.isHit).toBe(false);

    // Linear V mode test
    const questionV = generateColorQuestion('V', 35);
    questionV.targetV = 50;
    const hitVSuccess = checkColorHit('V', 50, questionV);
    expect(hitVSuccess.isHit).toBe(true);
  });

  it('generateColorQuestion with manual targeting - should generate targeted hues with higher probability', () => {
    const options = {
      targetingMode: 'manual' as const,
      targetSectors: [0], // 0°-30°
    };

    let targetedCount = 0;
    const totalRuns = 200;

    for (let i = 0; i < totalRuns; i++) {
      const q = generateColorQuestion('H', 5, options);
      if (q.targetH >= 0 && q.targetH <= 35) {
        targetedCount++;
      }
    }

    const ratio = targetedCount / totalRuns;
    expect(ratio).toBeGreaterThan(0.4);
  });
});
~~~~~

### 下一步建议
- **跑通单体测试**: 在终端运行 `npm run test`，确保所有的测试用例全绿通过。
- **验证构建状态**: 运行 `npm run build` 确保 TypeScript 类型检查成功。
- **提交变更**: 完成验证后，可发起独立的 Git Commit 计划以将更改持久化。
