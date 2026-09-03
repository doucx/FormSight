import { useCallback, useMemo, useRef, useState } from 'preact/hooks';
import { setupHiDpiCanvas } from '../core/canvas/hidpi';
import type { Point } from '../types';
import { CANVAS_THEME } from '../utils/theme';

export const LOUPE_DIAMETER = 104; // 放大镜直径 (px)

export interface UsePointLoupeOptions {
  canvasSize: number;
  gridPoints: Point[];
  disabled?: boolean;
}

export function usePointLoupe({ canvasSize, gridPoints, disabled = false }: UsePointLoupeOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isTouching, setIsTouching] = useState<boolean>(false);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);
  const [currentCanvasPos, setCurrentCanvasPos] = useState<Point | null>(null);

  // 根据当前点阵包围盒跨度动态自适应放大倍率
  const dynamicZoomFactor = useMemo(() => {
    if (!gridPoints || gridPoints.length < 2) return 2.2;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const p of gridPoints) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const spanX = maxX - minX;
    const spanY = maxY - minY;
    const maxSpan = Math.max(spanX, spanY);
    const requiredCoverage = Math.max(maxSpan * 1.3, 36);
    const calculatedZoom = LOUPE_DIAMETER / requiredCoverage;
    return Math.max(1.1, Math.min(3.2, calculatedZoom));
  }, [gridPoints]);

  const updateLoupeCanvas = useCallback(
    (focusPt: Point) => {
      const mainCanvas = canvasRef.current;
      const loupeCanvas = loupeCanvasRef.current;
      if (!mainCanvas || !loupeCanvas) return;

      const loupeCtx = setupHiDpiCanvas(loupeCanvas, LOUPE_DIAMETER, LOUPE_DIAMETER);
      if (!loupeCtx) return;

      loupeCtx.clearRect(0, 0, LOUPE_DIAMETER, LOUPE_DIAMETER);
      loupeCtx.fillStyle = CANVAS_THEME.bg.primary;
      loupeCtx.fillRect(0, 0, LOUPE_DIAMETER, LOUPE_DIAMETER);

      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const sampleSize = LOUPE_DIAMETER / dynamicZoomFactor;
      const sx = (focusPt.x - sampleSize / 2) * dpr;
      const sy = (focusPt.y - sampleSize / 2) * dpr;
      const sSize = sampleSize * dpr;

      loupeCtx.drawImage(
        mainCanvas,
        sx,
        sy,
        sSize,
        sSize,
        0,
        0,
        LOUPE_DIAMETER,
        LOUPE_DIAMETER,
      );

      const center = LOUPE_DIAMETER / 2;
      loupeCtx.strokeStyle = CANVAS_THEME.status.accent;
      loupeCtx.lineWidth = 1.5;

      loupeCtx.beginPath();
      loupeCtx.arc(center, center, 8, 0, Math.PI * 2);
      loupeCtx.stroke();

      loupeCtx.beginPath();
      loupeCtx.moveTo(center - 14, center);
      loupeCtx.lineTo(center - 4, center);
      loupeCtx.moveTo(center + 4, center);
      loupeCtx.lineTo(center + 14, center);
      loupeCtx.moveTo(center, center - 14);
      loupeCtx.lineTo(center, center - 4);
      loupeCtx.moveTo(center, center + 4);
      loupeCtx.lineTo(center, center + 14);
      loupeCtx.stroke();
    },
    [dynamicZoomFactor],
  );

  const getCanvasCoordinates = useCallback(
    (
      clientX: number,
      clientY: number,
    ): { canvasPoint: Point; relX: number; relY: number } | null => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return null;

      const rect = canvas.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const scaleX = canvasSize / rect.width;
      const scaleY = canvasSize / rect.height;

      const clickX = Math.round((clientX - rect.left) * scaleX * 100) / 100;
      const clickY = Math.round((clientY - rect.top) * scaleY * 100) / 100;

      const relX = clientX - containerRect.left;
      const relY = clientY - containerRect.top;

      return {
        canvasPoint: { x: clickX, y: clickY },
        relX,
        relY,
      };
    },
    [canvasSize],
  );

  const startTouch = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled) return null;
      const coords = getCanvasCoordinates(clientX, clientY);
      if (!coords) return null;

      setIsTouching(true);
      setCurrentCanvasPos(coords.canvasPoint);
      setLoupePos({
        x: coords.relX,
        y: coords.relY - 75,
      });
      updateLoupeCanvas(coords.canvasPoint);
      return coords.canvasPoint;
    },
    [disabled, getCanvasCoordinates, updateLoupeCanvas],
  );

  const moveTouch = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled || !isTouching) return null;
      const coords = getCanvasCoordinates(clientX, clientY);
      if (!coords) return null;

      setCurrentCanvasPos(coords.canvasPoint);
      setLoupePos({
        x: coords.relX,
        y: coords.relY - 75,
      });
      updateLoupeCanvas(coords.canvasPoint);
      return coords.canvasPoint;
    },
    [disabled, isTouching, getCanvasCoordinates, updateLoupeCanvas],
  );

  const endTouch = useCallback(() => {
    setIsTouching(false);
    setLoupePos(null);
  }, []);

  return {
    containerRef,
    canvasRef,
    loupeCanvasRef,
    isTouching,
    loupePos,
    currentCanvasPos,
    startTouch,
    moveTouch,
    endTouch,
    getCanvasCoordinates,
  };
}