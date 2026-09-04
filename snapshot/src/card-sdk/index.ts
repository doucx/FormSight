/**
 * ============================================================================
 * 🚀 FormSight Card Developer SDK
 * ============================================================================
 * 所有独立卡片 (src/cards/*) 应通过本 SDK 引入宿主能力，严禁使用脆弱的深层相对路径穿透访问宿主内部实现。
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
// 5. 国际化与契约规范 (I18n & Card Contracts)
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
} from '../core/contracts';

// ----------------------------------------------------------------------------
// 6. 主题 Token、样式与时间工具 (Theme, Styling & Formatting)
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
// 7. 共享数据类型与设置模型 (Data Types & Storage Models)
// ----------------------------------------------------------------------------
export type { Point, Size, Rect, HSVTuple, OKLabTuple } from '../types';
export type {
  BaseModuleSettings,
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

// ----------------------------------------------------------------------------
// 8. 基础通用交互组件 (UI Primitives & Common Views)
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
export { Button, type ButtonProps } from '../components/ui/button';
export { Badge, type BadgeProps } from '../components/ui/badge';
export { SettingToggleItem } from '../components/settings/common/SettingToggleItem';
export { SliderMarginGroup } from '../components/settings/common/SliderMarginGroup';

// ----------------------------------------------------------------------------
// 9. 废弃标记的过渡视图包装器 (Deprecated Standard Views for Graceful Migration)
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