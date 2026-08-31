已针对点阵画布（`PointClickCanvas.tsx`）中的放大镜交互完成重构设计，满足以下三项要求：
1. 移除靠近边缘时的翻转反弹逻辑，放大镜位置始终稳定跟随手指上方；
2. 放大镜采样中心直接跟随触控坐标，不再吸附至网格点，保留自然的手指移动反馈；
3. 根据 `gridPoints` 的包围盒跨度动态计算放大倍率，确保放大镜视野完整容纳所有点阵点。

## [WIP] refactor: 优化点阵放大镜动态倍率与连续触控定位体验

### 用户需求
1. 移除放大镜在画布边缘翻转反弹的逻辑，保持稳定的触控指示位置。
2. 放大镜倍率应基于点阵分布范围自动计算并微调，确保放大镜视野能完整覆盖所有点。
3. 放大镜采样中心取消对离散网格点的跳变吸附，保持与手指实际坐标的连续跟随。

### 评论
放大镜吸附在离散点上会造成视觉跳跃，破坏用户对实际微调偏移的连续感知；而在边缘翻转则会造成触控遮挡与视觉闪烁。通过点阵包围盒自适应计算视野倍率，并使放大镜视角连续跟随触控点，能够显著提升移动端盲打与精准定点的操作体验。

### 目标
1. 在 `PointClickCanvas.tsx` 中基于 `gridPoints` 动态计算 `dynamicZoomFactor`，确保采样视口能完整容纳全部点阵。
2. 移除 `handleTouchStart` / `handleTouchMove` 中的 `flipDown` 边缘反弹判断。
3. 将 `updateLoupeCanvas` 的采样焦点固定为 `coords.canvasPoint`，取消吸附偏移。

### 基本原理
1. 通过遍历 `gridPoints` 计算点阵的包围盒跨度 `maxSpan`，结合安全边距计算出最小覆盖尺寸，进而得出最佳放大倍率 `dynamicZoomFactor`。
2. 放大镜的绘制采样以用户的真实触控坐标为几何中心，十字靶心精确指示手指位置，网格高亮仅作为命中候选提示，互不冲突。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/point-click-canvas #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 重构 PointClickCanvas 放大镜倍率与触控逻辑

~~~~~act
patch_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~typescript.old
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

const LOUPE_SIZE = 104; // 放大镜直径 (px)
const ZOOM_FACTOR = 2.5; // 放大倍率

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
~~~~~typescript.new
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
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

const LOUPE_SIZE = 104; // 放大镜直径 (px)

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

  // 根据当前点阵包围盒跨度动态自适应放大倍率，确保视野至少完整容纳全部点阵
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

    // 为点阵边缘保留适当边距
    const requiredCoverage = Math.max(maxSpan * 1.3, 36);
    const calculatedZoom = LOUPE_SIZE / requiredCoverage;
    return Math.max(1.1, Math.min(3.2, calculatedZoom));
  }, [gridPoints]);
~~~~~

~~~~~act
patch_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~typescript.old
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

      // 绘制中心十字准星
      const center = LOUPE_SIZE / 2;
      loupeCtx.strokeStyle = '#4F46E5';
      loupeCtx.lineWidth = 1.5;

      // 环形中心靶心
      loupeCtx.beginPath();
      loupeCtx.arc(center, center, 8, 0, Math.PI * 2);
      loupeCtx.stroke();

      // 十字延伸刻度
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
    [canvasSize],
  );
~~~~~
~~~~~typescript.new
  // 2. 渲染放大镜画布内容
  const updateLoupeCanvas = useCallback(
    (focusPt: Point) => {
      const mainCanvas = canvasRef.current;
      const loupeCanvas = loupeCanvasRef.current;
      if (!mainCanvas || !loupeCanvas) return;

      const loupeCtx = setupHiDpiCanvas(loupeCanvas, LOUPE_SIZE, LOUPE_SIZE);
      if (!loupeCtx) return;

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

      // 环形中心靶心
      loupeCtx.beginPath();
      loupeCtx.arc(center, center, 8, 0, Math.PI * 2);
      loupeCtx.stroke();

      // 十字延伸刻度
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
~~~~~

~~~~~act
patch_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~typescript.old
  // 触控开始
  const handleTouchStart = (e: TouchEvent) => {
    if (disabled || showAnswer || !gridPoints.length || !e.touches[0]) return;
    const touch = e.touches[0];
    const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;

    setIsTouching(true);
    setCurrentCanvasPos(coords.canvasPoint);

    // 计算放大镜位置（默认在手指上方 72px，若超出顶部则自动翻转至下方）
    const flipDown = coords.relY < 90;
    setLoupePos({
      x: coords.relX,
      y: flipDown ? coords.relY + 75 : coords.relY - 75,
    });

    const { nearestPoint, isWithinRange } = findNearestGridPoint(coords.canvasPoint, gridPoints);
    setHoverPoint(isWithinRange ? nearestPoint : null);
    updateLoupeCanvas(isWithinRange ? nearestPoint : coords.canvasPoint);
  };

  // 触控移动
  const handleTouchMove = (e: TouchEvent) => {
    if (disabled || showAnswer || !gridPoints.length || !e.touches[0] || !isTouching) return;
    if (e.cancelable) e.preventDefault();

    const touch = e.touches[0];
    const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;

    setCurrentCanvasPos(coords.canvasPoint);

    const flipDown = coords.relY < 90;
    setLoupePos({
      x: coords.relX,
      y: flipDown ? coords.relY + 75 : coords.relY - 75,
    });

    const { nearestPoint, isWithinRange } = findNearestGridPoint(coords.canvasPoint, gridPoints);
    setHoverPoint(isWithinRange ? nearestPoint : null);
    updateLoupeCanvas(isWithinRange ? nearestPoint : coords.canvasPoint);
  };
~~~~~
~~~~~typescript.new
  // 触控开始
  const handleTouchStart = (e: TouchEvent) => {
    if (disabled || showAnswer || !gridPoints.length || !e.touches[0]) return;
    const touch = e.touches[0];
    const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;

    setIsTouching(true);
    setCurrentCanvasPos(coords.canvasPoint);

    // 放大镜稳定位于手指正上方 75px，不进行翻转
    setLoupePos({
      x: coords.relX,
      y: coords.relY - 75,
    });

    const { nearestPoint, isWithinRange } = findNearestGridPoint(coords.canvasPoint, gridPoints);
    setHoverPoint(isWithinRange ? nearestPoint : null);
    updateLoupeCanvas(coords.canvasPoint);
  };

  // 触控移动
  const handleTouchMove = (e: TouchEvent) => {
    if (disabled || showAnswer || !gridPoints.length || !e.touches[0] || !isTouching) return;
    if (e.cancelable) e.preventDefault();

    const touch = e.touches[0];
    const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;

    setCurrentCanvasPos(coords.canvasPoint);

    // 放大镜稳定位于手指正上方 75px，不进行翻转
    setLoupePos({
      x: coords.relX,
      y: coords.relY - 75,
    });

    const { nearestPoint, isWithinRange } = findNearestGridPoint(coords.canvasPoint, gridPoints);
    setHoverPoint(isWithinRange ? nearestPoint : null);
    updateLoupeCanvas(coords.canvasPoint);
  };
~~~~~

### 下一步建议
- 在移动端或触控模拟设备上测试点阵寻星模式，确认放大镜在手指移动过程中平滑跟随、无跳变。
- 确认当网格由 2x2 变为 5x5 时，放大镜视野中的全部点阵均可完整可见。
