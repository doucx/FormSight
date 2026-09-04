通过对所有卡片的源码扫描，发现各卡片中专属的**认知分析图表（Compass/Heatmap/HueRing/HueBias）**、**Callout 诊断提示框**、**触控放大镜（`usePointLoupe` 与 `LOUPE_DIAMETER`）** 以及 **特定卡片设置类型与 Trial 记录类型** 尚未包含在 SDK 中。

我们将在 `@formsight/card-sdk` 中全面补齐这些导出，确保卡片层在后续迁移时无需直接 import 宿主内部路径。

## [WIP] feat: 扩展 Card SDK 导出以支持卡片分析图表、诊断组件与触控放大镜

### 用户需求
在 `src/card-sdk/index.ts` 中补齐卡片（Cards）开发与自定义分析视图（Analytics）所需的所有基础设施导出，包括：
1. **触控与精细点阵定位**：`usePointLoupe`、`LOUPE_DIAMETER` 及相关类型。
2. **诊断与分析图表**：`Callout` 诊断容器，以及扇区雷达图（`renderCompassCanvas`）、热力散点图（`renderHeatmapCanvas`）、色相环（`renderHueRingCanvas`）、色偏趋势图（`renderHueBiasChartCanvas`、`calcSignedHueBias`）等。
3. **设置模型与持久化记录类型**：`StarSettings`、`ColorSenseSettings`、`RelativeColorSettings`、`NegativeSpaceSettings` 以及 `UnifiedTrialRecord`。

### 评论
卡片不仅包含答题界面（View），还包含卡片专属的认知分析页面（`analytics.tsx`）与复杂定位交互（如透视三维点阵与负形切点）。将图表绘制算法与提示组件一并收敛入 Card SDK，能使卡片彻底成为自包含、低耦合的插件单元。

### 目标
1. 完整重构 `src/card-sdk/index.ts`。
2. 导出分析图表、触控放大镜 Hook、Callout 诊断组件及数据库记录类型。
3. 确保导出命名与宿主模块完全吻合，支持强类型推断。

### 基本原理
卡片分析插件（`CardAnalyticsPlugin`）需要直接绘制 Canvas 图表与挂载诊断面板，通过将图表绘制核心能力提升至 SDK 层，满足卡片内部 `analytics.tsx` 的调用需求，建立真正的领域防腐层（Domain Facade）。

### 标签
#intent/build #flow/ready #priority/high #comp/interfaces #concept/ui #scope/dx #scope/core #ai/instruct #task/domain/architecture #task/object/card-sdk #task/action/setup #task/state/continue #task/status/active

---

### Script

#### Acts 1: 扩充 `src/card-sdk/index.ts` 完整导出集

我们将重写 `src/card-sdk/index.ts`，提供包含分析图表、触控放大镜和数据诊断模型的完整 SDK 接口。

~~~~~act
write_file
src/card-sdk/index.ts
~~~~~
~~~~~typescript
/**
 * ============================================================================
 * 🚀 FormSight Card Developer SDK
 * ============================================================================
 * 所有独立卡片 (src/cards/*) 应通过本 SDK 引入宿主能力，严禁使用深层相对路径穿透访问宿主内部实现。
 */

// ----------------------------------------------------------------------------
// 1. 核心数学算法与噪声 (Math & Procedural Noise)
// ----------------------------------------------------------------------------
export { expDecayInterpolate, createShuffledChoices } from '../core/math/mathUtils';
export {
  createNoise2D,
  fbm2D,
  calculateOtsuThreshold,
  type Noise2DFunction,
} from '../core/math/noiseUtils';

// ----------------------------------------------------------------------------
// 2. 空间几何与离散网格计算 (Geometry & Point Grid)
// ----------------------------------------------------------------------------
export {
  calcPointDistance,
  findNearestPointInGrid,
  evaluatePointGridHit,
  type NearestGridPointResult,
  type PointHitDetectionResult,
} from '../core/geometry/pointGrid';

// ----------------------------------------------------------------------------
// 3. 色彩感知与 OKLab 均匀空间 (Color Models & OKLab/OKLCH)
// ----------------------------------------------------------------------------
export {
  hsvToHex,
  generateColorQuestion,
  checkColorHit,
  getToleranceSpan,
  type ColorMode,
  type ColorQuestionData,
  type ColorHitResult,
  type ToleranceSpan,
  type ColorQuestionGenerateOptions,
} from '../core/color/colorUtils';
export {
  hsvToOkLab,
  calcDeltaEOk,
  getOkChroma,
  getTargetDeltaEForLevel,
  okLabToHsv,
  isOkLabInGamut,
  hasGamutMargin,
  getDistractorDistanceForLevel,
  generateTetrahedralDistractors,
} from '../core/color/oklchUtils';

// ----------------------------------------------------------------------------
// 4. Canvas 高清渲染与图元工具 (Canvas HiDPI & Primitives)
// ----------------------------------------------------------------------------
export {
  setupHiDpiCanvas,
  setup2DCanvas,
  initSquareHiDpiCanvas,
  type InitSquareCanvasResult,
} from '../core/canvas/hidpi';
export {
  renderInteractivePointGrid,
  getGridMinSpacing,
  getDynamicDotRadius,
  getDynamicCrosshairMetrics,
  drawDot,
  type RenderInteractivePointGridOptions,
} from '../core/canvas/drawPointGrid';
export { drawPolygonCanvas, type DrawPolygonOptions } from '../core/canvas/drawPolygon';

// ----------------------------------------------------------------------------
// 5. 认知分析图表渲染器 (Analytics Chart Renderers)
// ----------------------------------------------------------------------------
export {
  renderCompassCanvas,
  type SectorStat,
} from '../core/canvas/charts/drawCompass';
export { renderHeatmapCanvas } from '../core/canvas/charts/drawHeatmap';
export { renderHueRingCanvas } from '../core/canvas/charts/drawColorRing';
export {
  calcSignedHueBias,
  renderHueBiasChartCanvas,
} from '../core/canvas/charts/drawHueBiasChart';
export {
  renderTrendChartCanvas,
  renderSessionTrendChartCanvas,
} from '../core/canvas/charts/drawTrendChart';

// ----------------------------------------------------------------------------
// 6. 交互 Hook 与触控手势 (Interactive Hooks & Point Loupe)
// ----------------------------------------------------------------------------
export {
  usePointLoupe,
  LOUPE_DIAMETER,
  type UsePointLoupeOptions,
} from '../hooks/usePointLoupe';
export {
  useTrackPointer,
  type UseTrackPointerOptions,
} from '../hooks/useTrackPointer';

// ----------------------------------------------------------------------------
// 7. 国际化与契约规范 (I18n & Card Contracts)
// ----------------------------------------------------------------------------
export {
  useCardTranslation,
  createScopedTranslator,
  getCardTitle,
  getCardDesc,
  type ScopedTranslator,
} from '../core/i18n';
export type {
  CardManifest,
  CardCanvasProps,
  CardAnalyticsView,
} from '../core/cardContract';
export {
  calculateBasicOverallStats,
  type BaseInteractiveCardProps,
  type CardAnalyticsPlugin,
} from '../core/contracts';

// ----------------------------------------------------------------------------
// 8. 主题 Token、样式与时间工具 (Theme, Styling & Formatting)
// ----------------------------------------------------------------------------
export {
  CANVAS_THEME,
  PALETTE,
  HUE_SPECTRUM_GRADIENT,
  hexToRgba,
  getAccuracyColor,
  getAccuracyFillColor,
  getAccuracyBadgeClass,
  isDarkMode,
  getCurrentResolvedTheme,
  getCanvasTheme,
  type CanvasThemeTokens,
} from '../utils/theme';
export { cn } from '../utils/cn';
export { formatSecondsToTimer } from '../utils/time';

// ----------------------------------------------------------------------------
// 9. 共享数据类型与存储模型 (Data Types & Storage Models)
// ----------------------------------------------------------------------------
export type { Point, Size, Rect, HSVTuple, OKLabTuple } from '../types';
export type {
  BaseModuleSettings,
  StarSettings,
  ColorSenseSettings,
  RelativeColorSettings,
  NegativeSpaceSettings,
  AbstractionSettings,
  StepGranularity,
  AdaptiveMode,
  TargetingMode,
} from '../storage/settings';
export type {
  CardDefinition,
  CardTags,
  VisualDomainTag,
  CognitivePathTag,
  MentalChallengeTag,
  InteractionTag,
  CardStatusTag,
} from '../types/card';
export type {
  UnifiedTrialRecord,
  UnifiedSessionData,
  UnifiedProfileData,
  DailySummaryData,
} from '../storage/db/schema';

// ----------------------------------------------------------------------------
// 10. 通用 UI 组件 (UI Primitives & Diagnostic Components)
// ----------------------------------------------------------------------------
export { CanvasView, type CanvasViewProps } from '../components/common/CanvasView';
export { DualViewportContainer } from '../components/common/DualViewportContainer';
export { PointClickCanvas, type PointClickCanvasProps } from '../components/common/PointClickCanvas';
export { HsvTrackSlider, type HsvTrackSliderProps } from '../components/common/HsvTrackSlider';
export { QuestionCardShell } from '../components/common/QuestionCardShell';
export {
  Choice2AfcContainer,
  type Choice2AfcOption,
} from '../components/common/Choice2AfcContainer';
export {
  ChoiceNafcContainer,
  type ChoiceNafcOption,
} from '../components/common/ChoiceNafcContainer';
export {
  ChoiceCard,
  getChoiceCardState,
  type ChoiceCardState,
  type ChoiceCardProps,
} from '../components/ui/choice-card';
export { Callout, type CalloutProps, calloutVariants } from '../components/ui/callout';
export { Button, type ButtonProps } from '../components/ui/button';
export { Badge, type BadgeProps } from '../components/ui/badge';
export { SettingToggleItem } from '../components/settings/common/SettingToggleItem';
export { SliderMarginGroup } from '../components/settings/common/SliderMarginGroup';

// ----------------------------------------------------------------------------
// 11. 废弃标记的过渡视图包装器 (Deprecated Standard Views for Graceful Migration)
// ----------------------------------------------------------------------------
/** @deprecated 建议优先使用组合排版与原子 Hook，后续将移除此包装器 */
export {
  StandardSliderView,
  type StandardSliderViewProps,
} from '../components/common/StandardSliderView';

/** @deprecated 建议优先使用组合排版与原子 Hook，后续将移除此包装器 */
export {
  Standard2AfcView,
  type Standard2AfcViewProps,
} from '../components/common/Standard2AfcView';

/** @deprecated 建议优先使用组合排版与原子 Hook，后续将移除此包装器 */
export {
  StandardNafcView,
  type StandardNafcViewProps,
} from '../components/common/StandardNafcView';
~~~~~

### 下一步建议
SDK 已具备支持卡片生成器、交互 View 以及分析诊断页面所需的全部导出。
下一步可以开始执行：
- **全局收敛相对路径**：批量将 `src/cards/` 目录下全部卡片源文件（包括 `index.tsx`、`*View.tsx`、`generator.ts`、`analytics.tsx` 等）中的宿主跨级相对导入替换为从 `@formsight/card-sdk` 导入。
