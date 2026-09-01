## [WIP] 把 CSS 的控制权交还给上层 React 组件与具体的图表渲染函数

这是因为我们在上一次修复「分析视图图表被拉伸变形」时，采取了一个较为粗暴的底层修复方案：在 `src/core/canvas/hidpi.ts` 的 `setupHiDpiCanvas` 核心函数中，强制为所有 Canvas 添加了内联样式 `canvas.style.width = width + 'px';`。

### 原有设计的目的与冲突分析

1. **训练卡片的原有设计 (`w-full aspect-square`)**：
   训练卡片（如 `star_single`、`neg_vertex_fitting`）的逻辑是在内存中创建一个固定尺寸的高清位图（比如逻辑上是 500x500，在 Retina 屏上物理缓冲区是 1000x1000），然后通过 Tailwind CSS 类名 `w-full h-full aspect-square` 将其**自适应地挤压/拉伸**到页面容器中（比如手机上只有 340px 宽）。
   这是一种非常优雅的响应式设计：物理像素极高保证清晰度，CSS 负责布局弹性。

2. **冲突原因 (CSS 特异性覆盖)**：
   我们在底层的 `setupHiDpiCanvas` 中强制注入了 `style="width: 500px; height: 500px;"`。
   在浏览器的 CSS 优先级中，**内联样式 (`style`) 的优先级高于 Tailwind 的工具类 (`w-full`)**。
   因此，原本通过 `w-full` 随容器缩小的 Canvas，被强行锁死在了 500px 宽，导致其溢出容器（比如 340px 的容器），破坏了所有布局。

### 优雅的解决方案

为了兼顾「训练卡片的响应式自适应」与「数据分析图表的防模糊比例控制」，我们需要**把 CSS 的控制权交还给上层 React 组件与具体的图表渲染函数**：

1. **还原底层的纯粹性**：将 `setupHiDpiCanvas` 恢复到只负责管理物理像素缓冲区的状态，移除对 `canvas.style` 的入侵。
2. **在静态图表层显式声明基准尺寸**：仅在那些没有用 CSS 强制约束比例的**数据分析图表绘制函数**（如折线图、热力图）中，显式指定它们需要的 `style` 尺寸。
3. **补充响应式缩放属性 (`h-auto`)**：在分析视图容器中增加 `h-auto`，配合 `max-w-full`，使内联写死的 540x260 基准尺寸能够在窄屏设备上像图片一样等比缩放。

---

### 开始修复代码

#### 1. 还原 `hidpi.ts` 核心绘图底座，解除内联样式强制绑定
我们将移除对 `canvas.style` 的直接修改，将其交还给各个图表自己的上下文，同时在专门用于分析图表的 `initSquareHiDpiCanvas` 中补齐。

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

  ctx.resetTransform?.();
  ctx.scale(dpr, dpr);

  return ctx;
}
~~~~~

~~~~~act
patch_file
src/core/canvas/hidpi.ts
~~~~~
~~~~~typescript
export function initSquareHiDpiCanvas(
  canvas: HTMLCanvasElement,
  fallbackSize = 340,
  bgColor: string = CANVAS_THEME.bg.secondary,
): InitSquareCanvasResult | null {
  const rect = canvas.getBoundingClientRect();
  const size = Math.round(rect.width) || fallbackSize;
  const ctx = setupHiDpiCanvas(canvas, size, size);
  if (!ctx) return null;

  if (bgColor) {
~~~~~
~~~~~typescript
export function initSquareHiDpiCanvas(
  canvas: HTMLCanvasElement,
  fallbackSize = 340,
  bgColor: string = CANVAS_THEME.bg.secondary,
): InitSquareCanvasResult | null {
  const rect = canvas.getBoundingClientRect();
  const size = Math.round(rect.width) || fallbackSize;
  const ctx = setupHiDpiCanvas(canvas, size, size);
  if (!ctx) return null;

  // 专属分析图表的正方形绘图，补齐基准 CSS 尺寸
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;

  if (bgColor) {
~~~~~

#### 2. 在非正方形分析图表中手动补充基准 CSS 尺寸
在趋势图（Trend）和分形粗糙度图表中，补全它们自身的 CSS 尺寸定义，以防物理放大后的位图占据屏幕过大面积。

~~~~~act
patch_file
src/core/canvas/charts/drawTrendChart.ts
~~~~~
~~~~~typescript
  const width = Math.round(rect.width) || canvas.parentElement?.clientWidth || 480;
  const height = 160;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  const padding = { top: 20, right: 20, bottom: 25, left: 30 };
~~~~~
~~~~~typescript
  const width = Math.round(rect.width) || canvas.parentElement?.clientWidth || 480;
  const height = 160;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const padding = { top: 20, right: 20, bottom: 25, left: 30 };
~~~~~

~~~~~act
patch_file
src/core/canvas/charts/drawTrendChart.ts
~~~~~
~~~~~typescript
  const width = Math.round(rect.width) || canvas.parentElement?.clientWidth || 440;
  const height = 160;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx || history.length === 0) return;

  const padding = { top: 25, right: 25, bottom: 30, left: 45 };
~~~~~
~~~~~typescript
  const width = Math.round(rect.width) || canvas.parentElement?.clientWidth || 440;
  const height = 160;
  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx || history.length === 0) return;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const padding = { top: 25, right: 25, bottom: 30, left: 45 };
~~~~~

~~~~~act
patch_file
src/cards/fractal_edge_roughness/utils/charts.ts
~~~~~
~~~~~typescript
  const height = 260;

  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  // 背景填充
~~~~~
~~~~~typescript
  const height = 260;

  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  // 背景填充
~~~~~

~~~~~act
patch_file
src/cards/fractal_edge_roughness/utils/charts.ts
~~~~~
~~~~~typescript
  const height = 230;

  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  ctx.fillStyle = CANVAS_THEME.bg.primary;
~~~~~
~~~~~typescript
  const height = 230;

  const ctx = setupHiDpiCanvas(canvas, width, height);
  if (!ctx) return;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.fillStyle = CANVAS_THEME.bg.primary;
~~~~~

#### 3. 增强数据分析视图的 CSS 等比响应特性 (`h-auto`)
为了使带有内联样式（比如 `width: 540px; height: 260px`）的 Canvas 图表能在更窄的手机屏幕中无损缩放且不被压扁，追加 `h-auto`。

~~~~~act
patch_file
src/views/CardAnalyticsView.tsx
~~~~~
~~~~~tsx
          <div className="lg:col-span-7 flex items-center justify-center bg-muted/40 p-4 sm:p-6 rounded-3xl border border-border shadow-inner relative min-h-[320px] overflow-hidden">
            <canvas
              key={`${card.id}-${currentView.id}`}
              ref={canvasRef}
              className="max-w-full rounded-2xl border border-border/60 shadow-xs block"
            />
          </div>
~~~~~
~~~~~tsx
          <div className="lg:col-span-7 flex items-center justify-center bg-muted/40 p-4 sm:p-6 rounded-3xl border border-border shadow-inner relative min-h-[320px] overflow-hidden">
            <canvas
              key={`${card.id}-${currentView.id}`}
              ref={canvasRef}
              className="max-w-full h-auto rounded-2xl border border-border/60 shadow-xs block"
            />
          </div>
~~~~~

### 总结机制
通过这套修改，逻辑回归到最完美的隔离状态：
1. **对于所有训练卡片**：`setupHiDpiCanvas` 只单纯提供放大了一倍（Retina 屏）物理像素的高清空白缓冲区，不触碰任何 CSS 尺寸。外层 React 组件赋予它们的 `w-full aspect-square` 将毫无阻碍地生效。
2. **对于分析界面的统计图表**：这些图表在绘制代码内部声明自己「天生应该是多宽多高」，但受到父组件 `max-w-full h-auto` 保护机制的作用。当手机屏幕较窄时，`max-width` 生效挤压宽度，而 `h-auto` 指示浏览器自动根据它内联声明的原生高宽比向下压缩高度，从而既保持锐利的高分屏图像，又完美等比自适应布局。
