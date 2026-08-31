我们将通过在 `src/utils/theme.ts` 中导出统一的 `HUE_SPECTRUM_GRADIENT` 光谱渐变常量和 `PALETTE.black`，彻底消除 `ColorCanvas.tsx` 与 `AlbersInductionView.tsx` 中剩余的 16 处硬编码渐变色值，并在执行后运行扫描器进行最终验证。

## [WIP] refactor(color): 将全光谱与明度渐变色值统一接入 PALETTE 与主题 Tokens

### 用户需求
手动修复 `src/packs/color/views/ColorCanvas.tsx` 与 `src/packs/relative_color/components/AlbersInductionView.tsx` 中的内联全光谱 360° 渐变和明度纯黑渐变硬编码。

### 评论
将 360° 全光谱 CSS 渐变字符串抽离为全局共享的 `HUE_SPECTRUM_GRADIENT`，不仅确保了 HSV 取色轨与色相诱导视图中的渐变完全一致，还使得项目中所有涉及色彩空间采样的基础色值百分之百收敛到 `PALETTE`。

### 目标
1. 在 `src/utils/theme.ts` 中基于 `PALETTE.spectrum` 构造并导出 `HUE_SPECTRUM_GRADIENT`。
2. 重构 `src/packs/color/views/ColorCanvas.tsx`。
3. 重构 `src/packs/relative_color/components/AlbersInductionView.tsx`。
4. 运行 `analyze_hardcoded_colors.py` 验证全项目硬编码色值已全部清零。

### 基本原理
- 在 `theme.ts` 中组合 `PALETTE.spectrum` 与 `PALETTE.black` 构造语义化渐变常数；
- 替换各视图中的内联字符串模版为引用常量，消除散落的 `#FF0000`、`#FFFF00`、`#000000` 等十六进制字面量。

### 标签
#intent/refine #flow/ready #priority/medium #comp/engine #concept/ui #scope/core #ai/delegate #task/domain/ui #task/object/canvas-theme-tokens #task/action/refactor #task/state/continue #task/status/active

---

### Script

#### Acts 1: 在 `src/utils/theme.ts` 中导出 `HUE_SPECTRUM_GRADIENT`

~~~~~act
patch_file
src/utils/theme.ts
~~~~~
~~~~~typescript.old
  spectrum: {
    red: '#FF0000',
    yellow: '#FFFF00',
    green: '#00FF00',
    cyan: '#00FFFF',
    blue: '#0000FF',
    magenta: '#FF00FF',
  },
  white: '#FFFFFF',
  black: '#000000',
} as const;
~~~~~
~~~~~typescript.new
  spectrum: {
    red: '#FF0000',
    yellow: '#FFFF00',
    green: '#00FF00',
    cyan: '#00FFFF',
    blue: '#0000FF',
    magenta: '#FF00FF',
  },
  white: '#FFFFFF',
  black: '#000000',
} as const;

/**
 * 360° 全色相光谱线性渐变标准定义
 */
export const HUE_SPECTRUM_GRADIENT = `linear-gradient(to right, ${PALETTE.spectrum.red} 0%, ${PALETTE.spectrum.yellow} 17%, ${PALETTE.spectrum.green} 33%, ${PALETTE.spectrum.cyan} 50%, ${PALETTE.spectrum.blue} 67%, ${PALETTE.spectrum.magenta} 83%, ${PALETTE.spectrum.red} 100%)`;
~~~~~

#### Acts 2: 修复 `src/packs/color/views/ColorCanvas.tsx`

~~~~~act
patch_file
src/packs/color/views/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
import {
  type ColorHitResult,
  type ColorQuestionData,
  hsvToHex,
} from '../../../core/color/colorUtils';
import { useTranslation } from '../../../core/i18n';
~~~~~
~~~~~typescript.new
import {
  type ColorHitResult,
  type ColorQuestionData,
  hsvToHex,
} from '../../../core/color/colorUtils';
import { useTranslation } from '../../../core/i18n';
import { HUE_SPECTRUM_GRADIENT, PALETTE } from '../../../utils/theme';
~~~~~

~~~~~act
patch_file
src/packs/color/views/ColorCanvas.tsx
~~~~~
~~~~~typescript.old
  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
  const satGradient = `linear-gradient(to right, ${hsvToHex(currentH, 0, currentV)}, ${hsvToHex(currentH, 100, currentV)})`;
  const valGradient = `linear-gradient(to right, #000000, ${hsvToHex(currentH, 100, 100)})`;
~~~~~
~~~~~typescript.new
  const hueGradient = HUE_SPECTRUM_GRADIENT;
  const satGradient = `linear-gradient(to right, ${hsvToHex(currentH, 0, currentV)}, ${hsvToHex(currentH, 100, currentV)})`;
  const valGradient = `linear-gradient(to right, ${PALETTE.black}, ${hsvToHex(currentH, 100, 100)})`;
~~~~~

#### Acts 3: 修复 `src/packs/relative_color/components/AlbersInductionView.tsx`

~~~~~act
patch_file
src/packs/relative_color/components/AlbersInductionView.tsx
~~~~~
~~~~~typescript.old
import { hsvToHex } from '../../../core/color/colorUtils';
import { useTranslation } from '../../../core/i18n';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../utils/index';
~~~~~
~~~~~typescript.new
import { hsvToHex } from '../../../core/color/colorUtils';
import { useTranslation } from '../../../core/i18n';
import { HUE_SPECTRUM_GRADIENT, PALETTE } from '../../../utils/theme';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../utils/index';
~~~~~

~~~~~act
patch_file
src/packs/relative_color/components/AlbersInductionView.tsx
~~~~~
~~~~~typescript.old
  const rightSatGradient = `linear-gradient(to right, ${hsvToHex(userRightH, 0, userRightV)}, ${hsvToHex(userRightH, 100, userRightV)})`;
  const rightValGradient = `linear-gradient(to right, #000000, ${hsvToHex(userRightH, 100, 100)})`;
  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
~~~~~
~~~~~typescript.new
  const rightSatGradient = `linear-gradient(to right, ${hsvToHex(userRightH, 0, userRightV)}, ${hsvToHex(userRightH, 100, userRightV)})`;
  const rightValGradient = `linear-gradient(to right, ${PALETTE.black}, ${hsvToHex(userRightH, 100, 100)})`;
  const hueGradient = HUE_SPECTRUM_GRADIENT;
~~~~~

#### Acts 4: 运行扫描脚本验证硬编码色值清零

~~~~~act
run_command
~~~~~
~~~~~
python3 ./scripts/analyze_hardcoded_colors.py
~~~~~

### 下一步建议
1. **类型检查与测试验证**：运行 `npm run check` 确保所有 TypeScript 类型校验与打包构建正常。
2. **提交当前工作区改动**：如果在验证中未发现任何残留与回归，可以生成完整的 `[COMMIT]` 计划提交所有关于调色盘与画布硬编码的重构。
