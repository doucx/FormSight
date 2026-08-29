/**
 * 配置 Canvas 支持 Retina / HiDPI 屏幕高清渲染
 * @param canvas HTML Canvas 元素
 * @param logicalWidth 逻辑宽度 (CSS 像素)
 * @param logicalHeight 逻辑高度 (CSS 像素)
 * @returns 预设好 scale 的 2D 绘图上下文
 */
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

export interface InitSquareCanvasResult {
  ctx: CanvasRenderingContext2D;
  size: number;
}

/**
 * 快速初始化正方形高清 Canvas，自动适配容器宽度、HiDPI 缩放并填充背景色
 */
export function initSquareHiDpiCanvas(
  canvas: HTMLCanvasElement,
  fallbackSize = 340,
  bgColor = '#F8FAFC',
): InitSquareCanvasResult | null {
  const rect = canvas.getBoundingClientRect();
  const size = Math.round(rect.width) || fallbackSize;
  const ctx = setupHiDpiCanvas(canvas, size, size);
  if (!ctx) return null;

  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
  }

  return { ctx, size };
}

/**
 * 快速获取 2D 绘图上下文并填充默认背景色（轻量 2D 绘制专用）
 */
export function setup2DCanvas(
  canvas: HTMLCanvasElement | null,
  size: number,
  bgColor = '#FFFFFF',
): CanvasRenderingContext2D | null {
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
  }

  return ctx;
}
