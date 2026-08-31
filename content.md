我们将对 `src/packs/` 之外的所有核心绘制、图表分析与通用画布组件进行统一重构，建立系统级 `CANVAS_THEME` Token 体系，彻底消除 Canvas 中的裸色值硬编码。

## [WIP] refactor(theme): 统一核心画布与图表渲染的 Design System 色板 Tokens

### 用户需求
对 `src/packs` 之外的所有图表渲染、Canvas 绘图与通用组件中的硬编码色值进行重构，接入统一的 Design System 主题 Tokens (`CANVAS_THEME`)，确保视觉风格与 Tailwind 色板 100% 对齐。

### 评论
这是一个关键的基础设施与设计系统重构任务。Canvas 2D 绘图天然脱离 CSS 类名控制，通过建立类型安全的集中式色彩常数与透明度转换工具，不仅消除了跨组件的色值混乱（如多种绿色、红色并存），还为后续全站暗黑模式或主题切换奠定了稳固基础。

### 目标
1. 在 `src/utils/theme.ts` 中建立标准 `PALETTE`、`CANVAS_THEME` 语义化色彩体系及 `hexToRgba`、`getAccuracyFillColor` 工具函数，并保持向后兼容。
2. 重构 `src/core/canvas/` 下的通用绘图函数 (`hidpi.ts`, `drawPointGrid.ts`, `drawPolygon.ts`)。
3. 重构 `src/core/analytics/` 下的图表诊断 (`difficultyPlateauView.tsx`, `speedAccuracyView.tsx`)。
4. 重构 `src/utils/canvas/` 下的全部统计与分析图表 (`drawColorRing.ts`, `drawCompass.ts`, `drawHeatmap.ts`, `drawHueBiasChart.ts`, `drawTrendChart.ts`)。
5. 重构通用交互组件 `src/components/common/PointClickCanvas.tsx`。

### 基本原理
- 在 `theme.ts` 中定义与 Tailwind CSS 完全一致的色阶（Slate, Indigo, Emerald, Amber, Rose 等），并导出面向 Canvas 的语义化命名空间 `CANVAS_THEME`（包含 `bg`, `axis`, `text`, `status`, `pointGrid` 等维度）。
- 通过纯函数 `hexToRgba(hex, alpha)` 动态生成 RGBA 渐变和半透明遮罩，取代随意散落的内联 `rgba(...)` 字符串。
- 将全部非 pack 目录下的 Canvas 颜色赋值（`ctx.fillStyle`, `ctx.strokeStyle`, `gradient.addColorStop` 等）替换为 `CANVAS_THEME` 的对应语义属性。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #concept/ui #scope/core #scope/ux #ai/delegate #task/domain/ui #task/object/canvas-theme-tokens #task/action/refactor #task/state/begin #task/status/active

---

### Script

#### Acts 1: 扩展 `src/utils/theme.ts` 色彩系统与工具函数

~~~~~act
write_file
src/utils/theme.ts
~~~~~
~~~~~typescript
/**
 * 1. 基础调色盘（与 Tailwind 标准色彩空间 100% 对齐）
 */
export const PALETTE = {
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
  indigo: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
  },
  emerald: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#166534',
  },
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
  },
  rose: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    400: '#FB7185',
    500: '#F43F5E',
    600: '#E11D48',
    700: '#BE123C',
    800: '#9F1239',
  },
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
 * 2. Canvas 语义化 Token (Semantic Canvas Theme Tokens)
 */
export const CANVAS_THEME = {
  // 画布背景
  bg: {
    primary: PALETTE.white,
    secondary: PALETTE.slate[50],
    subtle: PALETTE.slate[100],
  },
  // 轴线、刻度、参考网格
  axis: {
    line: PALETTE.slate[200],
    grid: PALETTE.slate[300],
    highlight: PALETTE.slate[700],
  },
  // 图表文字
  text: {
    primary: PALETTE.slate[800],
    secondary: PALETTE.slate[600],
    muted: PALETTE.slate[400],
    dark: PALETTE.slate[900],
    code: PALETTE.slate[600],
  },
  // 状态与指示色
  status: {
    hit: PALETTE.emerald[500],
    hitDark: PALETTE.emerald[700],
    miss: PALETTE.rose[500],
    missDark: PALETTE.rose[700],
    warning: PALETTE.amber[500],
    accent: PALETTE.indigo[600],
    accentHover: PALETTE.indigo[500],
    accentDark: PALETTE.indigo[800],
  },
  // 形状与多边形
  shape: {
    fill: PALETTE.slate[900],
    stroke: PALETTE.slate[800],
    highlight: PALETTE.emerald[500],
  },
  // 点阵专用
  pointGrid: {
    dotDefault: PALETTE.slate[400],
    dotAnchor: PALETTE.black,
    dotHover: PALETTE.indigo[600],
    dotHit: PALETTE.emerald[500],
    dotMiss: PALETTE.rose[500],
    crosshairTarget: PALETTE.emerald[500],
  },
} as const;

/**
 * 3. 颜色工具函数：Hex 转指定透明度的 RGBA 字符串
 */
export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  let r = 0;
  let g = 0;
  let b = 0;

  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6 || cleanHex.length === 8) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const ACCURACY_COLORS = {
  high: CANVAS_THEME.status.hit,
  medium: CANVAS_THEME.status.warning,
  low: CANVAS_THEME.status.miss,
} as const;

/**
 * 获取正确率对应的 Canvas 十六进制主题色
 */
export function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 80) return ACCURACY_COLORS.high;
  if (accuracy >= 60) return ACCURACY_COLORS.medium;
  return ACCURACY_COLORS.low;
}

/**
 * 获取正确率对应的半透明背景色
 */
export function getAccuracyFillColor(accuracy: number, alpha = 0.35): string {
  if (accuracy >= 80) return hexToRgba(CANVAS_THEME.status.hit, alpha);
  if (accuracy >= 60) return hexToRgba(CANVAS_THEME.status.warning, alpha);
  return hexToRgba(CANVAS_THEME.status.miss, alpha);
}

/**
 * 获取正确率对应的 Tailwind 徽章样式类名
 */
export function getAccuracyBadgeClass(accuracy: number, total = 1): string {
  if (total === 0) return 'bg-slate-100 text-slate-400';
  if (accuracy >= 80) return 'bg-emerald-50 text-emerald-700';
  if (accuracy >= 60) return 'bg-amber-50 text-amber-700';
  return 'bg-rose-50 text-rose-700';
}
~~~~~

#### Acts 2: 重构 `src/core/canvas/` 通用绘图逻辑

~~~~~act
patch_file
src/core/canvas/hidpi.ts
~~~~~
~~~~~typescript.old
export function initSquareHiDpiCanvas(
  canvas: HTMLCanvasElement,
  fallbackSize = 340,
  bgColor = '#F8FAFC',
): InitSquareCanvasResult | null {
~~~~~
~~~~~typescript.new
import { CANVAS_THEME } from '../../utils/theme';

export function initSquareHiDpiCanvas(
  canvas: HTMLCanvasElement,
  fallbackSize = 340,
  bgColor: string = CANVAS_THEME.bg.secondary,
): InitSquareCanvasResult | null {
~~~~~

~~~~~act
patch_file
src/core/canvas/hidpi.ts
~~~~~
~~~~~typescript.old
export function setup2DCanvas(
  canvas: HTMLCanvasElement | null,
  size: number,
  bgColor = '#FFFFFF',
): CanvasRenderingContext2D | null {
~~~~~
~~~~~typescript.new
export function setup2DCanvas(
  canvas: HTMLCanvasElement | null,
  size: number,
  bgColor: string = CANVAS_THEME.bg.primary,
): CanvasRenderingContext2D | null {
~~~~~

~~~~~act
patch_file
src/core/canvas/drawPointGrid.ts
~~~~~
~~~~~typescript.old
export function renderInteractivePointGrid({
  ctx,
  canvasSize,
  gridPoints,
  targetPoint,
  userNearestPoint,
  hoverPoint,
  anchors = [],
  showAnswer,
  isHit = false,
  disabled = false,
}: RenderInteractivePointGridOptions): void {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  const dotRadius = getDynamicDotRadius(gridPoints);
  const hoverRadius = Math.max(2.5, dotRadius * 1.6);

  for (const p of gridPoints) {
    drawDot(ctx, p.x, p.y, '#888888', dotRadius);
  }

  if (!disabled && !showAnswer && hoverPoint) {
    drawDot(ctx, hoverPoint.x, hoverPoint.y, '#4F46E5', hoverRadius);
  }

  for (const anchor of anchors) {
    if (anchor) {
      drawDot(ctx, anchor.x, anchor.y, '#000000', dotRadius);
    }
  }

  if (showAnswer && targetPoint) {
    const { size: chSize, lineWidth: chLineWidth } = getDynamicCrosshairMetrics(gridPoints);

    drawDot(ctx, targetPoint.x, targetPoint.y, '#000000', dotRadius);

    ctx.strokeStyle = '#00AA00';
    ctx.lineWidth = chLineWidth;
    ctx.beginPath();
    ctx.moveTo(targetPoint.x - chSize, targetPoint.y);
    ctx.lineTo(targetPoint.x + chSize, targetPoint.y);
    ctx.moveTo(targetPoint.x, targetPoint.y - chSize);
    ctx.lineTo(targetPoint.x, targetPoint.y + chSize);
    ctx.stroke();

    if (userNearestPoint && !isHit) {
      const dashLength = Math.max(2, Math.min(4, chSize * 0.4));
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = Math.max(1, chLineWidth * 0.85);
      ctx.setLineDash([dashLength, dashLength]);
      ctx.beginPath();
      ctx.moveTo(userNearestPoint.x, userNearestPoint.y);
      ctx.lineTo(targetPoint.x, targetPoint.y);
      ctx.stroke();
      ctx.setLineDash([]);

      drawDot(ctx, userNearestPoint.x, userNearestPoint.y, '#FF0000', dotRadius);
    }
  }
}
~~~~~
~~~~~typescript.new
import { CANVAS_THEME } from '../../utils/theme';

export function renderInteractivePointGrid({
  ctx,
  canvasSize,
  gridPoints,
  targetPoint,
  userNearestPoint,
  hoverPoint,
  anchors = [],
  showAnswer,
  isHit = false,
  disabled = false,
}: RenderInteractivePointGridOptions): void {
  ctx.fillStyle = CANVAS_THEME.bg.primary;
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  const dotRadius = getDynamicDotRadius(gridPoints);
  const hoverRadius = Math.max(2.5, dotRadius * 1.6);

  for (const p of gridPoints) {
    drawDot(ctx, p.x, p.y, CANVAS_THEME.pointGrid.dotDefault, dotRadius);
  }

  if (!disabled && !showAnswer && hoverPoint) {
    drawDot(ctx, hoverPoint.x, hoverPoint.y, CANVAS_THEME.pointGrid.dotHover, hoverRadius);
  }

  for (const anchor of anchors) {
    if (anchor) {
      drawDot(ctx, anchor.x, anchor.y, CANVAS_THEME.pointGrid.dotAnchor, dotRadius);
    }
  }

  if (showAnswer && targetPoint) {
    const { size: chSize, lineWidth: chLineWidth } = getDynamicCrosshairMetrics(gridPoints);

    drawDot(ctx, targetPoint.x, targetPoint.y, CANVAS_THEME.pointGrid.dotAnchor, dotRadius);

    ctx.strokeStyle = CANVAS_THEME.pointGrid.crosshairTarget;
    ctx.lineWidth = chLineWidth;
    ctx.beginPath();
    ctx.moveTo(targetPoint.x - chSize, targetPoint.y);
    ctx.lineTo(targetPoint.x + chSize, targetPoint.y);
    ctx.moveTo(targetPoint.x, targetPoint.y - chSize);
    ctx.lineTo(targetPoint.x, targetPoint.y + chSize);
    ctx.stroke();

    if (userNearestPoint && !isHit) {
      const dashLength = Math.max(2, Math.min(4, chSize * 0.4));
      ctx.strokeStyle = CANVAS_THEME.pointGrid.dotMiss;
      ctx.lineWidth = Math.max(1, chLineWidth * 0.85);
      ctx.setLineDash([dashLength, dashLength]);
      ctx.beginPath();
      ctx.moveTo(userNearestPoint.x, userNearestPoint.y);
      ctx.lineTo(targetPoint.x, targetPoint.y);
      ctx.stroke();
      ctx.setLineDash([]);

      drawDot(ctx, userNearestPoint.x, userNearestPoint.y, CANVAS_THEME.pointGrid.dotMiss, dotRadius);
    }
  }
}
~~~~~

~~~~~act
patch_file
src/core/canvas/drawPolygon.ts
~~~~~
~~~~~typescript.old
export function drawPolygonCanvas({
  canvas,
  vertices,
  size,
  fillColor = '#0F172A',
  strokeColor = '#1E293B',
  lineWidth = 2,
  bgColor = '#FFFFFF',
  isHighlighted = false,
  highlightColor = '#22C55E',
}: DrawPolygonOptions): void {
~~~~~
~~~~~typescript.new
import { CANVAS_THEME } from '../../utils/theme';

export function drawPolygonCanvas({
  canvas,
  vertices,
  size,
  fillColor = CANVAS_THEME.shape.fill,
  strokeColor = CANVAS_THEME.shape.stroke,
  lineWidth = 2,
  bgColor = CANVAS_THEME.bg.primary,
  isHighlighted = false,
  highlightColor = CANVAS_THEME.shape.highlight,
}: DrawPolygonOptions): void {
~~~~~

#### Acts 3: 重构 `src/core/analytics/` 图表诊断组件

~~~~~act
patch_file
src/core/analytics/difficultyPlateauView.tsx
~~~~~
~~~~~typescript.old
import type { ComponentChildren } from 'preact';
import type { UnifiedTrialRecord } from '../../utils/db/schema';
import { getAccuracyBadgeClass, getAccuracyColor } from '../../utils/theme';
import { initSquareHiDpiCanvas } from '../canvas/hidpi';
import { i18n } from '../i18n';
~~~~~
~~~~~typescript.new
import type { ComponentChildren } from 'preact';
import type { UnifiedTrialRecord } from '../../utils/db/schema';
import { CANVAS_THEME, getAccuracyBadgeClass, getAccuracyColor, hexToRgba } from '../../utils/theme';
import { initSquareHiDpiCanvas } from '../canvas/hidpi';
import { i18n } from '../i18n';
~~~~~

~~~~~act
patch_file
src/core/analytics/difficultyPlateauView.tsx
~~~~~
~~~~~typescript.old
  for (const tick of yTicks) {
    const y = padding.top + (1 - tick / 100) * chartH;
    ctx.strokeStyle = tick === 0 ? '#CBD5E1' : '#E2E8F0';
    ctx.setLineDash(tick === 0 ? [] : [2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.fillText(`${tick}%`, padding.left - 5, y);
  }
  ctx.setLineDash([]);

  const slotW = chartW / levelStats.length;
  const points = levelStats.map((stat, idx) => {
    const x = padding.left + (idx + 0.5) * slotW;
    const y = padding.top + (1 - stat.accuracy / 100) * chartH;
    return { x, y, stat };
  });

  // 渐变面积背景
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, 'rgba(79, 70, 229, 0.16)');
  gradient.addColorStop(1, 'rgba(79, 70, 229, 0.01)');

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
  ctx.lineTo(points[0].x, height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // 主折线
  ctx.beginPath();
  ctx.strokeStyle = '#4F46E5';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  // 绘制数据节点与标签
  for (const { x, y, stat } of points) {
    const dotColor = getAccuracyColor(stat.accuracy);

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = dotColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 顶部胜率文字
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${stat.accuracy}%`, x, y - 6);

    // 底部 X 轴标签（Level）
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`L${stat.level}`, x, height - padding.bottom + 6);

    // 底部题量标签
    ctx.fillStyle = '#94A3B8';
    ctx.font = '8px sans-serif';
    ctx.fillText(`${stat.total}${i18n.t('common.trialsUnit')}`, x, height - padding.bottom + 18);
  }
~~~~~
~~~~~typescript.new
  for (const tick of yTicks) {
    const y = padding.top + (1 - tick / 100) * chartH;
    ctx.strokeStyle = tick === 0 ? CANVAS_THEME.axis.grid : CANVAS_THEME.axis.line;
    ctx.setLineDash(tick === 0 ? [] : [2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = CANVAS_THEME.text.muted;
    ctx.fillText(`${tick}%`, padding.left - 5, y);
  }
  ctx.setLineDash([]);

  const slotW = chartW / levelStats.length;
  const points = levelStats.map((stat, idx) => {
    const x = padding.left + (idx + 0.5) * slotW;
    const y = padding.top + (1 - stat.accuracy / 100) * chartH;
    return { x, y, stat };
  });

  // 渐变面积背景
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, hexToRgba(CANVAS_THEME.status.accent, 0.16));
  gradient.addColorStop(1, hexToRgba(CANVAS_THEME.status.accent, 0.01));

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
  ctx.lineTo(points[0].x, height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // 主折线
  ctx.beginPath();
  ctx.strokeStyle = CANVAS_THEME.status.accent;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  // 绘制数据节点与标签
  for (const { x, y, stat } of points) {
    const dotColor = getAccuracyColor(stat.accuracy);

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = CANVAS_THEME.bg.primary;
    ctx.fill();
    ctx.strokeStyle = dotColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 顶部胜率文字
    ctx.fillStyle = CANVAS_THEME.text.primary;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${stat.accuracy}%`, x, y - 6);

    // 底部 X 轴标签（Level）
    ctx.fillStyle = CANVAS_THEME.text.secondary;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`L${stat.level}`, x, height - padding.bottom + 6);

    // 底部题量标签
    ctx.fillStyle = CANVAS_THEME.text.muted;
    ctx.font = '8px sans-serif';
    ctx.fillText(`${stat.total}${i18n.t('common.trialsUnit')}`, x, height - padding.bottom + 18);
  }
~~~~~

~~~~~act
patch_file
src/core/analytics/speedAccuracyView.tsx
~~~~~
~~~~~typescript.old
import type { ComponentChildren } from 'preact';
import type { UnifiedTrialRecord } from '../../utils/db/schema';
import { getAccuracyBadgeClass, getAccuracyColor } from '../../utils/theme';
import { initSquareHiDpiCanvas } from '../canvas/hidpi';
import { i18n } from '../i18n';
~~~~~
~~~~~typescript.new
import type { ComponentChildren } from 'preact';
import type { UnifiedTrialRecord } from '../../utils/db/schema';
import { CANVAS_THEME, getAccuracyBadgeClass, getAccuracyColor, hexToRgba } from '../../utils/theme';
import { initSquareHiDpiCanvas } from '../canvas/hidpi';
import { i18n } from '../i18n';
~~~~~

~~~~~act
patch_file
src/core/analytics/speedAccuracyView.tsx
~~~~~
~~~~~typescript.old
  for (const tick of yTicks) {
    const y = padding.top + (1 - tick / 100) * chartH;
    ctx.strokeStyle = tick === 0 ? '#CBD5E1' : '#E2E8F0';
    ctx.setLineDash(tick === 0 ? [] : [2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.fillText(`${tick}%`, padding.left - 5, y);
  }
  ctx.setLineDash([]);

  const slotW = chartW / bins.length;
  const points = bins.map((bin, idx) => {
    const x = padding.left + (idx + 0.5) * slotW;
    const y = padding.top + (1 - bin.accuracy / 100) * chartH;
    return { x, y, bin };
  });

  const validPoints = points.filter((p) => p.bin.total > 0);

  // 绘制折线与渐变面积
  if (validPoints.length > 0) {
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.16)');
    gradient.addColorStop(1, 'rgba(79, 70, 229, 0.01)');

    ctx.beginPath();
    ctx.moveTo(validPoints[0].x, validPoints[0].y);
    for (let i = 1; i < validPoints.length; i++) {
      ctx.lineTo(validPoints[i].x, validPoints[i].y);
    }
    ctx.lineTo(validPoints[validPoints.length - 1].x, height - padding.bottom);
    ctx.lineTo(validPoints[0].x, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.moveTo(validPoints[0].x, validPoints[0].y);
    for (let i = 1; i < validPoints.length; i++) {
      ctx.lineTo(validPoints[i].x, validPoints[i].y);
    }
    ctx.stroke();
  }

  // 绘制数据节点与标签
  for (const p of points) {
    const { x, y, bin } = p;

    if (bin.total > 0) {
      const dotColor = getAccuracyColor(bin.accuracy);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = dotColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 准确率标签
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${bin.accuracy}%`, x, y - 6);
    } else {
      ctx.beginPath();
      ctx.arc(x, padding.top + chartH, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#CBD5E1';
      ctx.fill();
    }

    // X 轴时间与题数标签
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(bin.rangeLabel, x, height - padding.bottom + 6);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '8px sans-serif';
    ctx.fillText(`${bin.total}${i18n.t('common.trialsUnit')}`, x, height - padding.bottom + 18);
  }
~~~~~
~~~~~typescript.new
  for (const tick of yTicks) {
    const y = padding.top + (1 - tick / 100) * chartH;
    ctx.strokeStyle = tick === 0 ? CANVAS_THEME.axis.grid : CANVAS_THEME.axis.line;
    ctx.setLineDash(tick === 0 ? [] : [2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = CANVAS_THEME.text.muted;
    ctx.fillText(`${tick}%`, padding.left - 5, y);
  }
  ctx.setLineDash([]);

  const slotW = chartW / bins.length;
  const points = bins.map((bin, idx) => {
    const x = padding.left + (idx + 0.5) * slotW;
    const y = padding.top + (1 - bin.accuracy / 100) * chartH;
    return { x, y, bin };
  });

  const validPoints = points.filter((p) => p.bin.total > 0);

  // 绘制折线与渐变面积
  if (validPoints.length > 0) {
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, hexToRgba(CANVAS_THEME.status.accent, 0.16));
    gradient.addColorStop(1, hexToRgba(CANVAS_THEME.status.accent, 0.01));

    ctx.beginPath();
    ctx.moveTo(validPoints[0].x, validPoints[0].y);
    for (let i = 1; i < validPoints.length; i++) {
      ctx.lineTo(validPoints[i].x, validPoints[i].y);
    }
    ctx.lineTo(validPoints[validPoints.length - 1].x, height - padding.bottom);
    ctx.lineTo(validPoints[0].x, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = CANVAS_THEME.status.accent;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.moveTo(validPoints[0].x, validPoints[0].y);
    for (let i = 1; i < validPoints.length; i++) {
      ctx.lineTo(validPoints[i].x, validPoints[i].y);
    }
    ctx.stroke();
  }

  // 绘制数据节点与标签
  for (const p of points) {
    const { x, y, bin } = p;

    if (bin.total > 0) {
      const dotColor = getAccuracyColor(bin.accuracy);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = CANVAS_THEME.bg.primary;
      ctx.fill();
      ctx.strokeStyle = dotColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 准确率标签
      ctx.fillStyle = CANVAS_THEME.text.primary;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${bin.accuracy}%`, x, y - 6);
    } else {
      ctx.beginPath();
      ctx.arc(x, padding.top + chartH, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = CANVAS_THEME.axis.grid;
      ctx.fill();
    }

    // X 轴时间与题数标签
    ctx.fillStyle = CANVAS_THEME.text.secondary;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(bin.rangeLabel, x, height - padding.bottom + 6);

    ctx.fillStyle = CANVAS_THEME.text.muted;
    ctx.font = '8px sans-serif';
    ctx.fillText(`${bin.total}${i18n.t('common.trialsUnit')}`, x, height - padding.bottom + 18);
  }
~~~~~

#### Acts 4: 重构 `src/utils/canvas/` 统计与趋势图表

~~~~~act
patch_file
src/utils/canvas/drawColorRing.ts
~~~~~
~~~~~typescript.old
import { initSquareHiDpiCanvas } from '../../core/canvas/hidpi';
import { hsvToHex } from '../../core/color/colorUtils';
import type { SectorStat } from './drawCompass';
~~~~~
~~~~~typescript.new
import { initSquareHiDpiCanvas } from '../../core/canvas/hidpi';
import { hsvToHex } from '../../core/color/colorUtils';
import { CANVAS_THEME, getAccuracyFillColor, hexToRgba } from '../theme';
import type { SectorStat } from './drawCompass';
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawColorRing.ts
~~~~~
~~~~~typescript.old
    if (stat.total === 0) {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.7)';
    } else if (stat.accuracy >= 80) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
    } else if (stat.accuracy >= 60) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
    } else {
      ctx.fillStyle = 'rgba(244, 63, 94, 0.55)';
    }
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.stroke();

    const midA = startA + sectorAngle / 2;
    const labelR = outerRadius + 25;
    const lx = cx + Math.cos(midA) * labelR;
    const ly = cy + Math.sin(midA) * labelR;

    ctx.fillStyle = stat.accuracy < 60 && stat.total >= 3 ? '#E11D48' : '#64748B';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const shortName = stat.label.split(' ')[0];
    ctx.fillText(shortName, lx, ly);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.stroke();

  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Hue', cx, cy - 5);
  ctx.fillStyle = '#64748B';
  ctx.font = '9px sans-serif';
  ctx.fillText('Accuracy', cx, cy + 8);
~~~~~
~~~~~typescript.new
    if (stat.total === 0) {
      ctx.fillStyle = hexToRgba(CANVAS_THEME.axis.line, 0.7);
    } else {
      ctx.fillStyle = getAccuracyFillColor(stat.accuracy, stat.accuracy >= 80 ? 0.35 : stat.accuracy >= 60 ? 0.45 : 0.55);
    }
    ctx.fill();
    ctx.strokeStyle = CANVAS_THEME.axis.grid;
    ctx.lineWidth = 1;
    ctx.stroke();

    const midA = startA + sectorAngle / 2;
    const labelR = outerRadius + 25;
    const lx = cx + Math.cos(midA) * labelR;
    const ly = cy + Math.sin(midA) * labelR;

    ctx.fillStyle = stat.accuracy < 60 && stat.total >= 3 ? CANVAS_THEME.status.missDark : CANVAS_THEME.text.secondary;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const shortName = stat.label.split(' ')[0];
    ctx.fillText(shortName, lx, ly);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = CANVAS_THEME.bg.primary;
  ctx.fill();
  ctx.strokeStyle = CANVAS_THEME.axis.line;
  ctx.stroke();

  ctx.fillStyle = CANVAS_THEME.text.primary;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Hue', cx, cy - 5);
  ctx.fillStyle = CANVAS_THEME.text.secondary;
  ctx.font = '9px sans-serif';
  ctx.fillText('Accuracy', cx, cy + 8);
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawCompass.ts
~~~~~
~~~~~typescript.old
import { initSquareHiDpiCanvas } from '../../core/canvas/hidpi';

export interface SectorStat {
~~~~~
~~~~~typescript.new
import { initSquareHiDpiCanvas } from '../../core/canvas/hidpi';
import { CANVAS_THEME, getAccuracyFillColor, hexToRgba } from '../theme';

export interface SectorStat {
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawCompass.ts
~~~~~
~~~~~typescript.old
    if (stat.total === 0) {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.7)';
    } else if (stat.accuracy >= 80) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
    } else if (stat.accuracy >= 60) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
    } else {
      ctx.fillStyle = 'rgba(244, 63, 94, 0.55)';
    }
    ctx.fill();

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.stroke();

    const midA = startA + sectorAngle / 2;
    const labelR = outerRadius + 18;
    const lx = cx + Math.cos(midA) * labelR;
    const ly = cy + Math.sin(midA) * labelR;

    ctx.fillStyle = stat.accuracy < 60 && stat.total > 0 ? '#E11D48' : '#64748B';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stat.label.split(' ')[0], lx, ly);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#4F46E5';
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();
~~~~~
~~~~~typescript.new
    if (stat.total === 0) {
      ctx.fillStyle = hexToRgba(CANVAS_THEME.axis.line, 0.7);
    } else {
      ctx.fillStyle = getAccuracyFillColor(stat.accuracy, stat.accuracy >= 80 ? 0.35 : stat.accuracy >= 60 ? 0.45 : 0.55);
    }
    ctx.fill();

    ctx.strokeStyle = CANVAS_THEME.axis.grid;
    ctx.lineWidth = 1;
    ctx.stroke();

    const midA = startA + sectorAngle / 2;
    const labelR = outerRadius + 18;
    const lx = cx + Math.cos(midA) * labelR;
    const ly = cy + Math.sin(midA) * labelR;

    ctx.fillStyle = stat.accuracy < 60 && stat.total > 0 ? CANVAS_THEME.status.missDark : CANVAS_THEME.text.secondary;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stat.label.split(' ')[0], lx, ly);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fillStyle = CANVAS_THEME.status.accent;
  ctx.fill();
  ctx.strokeStyle = CANVAS_THEME.bg.primary;
  ctx.lineWidth = 2;
  ctx.stroke();
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawHeatmap.ts
~~~~~
~~~~~typescript.old
import { initSquareHiDpiCanvas } from '../../core/canvas/hidpi';
import type { UnifiedTrialRecord } from '../db/index';
~~~~~
~~~~~typescript.new
import { initSquareHiDpiCanvas } from '../../core/canvas/hidpi';
import type { UnifiedTrialRecord } from '../db/index';
import { CANVAS_THEME, hexToRgba } from '../theme';
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawHeatmap.ts
~~~~~
~~~~~typescript.old
  // 1. 背景同心圆标尺
  const rings = [5, 10, 20, 30];
  ctx.lineWidth = 1;
  for (const r of rings) {
    ctx.strokeStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px monospace';
    ctx.fillText(`${r}`, cx + r * scale + 2, cy - 4);
  }

  // 十字辅助基准线
  ctx.strokeStyle = '#CBD5E1';
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(width, cy);
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, height);
  ctx.stroke();
  ctx.setLineDash([]);

  // 2. 数据点与密度分箱处理
  if (totalCount > 0) {
    if (totalCount <= 300) {
      // 样本量较少时：直接绘制带适度半透明的散点
      const alpha = Math.max(0.35, 1 - totalCount / 600);
      for (const r of records) {
        const uClick = (r.userClick as [number, number]) || [0, 0];
        const tB = (r.targetB as [number, number]) || [0, 0];
        const dx = uClick[0] - tB[0];
        const dy = uClick[1] - tB[1];

        const px = cx + dx * scale;
        const py = cy + dy * scale;

        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = r.isHit
          ? `rgba(34, 197, 94, ${alpha})`
          : `rgba(239, 68, 68, ${alpha * 1.1})`;
        ctx.fill();
      }
    } else {
      // 海量样本时 (300 ~ 10000+)：2D 网格分箱热力聚合 (Binning)
      const gridSize = 40; // 40x40 分箱网格
      const cellW = width / gridSize;
      const cellH = height / gridSize;
      const bins = new Uint16Array(gridSize * gridSize);
      let maxBinCount = 1;

      for (const r of records) {
        const uClick = (r.userClick as [number, number]) || [0, 0];
        const tB = (r.targetB as [number, number]) || [0, 0];
        const dx = uClick[0] - tB[0];
        const dy = uClick[1] - tB[1];

        const px = cx + dx * scale;
        const py = cy + dy * scale;

        if (px >= 0 && px < width && py >= 0 && py < height) {
          const col = Math.floor(px / cellW);
          const row = Math.floor(py / cellH);
          const idx = row * gridSize + col;
          bins[idx]++;
          if (bins[idx] > maxBinCount) {
            maxBinCount = bins[idx];
          }
        }
      }

      // 绘制热力色阶块 (对数强度映射)
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const count = bins[r * gridSize + c];
          if (count > 0) {
            const intensity = Math.log(count + 1) / Math.log(maxBinCount + 1);
            ctx.fillStyle = `rgba(99, 102, 241, ${Math.min(0.85, 0.15 + intensity * 0.7)})`;
            ctx.fillRect(c * cellW, r * cellH, cellW + 0.5, cellH + 0.5);
          }
        }
      }

      // 叠加表层最近 100 道题的精细高亮散点，保留动态击中反馈
      const recentSample = records.slice(-100);
      for (const r of recentSample) {
        const uClick = (r.userClick as [number, number]) || [0, 0];
        const tB = (r.targetB as [number, number]) || [0, 0];
        const dx = uClick[0] - tB[0];
        const dy = uClick[1] - tB[1];
        const px = cx + dx * scale;
        const py = cy + dy * scale;

        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = r.isHit ? 'rgba(34, 197, 94, 0.75)' : 'rgba(239, 68, 68, 0.75)';
        ctx.fill();
      }
    }
  }

  // 3. 绝对真理中心点
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#22C55E';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 4. 系统性平均偏置向量
  if (totalCount > 0) {
    const avgPx = cx + avgDx * scale;
    const avgPy = cy + avgDy * scale;

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(avgPx, avgPy);
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(avgPx, avgPy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
~~~~~
~~~~~typescript.new
  // 1. 背景同心圆标尺
  const rings = [5, 10, 20, 30];
  ctx.lineWidth = 1;
  for (const r of rings) {
    ctx.strokeStyle = CANVAS_THEME.axis.line;
    ctx.beginPath();
    ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = CANVAS_THEME.text.muted;
    ctx.font = '10px monospace';
    ctx.fillText(`${r}`, cx + r * scale + 2, cy - 4);
  }

  // 十字辅助基准线
  ctx.strokeStyle = CANVAS_THEME.axis.grid;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(width, cy);
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, height);
  ctx.stroke();
  ctx.setLineDash([]);

  // 2. 数据点与密度分箱处理
  if (totalCount > 0) {
    if (totalCount <= 300) {
      // 样本量较少时：直接绘制带适度半透明的散点
      const alpha = Math.max(0.35, 1 - totalCount / 600);
      for (const r of records) {
        const uClick = (r.userClick as [number, number]) || [0, 0];
        const tB = (r.targetB as [number, number]) || [0, 0];
        const dx = uClick[0] - tB[0];
        const dy = uClick[1] - tB[1];

        const px = cx + dx * scale;
        const py = cy + dy * scale;

        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = r.isHit
          ? hexToRgba(CANVAS_THEME.status.hit, alpha)
          : hexToRgba(CANVAS_THEME.status.miss, Math.min(1, alpha * 1.1));
        ctx.fill();
      }
    } else {
      // 海量样本时 (300 ~ 10000+)：2D 网格分箱热力聚合 (Binning)
      const gridSize = 40; // 40x40 分箱网格
      const cellW = width / gridSize;
      const cellH = height / gridSize;
      const bins = new Uint16Array(gridSize * gridSize);
      let maxBinCount = 1;

      for (const r of records) {
        const uClick = (r.userClick as [number, number]) || [0, 0];
        const tB = (r.targetB as [number, number]) || [0, 0];
        const dx = uClick[0] - tB[0];
        const dy = uClick[1] - tB[1];

        const px = cx + dx * scale;
        const py = cy + dy * scale;

        if (px >= 0 && px < width && py >= 0 && py < height) {
          const col = Math.floor(px / cellW);
          const row = Math.floor(py / cellH);
          const idx = row * gridSize + col;
          bins[idx]++;
          if (bins[idx] > maxBinCount) {
            maxBinCount = bins[idx];
          }
        }
      }

      // 绘制热力色阶块 (对数强度映射)
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const count = bins[r * gridSize + c];
          if (count > 0) {
            const intensity = Math.log(count + 1) / Math.log(maxBinCount + 1);
            ctx.fillStyle = hexToRgba(CANVAS_THEME.status.accentHover, Math.min(0.85, 0.15 + intensity * 0.7));
            ctx.fillRect(c * cellW, r * cellH, cellW + 0.5, cellH + 0.5);
          }
        }
      }

      // 叠加表层最近 100 道题的精细高亮散点，保留动态击中反馈
      const recentSample = records.slice(-100);
      for (const r of recentSample) {
        const uClick = (r.userClick as [number, number]) || [0, 0];
        const tB = (r.targetB as [number, number]) || [0, 0];
        const dx = uClick[0] - tB[0];
        const dy = uClick[1] - tB[1];
        const px = cx + dx * scale;
        const py = cy + dy * scale;

        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = r.isHit
          ? hexToRgba(CANVAS_THEME.status.hit, 0.75)
          : hexToRgba(CANVAS_THEME.status.miss, 0.75);
        ctx.fill();
      }
    }
  }

  // 3. 绝对真理中心点
  ctx.fillStyle = CANVAS_THEME.bg.primary;
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = CANVAS_THEME.status.hit;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 4. 系统性平均偏置向量
  if (totalCount > 0) {
    const avgPx = cx + avgDx * scale;
    const avgPy = cy + avgDy * scale;

    ctx.strokeStyle = CANVAS_THEME.status.warning;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(avgPx, avgPy);
    ctx.stroke();

    ctx.fillStyle = CANVAS_THEME.status.warning;
    ctx.beginPath();
    ctx.arc(avgPx, avgPy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawHueBiasChart.ts
~~~~~
~~~~~typescript.old
import { initSquareHiDpiCanvas } from '../../core/canvas/hidpi';
import { i18n } from '../../core/i18n';
import type { UnifiedTrialRecord } from '../db/index';
~~~~~
~~~~~typescript.new
import { initSquareHiDpiCanvas } from '../../core/canvas/hidpi';
import { i18n } from '../../core/i18n';
import type { UnifiedTrialRecord } from '../db/index';
import { CANVAS_THEME, PALETTE, hexToRgba } from '../theme';
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawHueBiasChart.ts
~~~~~
~~~~~typescript.old
  for (const tick of yTicks) {
    const y = getY(tick);
    ctx.strokeStyle = tick === 0 ? '#94A3B8' : '#E2E8F0';
    ctx.setLineDash(tick === 0 ? [] : [2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = tick === 0 ? '#334155' : '#64748B';
    const label = tick > 0 ? `+${tick}°` : `${tick}°`;
    ctx.fillText(label, padding.left - 5, y);
  }
  ctx.setLineDash([]);

  // 2. 绘制 X 轴色相刻度竖线 (0°, 90°, 180°, 270°, 360°)
  const xTicks = [0, 90, 180, 270, 360];
  ctx.strokeStyle = '#E2E8F0';
  ctx.setLineDash([2, 2]);
  for (const h of xTicks) {
    const x = getX(h);
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, height - padding.bottom);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // 3. 绘制底部色相环全光谱渐变指示条
  const barY = height - padding.bottom + 8;
  const barH = 8;
  const barGradient = ctx.createLinearGradient(padding.left, 0, width - padding.right, 0);
  barGradient.addColorStop(0 / 6, '#FF0000');
  barGradient.addColorStop(1 / 6, '#FFFF00');
  barGradient.addColorStop(2 / 6, '#00FF00');
  barGradient.addColorStop(3 / 6, '#00FFFF');
  barGradient.addColorStop(4 / 6, '#0000FF');
  barGradient.addColorStop(5 / 6, '#FF00FF');
  barGradient.addColorStop(6 / 6, '#FF0000');

  ctx.fillStyle = barGradient;
  ctx.beginPath();
  ctx.roundRect(padding.left, barY, chartW, barH, 4);
  ctx.fill();

  // 底部 X 轴标签
  ctx.fillStyle = '#94A3B8';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('0°', getX(0), barY + barH + 4);
  ctx.fillText('90°', getX(90), barY + barH + 4);
  ctx.fillText('180°', getX(180), barY + barH + 4);
  ctx.fillText('270°', getX(270), barY + barH + 4);
  ctx.fillText('360°', getX(360), barY + barH + 4);

  // 4. 自适应透明度与半径绘制做答记录散点 (样本量自适应下调 Alpha)
  const totalCount = pointData.length;
  const dotAlpha = totalCount > 500 ? 0.2 : totalCount > 150 ? 0.45 : 0.75;
  const dotRadius = totalCount > 500 ? 2.5 : 3.5;

  // 限制最大绘制散点数为最近 800 个，兼顾极端数据下的渲染流畅度
  const renderPoints = totalCount > 800 ? pointData.slice(-800) : pointData;

  for (const pt of renderPoints) {
    const px = getX(pt.targetH);
    const py = getY(pt.bias);

    ctx.beginPath();
    ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = pt.isHit
      ? `rgba(34, 197, 94, ${dotAlpha})`
      : `rgba(239, 68, 68, ${dotAlpha * 1.1})`;
    ctx.fill();
    if (totalCount <= 150) {
      ctx.strokeStyle = pt.isHit ? '#15803D' : '#991B1B';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // 5. 计算 12 个色相扇区的平均偏差并绘制趋势平滑线 (使用全部样本计算统计均值)
  const sectorSums = Array.from({ length: 12 }, () => ({ sumBias: 0, count: 0 }));
  for (const pt of pointData) {
    const sIdx = Math.max(0, Math.min(11, Math.floor(pt.targetH / 30)));
    sectorSums[sIdx].sumBias += pt.bias;
    sectorSums[sIdx].count += 1;
  }

  const trendPoints: { x: number; y: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const centerHue = i * 30 + 15;
    if (sectorSums[i].count > 0) {
      const avgBias = sectorSums[i].sumBias / sectorSums[i].count;
      trendPoints.push({ x: getX(centerHue), y: getY(avgBias) });
    }
  }

  if (trendPoints.length >= 2) {
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(trendPoints[0].x, trendPoints[0].y);
    for (let i = 1; i < trendPoints.length; i++) {
      ctx.lineTo(trendPoints[i].x, trendPoints[i].y);
    }
    ctx.stroke();

    for (const tp of trendPoints) {
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#F59E0B';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // 顶部标题提示
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(i18n.t('stats.biasPositive'), padding.left, padding.top - 10);
  ctx.textAlign = 'right';
  ctx.fillText(i18n.t('stats.biasNegative'), width - padding.right, height - padding.bottom - 4);
~~~~~
~~~~~typescript.new
  for (const tick of yTicks) {
    const y = getY(tick);
    ctx.strokeStyle = tick === 0 ? CANVAS_THEME.axis.grid : CANVAS_THEME.axis.line;
    ctx.setLineDash(tick === 0 ? [] : [2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = tick === 0 ? CANVAS_THEME.text.dark : CANVAS_THEME.text.secondary;
    const label = tick > 0 ? `+${tick}°` : `${tick}°`;
    ctx.fillText(label, padding.left - 5, y);
  }
  ctx.setLineDash([]);

  // 2. 绘制 X 轴色相刻度竖线 (0°, 90°, 180°, 270°, 360°)
  const xTicks = [0, 90, 180, 270, 360];
  ctx.strokeStyle = CANVAS_THEME.axis.line;
  ctx.setLineDash([2, 2]);
  for (const h of xTicks) {
    const x = getX(h);
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, height - padding.bottom);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // 3. 绘制底部色相环全光谱渐变指示条
  const barY = height - padding.bottom + 8;
  const barH = 8;
  const barGradient = ctx.createLinearGradient(padding.left, 0, width - padding.right, 0);
  barGradient.addColorStop(0 / 6, PALETTE.spectrum.red);
  barGradient.addColorStop(1 / 6, PALETTE.spectrum.yellow);
  barGradient.addColorStop(2 / 6, PALETTE.spectrum.green);
  barGradient.addColorStop(3 / 6, PALETTE.spectrum.cyan);
  barGradient.addColorStop(4 / 6, PALETTE.spectrum.blue);
  barGradient.addColorStop(5 / 6, PALETTE.spectrum.magenta);
  barGradient.addColorStop(6 / 6, PALETTE.spectrum.red);

  ctx.fillStyle = barGradient;
  ctx.beginPath();
  ctx.roundRect(padding.left, barY, chartW, barH, 4);
  ctx.fill();

  // 底部 X 轴标签
  ctx.fillStyle = CANVAS_THEME.text.muted;
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('0°', getX(0), barY + barH + 4);
  ctx.fillText('90°', getX(90), barY + barH + 4);
  ctx.fillText('180°', getX(180), barY + barH + 4);
  ctx.fillText('270°', getX(270), barY + barH + 4);
  ctx.fillText('360°', getX(360), barY + barH + 4);

  // 4. 自适应透明度与半径绘制做答记录散点 (样本量自适应下调 Alpha)
  const totalCount = pointData.length;
  const dotAlpha = totalCount > 500 ? 0.2 : totalCount > 150 ? 0.45 : 0.75;
  const dotRadius = totalCount > 500 ? 2.5 : 3.5;

  // 限制最大绘制散点数为最近 800 个，兼顾极端数据下的渲染流畅度
  const renderPoints = totalCount > 800 ? pointData.slice(-800) : pointData;

  for (const pt of renderPoints) {
    const px = getX(pt.targetH);
    const py = getY(pt.bias);

    ctx.beginPath();
    ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = pt.isHit
      ? hexToRgba(CANVAS_THEME.status.hit, dotAlpha)
      : hexToRgba(CANVAS_THEME.status.miss, Math.min(1, dotAlpha * 1.1));
    ctx.fill();
    if (totalCount <= 150) {
      ctx.strokeStyle = pt.isHit ? CANVAS_THEME.status.hitDark : CANVAS_THEME.status.missDark;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // 5. 计算 12 个色相扇区的平均偏差并绘制趋势平滑线 (使用全部样本计算统计均值)
  const sectorSums = Array.from({ length: 12 }, () => ({ sumBias: 0, count: 0 }));
  for (const pt of pointData) {
    const sIdx = Math.max(0, Math.min(11, Math.floor(pt.targetH / 30)));
    sectorSums[sIdx].sumBias += pt.bias;
    sectorSums[sIdx].count += 1;
  }

  const trendPoints: { x: number; y: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const centerHue = i * 30 + 15;
    if (sectorSums[i].count > 0) {
      const avgBias = sectorSums[i].sumBias / sectorSums[i].count;
      trendPoints.push({ x: getX(centerHue), y: getY(avgBias) });
    }
  }

  if (trendPoints.length >= 2) {
    ctx.strokeStyle = CANVAS_THEME.status.warning;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(trendPoints[0].x, trendPoints[0].y);
    for (let i = 1; i < trendPoints.length; i++) {
      ctx.lineTo(trendPoints[i].x, trendPoints[i].y);
    }
    ctx.stroke();

    for (const tp of trendPoints) {
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = CANVAS_THEME.status.warning;
      ctx.fill();
      ctx.strokeStyle = CANVAS_THEME.bg.primary;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // 顶部标题提示
  ctx.fillStyle = CANVAS_THEME.text.muted;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(i18n.t('stats.biasPositive'), padding.left, padding.top - 10);
  ctx.textAlign = 'right';
  ctx.fillText(i18n.t('stats.biasNegative'), width - padding.right, height - padding.bottom - 4);
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawTrendChart.ts
~~~~~
~~~~~typescript.old
import type { SessionHistoryItem } from '../../components/SessionSummaryModal';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { i18n } from '../../core/i18n';
import { lttbDownsample } from '../../core/math/downsample';
~~~~~
~~~~~typescript.new
import type { SessionHistoryItem } from '../../components/SessionSummaryModal';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { i18n } from '../../core/i18n';
import { lttbDownsample } from '../../core/math/downsample';
import { CANVAS_THEME, hexToRgba } from '../theme';
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawTrendChart.ts
~~~~~
~~~~~typescript.old
  if (recentDates.length === 0) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(i18n.t('stats.noTrace'), width / 2, height / 2);
    return;
  }

  const rawPoints = recentDates.map((d, idx) => ({
    x: idx,
    y: dailyData[d].maxLevel,
    date: d,
  }));

  // 若采样点超过 60 个，自适应执行 LTTB 降采样
  const sampledPoints = rawPoints.length > 60 ? lttbDownsample(rawPoints, 40) : rawPoints;

  const levels = sampledPoints.map((p) => p.y);
  const maxLevel = Math.max(...levels, 35);
  const minLevel = 1;

  const getY = (val: number) =>
    padding.top + (1 - (val - minLevel) / (maxLevel - minLevel || 1)) * chartH;
  const getX = (idx: number) =>
    padding.left + (idx / Math.max(1, sampledPoints.length - 1)) * chartW;

  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const l of [minLevel, Math.round(maxLevel / 2), maxLevel]) {
    const y = getY(l);
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = '#6366F1';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.moveTo(getX(0), getY(levels[0]));
  for (let i = 1; i < levels.length; i++) {
    ctx.lineTo(getX(i), getY(levels[i]));
  }
  ctx.stroke();

  const pointRadius = sampledPoints.length > 20 ? 2.5 : 3.5;
  for (let i = 0; i < levels.length; i++) {
    ctx.beginPath();
    ctx.arc(getX(i), getY(levels[i]), pointRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const l of [minLevel, maxLevel]) {
    ctx.fillText(`L${l}`, padding.left - 5, getY(l));
  }
  ctx.textAlign = 'center';
  ctx.fillText(i18n.t('stats.trendAxisNotice'), width / 2, height - 5);
~~~~~
~~~~~typescript.new
  if (recentDates.length === 0) {
    ctx.fillStyle = CANVAS_THEME.text.muted;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(i18n.t('stats.noTrace'), width / 2, height / 2);
    return;
  }

  const rawPoints = recentDates.map((d, idx) => ({
    x: idx,
    y: dailyData[d].maxLevel,
    date: d,
  }));

  // 若采样点超过 60 个，自适应执行 LTTB 降采样
  const sampledPoints = rawPoints.length > 60 ? lttbDownsample(rawPoints, 40) : rawPoints;

  const levels = sampledPoints.map((p) => p.y);
  const maxLevel = Math.max(...levels, 35);
  const minLevel = 1;

  const getY = (val: number) =>
    padding.top + (1 - (val - minLevel) / (maxLevel - minLevel || 1)) * chartH;
  const getX = (idx: number) =>
    padding.left + (idx / Math.max(1, sampledPoints.length - 1)) * chartW;

  ctx.strokeStyle = CANVAS_THEME.axis.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const l of [minLevel, Math.round(maxLevel / 2), maxLevel]) {
    const y = getY(l);
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = CANVAS_THEME.status.accentHover;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.moveTo(getX(0), getY(levels[0]));
  for (let i = 1; i < levels.length; i++) {
    ctx.lineTo(getX(i), getY(levels[i]));
  }
  ctx.stroke();

  const pointRadius = sampledPoints.length > 20 ? 2.5 : 3.5;
  for (let i = 0; i < levels.length; i++) {
    ctx.beginPath();
    ctx.arc(getX(i), getY(levels[i]), pointRadius, 0, Math.PI * 2);
    ctx.fillStyle = CANVAS_THEME.bg.primary;
    ctx.fill();
    ctx.strokeStyle = CANVAS_THEME.status.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = CANVAS_THEME.text.muted;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const l of [minLevel, maxLevel]) {
    ctx.fillText(`L${l}`, padding.left - 5, getY(l));
  }
  ctx.textAlign = 'center';
  ctx.fillText(i18n.t('stats.trendAxisNotice'), width / 2, height - 5);
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawTrendChart.ts
~~~~~
~~~~~typescript.old
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  // 构造序列
  const rawPoints = [
    { x: 0, y: history[0].levelBefore, isHit: true },
    ...history.map((h, i) => ({
      x: i + 1,
      y: h.levelAfter,
      isHit: h.isHit,
    })),
  ];

  // 当会话题量 > 120 题时执行 LTTB 降采样至 80 点
  const sampledPoints = rawPoints.length > 120 ? lttbDownsample(rawPoints, 80) : rawPoints;

  const totalPoints = sampledPoints.length;
  const levelSequence = sampledPoints.map((p) => p.y);
  const maxLevel = Math.max(...levelSequence, 35);
  const minLevel = Math.min(...levelSequence, 1);

  const getY = (val: number) => {
    const ratio = (val - minLevel) / (maxLevel - minLevel || 1);
    return padding.top + (1 - ratio) * chartH;
  };

  const getX = (index: number) => {
    if (totalPoints === 1) return padding.left + chartW / 2;
    return padding.left + (index / (totalPoints - 1)) * chartW;
  };

  // 背景刻度线
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#E2E8F0';
  ctx.fillStyle = '#64748B';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const yTicks = [maxLevel, Math.round((maxLevel + minLevel) / 2), minLevel];
  const uniqueYTicks = Array.from(new Set(yTicks));

  for (const tickVal of uniqueYTicks) {
    const y = getY(tickVal);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillText(`Lvl ${tickVal}`, padding.left - 8, y);
  }

  // 面积渐变背景
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, 'rgba(79, 70, 229, 0.18)');
  gradient.addColorStop(1, 'rgba(79, 70, 229, 0.01)');

  ctx.beginPath();
  ctx.moveTo(getX(0), getY(levelSequence[0]));
  for (let i = 1; i < totalPoints; i++) {
    ctx.lineTo(getX(i), getY(levelSequence[i]));
  }
  ctx.lineTo(getX(totalPoints - 1), height - padding.bottom);
  ctx.lineTo(getX(0), height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // 主折线
  ctx.beginPath();
  ctx.strokeStyle = '#4F46E5';
  ctx.lineWidth = totalPoints > 60 ? 1.8 : 2.5;
  ctx.lineJoin = 'round';
  ctx.moveTo(getX(0), getY(levelSequence[0]));
  for (let i = 1; i < totalPoints; i++) {
    ctx.lineTo(getX(i), getY(levelSequence[i]));
  }
  ctx.stroke();

  // 绘制各个试炼对应的判定结果圆点
  const isCrowded = totalPoints > 35;
  const isSuperCrowded = totalPoints > 80;

  if (!isSuperCrowded) {
    const dotRadius = isCrowded ? 2.5 : 3.5;
    for (let i = 0; i < sampledPoints.length; i++) {
      const p = sampledPoints[i];
      const x = getX(i);
      const y = getY(p.y);

      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = p.isHit ? '#10B981' : '#F43F5E';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  ctx.strokeStyle = '#CBD5E1';
  ctx.beginPath();
  ctx.moveTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(i18n.t('stats.sessionSeqNotice'), width / 2, height - 8);
~~~~~
~~~~~typescript.new
  ctx.fillStyle = CANVAS_THEME.bg.secondary;
  ctx.fillRect(0, 0, width, height);

  // 构造序列
  const rawPoints = [
    { x: 0, y: history[0].levelBefore, isHit: true },
    ...history.map((h, i) => ({
      x: i + 1,
      y: h.levelAfter,
      isHit: h.isHit,
    })),
  ];

  // 当会话题量 > 120 题时执行 LTTB 降采样至 80 点
  const sampledPoints = rawPoints.length > 120 ? lttbDownsample(rawPoints, 80) : rawPoints;

  const totalPoints = sampledPoints.length;
  const levelSequence = sampledPoints.map((p) => p.y);
  const maxLevel = Math.max(...levelSequence, 35);
  const minLevel = Math.min(...levelSequence, 1);

  const getY = (val: number) => {
    const ratio = (val - minLevel) / (maxLevel - minLevel || 1);
    return padding.top + (1 - ratio) * chartH;
  };

  const getX = (index: number) => {
    if (totalPoints === 1) return padding.left + chartW / 2;
    return padding.left + (index / (totalPoints - 1)) * chartW;
  };

  // 背景刻度线
  ctx.lineWidth = 1;
  ctx.strokeStyle = CANVAS_THEME.axis.line;
  ctx.fillStyle = CANVAS_THEME.text.secondary;
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const yTicks = [maxLevel, Math.round((maxLevel + minLevel) / 2), minLevel];
  const uniqueYTicks = Array.from(new Set(yTicks));

  for (const tickVal of uniqueYTicks) {
    const y = getY(tickVal);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillText(`Lvl ${tickVal}`, padding.left - 8, y);
  }

  // 面积渐变背景
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, hexToRgba(CANVAS_THEME.status.accent, 0.18));
  gradient.addColorStop(1, hexToRgba(CANVAS_THEME.status.accent, 0.01));

  ctx.beginPath();
  ctx.moveTo(getX(0), getY(levelSequence[0]));
  for (let i = 1; i < totalPoints; i++) {
    ctx.lineTo(getX(i), getY(levelSequence[i]));
  }
  ctx.lineTo(getX(totalPoints - 1), height - padding.bottom);
  ctx.lineTo(getX(0), height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // 主折线
  ctx.beginPath();
  ctx.strokeStyle = CANVAS_THEME.status.accent;
  ctx.lineWidth = totalPoints > 60 ? 1.8 : 2.5;
  ctx.lineJoin = 'round';
  ctx.moveTo(getX(0), getY(levelSequence[0]));
  for (let i = 1; i < totalPoints; i++) {
    ctx.lineTo(getX(i), getY(levelSequence[i]));
  }
  ctx.stroke();

  // 绘制各个试炼对应的判定结果圆点
  const isCrowded = totalPoints > 35;
  const isSuperCrowded = totalPoints > 80;

  if (!isSuperCrowded) {
    const dotRadius = isCrowded ? 2.5 : 3.5;
    for (let i = 0; i < sampledPoints.length; i++) {
      const p = sampledPoints[i];
      const x = getX(i);
      const y = getY(p.y);

      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = p.isHit ? CANVAS_THEME.status.hit : CANVAS_THEME.status.miss;
      ctx.fill();
      ctx.strokeStyle = CANVAS_THEME.bg.primary;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  ctx.strokeStyle = CANVAS_THEME.axis.grid;
  ctx.beginPath();
  ctx.moveTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();

  ctx.fillStyle = CANVAS_THEME.text.muted;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(i18n.t('stats.sessionSeqNotice'), width / 2, height - 8);
~~~~~

#### Acts 5: 重构 `src/components/common/PointClickCanvas.tsx` 放大镜中心准星与底色

~~~~~act
patch_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~typescript.old
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { renderInteractivePointGrid } from '../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { useTranslation } from '../../core/i18n';
import { findNearestGridPoint } from '../../packs/star/utils/hitDetection';
import type { Point } from '../../types';
~~~~~
~~~~~typescript.new
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { renderInteractivePointGrid } from '../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { useTranslation } from '../../core/i18n';
import { findNearestGridPoint } from '../../packs/star/utils/hitDetection';
import type { Point } from '../../types';
import { CANVAS_THEME } from '../../utils/theme';
~~~~~

~~~~~act
patch_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~typescript.old
      loupeCtx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
      loupeCtx.fillStyle = '#FFFFFF';
      loupeCtx.fillRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);

      // 主画布采样的视口区域（直接以触控点为中心，不进行强制边界或网格吸附）
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const sampleSize = LOUPE_SIZE / dynamicZoomFactor;
      const sx = (focusPt.x - sampleSize / 2) * dpr;
      const sy = (focusPt.y - sampleSize / 2) * dpr;
      const sSize = sampleSize * dpr;

      // 绘制放大图像
      loupeCtx.drawImage(mainCanvas, sx, sy, sSize, sSize, 0, 0, LOUPE_SIZE, LOUPE_SIZE);

      // 绘制中心十字准星
      const center = LOUPE_SIZE / 2;
      loupeCtx.strokeStyle = '#4F46E5';
      loupeCtx.lineWidth = 1.5;
~~~~~
~~~~~typescript.new
      loupeCtx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
      loupeCtx.fillStyle = CANVAS_THEME.bg.primary;
      loupeCtx.fillRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);

      // 主画布采样的视口区域（直接以触控点为中心，不进行强制边界或网格吸附）
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const sampleSize = LOUPE_SIZE / dynamicZoomFactor;
      const sx = (focusPt.x - sampleSize / 2) * dpr;
      const sy = (focusPt.y - sampleSize / 2) * dpr;
      const sSize = sampleSize * dpr;

      // 绘制放大图像
      loupeCtx.drawImage(mainCanvas, sx, sy, sSize, sSize, 0, 0, LOUPE_SIZE, LOUPE_SIZE);

      // 绘制中心十字准星
      const center = LOUPE_SIZE / 2;
      loupeCtx.strokeStyle = CANVAS_THEME.status.accent;
      loupeCtx.lineWidth = 1.5;
~~~~~

### 下一步建议
1. **运行验证脚本**：在终端运行 `python3 ./scripts/analyze_hardcoded_colors.py` 检验核心包外文件的硬编码色值是否已清零。
2. **推进 Pack 内部重构**：按扩展包（如 `perspective`, `abstraction`, `negative_space`, `color`, `angle` 等）逐批将局部私有 Canvas 接入 `CANVAS_THEME`。
