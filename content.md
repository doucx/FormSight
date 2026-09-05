好的，我将提取标准的 `ColorSwatch` 组件并注册至 `@formsight/card-sdk`，随后将所有色彩感知类卡片的展示色块重构为统一调用该组件。

## [WIP] refactor: 提取标准色彩展示块组件 ColorSwatch 并重构色彩卡片

### 用户需求

提取一个统一、标准的色彩展示块（`ColorSwatch`）组件，将白边基准、尺寸预设、切半真理对比（split comparison）和动态过渡逻辑收敛为单一可复用的基元，并在各色彩卡片中完成替换。

### 评论

原有的色块实现散落在各个卡片中，包含了复杂的长类名，且容易在主题适配时产生边框色遗漏。将颜色块标准化为 `ColorSwatch` 能够从系统层面确立“恒定白场参考系（White Reference Frame）”，提升色彩学视错觉训练的准确性与工程可维护性。

### 目标

1. 新增 `src/components/common/ColorSwatch.tsx`，支持 `standard`（标准绝对白边）、`compact`（紧凑白边）、`container`（双视口大白边容器）与 `embedded`（内嵌中心块）等变体，并内置切半对比支持。
2. 在 `src/card-sdk/index.ts` 中导出 `ColorSwatch` 与 `ColorSwatchProps`。
3. 重构 `color_hue`、`color_all`、`color_sat`、`color_val`、`rel_vector_shift`、`rel_hue_induction`、`rel_lightness_induction`，全面使用 `ColorSwatch`。

### 基本原理

通过封装纯展示原子组件，收敛 CSS 样式系统：
- 标准白边 `rounded-2xl border-4 border-white shadow-md ring-1 ring-black/10 shadow-inner`
- 紧凑白边 `rounded-2xl border-2 border-white shadow-md`
- 支持传入 `compareColor` 自动渲染半半切分真理对比层，彻底消除各个卡片中重复手写的绝对定位代码。

### 标签

#intent/refactor #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/color-swatch-component #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 创建标准色彩试样块组件并接入 card-sdk

新建 `src/components/common/ColorSwatch.tsx` 并将其接入 `src/card-sdk/index.ts`。

~~~~~act
write_file
src/components/common/ColorSwatch.tsx
~~~~~
~~~~~tsx
import type { ComponentChildren, JSX } from 'preact';

export interface ColorSwatchProps {
  /** 主色彩（HEX/RGB/CSS 格式色值） */
  color: string;
  /** 揭晓答案时的对比真理色（传入时自动以下半区切半展示） */
  compareColor?: string;
  /** 边框变体：
   * - standard: 4px 恒定绝对白边 + 柔和黑环外圈 + 深度内阴影（用于单/多项绝对拾色卡片）
   * - compact: 2px 恒定绝对白边 + 阴影（用于矢量迁移等紧凑对比方块）
   * - container: 4px 恒定绝对白边大背景容器（用于双视口环境诱导对比区）
   * - embedded: 无外白边圆角块（用于嵌入在大背景内部的中心对比块）
   */
  variant?: 'standard' | 'compact' | 'container' | 'embedded';
  /** 预设尺寸等级或通过 className 覆写 */
  size?: 'sm' | 'md' | 'lg' | 'full';
  /** 动态过渡速度：realtime (75ms, 拖拽/悬停实时联动) | smooth (300ms, 题目切换) | none */
  transition?: 'realtime' | 'smooth' | 'none';
  /** 对比层浮层文字提示 */
  compareTooltip?: string;
  children?: ComponentChildren;
  className?: string;
  style?: JSX.CSSProperties;
}

export function ColorSwatch({
  color,
  compareColor,
  variant = 'standard',
  size,
  transition = 'smooth',
  compareTooltip,
  children,
  className = '',
  style,
}: ColorSwatchProps) {
  const variantStyles = {
    standard: 'rounded-2xl border-4 border-white shadow-md ring-1 ring-black/10 shadow-inner',
    compact: 'rounded-2xl border-2 border-white shadow-md',
    container: 'rounded-2xl border-4 border-white shadow-md',
    embedded: 'rounded-xl',
  }[variant];

  const sizeStyles = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    full: 'w-full h-full',
  }[size || ''] || '';

  const transitionStyles = {
    realtime: 'transition-all duration-75',
    smooth: 'transition-all duration-300',
    none: '',
  }[transition];

  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center select-none ${variantStyles} ${sizeStyles} ${transitionStyles} ${className}`}
      style={{ backgroundColor: color, ...style }}
    >
      {/* 揭晓答案切半对比区 */}
      {compareColor && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1/2 pointer-events-none"
          style={{ backgroundColor: compareColor }}
          title={compareTooltip}
        />
      )}

      {children}
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/card-sdk/index.ts
~~~~~
~~~~~typescript
export { CanvasView, type CanvasViewProps } from '../components/common/CanvasView';
export { DualViewportContainer } from '../components/common/DualViewportContainer';
export { SliderTrack, type SliderTrackProps } from '../components/common/SliderTrack';
~~~~~
~~~~~typescript
export { CanvasView, type CanvasViewProps } from '../components/common/CanvasView';
export { ColorSwatch, type ColorSwatchProps } from '../components/common/ColorSwatch';
export { DualViewportContainer } from '../components/common/DualViewportContainer';
export { SliderTrack, type SliderTrackProps } from '../components/common/SliderTrack';
~~~~~

#### Acts 2: 重构基础绝对拾色类卡片 (H, S, V, All)

将 `color_hue`、`color_sat`、`color_val` 和 `color_all` 中的原生 div 重构为 `ColorSwatch`。

~~~~~act
patch_file
src/cards/color_hue/ColorHueView.tsx
~~~~~
~~~~~tsx
import {
  type ColorHitResult,
  type ColorQuestionData,
  type ColorSenseSettings,
  HUE_SPECTRUM_GRADIENT,
  HsvTrackSlider,
  QuestionCardShell,
  hsvToHex,
  useCardTranslation,
} from '@formsight/card-sdk';
~~~~~
~~~~~tsx
import {
  type ColorHitResult,
  type ColorQuestionData,
  type ColorSenseSettings,
  ColorSwatch,
  HUE_SPECTRUM_GRADIENT,
  HsvTrackSlider,
  QuestionCardShell,
  hsvToHex,
  useCardTranslation,
} from '@formsight/card-sdk';
~~~~~

~~~~~act
patch_file
src/cards/color_hue/ColorHueView.tsx
~~~~~
~~~~~tsx
      <div className="flex flex-col items-center gap-2 w-full">
        <div
          className="w-32 h-32 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-300"
          style={{ backgroundColor: targetHex }}
        />
      </div>
~~~~~
~~~~~tsx
      <div className="flex flex-col items-center gap-2 w-full">
        <ColorSwatch color={targetHex} size="lg" />
      </div>
~~~~~

~~~~~act
patch_file
src/cards/color_sat/ColorSatView.tsx
~~~~~
~~~~~tsx
import {
  type ColorHitResult,
  type ColorQuestionData,
  type ColorSenseSettings,
  HUE_SPECTRUM_GRADIENT,
  HsvTrackSlider,
  PALETTE,
  QuestionCardShell,
  hsvToHex,
  useCardTranslation,
} from '@formsight/card-sdk';
~~~~~
~~~~~tsx
import {
  type ColorHitResult,
  type ColorQuestionData,
  type ColorSenseSettings,
  ColorSwatch,
  HUE_SPECTRUM_GRADIENT,
  HsvTrackSlider,
  PALETTE,
  QuestionCardShell,
  hsvToHex,
  useCardTranslation,
} from '@formsight/card-sdk';
~~~~~

~~~~~act
patch_file
src/cards/color_sat/ColorSatView.tsx
~~~~~
~~~~~tsx
      <div className="flex flex-col items-center gap-2 w-full">
        <div
          className="w-32 h-32 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-300"
          style={{ backgroundColor: targetHex }}
        />
      </div>
~~~~~
~~~~~tsx
      <div className="flex flex-col items-center gap-2 w-full">
        <ColorSwatch color={targetHex} size="lg" />
      </div>
~~~~~

~~~~~act
patch_file
src/cards/color_val/ColorValView.tsx
~~~~~
~~~~~tsx
import {
  type ColorHitResult,
  type ColorQuestionData,
  type ColorSenseSettings,
  HUE_SPECTRUM_GRADIENT,
  HsvTrackSlider,
  PALETTE,
  QuestionCardShell,
  hsvToHex,
  useCardTranslation,
} from '@formsight/card-sdk';
~~~~~
~~~~~tsx
import {
  type ColorHitResult,
  type ColorQuestionData,
  type ColorSenseSettings,
  ColorSwatch,
  HUE_SPECTRUM_GRADIENT,
  HsvTrackSlider,
  PALETTE,
  QuestionCardShell,
  hsvToHex,
  useCardTranslation,
} from '@formsight/card-sdk';
~~~~~

~~~~~act
patch_file
src/cards/color_val/ColorValView.tsx
~~~~~
~~~~~tsx
      <div className="flex flex-col items-center gap-2 w-full">
        <div
          className="w-32 h-32 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-300"
          style={{ backgroundColor: targetHex }}
        />
      </div>
~~~~~
~~~~~tsx
      <div className="flex flex-col items-center gap-2 w-full">
        <ColorSwatch color={targetHex} size="lg" />
      </div>
~~~~~

~~~~~act
patch_file
src/cards/color_all/ColorAllView.tsx
~~~~~
~~~~~tsx
import {
  Button,
  type ColorSenseSettings,
  HUE_SPECTRUM_GRADIENT,
  HsvTrackSlider,
  PALETTE,
  QuestionCardShell,
  hsvToHex,
  useCardTranslation,
} from '@formsight/card-sdk';
~~~~~
~~~~~tsx
import {
  Button,
  type ColorSenseSettings,
  ColorSwatch,
  HUE_SPECTRUM_GRADIENT,
  HsvTrackSlider,
  PALETTE,
  QuestionCardShell,
  hsvToHex,
  useCardTranslation,
} from '@formsight/card-sdk';
~~~~~

~~~~~act
patch_file
src/cards/color_all/ColorAllView.tsx
~~~~~
~~~~~tsx
      <div className="flex flex-col items-center gap-2 w-full">
        <div className="flex items-center justify-center gap-4 w-full">
          <div
            className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-300"
            style={{ backgroundColor: targetHex }}
          />
          <div
            className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-card dark:border-border shadow-md ring-1 ring-border/60 transition-all duration-75"
            style={{
              backgroundColor: hsvToHex(
                draggingLabel === 'H' || (enableHoverColorPreview && allHoverVals.H !== null)
                  ? (allHoverVals.H ?? userH)
                  : userH,
                draggingLabel === 'S' || (enableHoverColorPreview && allHoverVals.S !== null)
                  ? (allHoverVals.S ?? userS)
                  : userS,
                draggingLabel === 'V' || (enableHoverColorPreview && allHoverVals.V !== null)
                  ? (allHoverVals.V ?? userV)
                  : userV,
              ),
            }}
          />
        </div>
      </div>
~~~~~
~~~~~tsx
      <div className="flex flex-col items-center gap-2 w-full">
        <div className="flex items-center justify-center gap-4 w-full">
          <ColorSwatch color={targetHex} className="flex-1 h-28" transition="smooth" />
          <ColorSwatch
            color={hsvToHex(
              draggingLabel === 'H' || (enableHoverColorPreview && allHoverVals.H !== null)
                ? (allHoverVals.H ?? userH)
                : userH,
              draggingLabel === 'S' || (enableHoverColorPreview && allHoverVals.S !== null)
                ? (allHoverVals.S ?? userS)
                : userS,
              draggingLabel === 'V' || (enableHoverColorPreview && allHoverVals.V !== null)
                ? (allHoverVals.V ?? userV)
                : userV,
            )}
            className="flex-1 h-28"
            transition="realtime"
          />
        </div>
      </div>
~~~~~

#### Acts 3: 重构关系与诱导对比类卡片

重构 `rel_vector_shift`、`rel_hue_induction` 与 `rel_lightness_induction`，利用 `ColorSwatch` 的 `container`、`embedded` 变体及内置 `compareColor` 切半功能。

~~~~~act
patch_file
src/cards/rel_vector_shift/RelVectorShiftView.tsx
~~~~~
~~~~~tsx
import {
  Badge,
  Button,
  ChoiceCard,
  QuestionCardShell,
  getChoiceCardState,
  hsvToHex,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
~~~~~
~~~~~tsx
import {
  Badge,
  Button,
  ChoiceCard,
  ColorSwatch,
  QuestionCardShell,
  getChoiceCardState,
  hsvToHex,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
~~~~~

~~~~~act
patch_file
src/cards/rel_vector_shift/RelVectorShiftView.tsx
~~~~~
~~~~~tsx
      {/* 题干 A->B 与 C->D 矢量推移展示区 */}
      <div className="bg-muted/60 p-4 rounded-2xl border border-border/60 w-full flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl border-2 border-card dark:border-border shadow-md"
            style={{ backgroundColor: hexA }}
          />
          <ArrowRight className="w-4 h-4 text-indigo-400" />
          <div
            className="w-20 h-20 rounded-2xl border-2 border-card dark:border-border shadow-md"
            style={{ backgroundColor: hexB }}
          />
        </div>

        <div className="flex items-center justify-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl border-2 border-card dark:border-border shadow-md"
            style={{ backgroundColor: hexC }}
          />
          <ArrowRight className="w-4 h-4 text-indigo-400" />
          <div
            className="w-20 h-20 rounded-2xl border-2 border-card dark:border-border shadow-md transition-all duration-150 relative overflow-hidden"
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
~~~~~
~~~~~tsx
      {/* 题干 A->B 与 C->D 矢量推移展示区 */}
      <div className="bg-muted/60 p-4 rounded-2xl border border-border/60 w-full flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-4">
          <ColorSwatch color={hexA} variant="compact" size="md" />
          <ArrowRight className="w-4 h-4 text-indigo-400" />
          <ColorSwatch color={hexB} variant="compact" size="md" />
        </div>

        <div className="flex items-center justify-center gap-4">
          <ColorSwatch color={hexC} variant="compact" size="md" />
          <ArrowRight className="w-4 h-4 text-indigo-400" />
          <ColorSwatch
            color={hexSelectedD}
            compareColor={showAnswer ? hexTargetD : undefined}
            variant="compact"
            size="md"
            transition="realtime"
          />
        </div>
      </div>
~~~~~

~~~~~act
patch_file
src/cards/rel_hue_induction/RelHueInductionView.tsx
~~~~~
~~~~~tsx
import {
  Badge,
  Button,
  ChoiceCard,
  DualViewportContainer,
  QuestionCardShell,
  getChoiceCardState,
  hsvToHex,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
~~~~~
~~~~~tsx
import {
  Badge,
  Button,
  ChoiceCard,
  ColorSwatch,
  DualViewportContainer,
  QuestionCardShell,
  getChoiceCardState,
  hsvToHex,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
~~~~~

~~~~~act
patch_file
src/cards/rel_hue_induction/RelHueInductionView.tsx
~~~~~
~~~~~tsx
      {/* 双视口实时联动残像对比区 */}
      <DualViewportContainer
        leftTitle={t('leftBase')}
        rightTitle={t('rightPreview')}
        leftContent={
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-card dark:border-border shadow-md relative"
            style={{ backgroundColor: bgLeftHex }}
          >
            <div
              className="w-16 h-16 rounded-xl transition-all"
              style={{ backgroundColor: centerLeftHex }}
            />
          </div>
        }
        rightContent={
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-card dark:border-border shadow-md relative"
            style={{ backgroundColor: bgRightHex }}
          >
            <div
              className="w-16 h-16 rounded-xl transition-all relative overflow-hidden"
              style={{ backgroundColor: activeRightHex }}
            >
              {showAnswer && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1/2"
                  style={{ backgroundColor: idealRightHex }}
                  title={t('splitComparisonTooltip')}
                />
              )}
            </div>
          </div>
        }
      />
~~~~~
~~~~~tsx
      {/* 双视口实时联动残像对比区 */}
      <DualViewportContainer
        leftTitle={t('leftBase')}
        rightTitle={t('rightPreview')}
        leftContent={
          <ColorSwatch color={bgLeftHex} variant="container" className="w-full h-44">
            <ColorSwatch color={centerLeftHex} variant="embedded" size="sm" />
          </ColorSwatch>
        }
        rightContent={
          <ColorSwatch color={bgRightHex} variant="container" className="w-full h-44">
            <ColorSwatch
              color={activeRightHex}
              compareColor={showAnswer ? idealRightHex : undefined}
              compareTooltip={t('splitComparisonTooltip')}
              variant="embedded"
              size="sm"
            />
          </ColorSwatch>
        }
      />
~~~~~

~~~~~act
patch_file
src/cards/rel_lightness_induction/RelLightnessInductionView.tsx
~~~~~
~~~~~tsx
import {
  Button,
  DualViewportContainer,
  HsvTrackSlider,
  PALETTE,
  QuestionCardShell,
  type RelativeColorSettings,
  hsvToHex,
  useCardTranslation,
} from '@formsight/card-sdk';
~~~~~
~~~~~tsx
import {
  Button,
  ColorSwatch,
  DualViewportContainer,
  HsvTrackSlider,
  PALETTE,
  QuestionCardShell,
  type RelativeColorSettings,
  hsvToHex,
  useCardTranslation,
} from '@formsight/card-sdk';
~~~~~

~~~~~act
patch_file
src/cards/rel_lightness_induction/RelLightnessInductionView.tsx
~~~~~
~~~~~tsx
      <DualViewportContainer
        leftTitle={t('leftBase')}
        rightTitle={t('rightModulate')}
        leftContent={
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-card dark:border-border shadow-md relative"
            style={{ backgroundColor: bgLeftHex }}
          >
            <div
              className="w-16 h-16 rounded-xl transition-all"
              style={{ backgroundColor: centerLeftHex }}
            />
          </div>
        }
        rightContent={
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-card dark:border-border shadow-md relative"
            style={{ backgroundColor: bgRightHex }}
          >
            <div
              className="w-16 h-16 rounded-xl transition-all relative overflow-hidden"
              style={{ backgroundColor: userRightHex }}
            >
              {showAnswer && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1/2"
                  style={{ backgroundColor: idealRightHex }}
                />
              )}
            </div>
          </div>
        }
      />
~~~~~
~~~~~tsx
      <DualViewportContainer
        leftTitle={t('leftBase')}
        rightTitle={t('rightModulate')}
        leftContent={
          <ColorSwatch color={bgLeftHex} variant="container" className="w-full h-44">
            <ColorSwatch color={centerLeftHex} variant="embedded" size="sm" />
          </ColorSwatch>
        }
        rightContent={
          <ColorSwatch color={bgRightHex} variant="container" className="w-full h-44">
            <ColorSwatch
              color={userRightHex}
              compareColor={showAnswer ? idealRightHex : undefined}
              variant="embedded"
              size="sm"
            />
          </ColorSwatch>
        }
      />
~~~~~

### 下一步建议

1. **构建与类型检查**: 执行 TypeScript 类型检查与单元测试，确保各卡片引用 `ColorSwatch` 的契约完好无损。
2. **多模式对比回归**: 在深浅两种主题模式下检查色块，确认白边和揭晓对比效果均符合色彩感知规范。
3. **提交代码**: 验证无误后可提交本次重构改动。
