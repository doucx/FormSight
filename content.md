拉伸的根本原因在于：`setupHiDpiCanvas` 原先直接设置了固定的 inline `style.width = '500px'` 和 `style.height = '500px'`，配合 `max-width: 100%` 时，宽度随父容器收缩但高度被固定在 500px，导致 Canvas 纵向严重变形拉伸。

我将生成一个修复计划，优化 `setupHiDpiCanvas` 的宽高比与样式自适应规则，并为左右卡片及内部画布设置严格等比的正方形（`aspect-square`）约束。

## [WIP] fix: 消除点阵视口拉伸变形并强制保持正方形宽高比

### 错误分析

1. **Inline 样式覆盖 `aspect-ratio`**：`setupHiDpiCanvas` 原本将 `style.height` 显式设为逻辑像素高度（如 `500px`），当容器宽度受限时，`max-width: 100%` 缩小了宽度，但高度依然为 `500px`，导致绘制内容被强制纵向拉伸为非正方形。
2. **容器宽高比未锁定**：外层卡片容器仅限制了宽度，未声明 `aspect-square`，导致外框与内部画布在 Flex 布局下未能按 1:1 锁定。

### 用户需求

确保寻星点阵左右两个视口及其外部卡片均为严格的 1:1 正方形，杜绝任何拉伸与失真。

### 评论

对于空间方位感知与距离估计训练而言，保持 1:1 真实正方形比例至关重要，否则会破坏用户的距离与角度直觉。

### 目标

1. 改造 `src/core/canvas/hidpi.ts` 中的 `setupHiDpiCanvas`，将固定像素 height 调整为 `aspectRatio` + `height: auto`，确保所有 Canvas 响应式缩放时严格保持正方形。
2. 更新 `src/packs/star/views/StarCanvas.tsx`，将左右卡片及其子元素设置为严格对称的 `w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] aspect-square`。

### 基本原理

通过 CSS `aspectRatio: `${logicalWidth} / ${logicalHeight}`` 和 `height: 'auto'`，使得不论画布处于何种父容器宽度下，其高度都将严格按比例由宽度决定，从而在任何分辨率下均保持绝对无畸变的正方形。

### 标签

#intent/fix #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/canvas-aspect-ratio #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 修复 `hidpi.ts` 中的画布宽高比机制

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
  canvas.style.width = `${logicalWidth}px`;
  canvas.style.height = `${logicalHeight}px`;
  canvas.style.maxWidth = '100%';

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
  canvas.style.maxWidth = `${logicalWidth}px`;
  canvas.style.aspectRatio = `${logicalWidth} / ${logicalHeight}`;
  canvas.style.height = 'auto';

  ctx.resetTransform?.();
  ctx.scale(dpr, dpr);

  return ctx;
}
~~~~~

#### Acts 2: 调整 `StarCanvas.tsx` 左右窗格卡片为严格等大正方形

~~~~~act
patch_file
src/packs/star/views/StarCanvas.tsx
~~~~~
~~~~~typescript.old
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-5xl mx-auto">
      <div className="flex-1 w-full max-w-[380px] lg:max-w-[420px] bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col items-center justify-center">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full aspect-square rounded-xl border border-gray-100 bg-white shadow-inner block"
        />
      </div>

      <div className="flex-1 w-full max-w-[380px] lg:max-w-[420px] bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col items-center justify-center">
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.hitResult.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.hitResult.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full"
          onCommitPoint={handleCommitPoint}
        />
      </div>
    </div>
  );
~~~~~
~~~~~typescript.new
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

### 下一步建议

1. **运行代码质量检查**：执行 `npm run check` 验证格式与类型。
2. **在浏览器中测试**：打开单锚点或双锚点寻星练习，确认左右两块区域呈现标准的 1:1 正方形，且网格圆点无任何椭圆或拉伸形变。
