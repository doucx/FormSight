我将修复分析视图中 Canvas 被强制拉伸为正方形以及在高清屏（HiDPI）下渲染模糊的问题。

## [WIP] fix(canvas): 修复分析图表被强制拉伸为正方形及 HiDPI 模糊问题

### 错误分析
1. **强制正方形拉伸原因**：`src/views/CardAnalyticsView.tsx` 中在 `<canvas>` 元素上硬编码了 `w-full max-w-[340px] aspect-square` 以及 `width={320} height={320}`。CSS 的 `aspect-ratio: 1 / 1` 强行锁死了所有图表的显示容器宽高比，导致非 1:1 比例的分析图表（如 2:1 的偏置折线图、横向条形图）被严重挤压变形。
2. **显示模糊与重采样发虚原因**：`setupHiDpiCanvas`（`src/core/canvas/hidpi.ts`）在设置 `canvas.width = logicalWidth * dpr` 与 `canvas.height = logicalHeight * dpr` 后，未显式将 `canvas.style.width` 与 `canvas.style.height` 锁定为对应的逻辑像素尺寸，导致当外部 CSS 尺寸与 Canvas 位图物理尺寸不一致时，浏览器触发了二次插值拉伸，导致线条和文字模糊发虚。

### 用户需求
修复分析模块中的图表渲染问题，使 Canvas 能够根据各个图表本身的逻辑宽高比（正方形罗盘、宽屏趋势散点图、横向进度柱等）自适应正确展示，同时在高分屏 (Retina / HiDPI) 下保持锐利清晰。

### 评论
该修复对于整个系统的图表呈现质量至关重要。将 Canvas 容器从硬编码的正方形中解绑，并在底层 HiDPI 适配层规范 CSS 逻辑尺寸与位图物理像素的映射关系，能够彻底解决全站所有卡片分析视图中的变形与模糊问题。

### 目标
1. 在 `src/core/canvas/hidpi.ts` 中的 `setupHiDpiCanvas` 函数内，同步设置 `canvas.style.width` 与 `canvas.style.height`，确保 CSS 逻辑尺寸与渲染缓冲区严格绑定。
2. 修改 `src/views/CardAnalyticsView.tsx`，移除 `<canvas>` 上硬编码的 `aspect-square`、`width={320}`、`height={320}` 等冲突样式，提供自适应居中容器。
3. 优化 `src/cards/fractal_edge_roughness/utils/charts.ts` 中的宽度探测逻辑，优先读取容器有效宽度，保障图表在不同屏幕宽度下的自适应呈现。

### 基本原理
HiDPI 渲染的标准模式要求画布元素的像素缓冲区尺寸（`canvas.width/height`）等于 `逻辑尺寸 × dpr`，而屏幕 CSS 尺寸（`canvas.style.width/height`）严格等于 `逻辑尺寸`。通过在底层建立这种双向绑定，并清除上层容器的硬性宽高比限制，浏览器将以 1:1 物理像素点对点渲染，既不会发生非等比形变，也不会产生位图放大拉伸的模糊。

### 标签
#intent/fix #flow/ready #priority/high #comp/core #comp/cards #concept/ui #scope/ux #ai/instruct #task/domain/canvas #task/object/hidpi-viewport #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 在 `hidpi.ts` 中将 CSS 样式宽高与逻辑尺寸严格绑定

修复 `setupHiDpiCanvas`，确保设置 `canvas.width/height` 物理像素的同时，显式同步 `canvas.style.width/height`。

~~~~~act
patch_file
src/core/canvas/hidpi.ts
~~~~~
~~~~~typescript
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

  ctx.resetTransform?.();
  ctx.scale(dpr, dpr);

  return ctx;
}
~~~~~
~~~~~typescript
export function setupHiDpiCanvas(
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number,
): CanvasRenderingContext2D | null {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const width = Math.round(logicalWidth);
  const height = Math.round(logicalHeight);

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.resetTransform?.();
  ctx.scale(dpr, dpr);

  return ctx;
}
~~~~~

#### Acts 2: 移除 `CardAnalyticsView.tsx` 中写死的 `aspect-square` 约束

解除对图表 Canvas 的强制正方形拉伸限制，让各类图表根据自身的高宽比自然渲染。

~~~~~act
patch_file
src/views/CardAnalyticsView.tsx
~~~~~
~~~~~typescript
          {/* 左侧 Canvas 可视化区 */}
          <div className="lg:col-span-7 flex justify-center bg-muted/40 p-6 rounded-3xl border border-border shadow-inner relative">
            <canvas
              key={`${card.id}-${currentView.id}`}
              ref={canvasRef}
              width={320}
              height={320}
              className="w-full max-w-[340px] aspect-square rounded-2xl border border-border/60 shadow-xs"
            />
          </div>
~~~~~
~~~~~typescript
          {/* 左侧 Canvas 可视化区 */}
          <div className="lg:col-span-7 flex items-center justify-center bg-muted/40 p-4 sm:p-6 rounded-3xl border border-border shadow-inner relative min-h-[320px] overflow-hidden">
            <canvas
              key={`${card.id}-${currentView.id}`}
              ref={canvasRef}
              className="max-w-full rounded-2xl border border-border/60 shadow-xs block"
            />
          </div>
~~~~~

#### Acts 3: 优化分形边缘图表的自适应宽度计算

使粗糙度偏置图和频段图能够灵敏感知父容器宽度，并在合适宽高比下清晰绘制。

~~~~~act
patch_file
src/cards/fractal_edge_roughness/utils/charts.ts
~~~~~
~~~~~typescript
export function renderRoughnessBiasChart(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
): void {
  const rect = canvas.getBoundingClientRect();
  const width = Math.round(rect.width) || 520;
  const height = 260;

  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;
~~~~~
~~~~~typescript
export function renderRoughnessBiasChart(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
): void {
  const parentWidth = canvas.parentElement ? canvas.parentElement.clientWidth - 48 : 500;
  const width = Math.min(540, Math.max(300, parentWidth));
  const height = 260;

  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;
~~~~~

~~~~~act
patch_file
src/cards/fractal_edge_roughness/utils/charts.ts
~~~~~
~~~~~typescript
export function renderRoughnessBandChart(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
): void {
  const rect = canvas.getBoundingClientRect();
  const width = Math.round(rect.width) || 520;
  const height = 240;

  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;
~~~~~
~~~~~typescript
export function renderRoughnessBandChart(
  canvas: HTMLCanvasElement,
  records: UnifiedTrialRecord[],
): void {
  const parentWidth = canvas.parentElement ? canvas.parentElement.clientWidth - 48 : 500;
  const width = Math.min(540, Math.max(300, parentWidth));
  const height = 230;

  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;
~~~~~

### 下一步建议
1. 打开「分形边缘粗糙度」、「色相偏差」及其他卡片的分析视图，验证图表是否恢复了自然的宽高比，且文字和线条清晰无锯齿。
2. 确认在移动端与桌面端视口缩放时，图表能自适应居中呈现。
