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

export interface InitSquareCanvasResult {
  ctx: CanvasRenderingContext2D;
  size: number;
}

/**
 * 快速初始化正方形高清 Canvas，自动适配容器宽度、HiDPI 缩放并填充背景色
 */
import { CANVAS_THEME } from '../../utils/theme';

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
  bgColor: string = CANVAS_THEME.bg.primary,
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
