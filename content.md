出现“右侧比左侧小”的根本原因在于两个相互叠加的样式限制：

1. **`setupHiDpiCanvas` 中的 `maxWidth` 限制了右侧画布**：`setupHiDpiCanvas` 原本将 `canvas.style.maxWidth` 硬编码为 `logicalWidth`（如负形定点的 340px）。当外部卡片容器宽度为 380px~420px 时，左侧普通 Canvas 撑满了容器（约 350~390px），而右侧交互 Canvas 被限制在最大 340px，导致右边明显比左边小一圈。
2. **`PointClickCanvas` 包装容器未撑满**：`PointClickCanvas` 根容器原先使用了 `inline-block w-full`，未声明 `h-full aspect-square`，在居中布局下没有完全填满外层卡片。
3. **两列未分配等比例 `flex-1`**：外层包装卡片未声明 `flex-1`，导致 Flexbox 在分配剩余空间时根据两边子元素的固有宽度产生了不对称。

我将生成一个修复计划，彻底解决尺寸不一致的问题。

## [WIP] fix: 消除画布 maxWidth 限制并统一左右视口 100% 满充正方形

### 错误分析

1. **`setupHiDpiCanvas` 硬编码 `style.maxWidth = logicalWidth`**：逻辑分辨率 `logicalWidth`（如 340px）被写入行内样式作为最大宽度，使右侧 Canvas 在更宽的屏幕上无法跟随卡片容器放大，导致右侧永远比左侧小。
2. **`PointClickCanvas` 未继承 100% 宽高**：内部包装层缺少 `h-full` 约束，导致右侧内容盒模型小于左侧。
3. **外层卡片缺少 `flex-1` 对称分配**：Flex 容器未能强制给左右两列分配完全等同的宽度比例。

### 用户需求

彻底确保寻星及负形点阵模块中，左侧参考窗格与右侧交互窗格在视觉上完全等大，且均为标准的 1:1 正方形。

### 评论

左右两画布完全等大是几何定位与构图对比训练的基石，确保两边像素与物理尺寸 1:1 对齐可以彻底消除眼睛在两边切换时的比例错觉。

### 目标

1. 修复 `src/core/canvas/hidpi.ts`，将 `canvas.style.maxWidth` 统一为 `'100%'`，并设置 `width: '100%'; height: '100%'`，使 Canvas 始终由外层卡片容器尺寸驱动。
2. 更新 `src/components/common/PointClickCanvas.tsx`，将内部包装层与 canvas 均设为 `w-full h-full aspect-square block`。
3. 为 `StarCanvas.tsx` 和 `VertexFittingView.tsx` 左右两外层卡片添加 `flex-1` 约束，确保两侧在 Flexbox 中获得绝对均等的空间。

### 基本原理

通过让 Canvas 和中间包装层无条件继承父容器的 `w-full h-full aspect-square`，并将外层左右两个卡片均设为 `flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square`，使两个卡片及内部画布由同一组响应式规则完全对称地约束，从根本上杜绝任何尺寸差异。

### 标签

#intent/fix #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/point-grid-symmetric-viewport #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 修复 `hidpi.ts` 解决逻辑像素限制画布撑满的问题

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
  canvas.style.width = '100%';
  canvas.style.maxWidth = `${logicalWidth}px`;
  canvas.style.aspectRatio = `${logicalWidth} / ${logicalHeight}`;
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
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.maxWidth = '100%';
  canvas.style.aspectRatio = `${logicalWidth} / ${logicalHeight}`;

  ctx.resetTransform?.();
  ctx.scale(dpr, dpr);

  return ctx;
}
~~~~~

#### Acts 2: 修复 `PointClickCanvas.tsx` 包装层确保 100% 撑满

~~~~~act
patch_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~typescript.old
export function PointClickCanvas({
  canvasSize,
  gridPoints,
  targetPoint,
  userNearestPoint,
  anchors = [],
  showAnswer,
  isHit = false,
  disabled = false,
  maxDisplayWidth = 'max-w-[380px] lg:max-w-[420px]',
  customOverlayRender,
  onCommitPoint,
}: PointClickCanvasProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
  const [isTouching, setIsTouching] = useState<boolean>(false);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);
  const [currentCanvasPos, setCurrentCanvasPos] = useState<Point | null>(null);
~~~~~
~~~~~typescript.new
export function PointClickCanvas({
  canvasSize,
  gridPoints,
  targetPoint,
  userNearestPoint,
  anchors = [],
  showAnswer,
  isHit = false,
  disabled = false,
  maxDisplayWidth = 'w-full h-full aspect-square',
  customOverlayRender,
  onCommitPoint,
}: PointClickCanvasProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
  const [isTouching, setIsTouching] = useState<boolean>(false);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);
  const [currentCanvasPos, setCurrentCanvasPos] = useState<Point | null>(null);
~~~~~

~~~~~act
patch_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~typescript.old
  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full ${maxDisplayWidth} select-none`}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
        }}
        tabIndex={0}
        role="button"
        aria-label={t('shell.pointGridAria')}
        className={`w-full aspect-square rounded-xl border border-gray-100 bg-white shadow-inner touch-none transition-all ${
          disabled || showAnswer
            ? 'cursor-default'
            : hoverPoint
              ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
              : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
        }`}
      />
~~~~~
~~~~~typescript.new
  return (
    <div
      ref={containerRef}
      className={`relative block ${maxDisplayWidth} select-none`}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
        }}
        tabIndex={0}
        role="button"
        aria-label={t('shell.pointGridAria')}
        className={`w-full h-full aspect-square rounded-xl border border-gray-100 bg-white shadow-inner touch-none transition-all block ${
          disabled || showAnswer
            ? 'cursor-default'
            : hoverPoint
              ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
              : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
        }`}
      />
~~~~~

#### Acts 3: 优化 `StarCanvas.tsx` 与 `VertexFittingView.tsx` 双卡片对称属性

~~~~~act
patch_file
src/packs/star/views/StarCanvas.tsx
~~~~~
~~~~~typescript.old
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
      <div className="w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-white p-3 sm:p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-center">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-gray-100 bg-white shadow-inner block"
        />
      </div>

      <div className="w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-white p-3 sm:p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-center">
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.hitResult.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.hitResult.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          onCommitPoint={handleCommitPoint}
        />
      </div>
    </div>
  );
~~~~~
~~~~~typescript.new
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-white p-3 sm:p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-center">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-gray-100 bg-white shadow-inner block"
        />
      </div>

      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-white p-3 sm:p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-center">
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.hitResult.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.hitResult.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          onCommitPoint={handleCommitPoint}
        />
      </div>
    </div>
  );
~~~~~

~~~~~act
patch_file
src/packs/negative_space/components/VertexFittingView.tsx
~~~~~
~~~~~typescript.old
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
      <div className="w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-white p-3 sm:p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-center">
        <canvas
          ref={leftFittingRef}
          width={FITTING_CANVAS_SIZE}
          height={FITTING_CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-gray-100 bg-white shadow-inner block"
        />
      </div>

      <div className="w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-white p-3 sm:p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-center">
        <PointClickCanvas
          canvasSize={FITTING_CANVAS_SIZE}
          gridPoints={question.distractorPoints || []}
          targetPoint={question.targetPoint}
          userNearestPoint={userAnswer?.nearestGridPoint}
          showAnswer={showAnswer}
          isHit={userAnswer?.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          customOverlayRender={handleCustomOverlayRender}
          onCommitPoint={onAnswer}
        />
      </div>
    </div>
  );
~~~~~
~~~~~typescript.new
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-5xl mx-auto">
      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-white p-3 sm:p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-center">
        <canvas
          ref={leftFittingRef}
          width={FITTING_CANVAS_SIZE}
          height={FITTING_CANVAS_SIZE}
          className="w-full h-full aspect-square rounded-xl border border-gray-100 bg-white shadow-inner block"
        />
      </div>

      <div className="flex-1 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square bg-white p-3 sm:p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-center">
        <PointClickCanvas
          canvasSize={FITTING_CANVAS_SIZE}
          gridPoints={question.distractorPoints || []}
          targetPoint={question.targetPoint}
          userNearestPoint={userAnswer?.nearestGridPoint}
          showAnswer={showAnswer}
          isHit={userAnswer?.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          customOverlayRender={handleCustomOverlayRender}
          onCommitPoint={onAnswer}
        />
      </div>
    </div>
  );
~~~~~

### 下一步建议

1. **类型与语法检查**：在终端运行 `npm run check`，验证无报错。
2. **多端实际渲染验证**：打开「负形边界反切定点」和「单锚点模式」，在不同窗口缩放下确认左右两块区域（包括外部卡片与内部画布）在物理尺寸上完全 1:1 对等。
