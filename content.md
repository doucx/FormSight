我已查明原因：在上一轮对 `setupHiDpiCanvas` 的修改中，将 `canvas.style.width` 与 `canvas.style.height` 硬编码为了 `'100%'`。

由于 inline 样式的优先级高于组件上的 Tailwind class，这导致诸如 `abs_polygon_decimation`（折线低模大形）和 `abs_td_hull_2afc`（几何大模寻形）等在提示区（Prompt）使用了局部缩略图尺寸（如 `w-40 h-40`、`w-24 h-24`）的 Canvas 被无条件强行撑大到 100% 满宽，从而撑破并溢出了外层的 `renderPrompt` 提示卡片容器。

我将生成一个修复计划：
1. **收敛 `setupHiDpiCanvas` 的职责**：只负责根据 DPR 计算物理像素分辨率（`canvas.width` / `canvas.height`）并执行 `ctx.scale`，彻底移除对 `canvas.style` 的破坏性覆盖，将 CSS 盒模型尺寸的控制权完全交还给各组件的 Tailwind `className`。
2. **规范 `TopDown2AfcView.tsx` 的提示卡片容器**：为提示图与容器补充明确的溢出保护（`max-w-xs overflow-hidden`）和正方形宽高比锁定。

## [WIP] fix: 清理 setupHiDpiCanvas 样式污染并修复抽象模块提示图尺寸溢出

### 错误分析

1. **`setupHiDpiCanvas` 覆盖了局部 Canvas 尺寸**：底层 `setupHiDpiCanvas` 强行写入了 `style.width = '100%'; style.height = '100%'`，覆盖了 `CanvasView` 上设置的 `w-40 h-40`、`w-24 h-24` 等缩略图限定类，导致提示区画布以 100% 容器宽度爆发性展开。
2. **提示卡片未设防溢出约束**：`TopDown2AfcView.tsx` 中的 `renderPrompt` 容器未指定 `max-w-xs` 与 `overflow-hidden`，在内部子元素变形时直接被撑破。

### 用户需求

解决 `abstraction` 卡包中「折线低模大形」和「几何大模寻形」等卡片上方多边形原图/大模提示区域过大及超出容器的问题，保持紧凑精致且不失真。

### 评论

HiDPI 工具函数的职责应聚焦于底层像素密度映射，不应侵入组件层的 CSS 盒模型布局；尺寸、自适应和最大宽高应由各组件的 JSX 与 Tailwind 类显式管理。

### 目标

1. 净化 `src/core/canvas/hidpi.ts`，移除所有对 `canvas.style.width/height/maxWidth/aspectRatio` 的直接操作。
2. 优化 `src/packs/abstraction/components/TopDown2AfcView.tsx` 中 `renderPrompt` 各模式的容器结构与 Canvas 尺寸定义。

### 基本原理

通过剥离 `setupHiDpiCanvas` 中的样式副作用，让所有全屏大视口（如 `StarCanvas`、`VertexFittingView`）继续使用 `w-full h-full aspect-square` 自适应撑满，而局部缩略图提示（如 `w-36 h-36`、`w-24 h-24`）恢复其预设的小巧尺寸，两者互不干扰。

### 标签

#intent/fix #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/abstraction-prompt-canvas #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 净化 `hidpi.ts`，去除对 canvas.style 的污染

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
  canvas.style.height = '100%';
  canvas.style.maxWidth = '100%';
  canvas.style.aspectRatio = `${logicalWidth} / ${logicalHeight}`;

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

  ctx.resetTransform?.();
  ctx.scale(dpr, dpr);

  return ctx;
}
~~~~~

#### Acts 2: 规范 `TopDown2AfcView.tsx` 中上部提示区的容器排版

~~~~~act
patch_file
src/packs/abstraction/components/TopDown2AfcView.tsx
~~~~~
~~~~~typescript.old
  const renderPrompt = () => {
    if (isPoly && question.detailedPolygon) {
      return (
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_polygon_decimation.promptTitle')}
          </span>
          <CanvasView
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-40 h-40 rounded-xl border border-slate-200 shadow-sm"
            draw={(canvas) =>
              drawPolygonCanvas({
                canvas,
                vertices: question.detailedPolygon,
                size: ABSTRACTION_CANVAS_SIZE,
              })
            }
            deps={[question.detailedPolygon]}
          />
        </div>
      );
    }

    if (mode === 'TD_GESTURE_2AFC') {
      return (
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_td_gesture_2afc.promptTitle')}
          </span>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className="w-24 h-24 rounded-xl border border-slate-200 shadow-sm"
            draw={(canvas) =>
              drawSpinePromptCanvas(canvas, question.promptSpine, ABSTRACTION_THUMB_SIZE)
            }
            deps={[question.promptSpine]}
          />
        </div>
      );
    }

    if (mode === 'TD_HULL_2AFC') {
      return (
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_td_hull_2afc.promptTitle')}
          </span>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className="w-24 h-24 rounded-xl border border-slate-200 shadow-sm"
            draw={(canvas) =>
              drawPolygonCanvas({
                canvas,
                vertices: question.promptHull,
                size: ABSTRACTION_THUMB_SIZE,
                fillColor: '#4F46E5',
                strokeColor: '#3730A3',
              })
            }
            deps={[question.promptHull]}
          />
        </div>
      );
    }

    if (mode === 'TD_NOTAN_2AFC' && question.promptNotanBuffer) {
      return (
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_td_notan_2afc.promptTitle')}
          </span>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className="w-24 h-24 rounded-xl border border-slate-200 shadow-sm"
            draw={(canvas) =>
              drawRawGrayscaleNoiseField(
                canvas,
                question.promptNotanBuffer,
                question.notanFieldDim ?? 120,
                ABSTRACTION_THUMB_SIZE,
              )
            }
            deps={[question.promptNotanBuffer, question.notanFieldDim]}
          />
        </div>
      );
    }

    return null;
  };
~~~~~
~~~~~typescript.new
  const renderPrompt = () => {
    if (isPoly && question.detailedPolygon) {
      return (
        <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner max-w-xs mx-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_polygon_decimation.promptTitle')}
          </span>
          <CanvasView
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-36 h-36 sm:w-40 sm:h-40 aspect-square rounded-xl border border-slate-200 shadow-sm block bg-white"
            draw={(canvas) =>
              drawPolygonCanvas({
                canvas,
                vertices: question.detailedPolygon,
                size: ABSTRACTION_CANVAS_SIZE,
              })
            }
            deps={[question.detailedPolygon]}
          />
        </div>
      );
    }

    if (mode === 'TD_GESTURE_2AFC') {
      return (
        <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner max-w-xs mx-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_td_gesture_2afc.promptTitle')}
          </span>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className="w-24 h-24 aspect-square rounded-xl border border-slate-200 shadow-sm block bg-white"
            draw={(canvas) =>
              drawSpinePromptCanvas(canvas, question.promptSpine, ABSTRACTION_THUMB_SIZE)
            }
            deps={[question.promptSpine]}
          />
        </div>
      );
    }

    if (mode === 'TD_HULL_2AFC') {
      return (
        <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner max-w-xs mx-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_td_hull_2afc.promptTitle')}
          </span>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className="w-24 h-24 aspect-square rounded-xl border border-slate-200 shadow-sm block bg-white"
            draw={(canvas) =>
              drawPolygonCanvas({
                canvas,
                vertices: question.promptHull,
                size: ABSTRACTION_THUMB_SIZE,
                fillColor: '#4F46E5',
                strokeColor: '#3730A3',
              })
            }
            deps={[question.promptHull]}
          />
        </div>
      );
    }

    if (mode === 'TD_NOTAN_2AFC' && question.promptNotanBuffer) {
      return (
        <div className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner max-w-xs mx-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.abstraction.cards.abs_td_notan_2afc.promptTitle')}
          </span>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className="w-24 h-24 aspect-square rounded-xl border border-slate-200 shadow-sm block bg-white"
            draw={(canvas) =>
              drawRawGrayscaleNoiseField(
                canvas,
                question.promptNotanBuffer,
                question.notanFieldDim ?? 120,
                ABSTRACTION_THUMB_SIZE,
              )
            }
            deps={[question.promptNotanBuffer, question.notanFieldDim]}
          />
        </div>
      );
    }

    return null;
  };
~~~~~

### 下一步建议

1. **类型与格式检查**：在终端运行 `npm run check`，确保代码格式和类型通过校验。
2. **界面视觉核验**：
   - 打开「折线低模大形（`abs_polygon_decimation`）」与「几何大模寻形（`abs_td_hull_2afc`）」，确认上方的多边形原图和提示大模大小适中、完全容纳于灰色圆角卡片中。
   - 同时再次核对「寻星（`star`）」与「负形定点（`neg_vertex_fitting`）」的左右两个点阵视口，确认依然保持严格 1:1 正方形且完全等大。
