好的，我们立刻开始实施这项重构。

下面为您生成 `[WIP]` 计划，用于将色相轨道及弱点分析色环的渐变生成逻辑重构为基于 OKLCH 均匀色彩空间的感知等明度色带。

## [WIP] refactor(color): 实现基于 OKLCH 的感知等明度色相渐变条

### 用户需求
将色感训练中的色相 (Hue) 轨道渐变及色相盲区分析色环从原先的 sRGB/HSV 纯度渐变重构为基于 OKLCH 均匀色彩空间生成的感知等明度色带，消除传统色相环中黄色/青色过亮、蓝色过暗导致的明度干扰。

### 评论
这是一个提升 FormSight 视觉训练专业度与理论一致性的重要重构。通过固定 OKLCH 空间的感知明度 ($L=0.70$) 与感知彩度 ($C=0.16$)，能有效隔离明度信号，让用户专注于纯粹的色相感知。

### 目标
1. 在 `oklchUtils.ts` 中新增 `oklchToHex` 及 `getPerceptualHueGradient` 工具函数。
2. 在 `ColorCanvas.tsx` 中使用 `getPerceptualHueGradient()` 替代硬编码的 sRGB HSV 渐变字符串。
3. 在 `ColorAnalyticsModal.tsx` 中使用 `oklchToHex(0.70, 0.16, hueAngle)` 渲染外圈光谱指示带。
4. 补充相关的单元测试逻辑。

### 基本原理
利用 OKLCH 空间的直角/极坐标转换公式，将固定的明度 $L$、彩度 $C$ 与变化的色相角 $H$ 转换为 OKLab，再经过 LMS Cone 逆变换与 Gamma 校正导出 sRGB HEX 颜色。在 $C=0.16$ 的安全边界下，既能覆盖全色域又不触发严重剪裁，生成视觉等明度的 CSS 渐变。

### 标签
#intent/refine #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/color-recognition #task/object/oklch-hue-gradient #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 实现 OKLCH 色相转换与渐变生成工具

首先在 `src/utils/oklchUtils.ts` 中新增 `oklchToHex` 以及 `getPerceptualHueGradient` 函数。

~~~~~act
patch_file
src/utils/oklchUtils.ts
~~~~~
~~~~~typescript
export function getTargetDeltaEForLevel(level: number): number {
  const clampedLevel = Math.max(1, Math.min(35, level));
  const t = (clampedLevel - 1) / 34; // 0..1
  const maxDeltaE = 0.12; // Level 1 容错 (宽松，约为 40 JND)
  const minDeltaE = 0.008; // Level 35 容错 (精细，约为 2.5 JND)

  return maxDeltaE * (minDeltaE / maxDeltaE) ** t;
}
~~~~~
~~~~~typescript
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
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);

  // 1. OKLab -> LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

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
~~~~~

#### Acts 2: 更新 ColorCanvas 渐变条

将 `ColorCanvas.tsx` 中写死的 sRGB HSV 渐变字符串替换为调用 `getPerceptualHueGradient()`。

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  type ColorHitResult,
  type ColorQuestionData,
  getToleranceSpan,
  hsvToHex,
} from '../utils/colorUtils';
~~~~~
~~~~~typescript
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  type ColorHitResult,
  type ColorQuestionData,
  getToleranceSpan,
  hsvToHex,
} from '../utils/colorUtils';
import { getPerceptualHueGradient } from '../utils/oklchUtils';
~~~~~

~~~~~act
patch_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript
  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
~~~~~
~~~~~typescript
  const hueGradient = getPerceptualHueGradient();
~~~~~

#### Acts 3: 更新 ColorAnalyticsModal 色彩环指示带

更新 `ColorAnalyticsModal.tsx`，将弱点分析图中外圈光谱环也改为使用 OKLCH 等明度算法绘制。

~~~~~act
patch_file
src/components/ColorAnalyticsModal.tsx
~~~~~
~~~~~typescript
import { AlertCircle, BarChart2, Info, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { hsvToHex } from '../utils/colorUtils';
import { type ColorTrialRecord, getAllColorTrialRecords } from '../utils/db';
~~~~~
~~~~~typescript
import { AlertCircle, BarChart2, Info, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { hsvToHex } from '../utils/colorUtils';
import { type ColorTrialRecord, getAllColorTrialRecords } from '../utils/db';
import { oklchToHex } from '../utils/oklchUtils';
~~~~~

~~~~~act
patch_file
src/components/ColorAnalyticsModal.tsx
~~~~~
~~~~~typescript
      // 1. 绘制最外圈彩色光谱指示带
      const hueAngle = i * 30 + 15; // 扇区中心色相
      const hexColor = hsvToHex(hueAngle, 100, 100);
~~~~~
~~~~~typescript
      // 1. 绘制最外圈彩色光谱指示带
      const hueAngle = i * 30 + 15; // 扇区中心色相
      const hexColor = oklchToHex(0.7, 0.16, hueAngle);
~~~~~

#### Acts 4: 补充单元测试

在 `src/utils/__tests__/colorUtils.test.ts` 中增加对 `oklchToHex` 与 `getPerceptualHueGradient` 函数的校验。

~~~~~act
patch_file
src/utils/__tests__/colorUtils.test.ts
~~~~~
~~~~~typescript
import {
  checkColorHit,
  generateColorQuestion,
  getToleranceForLevel,
  hsvToHex,
} from '../colorUtils';
import { calcDeltaEOk, getTargetDeltaEForLevel, hsvToOkLab } from '../oklchUtils';
~~~~~
~~~~~typescript
import {
  checkColorHit,
  generateColorQuestion,
  getToleranceForLevel,
  hsvToHex,
} from '../colorUtils';
import {
  calcDeltaEOk,
  getPerceptualHueGradient,
  getTargetDeltaEForLevel,
  hsvToOkLab,
  oklchToHex,
} from '../oklchUtils';
~~~~~

~~~~~act
patch_file
src/utils/__tests__/colorUtils.test.ts
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
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

  it('oklchUtils - should generate valid hex from OKLCH and create perceptual hue gradient string', () => {
    const hexRed = oklchToHex(0.7, 0.16, 0);
    expect(hexRed).toMatch(/^#[0-9A-F]{6}$/);

    const gradient = getPerceptualHueGradient();
    expect(gradient).toContain('linear-gradient(to right,');
    expect(gradient).toContain('100%');
  });
~~~~~

### 下一步建议
- **自动化测试**: 可以运行 `npm run test` 验证新增加的 OKLCH 色彩转换单元测试是否顺利通过。
- **视图核对**: 启动 `npm run dev` 并在浏览器中打开“色感训练 ➔ 色相 (Hue) 模式”，观察滑块轨道的过渡是否更加平滑且无明显暴亮暴暗点。
