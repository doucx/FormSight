我们将修复 `src/components/common/PointClickCanvas.tsx` 中对已废弃的旧 `src/packs/star/utils/hitDetection` 路径的残留引用，改为直接从核心几何模块 `src/core/geometry/pointGrid.ts` 导入点阵吸附计算函数。

## [WIP] fix: 修复 PointClickCanvas 对已废弃 star pack 路径的引用

### 错误分析
在完成阶段 1 绞杀旧 `src/packs/star/` 后，Vite 构建报错 `Failed to resolve import "../../packs/star/utils/hitDetection" from "src/components/common/PointClickCanvas.tsx"`。
其根本原因是公共组件 `PointClickCanvas.tsx` 历史残留地引用了 `src/packs/star/utils/hitDetection` 中的 `findNearestGridPoint` 别名。而实际上该算法的通用实现早已收敛于核心通用几何库 `src/core/geometry/pointGrid.ts`（`findNearestPointInGrid`）。

### 用户需求
修复 Vite 模块解析失败问题，使 `PointClickCanvas.tsx` 正确引用 `src/core/geometry/pointGrid.ts`。

### 评论
公共通用组件不应该向下依赖特定业务卡片或扩展包的私有目录。将几何点阵查找函数直接从 `src/core/geometry/pointGrid` 引入是彻底解耦、符合架构规范的做法。

### 目标
1. 修改 `src/components/common/PointClickCanvas.tsx`。
2. 替换旧的 `../../packs/star/utils/hitDetection` 导入为 `../../core/geometry/pointGrid` 中的 `findNearestPointInGrid`。

### 基本原理
`src/core/geometry/pointGrid.ts` 导出了 `findNearestPointInGrid(clickPoint, gridPoints)`，其返回签名与行为与原 `findNearestGridPoint` 完全一致。直接引用该核心模块可消除残留耦合。

### 标签
#intent/fix #flow/ready #priority/critical #comp/runtime #concept/parser #scope/core #ai/instruct #task/domain/architecture #task/object/point-click-canvas #task/action/bug-fix #task/state/continue #task/status/active

---

### Script

#### Acts 1: 修复 `PointClickCanvas.tsx` 模块引用

将导入源替换为 `../../core/geometry/pointGrid` 并直接调用 `findNearestPointInGrid`。

~~~~~act
patch_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~typescript.old
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { useTranslation } from '../../core/i18n';
import { findNearestGridPoint } from '../../packs/star/utils/hitDetection';
import type { Point } from '../../types';
import { CANVAS_THEME } from '../../utils/theme';
~~~~~
~~~~~typescript.new
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { findNearestPointInGrid } from '../../core/geometry/pointGrid';
import { useTranslation } from '../../core/i18n';
import type { Point } from '../../types';
import { CANVAS_THEME } from '../../utils/theme';
~~~~~

~~~~~act
patch_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
  // 鼠标悬停与移动
  const handleMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer || !gridPoints.length || isTouching) return;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(coords.canvasPoint, gridPoints);

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

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(coords.canvasPoint, gridPoints);
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

    // 放大镜稳定位于手指正上方 75px，不进行翻转
    setLoupePos({
      x: coords.relX,
      y: coords.relY - 75,
    });

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(coords.canvasPoint, gridPoints);
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

    const { nearestPoint, isWithinRange } = findNearestPointInGrid(coords.canvasPoint, gridPoints);
    setHoverPoint(isWithinRange ? nearestPoint : null);
    updateLoupeCanvas(coords.canvasPoint);
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
      const { nearestPoint, isWithinRange } = findNearestPointInGrid(currentCanvasPos, gridPoints);
      if (isWithinRange) {
        setHoverPoint(null);
        onCommitPoint(nearestPoint);
      }
    }
  };
~~~~~

### 下一步建议
导入路径修复完毕后，请刷新/重启 Vite 预览服务器进行验证。确认构建成功后，可继续进入**阶段 2: 几何与结构域迁移 (Angle 3 张 & Perspective 5 张)**。
