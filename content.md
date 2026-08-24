好的，我们将为点阵交互的核心底座组件 **`PointClickCanvas.tsx`** 实现**触控拖拽定位与实时浮动放大镜（Magnifier Loupe）机制**。

当用户在手机或触控屏上按住并滑动时，手指上方 70px 处会自动浮现一个带十字准星与 2.5 倍放大的圆形放大镜，并在手指移动时实时磁吸最近点，松手时精准确认提交，彻底解决胖手指遮挡高密微小点阵（如 3.5px 极小间距）的痛点。该优化将一举惠及 **寻星三卡（`star` 全系列）**、**负形边界反切定点（`negative_space`）** 与 **3D 结构空间翻转（`perspective`）**。

## [WIP] feat(common): 为 PointClickCanvas 增加触控拖拽与浮动放大镜 (Loupe) 机制

### 用户需求
解决移动端触控屏在点阵类题型（寻星盲打、负形反切定点、3D 透视点阵）中手指遮挡目标点及点击精度不足（胖手指问题）的缺陷，支持触摸滑动试探与放大镜辅助对齐。

### 评论
在高难度层阶（Level 30+）下，点阵间距会缩小至 3.5px~5px，远小于人手手指接触面（约 30px~40px）。如果没有放大镜与拖拽预览机制，移动端用户不仅完全看不清接触点下方的点阵排布，且极易误触非目标点。加入浮动放大镜与“按住滑动对齐 ➔ 抬手提交”交互，是触控端高精度定位的最优人机工程学解法。

### 目标
1. 在 `PointClickCanvas.tsx` 中包裹相对定位容器，并引入 `onTouchStart`、`onTouchMove`、`onTouchEnd` 与 `onTouchCancel` 触控手势。
2. 当发生触控手势时，在手指接触点上方（若靠顶则智能翻转至下方）渲染直径 100px、2.5 倍缩放且自带中心十字准星的圆形放大镜。
3. 拖动过程中实时磁吸最近有效点阵点，松手抬起时精准触发 `onCommitPoint` 提交。
4. 保持桌面端鼠标悬停与点击交互不受任何影响。

### 基本原理
利用子 Canvas 的 `drawImage` 对主画布进行局部裁切并以 2.5 倍率绘制至圆形放大镜中，叠加中心十字微准星，结合触摸坐标正交反算与 `findNearestGridPoint` 碰撞检测，在不增加额外绘图开销的前提下提供像素级的高清局部视野。

### 标签
#intent/build #flow/ready #priority/critical #comp/ui #concept/ui #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/point-click-loupe #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 升级 `PointClickCanvas.tsx` 实现触控拖拽与实时放大镜

~~~~~act
write_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~tsx
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { renderInteractivePointGrid } from '../../core/canvas/drawPointGrid';
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
  maxDisplayWidth = 'max-w-[380px] lg:max-w-[420px]',
  customOverlayRender,
  onCommitPoint,
}: PointClickCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
  const [isTouching, setIsTouching] = useState<boolean>(false);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);
  const [currentCanvasPos, setCurrentCanvasPos] = useState<Point | null>(null);

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
      loupeCtx.drawImage(
        mainCanvas,
        sx,
        sy,
        sampleSize,
        sampleSize,
        0,
        0,
        LOUPE_SIZE,
        LOUPE_SIZE,
      );

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

  // 3. 屏幕坐标换算为画布坐标
  const getCanvasCoordinates = useCallback(
    (clientX: number, clientY: number): { canvasPoint: Point; relX: number; relY: number } | null => {
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

  // 鼠标悬停与移动
  const handleMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer || !gridPoints.length || isTouching) return;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const { nearestPoint, isWithinRange } = findNearestGridPoint(coords.canvasPoint, gridPoints);

    if (isWithinRange) {
      setHoverPoint(nearestPoint);
    } else if (hoverPoint) {
      setHoverPoint(null);
    }
  };

  const handleMouseLeave = () => {
    if (!isTouching && hoverPoint) setHoverPoint(null);
  };

  // 鼠标普通点击
  const handleClick = (e: MouseEvent) => {
    if (disabled || showAnswer || !gridPoints.length || isTouching) return;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const { nearestPoint, isWithinRange } = findNearestGridPoint(coords.canvasPoint, gridPoints);
    if (!isWithinRange) return;

    setHoverPoint(null);
    onCommitPoint(nearestPoint);
  };

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

  // 触控松手确认提交
  const handleTouchEnd = () => {
    if (disabled || showAnswer || !isTouching) return;
    setIsTouching(false);
    setLoupePos(null);

    if (hoverPoint) {
      const commitPt = hoverPoint;
      setHoverPoint(null);
      onCommitPoint(commitPt);
    } else if (currentCanvasPos) {
      const { nearestPoint, isWithinRange } = findNearestGridPoint(currentCanvasPos, gridPoints);
      if (isWithinRange) {
        setHoverPoint(null);
        onCommitPoint(nearestPoint);
      }
    }
  };

  const handleTouchCancel = () => {
    setIsTouching(false);
    setLoupePos(null);
    setHoverPoint(null);
  };

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
        aria-label="点阵做答画布"
        className={`w-full aspect-square rounded-xl border border-gray-100 bg-white shadow-inner touch-none transition-all ${
          disabled || showAnswer
            ? 'cursor-default'
            : hoverPoint
              ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
              : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
        }`}
      />

      {/* 触控浮动放大镜 (Loupe) */}
      {isTouching && loupePos && (
        <div
          className="absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-600 shadow-2xl bg-white ring-4 ring-indigo-500/25 overflow-hidden animate-in zoom-in-75 duration-75"
          style={{
            left: `${loupePos.x}px`,
            top: `${loupePos.y}px`,
            width: `${LOUPE_SIZE}px`,
            height: `${LOUPE_SIZE}px`,
          }}
        >
          <canvas
            ref={loupeCanvasRef}
            width={LOUPE_SIZE}
            height={LOUPE_SIZE}
            className="w-full h-full block"
          />
        </div>
      )}
    </div>
  );
}
~~~~~

### 下一步建议
1. **真机与模拟器测试**：在移动端浏览器或 Chrome 触控模拟下进入寻星三卡（`star_single`、`star_double_h`、`star_double_r`），按住屏幕滑动测试放大镜跟随、局部放大清晰度与抬手磁吸判定的准确率。
2. **多模块验证**：同时抽检负形边界反切定点（`VertexFittingView`）与 3D 结构空间翻转（`StructureProjection3DView`），确认这些复用 `PointClickCanvas` 的模块在移动端均能自动获得放大镜辅助支持。
