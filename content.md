好的，我已全面梳理了系统中图表与 Canvas 渲染模糊的根本原因，并将对所有相关可视化绘图函数以及基础交互画布进行 HiDPI / 视网膜屏适配和容器自适应分辨率重构。

以下是修复计划：

## [WIP] fix: 修复图表与交互画布在不同分辨率与高分屏下的渲染模糊问题

### 错误分析

1. **逻辑尺寸与 CSS 容器宽度脱节拉伸**：
   - 全局趋势图（`renderTrendChartCanvas`）在绘图逻辑中硬编码为 340px，而父容器在桌面端常达 500px+，CSS `w-full` 强行将 340px 栅格拉伸了 1.5 倍以上；
   - 认知分析图（SAT 分析、难度抗压分析、色相偏差等）硬编码 320x320 逻辑尺寸，在 `CardAnalyticsView` 容器中被拉伸，且极小字号（8~10px）在插值放大后边缘严重虚化。
2. **基础交互画布缺失 HiDPI / DPR 缩放**：
   - `PointClickCanvas`（主交互画布及触控放大镜）与 `drawPolygonCanvas` 直接获取原生 2D 上下文，未根据设备的 `devicePixelRatio` 设置物理像素与 context scale，在高分屏（Retina / 移动端 / 4K 屏）上始终以 1x 低分辨率绘制。

### 用户需求

彻底消除“能力峰值演进轨迹”、“难度抗压分析”、“反应速度-正确率 (SAT)”以及其他分析图表和做答画布上的模糊、发虚和拉伸现象，确保在任何屏幕缩放比与容器宽度下均呈现锐利清晰的矢量级渲染效果。

### 评论

Canvas 清晰度是视觉认知与色彩训练系统的核心基础体验。通过引入动态逻辑尺寸探测与统一的 HiDPI 像素比缩放管理，不仅能修复现有图表的模糊，还能提升整体界面质感与手眼交互精度。

### 目标

1. 增强 `setupHiDpiCanvas`，支持自适应逻辑尺寸与精确的 CSS 视口映射。
2. 重构 `drawTrendChart.ts` 和 `universalViews.tsx`，动态按画布实际呈现宽度/高度进行自适应高清渲染。
3. 同步重构其余分析图表（`drawHeatmap`、`drawCompass`、`drawColorRing`、`drawHueBiasChart`）。
4. 为 `PointClickCanvas`（包括主画布与 Loupe 放大镜）和 `drawPolygon.ts` 补齐 DPR 高清缩放。

### 基本原理

1. **响应式尺寸探测**：在渲染前通过 `canvas.getBoundingClientRect()` 或父容器宽度获取真实 CSS 像素尺寸，消除位图在 CSS 层面被二次双线性插值放大的问题。
2. **统一 DPR 缩放**：确保 `canvas.width = Math.round(width * dpr)` 且 `canvas.height = Math.round(height * dpr)`，同时通过 `ctx.scale(dpr, dpr)` 保持业务绘图坐标系不变。

### 标签

#intent/fix #flow/ready #priority/high #comp/core #concept/ui #scope/ux #scope/core #ai/instruct #task/domain/ui #task/object/canvas-hidpi-rendering #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 升级基础 HiDPI 工具函数与多边形绘制模块

我们将优化 `setupHiDpiCanvas`，使其不仅设置物理像素尺寸，还同步锁定 CSS 样式宽高，避免不必要的拉伸；并在 `drawPolygonCanvas` 中引入高清屏缩放。

~~~~~act
patch_file
src/core/canvas/hidpi.ts
~~~~~
~~~~~typescript.old
export function setupHiDpiCanvas(
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number,
): CanvasRenderingContext2D | null {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = Math.round(logicalWidth * dpr);
  canvas.height = Math.round(logicalHeight * dpr);
  canvas.style.maxWidth = '100%';
  canvas.style.height = 'auto';

  ctx.resetTransform?.();
  ctx.scale(dpr, dpr);

  return ctx;
}
~~~~~
~~~~~typescript.new
export function setupHiDpiCanvas(
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number,
): CanvasRenderingContext2D | null {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = Math.round(logicalWidth * dpr);
  canvas.height = Math.round(logicalHeight * dpr);
  canvas.style.width = `${logicalWidth}px`;
  canvas.style.height = `${logicalHeight}px`;
  canvas.style.maxWidth = '100%';

  ctx.resetTransform?.();
  ctx.scale(dpr, dpr);

  return ctx;
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
  if (!canvas || !vertices || vertices.length < 3) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);
~~~~~
~~~~~typescript.new
import { setupHiDpiCanvas } from './hidpi';

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
  if (!canvas || !vertices || vertices.length < 3) return;
  const ctx = setupHiDpiCanvas(canvas, size, size);
  if (!ctx) return;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);
~~~~~

#### Acts 2: 修复全局趋势演进图与单次会话趋势图

我们将 `drawTrendChart.ts` 中写死的 340 宽度改为动态探测画布实际 CSS 呈现宽度，解决“能力峰值演进轨迹”被拉伸模糊的根本问题。

~~~~~act
patch_file
src/utils/canvas/drawTrendChart.ts
~~~~~
~~~~~typescript.old
export function renderTrendChartCanvas(
  canvas: HTMLCanvasElement,
  dailyData: Record<string, { total: number; maxLevel: number }>,
) {
  const width = 340;
  const height = 150;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;
~~~~~
~~~~~typescript.new
export function renderTrendChartCanvas(
  canvas: HTMLCanvasElement,
  dailyData: Record<string, { total: number; maxLevel: number }>,
) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.round(rect.width) || canvas.parentElement?.clientWidth || 480;
  const height = 160;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawTrendChart.ts
~~~~~
~~~~~typescript.old
export function renderSessionTrendChartCanvas(
  canvas: HTMLCanvasElement,
  history: SessionHistoryItem[],
) {
  const width = 440;
  const height = 160;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx || history.length === 0) return;
~~~~~
~~~~~typescript.new
export function renderSessionTrendChartCanvas(
  canvas: HTMLCanvasElement,
  history: SessionHistoryItem[],
) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.round(rect.width) || canvas.parentElement?.clientWidth || 440;
  const height = 160;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx || history.length === 0) return;
~~~~~

#### Acts 3: 修复 SAT 与难度抗压分析可视化图表

我们将 `universalViews.tsx` 的基准尺寸从 320x320 升级为动态自适应容器大小，并优化文字字号与清晰度。

~~~~~act
patch_file
src/core/analytics/universalViews.tsx
~~~~~
~~~~~typescript.old
export function renderSpeedAccuracyVisualizer(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
) {
  const width = 320;
  const height = 320;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;
~~~~~
~~~~~typescript.new
export function renderSpeedAccuracyVisualizer(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
) {
  const rect = canvas.getBoundingClientRect();
  const size = Math.round(rect.width) || 340;
  const width = size;
  const height = size;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;
~~~~~

~~~~~act
patch_file
src/core/analytics/universalViews.tsx
~~~~~
~~~~~typescript.old
export function renderDifficultyPlateauVisualizer(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
) {
  const width = 320;
  const height = 320;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;
~~~~~
~~~~~typescript.new
export function renderDifficultyPlateauVisualizer(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
) {
  const rect = canvas.getBoundingClientRect();
  const size = Math.round(rect.width) || 340;
  const width = size;
  const height = size;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;
~~~~~

#### Acts 4: 修复其他分析图表（罗盘、色环、热力图、色相偏差图）

为 `drawCompass`、`drawColorRing`、`drawHeatmap`、`drawHueBiasChart` 同样引入动态尺寸探测与清晰度优化。

~~~~~act
patch_file
src/utils/canvas/drawCompass.ts
~~~~~
~~~~~typescript.old
export function renderCompassCanvas(canvas: HTMLCanvasElement, sectorStats: SectorStat[]) {
  const width = 320;
  const height = 320;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;
~~~~~
~~~~~typescript.new
export function renderCompassCanvas(canvas: HTMLCanvasElement, sectorStats: SectorStat[]) {
  const rect = canvas.getBoundingClientRect();
  const size = Math.round(rect.width) || 340;
  const width = size;
  const height = size;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawColorRing.ts
~~~~~
~~~~~typescript.old
export function renderHueRingCanvas(canvas: HTMLCanvasElement, sectorStats: SectorStat[]) {
  const width = 320;
  const height = 320;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;
~~~~~
~~~~~typescript.new
export function renderHueRingCanvas(canvas: HTMLCanvasElement, sectorStats: SectorStat[]) {
  const rect = canvas.getBoundingClientRect();
  const size = Math.round(rect.width) || 340;
  const width = size;
  const height = size;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawHeatmap.ts
~~~~~
~~~~~typescript.old
export function renderHeatmapCanvas(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
  avgDx: number,
  avgDy: number,
  totalCount: number,
) {
  const width = 320;
  const height = 320;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;
~~~~~
~~~~~typescript.new
export function renderHeatmapCanvas(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
  avgDx: number,
  avgDy: number,
  totalCount: number,
) {
  const rect = canvas.getBoundingClientRect();
  const size = Math.round(rect.width) || 340;
  const width = size;
  const height = size;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawHueBiasChart.ts
~~~~~
~~~~~typescript.old
export function renderHueBiasChartCanvas(canvas: HTMLCanvasElement, records: UnifiedTrialRecord[]) {
  const width = 320;
  const height = 320;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;
~~~~~
~~~~~typescript.new
export function renderHueBiasChartCanvas(canvas: HTMLCanvasElement, records: UnifiedTrialRecord[]) {
  const rect = canvas.getBoundingClientRect();
  const size = Math.round(rect.width) || 340;
  const width = size;
  const height = size;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;
~~~~~

#### Acts 5: 为点阵交互画布与触控放大镜补齐 HiDPI 渲染

修复 `PointClickCanvas.tsx` 中主交互 Canvas 和触控放大镜 Canvas 缺乏 DPR 缩放支持导致的点阵发虚。

~~~~~act
patch_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~typescript.old
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { renderInteractivePointGrid } from '../../core/canvas/drawPointGrid';
import { useTranslation } from '../../core/i18n';
import { findNearestGridPoint } from '../../packs/star/utils/hitDetection';
import type { Point } from '../../types';

export interface PointClickCanvasProps {
  canvasSize: number;
  gridPoints: Point[];
  targetPoint?: Point;
  userNearestPoint?: Point;
  anchors?: (Point | null | undefined)[];
  showAnswer: boolean;
  isHit?: boolean;
  disabled?: boolean;
  maxDisplayWidth?: string;
  customOverlayRender?: (ctx: CanvasRenderingContext2D) => void;
  onCommitPoint: (point: Point) => void;
}
~~~~~
~~~~~typescript.new
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { renderInteractivePointGrid } from '../../core/canvas/drawPointGrid';
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { useTranslation } from '../../core/i18n';
import { findNearestGridPoint } from '../../packs/star/utils/hitDetection';
import type { Point } from '../../types';

export interface PointClickCanvasProps {
  canvasSize: number;
  gridPoints: Point[];
  targetPoint?: Point;
  userNearestPoint?: Point;
  anchors?: (Point | null | undefined)[];
  showAnswer: boolean;
  isHit?: boolean;
  disabled?: boolean;
  maxDisplayWidth?: string;
  customOverlayRender?: (ctx: CanvasRenderingContext2D) => void;
  onCommitPoint: (point: Point) => void;
}
~~~~~

~~~~~act
patch_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~typescript.old
  // 1. 渲染主画布内容
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderInteractivePointGrid({
      ctx,
      canvasSize,
      gridPoints,
      targetPoint,
      userNearestPoint,
      hoverPoint,
      anchors,
      showAnswer,
      isHit,
      disabled,
    });

    customOverlayRender?.(ctx);
  }, [
    canvasSize,
    gridPoints,
    targetPoint,
    userNearestPoint,
    hoverPoint,
    anchors,
    showAnswer,
    isHit,
    disabled,
    customOverlayRender,
  ]);

  // 2. 渲染放大镜画布内容
  const updateLoupeCanvas = useCallback(
    (focusPt: Point) => {
      const mainCanvas = canvasRef.current;
      const loupeCanvas = loupeCanvasRef.current;
      if (!mainCanvas || !loupeCanvas) return;

      const loupeCtx = loupeCanvas.getContext('2d');
      if (!loupeCtx) return;

      loupeCtx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);

      // 主画布采样的视口区域
      const sampleSize = LOUPE_SIZE / ZOOM_FACTOR;
      const sx = Math.max(0, Math.min(canvasSize - sampleSize, focusPt.x - sampleSize / 2));
      const sy = Math.max(0, Math.min(canvasSize - sampleSize, focusPt.y - sampleSize / 2));

      // 绘制放大图像
      loupeCtx.drawImage(mainCanvas, sx, sy, sampleSize, sampleSize, 0, 0, LOUPE_SIZE, LOUPE_SIZE);
~~~~~
~~~~~typescript.new
  // 1. 渲染主画布内容
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = setupHiDpiCanvas(canvas, canvasSize, canvasSize);
    if (!ctx) return;

    renderInteractivePointGrid({
      ctx,
      canvasSize,
      gridPoints,
      targetPoint,
      userNearestPoint,
      hoverPoint,
      anchors,
      showAnswer,
      isHit,
      disabled,
    });

    customOverlayRender?.(ctx);
  }, [
    canvasSize,
    gridPoints,
    targetPoint,
    userNearestPoint,
    hoverPoint,
    anchors,
    showAnswer,
    isHit,
    disabled,
    customOverlayRender,
  ]);

  // 2. 渲染放大镜画布内容
  const updateLoupeCanvas = useCallback(
    (focusPt: Point) => {
      const mainCanvas = canvasRef.current;
      const loupeCanvas = loupeCanvasRef.current;
      if (!mainCanvas || !loupeCanvas) return;

      const loupeCtx = setupHiDpiCanvas(loupeCanvas, LOUPE_SIZE, LOUPE_SIZE);
      if (!loupeCtx) return;

      loupeCtx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);

      // 主画布采样的视口区域（注意考虑主画布的实际物理像素与逻辑像素对应）
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const sampleSize = LOUPE_SIZE / ZOOM_FACTOR;
      const sx = Math.max(0, Math.min(canvasSize - sampleSize, focusPt.x - sampleSize / 2)) * dpr;
      const sy = Math.max(0, Math.min(canvasSize - sampleSize, focusPt.y - sampleSize / 2)) * dpr;
      const sSize = sampleSize * dpr;

      // 绘制放大图像
      loupeCtx.drawImage(mainCanvas, sx, sy, sSize, sSize, 0, 0, LOUPE_SIZE, LOUPE_SIZE);
~~~~~

---

### 下一步建议

1. **构建与类型检查**：执行 `npm run check` 确保所有 TypeScript 类型及 Biome 代码规范检查通过。
2. **端到端视觉验证**：在高分屏（Retina 显示器或移动端设备）上分别验证“认知统计大盘”、“单卡认知分析”以及“寻星点阵训练”，检查折线、文字和点阵的清晰锐利度。
