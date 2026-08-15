好的，我们现在开始实施 **HSV $\rightarrow$ OKLCH 色相角语义重映射（Hue Angle Remapping）**。

下面为您生成 `[WIP]` 计划：

## [WIP] refactor(color): 实现 HSV 到 OKLCH 色相角语义重映射

### 用户需求
在保留 OKLCH 感知等明度（$L=0.70$, $C=0.16$）优势的同时，引入 HSV $\rightarrow$ OKLCH 色相角线性重映射机制，修正 OKLCH 物理角度与 HSV 认知角度的差异，使得在 $H=60^\circ$ 位置渲染出标准的正黄色。

### 评论
通过对主要色彩节点（红 $29^\circ$、黄 $97^\circ$、绿 $142^\circ$、青 $195^\circ$、蓝 $264^\circ$、品红 $328^\circ$）建立段内线性插值，完美打通了“等明度感知”与“HSV 色彩语义认知”，彻底消除了 $60^\circ$ 呈现橙黄色的错位感。

### 目标
1. 在 `oklchUtils.ts` 中实现 `mapHsvHueToOklchHue` 色相角分段插值重映射函数。
2. 更新 `getPerceptualHueGradient`，使其在生成渐变带时自动进行色相角重映射。
3. 更新 `ColorAnalyticsModal.tsx` 中最外圈光谱指示带的渲染逻辑。
4. 补充相关映射算子的单元测试。

### 基本原理
利用 HSV 关键色彩节点在 OKLCH 空间中的实际物理测量值作为锚点，对任意输入的 HSV 色相角做分段线性插值。这既保证了 $0^\circ \sim 360^\circ$ 轨道的连续闭环，又保证了 $60^\circ$ 处能精准映射到 OKLCH 的 $97^\circ$ 正黄区。

### 标签
#intent/refine #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/color-recognition #task/object/oklch-hue-remapping #task/action/implementation #task/state/continue

---

### Script

#### Acts 1: 实现 mapHsvHueToOklchHue 函数与更新渐变生成器

在 `src/utils/oklchUtils.ts` 中新增色相角映射函数并更新渐变条生成逻辑。

~~~~~act
patch_file
src/utils/oklchUtils.ts
~~~~~
~~~~~typescript
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
~~~~~typescript
/**
 * 将 HSV 的色相角 (0~360°) 重映射为 OKLCH 中感知语义对齐的色相角
 * 消除 OKLCH 与 HSV 在主要色彩节点上的物理角度差异（如 HSV 60° 映射至 OKLCH 97° 正黄）
 */
export function mapHsvHueToOklchHue(hsvH: number): number {
  const normH = ((hsvH % 360) + 360) % 360;

  const anchors = [
    { hsv: 0, oklch: 29 },    // 红
    { hsv: 60, oklch: 97 },   // 黄 (60° -> 97° 正黄)
    { hsv: 120, oklch: 142 }, // 绿
    { hsv: 180, oklch: 195 }, // 青
    { hsv: 240, oklch: 264 }, // 蓝
    { hsv: 300, oklch: 328 }, // 品红
    { hsv: 360, oklch: 389 }, // 360° 闭环 (29 + 360)
  ];

  for (let i = 0; i < anchors.length - 1; i++) {
    const curr = anchors[i];
    const next = anchors[i + 1];
    if (normH >= curr.hsv && normH <= next.hsv) {
      const t = (normH - curr.hsv) / (next.hsv - curr.hsv);
      return (curr.oklch + t * (next.oklch - curr.oklch)) % 360;
    }
  }

  return normH;
}

/**
 * 生成 12 节点基于 OKLCH 等明度/等彩度且经色相重映射的感知均匀 CSS 色相渐变字符串
 */
export function getPerceptualHueGradient(): string {
  const L = 0.7;
  const C = 0.16;
  const stops: string[] = [];

  for (let hsvH = 0; hsvH <= 360; hsvH += 30) {
    const oklchH = mapHsvHueToOklchHue(hsvH);
    const hex = oklchToHex(L, C, oklchH);
    const pct = Math.round((hsvH / 360) * 100);
    stops.push(`${hex} ${pct}%`);
  }

  return `linear-gradient(to right, ${stops.join(', ')})`;
}
~~~~~

#### Acts 2: 更新 ColorAnalyticsModal 的光谱指示带

将分析图中外圈指示带的渲染也应用 `mapHsvHueToOklchHue` 映射。

~~~~~act
patch_file
src/components/ColorAnalyticsModal.tsx
~~~~~
~~~~~typescript
import { AlertCircle, BarChart2, Info, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { hsvToHex } from '../utils/colorUtils';
import { type ColorTrialRecord, getAllColorTrialRecords } from '../utils/db';
import { oklchToHex } from '../utils/oklchUtils';
~~~~~
~~~~~typescript
import { AlertCircle, BarChart2, Info, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { hsvToHex } from '../utils/colorUtils';
import { type ColorTrialRecord, getAllColorTrialRecords } from '../utils/db';
import { mapHsvHueToOklchHue, oklchToHex } from '../utils/oklchUtils';
~~~~~

~~~~~act
patch_file
src/components/ColorAnalyticsModal.tsx
~~~~~
~~~~~typescript
      // 1. 绘制最外圈彩色光谱指示带
      const hueAngle = i * 30 + 15; // 扇区中心色相
      const hexColor = oklchToHex(0.7, 0.16, hueAngle);
~~~~~
~~~~~typescript
      // 1. 绘制最外圈彩色光谱指示带
      const hueAngle = i * 30 + 15; // 扇区中心色相
      const hexColor = oklchToHex(0.7, 0.16, mapHsvHueToOklchHue(hueAngle));
~~~~~

#### Acts 3: 补充重映射算子单元测试

在 `src/utils/__tests__/colorUtils.test.ts` 中补充针对 `mapHsvHueToOklchHue` 的测试。

~~~~~act
patch_file
src/utils/__tests__/colorUtils.test.ts
~~~~~
~~~~~typescript
import {
  calcDeltaEOk,
  getPerceptualHueGradient,
  getTargetDeltaEForLevel,
  hsvToOkLab,
  oklchToHex,
} from '../oklchUtils';
~~~~~
~~~~~typescript
import {
  calcDeltaEOk,
  getPerceptualHueGradient,
  getTargetDeltaEForLevel,
  hsvToOkLab,
  mapHsvHueToOklchHue,
  oklchToHex,
} from '../oklchUtils';
~~~~~

~~~~~act
patch_file
src/utils/__tests__/colorUtils.test.ts
~~~~~
~~~~~typescript
  it('oklchUtils - should generate valid hex from OKLCH and create perceptual hue gradient string', () => {
    const hexRed = oklchToHex(0.7, 0.16, 0);
    expect(hexRed).toMatch(/^#[0-9A-F]{6}$/);

    const gradient = getPerceptualHueGradient();
    expect(gradient).toContain('linear-gradient(to right,');
    expect(gradient).toContain('100%');
  });
~~~~~
~~~~~typescript
  it('oklchUtils - should generate valid hex from OKLCH and create perceptual hue gradient string', () => {
    const hexRed = oklchToHex(0.7, 0.16, 0);
    expect(hexRed).toMatch(/^#[0-9A-F]{6}$/);

    const gradient = getPerceptualHueGradient();
    expect(gradient).toContain('linear-gradient(to right,');
    expect(gradient).toContain('100%');
  });

  it('oklchUtils - mapHsvHueToOklchHue should accurately map HSV 60 to OKLCH ~97 pure yellow', () => {
    expect(mapHsvHueToOklchHue(0)).toBeCloseTo(29, 1);
    expect(mapHsvHueToOklchHue(60)).toBeCloseTo(97, 1);
    expect(mapHsvHueToOklchHue(120)).toBeCloseTo(142, 1);
  });
~~~~~

### 下一步建议
- **运行单元测试**: 执行 `npm run test` 验证 `mapHsvHueToOklchHue` 的映射计算及 OKLCH 工具集测试是否通过。
- **界面体验验证**: 在浏览器中打开色相轨道，滑动至 $60^\circ$ 位置，确认显示的色彩已经精准呈现为标准的正黄色。
