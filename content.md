好的，我将生成一个计划来修复 `spatial_fractal` 卡片的 Settings 透穿问题，将设置中的 `showCanvasHints` 正确传递并应用到视图组件与 `QuestionCardShell` 中，使其与另外两张卡片保持架构一致。

---

## [WIP] refactor(spatial_fractal): 透传 settings 并支持动态 showCanvasHints 控制

### 用户需求
`spatial_fractal` 卡片此前硬编码了 `showCanvasHints={true}`，且在 `index.tsx` 的 `renderCanvas` 中未解构和透穿 `settings` 参数，导致全局或模块配置无法控制该卡片的画布提示显示。需要统一其设置透穿链路。

### 评论
该修复消除了卡片间的配置隔离，使 `spatial_fractal` 能够正确响应设置面板中的画布提示开关，提升了整个系统的架构一致性与开发者体验 (DX)。

### 目标
1. 修改 `SpatialFractalView.tsx`，使其接收可选的 `showCanvasHints` 属性，并将其传递给底层 `QuestionCardShell`。
2. 修改 `src/cards/spatial_fractal/index.tsx`，在 `renderCanvas` 回调中解构 `settings` 并将其转换为布尔值传入视图。

### 基本原理
通过在 `manifest.ui.renderCanvas` 的参数中解构 `settings`，并利用 `(settings.showCanvasHints as boolean) ?? true` 提供安全的默认回退值，可以完美对接框架底层的设置管理系统，同时保留向后兼容性。

### 标签
#intent/refine #flow/ready #priority/medium #comp/engine #concept/config #scope/dx #ai/instruct #task/domain/ui #task/object/spatial-fractal-settings #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 更新 `SpatialFractalView.tsx` 支持 `showCanvasHints` 属性

~~~~~act
patch_file
src/cards/spatial_fractal/SpatialFractalView.tsx
~~~~~
~~~~~typescript.old
export interface SpatialFractalViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: number) => void;
  disabled?: boolean;
}

export function SpatialFractalView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: SpatialFractalViewProps) {
  const { t } = useCardTranslation('spatial_fractal');

  // 支持键盘数字键 1-4 直接做答
  useChoiceShortcuts({
    optionsCount: 4,
    disabled: disabled || showAnswer,
    onSelect: (idx) => onAnswer(idx),
  });

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Cuboid}
      showCanvasHints={true}
      maxWidth="max-w-4xl"
      className="gap-6"
    >
~~~~~
~~~~~typescript.new
export interface SpatialFractalViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: number) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function SpatialFractalView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: SpatialFractalViewProps) {
  const { t } = useCardTranslation('spatial_fractal');

  // 支持键盘数字键 1-4 直接做答
  useChoiceShortcuts({
    optionsCount: 4,
    disabled: disabled || showAnswer,
    onSelect: (idx) => onAnswer(idx),
  });

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Cuboid}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-4xl"
      className="gap-6"
    >
~~~~~

#### Acts 2: 更新 `src/cards/spatial_fractal/index.tsx` 透传 settings

~~~~~act
patch_file
src/cards/spatial_fractal/index.tsx
~~~~~
~~~~~typescript.old
    ui: {
      icon: Cuboid,
      renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
        <SpatialFractalView
          question={question}
          showAnswer={showAnswer}
          userAnswer={userAnswer}
          onAnswer={onAnswer}
          disabled={disabled}
        />
      ),
    },
~~~~~
~~~~~typescript.new
    ui: {
      icon: Cuboid,
      renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
        <SpatialFractalView
          question={question}
          showAnswer={showAnswer}
          userAnswer={userAnswer}
          onAnswer={onAnswer}
          disabled={disabled}
          showCanvasHints={(settings.showCanvasHints as boolean) ?? true}
        />
      ),
    },
~~~~~

### 下一步建议
建议检查其他实验性卡片（如有），确保它们的设置透穿和 `renderCanvas` 参数完整性，并在后续为 `spatial_fractal` 补充完整的数据分析（Analytics）及 `extractRecordDetails` 支持。
