好的，我将对所有色彩感知类卡片的展示色块进行统一样式修正，确保在深色模式与浅色模式下均保持恒定白边，避免夜间模式下暗色边框对视觉色彩感知的干扰。

## [WIP] fix: 统一各色彩卡片展示色块的恒定白边样式

### 错误分析

在 `color_hue`、`color_all`、`color_sat`、`color_val`、`rel_hue_induction`、`rel_lightness_induction` 以及 `rel_vector_shift` 视图组件中，色彩展示块的外框均使用了 `border-card dark:border-border` 或 `ring-border/60` 等跟随系统/主题动态变化的边框。
在夜间模式（Dark Mode）下，这会导致包裹色块的外框变为深灰/暗黑色边框。在色彩感知训练中，颜色与周围边界的接触会产生同时对比（Simultaneous Contrast），破坏了客观白场基准，从而对色相、明度和饱和度的感知判断产生系统性干扰。

### 用户需求

将所有颜色展示块外部包裹的边框统一定义为恒定绝对白边（`border-white`），不跟随夜间模式变为暗黑边。

### 评论

这是一个非常关键的色彩学 UX 细节修正。在颜色感官训练（Color Sense）中，维持标准白色基准轮廓（White Reference Frame）是防止视错觉和环境色诱导干扰的前提。

### 目标

1. 修复单项感知卡片：`color_hue`、`color_all`、`color_sat`、`color_val` 中的目标色块与试探色块边框样式，使用恒定白边 `border-4 border-white shadow-md ring-1 ring-black/10`。
2. 修复关系/错觉卡片：`rel_hue_induction`、`rel_lightness_induction`、`rel_vector_shift` 中的对比色块容器与矢量色块边框，使用恒定白边 `border-white`。

### 基本原理

通过将动态主题边框类名 `border-card dark:border-border` 替换为静态白边类名 `border-white`，并在绝对色卡上辅以微弱的黑环柔化阴影（`ring-1 ring-black/10`），使色块无论在白昼模式还是暗黑模式下均具备稳定可靠的无色彩白边环绕，杜绝暗黑模式下的暗边对比失真。

### 标签

#intent/fix #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/swatch-border-style #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 修复色相与综合拾色卡片的色块边框

我们将修改 `color_hue` 与 `color_all` 视图中的色块边框样式。

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
        <div
          className="w-32 h-32 rounded-2xl shadow-inner border-4 border-white shadow-md ring-1 ring-black/10 transition-all duration-300"
          style={{ backgroundColor: targetHex }}
        />
      </div>
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
~~~~~
~~~~~tsx
      <div className="flex flex-col items-center gap-2 w-full">
        <div className="flex items-center justify-center gap-4 w-full">
          <div
            className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-white shadow-md ring-1 ring-black/10 transition-all duration-300"
            style={{ backgroundColor: targetHex }}
          />
          <div
            className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-white shadow-md ring-1 ring-black/10 transition-all duration-75"
            style={{
              backgroundColor: hsvToHex(
~~~~~

#### Acts 2: 修复饱和度与明度卡片的色块边框

我们将修改 `color_sat` 与 `color_val` 视图中的色块边框样式。

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
        <div
          className="w-32 h-32 rounded-2xl shadow-inner border-4 border-white shadow-md ring-1 ring-black/10 transition-all duration-300"
          style={{ backgroundColor: targetHex }}
        />
      </div>
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
        <div
          className="w-32 h-32 rounded-2xl shadow-inner border-4 border-white shadow-md ring-1 ring-black/10 transition-all duration-300"
          style={{ backgroundColor: targetHex }}
        />
      </div>
~~~~~

#### Acts 3: 修复环境关系与矢量推移卡片的色块边框

我们将修改 `rel_hue_induction`、`rel_lightness_induction` 与 `rel_vector_shift` 视图中的展示色块边框。

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
~~~~~
~~~~~tsx
      {/* 双视口实时联动残像对比区 */}
      <DualViewportContainer
        leftTitle={t('leftBase')}
        rightTitle={t('rightPreview')}
        leftContent={
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
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
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
            style={{ backgroundColor: bgRightHex }}
          >
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
~~~~~
~~~~~tsx
      <DualViewportContainer
        leftTitle={t('leftBase')}
        rightTitle={t('rightModulate')}
        leftContent={
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
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
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
            style={{ backgroundColor: bgRightHex }}
          >
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
~~~~~
~~~~~tsx
      {/* 题干 A->B 与 C->D 矢量推移展示区 */}
      <div className="bg-muted/60 p-4 rounded-2xl border border-border/60 w-full flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexA }}
          />
          <ArrowRight className="w-4 h-4 text-indigo-400" />
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexB }}
          />
        </div>

        <div className="flex items-center justify-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexC }}
          />
          <ArrowRight className="w-4 h-4 text-indigo-400" />
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md transition-all duration-150 relative overflow-hidden"
            style={{ backgroundColor: hexSelectedD }}
          >
~~~~~

### 下一步建议

1. **界面与夜间模式验证**: 在界面中切换暗色模式（Dark Mode），验证各色彩卡片中的主色块是否稳定保持高对比度的无色彩白边，确认其在不同背景对比下的视觉表现。
2. **提交代码**: 验证无误后，可以生成提交计划将这些组件的边框修改提交至 Git。
