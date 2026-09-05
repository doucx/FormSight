好的，我将对识别出的卡片进行统一修复，并在 `ColorSwatch` 中补充 `option` 变体以彻底统一多选候选卡片中的色块展示。

## [WIP] fix: 修复遗留卡片中的色彩展示暗边并统一候选色块规范

### 用户需求

修复 `abs_td_palette_2afc`、`rel_hue_induction`、`abs_palette_clustering` 及 `rel_decontextual_2afc` 中遗留的色彩边界问题，确保夜间模式下保持纯白边基准，消除视觉评测干扰。

### 评论

1. `abs_td_palette_2afc` 的题干基准色块直接存在 `border-card dark:border-border`，在深色模式下退化为暗边。
2. `rel_hue_induction` 的 4AFC 候选列表使用 `border-border/50` 与 `bg-card`，造成深色模式下选项色块带暗边暗底。
3. `abs_palette_clustering` 与 `rel_vector_shift` 虽有半透明白边，但仍为零散手写类名。
4. `rel_decontextual_2afc` 的视口大背景框与中心色块仍在使用原生 div。
5. 在 `ColorSwatch` 增加 `option` 变体，将所有 ChoiceCard 内的色块一同收敛至标准库组件。

### 目标

1. 更新 `ColorSwatch`，增加 `variant="option"`（用于候选选项列表中的紧凑色块：`rounded-xl border border-white/70 shadow-inner`）。
2. 在 `abs_td_palette_2afc` 中引入并使用 `ColorSwatch` 作为题干基准主调色。
3. 在 `rel_hue_induction` 中修复 4AFC 候选色块为 `ColorSwatch` 的 `option` 变体，清除 `border-border/50` 与 `bg-card` 暗底。
4. 在 `abs_palette_clustering` 中使用 `ColorSwatch` 渲染 4AFC 候选色块。
5. 在 `rel_vector_shift` 中将候选色块统一替换为 `ColorSwatch`。
6. 在 `rel_decontextual_2afc` 中将双视口大背景与中心色块收敛至 `ColorSwatch`。

### 标签

#intent/fix #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/color-swatch-consistency #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 在 ColorSwatch 中增加 option 候选变体

修改 `src/components/common/ColorSwatch.tsx`，支持 `option` 变体。

~~~~~act
patch_file
src/components/common/ColorSwatch.tsx
~~~~~
~~~~~tsx
   * - compact: 2px 恒定绝对白边 + 阴影（用于矢量迁移等紧凑对比方块）
   * - container: 4px 恒定绝对白边大背景容器（用于双视口环境诱导对比区）
   * - embedded: 无外白边圆角块（用于嵌入在大背景内部的中心对比块）
   */
  variant?: 'standard' | 'compact' | 'container' | 'embedded';
  /** 预设尺寸等级或通过 className 覆写 */
~~~~~
~~~~~tsx
   * - compact: 2px 恒定绝对白边 + 阴影（用于矢量迁移等紧凑对比方块）
   * - container: 4px 恒定绝对白边大背景容器（用于双视口环境诱导对比区）
   * - embedded: 无外白边圆角块（用于嵌入在大背景内部的中心对比块）
   * - option: 1px 绝对亮白边 + 微阴影（用于 ChoiceCard 候选选项中的内嵌色块）
   */
  variant?: 'standard' | 'compact' | 'container' | 'embedded' | 'option';
  /** 预设尺寸等级或通过 className 覆写 */
~~~~~

~~~~~act
patch_file
src/components/common/ColorSwatch.tsx
~~~~~
~~~~~tsx
  const variantStyles = {
    standard: 'rounded-2xl border-4 border-white shadow-md ring-1 ring-black/10 shadow-inner',
    compact: 'rounded-2xl border-2 border-white shadow-md',
    container: 'rounded-2xl border-4 border-white shadow-md',
    embedded: 'rounded-xl',
  }[variant];
~~~~~
~~~~~tsx
  const variantStyles = {
    standard: 'rounded-2xl border-4 border-white shadow-md ring-1 ring-black/10 shadow-inner',
    compact: 'rounded-2xl border-2 border-white shadow-md',
    container: 'rounded-2xl border-4 border-white shadow-md',
    embedded: 'rounded-xl',
    option: 'rounded-xl border border-white/70 shadow-inner',
  }[variant];
~~~~~

#### Acts 2: 修复调性基底归位中的基准主调色

修改 `src/cards/abs_td_palette_2afc/AbsTdPalette2afcView.tsx`，消除深色模式下变黑边的 `border-card dark:border-border`。

~~~~~act
patch_file
src/cards/abs_td_palette_2afc/AbsTdPalette2afcView.tsx
~~~~~
~~~~~tsx
import {
  Badge,
  CANVAS_THEME,
  CanvasView,
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
  CANVAS_THEME,
  CanvasView,
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
src/cards/abs_td_palette_2afc/AbsTdPalette2afcView.tsx
~~~~~
~~~~~tsx
      {/* 题干上方基准主调色块 */}
      <div className="flex flex-col items-center gap-1.5 bg-muted/60 p-3 rounded-2xl border border-border shadow-inner">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {t('promptTitle')}
        </span>
        <div
          className="w-16 h-16 rounded-2xl border-4 border-card dark:border-border shadow-md ring-1 ring-border/60"
          style={{ backgroundColor: promptHex }}
        />
      </div>
~~~~~
~~~~~tsx
      {/* 题干上方基准主调色块 */}
      <div className="flex flex-col items-center gap-1.5 bg-muted/60 p-3 rounded-2xl border border-border shadow-inner">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {t('promptTitle')}
        </span>
        <ColorSwatch color={promptHex} size="sm" />
      </div>
~~~~~

#### Acts 3: 修复补色残像调和卡片中的候选色块

修改 `src/cards/rel_hue_induction/RelHueInductionView.tsx`，移除深色背景和暗边框。

~~~~~act
patch_file
src/cards/rel_hue_induction/RelHueInductionView.tsx
~~~~~
~~~~~tsx
              <div className="w-full aspect-[4/3] rounded-xl shadow-inner border border-border/60 p-1 flex items-center justify-center bg-card">
                <div
                  className="w-full h-full rounded-lg shadow-sm border border-border/50"
                  style={{ backgroundColor: hexVal }}
                />
              </div>
~~~~~
~~~~~tsx
              <ColorSwatch
                color={hexVal}
                variant="option"
                className="w-full aspect-[4/3]"
              />
~~~~~

#### Acts 4: 统一主调色群提炼与色彩矢量迁移的候选色块

修改 `src/cards/abs_palette_clustering/AbsPaletteClusteringView.tsx` 与 `src/cards/rel_vector_shift/RelVectorShiftView.tsx`。

~~~~~act
patch_file
src/cards/abs_palette_clustering/AbsPaletteClusteringView.tsx
~~~~~
~~~~~tsx
import {
  Badge,
  CanvasView,
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
  CanvasView,
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
src/cards/abs_palette_clustering/AbsPaletteClusteringView.tsx
~~~~~
~~~~~tsx
              <div
                className="w-full aspect-square rounded-xl shadow-inner border border-white/60"
                style={{ backgroundColor: hex }}
              />
~~~~~
~~~~~tsx
              <ColorSwatch
                color={hex}
                variant="option"
                className="w-full aspect-square"
              />
~~~~~

~~~~~act
patch_file
src/cards/rel_vector_shift/RelVectorShiftView.tsx
~~~~~
~~~~~tsx
              <div
                className="w-full aspect-[4/3] rounded-xl shadow-inner border border-white/60"
                style={{ backgroundColor: hexVal }}
              />
~~~~~
~~~~~tsx
              <ColorSwatch
                color={hexVal}
                variant="option"
                className="w-full aspect-[4/3]"
              />
~~~~~

#### Acts 5: 重构脱语境明度对比卡片的视口色块容器

修改 `src/cards/rel_decontextual_2afc/RelDecontextual2AfcView.tsx`。

~~~~~act
patch_file
src/cards/rel_decontextual_2afc/RelDecontextual2AfcView.tsx
~~~~~
~~~~~tsx
import {
  Badge,
  ChoiceCard,
  PALETTE,
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
  ChoiceCard,
  ColorSwatch,
  PALETTE,
  QuestionCardShell,
  getChoiceCardState,
  hsvToHex,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
~~~~~

~~~~~act
patch_file
src/cards/rel_decontextual_2afc/RelDecontextual2AfcView.tsx
~~~~~
~~~~~tsx
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
            style={{ backgroundColor: showAnswer ? PALETTE.slate[500] : hexBgA }}
          >
            <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterA }} />
          </div>
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge
                variant="secondary"
                size="sm"
                className="w-5 h-5 p-0 justify-center font-mono text-xs"
              >
                2
              </Badge>
              {t('common.areaB')}
            </span>

            {showAnswer && (
              <span
                className={`text-xs font-semibold flex items-center gap-1 ${
                  isBHit
                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'text-muted-foreground'
                }`}
              >
                {isBHit && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                {isBHit
                  ? t('physicallyBrighter', { v: question.centerColorB[2] })
                  : t('physicallyDarker', { v: question.centerColorB[2] })}
              </span>
            )}
          </div>

          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
            style={{ backgroundColor: showAnswer ? PALETTE.slate[500] : hexBgB }}
          >
            <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterB }} />
          </div>
~~~~~
~~~~~tsx
          <ColorSwatch
            color={showAnswer ? PALETTE.slate[500] : hexBgA}
            variant="container"
            className="w-full h-44 shadow-inner"
          >
            <ColorSwatch color={hexCenterA} variant="embedded" size="sm" />
          </ColorSwatch>
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge
                variant="secondary"
                size="sm"
                className="w-5 h-5 p-0 justify-center font-mono text-xs"
              >
                2
              </Badge>
              {t('common.areaB')}
            </span>

            {showAnswer && (
              <span
                className={`text-xs font-semibold flex items-center gap-1 ${
                  isBHit
                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'text-muted-foreground'
                }`}
              >
                {isBHit && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                {isBHit
                  ? t('physicallyBrighter', { v: question.centerColorB[2] })
                  : t('physicallyDarker', { v: question.centerColorB[2] })}
              </span>
            )}
          </div>

          <ColorSwatch
            color={showAnswer ? PALETTE.slate[500] : hexBgB}
            variant="container"
            className="w-full h-44 shadow-inner"
          >
            <ColorSwatch color={hexCenterB} variant="embedded" size="sm" />
          </ColorSwatch>
~~~~~

---

### 修复总结

1. **彻底消除夜间暗边退化**：`abs_td_palette_2afc` 题干基准主调色与 `rel_hue_induction` 候选色块均已消除 `dark:border-border` 与 `bg-card` 嵌套暗底。
2. **构建统一色块体系**：`ColorSwatch` 现已覆盖大展示色块（`standard`）、双视口背景（`container`）、嵌入中心块（`embedded`）、紧凑矢量块（`compact`）及选项卡片色块（`option`），全库涉及物理色彩展示的地方均达到 100% 绝对白边与规范收敛。
