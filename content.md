好的，我将遵循你的原则，不添加额外淡入动画及分割细线，保持瞬时硬切分以最大化揭晓阶段的视觉冲击力与时间效率；同时在 `color_val` 中保持常规答题对比。

我将为 `color_hue`、`color_sat` 和 `color_val` 三个卡片的视图组件接入 `ColorSwatch` 的 `compareColor` 切半分区能力。

## [WIP] feat(cards): 为色相、饱和度与明度卡片添加答案揭晓切半分区对比

### 用户需求
在 `color_hue`、`color_sat`、`color_val` 卡片中接入揭晓对比态（Split Swatch），在揭晓答案时：
1. 上半区保持目标真理原色。
2. 下半区直接切分展示用户作答估计值所合成的实际色彩。
3. 不添加柔和渐变动效，不添加中缝细线，直接贴合硬切分。
4. `color_val` 卡片只采用常规答题对比。

### 评论
在单维度的连续色彩练习中，用户仅通过滑块上的标记线很难建立直观的色彩感知差异。引入 1:1 无接缝上下切分色块对比，能让用户在揭晓瞬间清晰感知到自身估计偏差对应的视觉色差。命中时上下融为一体，能提供强烈的正向心理反馈。

### 目标
1. 修改 `ColorHueView.tsx`，在答案揭晓时将用户的色相作答值与固定的目标 $S$、$V$ 合成为十六进制色，传递给 `ColorSwatch` 的 `compareColor`。
2. 修改 `ColorSatView.tsx`，在答案揭晓时将用户的饱和度作答值与固定的目标 $H$、$V$ 合成为十六进制色传递给 `compareColor`。
3. 修改 `ColorValView.tsx`，在答案揭晓时将用户的明度作答值与固定的目标 $H$、$S$ 合成为十六进制色传递给 `compareColor`。

### 基本原理
`ColorSwatch` 已经原生具备 `compareColor` 的绝对定位下半区切分容器，且未传递该属性时不产生任何布局冗余。在各个卡片中，用户作答结果 `userAnswer.userValue` 保存了单项调节维度的提交值。通过调用已有的 `hsvToHex` 工具函数将其与目标色彩其余固定两维组合，即可生成精确的用户作答色彩 Hex，并在 `showAnswer` 为 `true` 时由 `compareColor` 无缝接管下半区展示。

### 标签
#intent/build #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/color-cards-split-swatch #task/action/integration #task/state/begin #task/status/active

---

### Script

#### Acts 1: 在 `ColorHueView` 中接入用户估算色的切半对比

为色相卡片计算用户作答色，并在揭晓答案时传入 `ColorSwatch`。

~~~~~act
patch_file
src/cards/color_hue/ColorHueView.tsx
~~~~~
~~~~~tsx
  const hitMargin = settings.sliderHitMargin ?? 12;
  const showToleranceBand = settings.showToleranceBand ?? true;
  const showCanvasHints = (settings.showCanvasHints as boolean) ?? true;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={RotateCw}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-md"
      className="gap-6"
    >
      <div className="flex flex-col items-center gap-2 w-full">
        <ColorSwatch color={targetHex} size="lg" />
      </div>
~~~~~
~~~~~tsx
  const hitMargin = settings.sliderHitMargin ?? 12;
  const showToleranceBand = settings.showToleranceBand ?? true;
  const showCanvasHints = (settings.showCanvasHints as boolean) ?? true;

  const userHex =
    userAnswer !== null ? hsvToHex(userAnswer.userValue, targetS, targetV) : undefined;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={RotateCw}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-md"
      className="gap-6"
    >
      <div className="flex flex-col items-center gap-2 w-full">
        <ColorSwatch
          color={targetHex}
          compareColor={showAnswer ? userHex : undefined}
          size="lg"
        />
      </div>
~~~~~

#### Acts 2: 在 `ColorSatView` 中接入用户估算色的切半对比

为饱和度卡片计算用户作答色，并在揭晓答案时传入 `ColorSwatch`。

~~~~~act
patch_file
src/cards/color_sat/ColorSatView.tsx
~~~~~
~~~~~tsx
  const hueGradient = HUE_SPECTRUM_GRADIENT;
  const satGradient = `linear-gradient(to right, ${hsvToHex(targetH, 0, targetV)}, ${hsvToHex(targetH, 100, targetV)})`;
  const valGradient = `linear-gradient(to right, ${PALETTE.black}, ${hsvToHex(targetH, 100, 100)})`;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Droplet}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-md"
      className="gap-6"
    >
      <div className="flex flex-col items-center gap-2 w-full">
        <ColorSwatch color={targetHex} size="lg" />
      </div>
~~~~~
~~~~~tsx
  const hueGradient = HUE_SPECTRUM_GRADIENT;
  const satGradient = `linear-gradient(to right, ${hsvToHex(targetH, 0, targetV)}, ${hsvToHex(targetH, 100, targetV)})`;
  const valGradient = `linear-gradient(to right, ${PALETTE.black}, ${hsvToHex(targetH, 100, 100)})`;

  const userHex =
    userAnswer !== null ? hsvToHex(targetH, userAnswer.userValue, targetV) : undefined;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Droplet}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-md"
      className="gap-6"
    >
      <div className="flex flex-col items-center gap-2 w-full">
        <ColorSwatch
          color={targetHex}
          compareColor={showAnswer ? userHex : undefined}
          size="lg"
        />
      </div>
~~~~~

#### Acts 3: 在 `ColorValView` 中接入用户估算色的常规对比

为明度卡片计算用户作答色，并在揭晓答案时传入 `ColorSwatch`。

~~~~~act
patch_file
src/cards/color_val/ColorValView.tsx
~~~~~
~~~~~tsx
  const hueGradient = HUE_SPECTRUM_GRADIENT;
  const valGradient = `linear-gradient(to right, ${PALETTE.black}, ${hsvToHex(targetH, 100, 100)})`;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Sun}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-md"
      className="gap-6"
    >
      <div className="flex flex-col items-center gap-2 w-full">
        <ColorSwatch color={targetHex} size="lg" />
      </div>
~~~~~
~~~~~tsx
  const hueGradient = HUE_SPECTRUM_GRADIENT;
  const valGradient = `linear-gradient(to right, ${PALETTE.black}, ${hsvToHex(targetH, 100, 100)})`;

  const userHex =
    userAnswer !== null ? hsvToHex(targetH, targetS, userAnswer.userValue) : undefined;

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Sun}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-md"
      className="gap-6"
    >
      <div className="flex flex-col items-center gap-2 w-full">
        <ColorSwatch
          color={targetHex}
          compareColor={showAnswer ? userHex : undefined}
          size="lg"
        />
      </div>
~~~~~

### 下一步建议

1. **测试验证**：在本地开发环境分别打开色相、饱和度、明度卡片完成一题作答，确认揭晓阶段色块下半区立即精准显示用户作答色，且命中时上下无缝融合。
2. **提交变更**：若视觉与交互效果符合预期，通知我生成对应的 `[COMMIT]` 计划以归档此次变更。
