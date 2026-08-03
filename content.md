这个改进方案非常符合几何训练的精度与交互诉求。通过在 Canvas 交互层引入网格点感应邻域，不仅能让用户在选点前有明确的高亮预判，还消除了手部抖动对像素误差计算带来的噪声干扰。

以下是完整的 Quipu 改进计划与代码 patch。

## [WIP] feat: 点阵悬停高亮与网格点吸附对齐

### 用户需求
1. 鼠标靠近网格点时略微变大高亮，给出选点感知预估。
2. 作答点必须严格吸附至网格点中心，错误/正确图标与误差指示虚线直接锚定在该网格点上。
3. 点击空白区域（远离任何网格点，超出感应范围）的操作将被忽略，不触发答题。

### 评论
这显著改进了几何寻星训练的交互精确度。用户不再需要承受鼠标微小微调误差的心理负担，而是将注意力完全集中在推演目标网格点位置本身，彻底实现了从“像素点匹配”到“网格几何逻辑推演”的转变。

### 目标
1. 扩展 `HitResult` 类型定义，增加 `isWithinRange` 感应范围标识。
2. 在 `geometry.ts` 中新增 `findNearestGridPoint` 辅助函数，并优化 `checkHit` 函数：
   - 计算感应阈值 `maxRadius`（取 `gridStep * 0.55`）。
   - 将误差计算距离设为吸附后的网格点与目标点之间的像素距离。
3. 修改 `StarCanvas.tsx`：
   - 增加 `hoverPoint` 状态及 `onMouseMove` / `onMouseLeave` 事件处理。
   - 在交互 Canvas 渲染层绘制放大高亮的悬停网格点。
   - 点击时过滤掉超出感应范围的点击。
   - 反馈层（红点标记与红色误差虚线）统一绑定至吸附后的 `nearestGridPoint`。
4. 修改 `TrainingView.tsx`：
   - 记录存储到数据库的 `userClick` 坐标使用吸附后的网格点中心坐标。

### 基本原理
通过在 Canvas 交互层接入极小范围的邻域检索（Nearest-Point Distance Check），将连续的屏幕鼠标坐标离散化（Quantize）至最近的网格点。这保证了渲染层、交互反馈层与底层数据分析层的一致性与严谨度。

### 标签
#intent/build #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/grid-hover-and-snap #task/action/implementation #task/state/continue

---

### Script

#### Acts 1: 更新类型定义 `HitResult`

在 `src/types/index.ts` 中新增 `isWithinRange` 属性，标记点击是否落在有效网格点感应范围内。

~~~~~act
patch_file
src/types/index.ts
~~~~~
~~~~~ts.old
export interface HitResult {
  isHit: boolean;            // 是否选中正确的网格点
  nearestGridPoint: Point;   // 用户点击位置对应的网格点
  errorDistance: number;     // 点击位置与真理点的像素误差
}
~~~~~
~~~~~ts.new
export interface HitResult {
  isHit: boolean;            // 是否选中正确的网格点
  nearestGridPoint: Point;   // 用户点击位置对应的网格点
  errorDistance: number;     // 点击位置与真理点的像素误差
  isWithinRange?: boolean;   // 是否落在有效点击感应范围内
}
~~~~~

#### Acts 2: 增加最近网格点感应检索与判定逻辑

在 `src/utils/geometry.ts` 中，增加 `findNearestGridPoint` 函数，并改写 `checkHit` 计算吸附距离。

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~ts.old
/**
 * 点击作答 Hit Detection：判定用户的点击坐标是否击中了真理点 B 所在的网格
 */
export function checkHit(
  clickPoint: Point,
  targetB: Point,
  gridStart: Point,
  gridStep: number,
  dim: number = DEFAULT_GRID_DIM
): HitResult {
  const gridPoints = generateGridPoints(gridStart, dim, gridStep);

  // 1. 寻找离用户点击位置最近的网格点
  let nearestGridPoint = gridPoints[0];
  let minDistance = calcDistance(clickPoint, nearestGridPoint);

  for (let i = 1; i < gridPoints.length; i++) {
    const dist = calcDistance(clickPoint, gridPoints[i]);
    if (dist < minDistance) {
      minDistance = dist;
      nearestGridPoint = gridPoints[i];
    }
  }

  // 2. 判断该最近网格点是否与真理点 B 重合（极小误差范围内）
  const distToTarget = calcDistance(nearestGridPoint, targetB);
  const isHit = distToTarget < 0.5;

  // 3. 计算点击坐标与真理点 B 的直接像素偏差
  const errorDistance = calcDistance(clickPoint, targetB);

  return {
    isHit,
    nearestGridPoint,
    errorDistance,
  };
}
~~~~~
~~~~~ts.new
/**
 * 寻找最近的网格点及感应范围判定
 */
export function findNearestGridPoint(
  clickPoint: Point,
  gridStart: Point,
  gridStep: number,
  dim: number = DEFAULT_GRID_DIM
): { nearestPoint: Point; minDistance: number; isWithinRange: boolean } {
  const gridPoints = generateGridPoints(gridStart, dim, gridStep);
  let nearestPoint = gridPoints[0];
  let minDistance = calcDistance(clickPoint, nearestPoint);

  for (let i = 1; i < gridPoints.length; i++) {
    const dist = calcDistance(clickPoint, gridPoints[i]);
    if (dist < minDistance) {
      minDistance = dist;
      nearestPoint = gridPoints[i];
    }
  }

  // 判定感应半径：网格步长的 55%
  const maxRadius = gridStep * 0.55;
  return {
    nearestPoint,
    minDistance,
    isWithinRange: minDistance <= maxRadius,
  };
}

/**
 * 点击作答 Hit Detection：判定用户的点击坐标是否击中了真理点 B 所在的网格
 */
export function checkHit(
  clickPoint: Point,
  targetB: Point,
  gridStart: Point,
  gridStep: number,
  dim: number = DEFAULT_GRID_DIM
): HitResult {
  const { nearestPoint, isWithinRange } = findNearestGridPoint(
    clickPoint,
    gridStart,
    gridStep,
    dim
  );

  // 1. 判断吸附后网格点与真理点 B 的直接偏差
  const errorDistance = calcDistance(nearestPoint, targetB);
  const isHit = errorDistance < 0.5;

  return {
    isHit,
    nearestGridPoint: nearestPoint,
    errorDistance,
    isWithinRange,
  };
}
~~~~~

#### Acts 3: 在 Canvas 组件中实现悬停高亮、吸附对齐与范围过滤

更新 `src/components/StarCanvas.tsx`，加入悬停高亮渲染、点击忽略逻辑以及对齐锚定。

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~ts.old
import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { QuestionData, Point, HitResult } from '../types';
import { checkHit, generateGridPoints, CANVAS_SIZE } from '../utils/geometry';
~~~~~
~~~~~ts.new
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { QuestionData, Point, HitResult } from '../types';
import { checkHit, findNearestGridPoint, generateGridPoints, CANVAS_SIZE } from '../utils/geometry';
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~ts.old
export function StarCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarCanvasProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // === 绘图主逻辑 ===
~~~~~
~~~~~ts.new
export function StarCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarCanvasProps) {
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  // === 绘图主逻辑 ===
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~ts.old
        // 图层 1: 干扰点阵 (底层)
        const gridPoints = generateGridPoints(
          question.gridStart,
          question.gridDim,
          question.gridStep
        );
        gridPoints.forEach((p) => {
          drawDot(ctx, p.x, p.y, '#888888', 3.5);
        });

        // 图层 2: 锚点 (顶层)
~~~~~
~~~~~ts.new
        // 图层 1: 干扰点阵 (底层)
        const gridPoints = generateGridPoints(
          question.gridStart,
          question.gridDim,
          question.gridStep
        );
        gridPoints.forEach((p) => {
          drawDot(ctx, p.x, p.y, '#888888', 3.5);
        });

        // 图层 1.5: 鼠标悬停高亮网格点
        if (!disabled && !showAnswer && hoverPoint) {
          drawDot(ctx, hoverPoint.x, hoverPoint.y, '#4F46E5', 6);
        }

        // 图层 2: 锚点 (顶层)
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~ts.old
          // 如果回答错或有用户点击坐标，绘制误差连线与点击位置
          if (userAnswer) {
            const { clickPoint, hitResult } = userAnswer;

            if (!hitResult.isHit) {
              // 绘制红色虚线误差指示
              ctx.strokeStyle = '#FF0000';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(clickPoint.x, clickPoint.y);
              ctx.lineTo(bx, by);
              ctx.stroke();
              ctx.setLineDash([]); // 恢复实线

              // 用户实点击位置标记 (红点)
              drawDot(ctx, clickPoint.x, clickPoint.y, '#FF0000', 3.5);
            }
          }
        }
      }
    }
  }, [question, showAnswer, userAnswer]);
~~~~~
~~~~~ts.new
          // 如果回答错或有用户点击坐标，绘制误差连线与点击位置
          if (userAnswer) {
            const { hitResult } = userAnswer;
            const chosenPoint = hitResult.nearestGridPoint;

            if (!hitResult.isHit) {
              // 绘制红色虚线误差指示
              ctx.strokeStyle = '#FF0000';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(chosenPoint.x, chosenPoint.y);
              ctx.lineTo(bx, by);
              ctx.stroke();
              ctx.setLineDash([]); // 恢复实线

              // 用户点击位置标记 (红点 - 锚定在网格点中心)
              drawDot(ctx, chosenPoint.x, chosenPoint.y, '#FF0000', 3.5);
            }
          }
        }
      }
    }
  }, [question, showAnswer, userAnswer, hoverPoint, disabled]);
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~ts.old
  // === 交互事件：点击右侧 Canvas 做答 ===
  const handleRightCanvasClick = (e: MouseEvent) => {
    if (disabled || showAnswer) return;

    const canvas = rightCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // 换算 CSS 实际像素到 Canvas 逻辑像素 (500x500)
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX * 100) / 100;
    const clickY = Math.round((e.clientY - rect.top) * scaleY * 100) / 100;

    const clickPoint: Point = { x: clickX, y: clickY };
    const hitResult = checkHit(
      clickPoint,
      question.targetB,
      question.gridStart,
      question.gridStep,
      question.gridDim
    );

    onAnswer(clickPoint, hitResult);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-5xl mx-auto">
      {/* 左侧参考 Canvas */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner"
        />
      </div>

      {/* 右侧交互 Canvas */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm">
        <canvas
          ref={rightCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onClick={handleRightCanvasClick}
          className={`w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
          }`}
        />
      </div>
    </div>
  );
}
~~~~~
~~~~~ts.new
  // === 交互事件：鼠标移动计算悬停高亮点 ===
  const handleRightCanvasMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer) {
      if (hoverPoint) setHoverPoint(null);
      return;
    }

    const canvas = rightCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX * 100) / 100;
    const clickY = Math.round((e.clientY - rect.top) * scaleY * 100) / 100;

    const currentPoint: Point = { x: clickX, y: clickY };
    const { nearestPoint, isWithinRange } = findNearestGridPoint(
      currentPoint,
      question.gridStart,
      question.gridStep,
      question.gridDim
    );

    if (isWithinRange) {
      setHoverPoint(nearestPoint);
    } else if (hoverPoint) {
      setHoverPoint(null);
    }
  };

  const handleRightCanvasMouseLeave = () => {
    if (hoverPoint) setHoverPoint(null);
  };

  // === 交互事件：点击右侧 Canvas 做答 ===
  const handleRightCanvasClick = (e: MouseEvent) => {
    if (disabled || showAnswer) return;

    const canvas = rightCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // 换算 CSS 实际像素到 Canvas 逻辑像素 (500x500)
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX * 100) / 100;
    const clickY = Math.round((e.clientY - rect.top) * scaleY * 100) / 100;

    const clickPoint: Point = { x: clickX, y: clickY };
    const hitResult = checkHit(
      clickPoint,
      question.targetB,
      question.gridStart,
      question.gridStep,
      question.gridDim
    );

    // 忽略在有效感应范围之外的点击
    if (!hitResult.isWithinRange) return;

    setHoverPoint(null);
    onAnswer(clickPoint, hitResult);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-5xl mx-auto">
      {/* 左侧参考 Canvas */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm">
        <canvas
          ref={leftCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner"
        />
      </div>

      {/* 右侧交互 Canvas */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm">
        <canvas
          ref={rightCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onClick={handleRightCanvasClick}
          onMouseMove={handleRightCanvasMouseMove}
          onMouseLeave={handleRightCanvasMouseLeave}
          className={`w-full max-w-[380px] lg:max-w-[420px] aspect-square rounded-xl border border-gray-100 bg-white shadow-inner transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
          }`}
        />
      </div>
    </div>
  );
}
~~~~~

#### Acts 4: 绑字吸附后的用户点击坐标至试题记录

修改 `src/views/TrainingView.tsx`，保存答题记录时将 `userClick` 坐标绑定到吸附后的网格点上。

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~ts.old
    // 1. 存数据库原子记录
    const record: TrialRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: sessionIdRef.current,
      mode,
      timestamp: Date.now(),
      gridStep: question.gridStep,
      anchorA: [question.anchorA.x, question.anchorA.y],
      anchorC: question.anchorC ? [question.anchorC.x, question.anchorC.y] : undefined,
      targetB: [question.targetB.x, question.targetB.y],
      userClick: [clickPoint.x, clickPoint.y],
      angleDegree: question.angleDegree,
      distanceRatio: question.distanceRatio,
      isHit: hitResult.isHit,
      errorPixelDistance: hitResult.errorDistance,
      responseTimeMs,
    };
~~~~~
~~~~~ts.new
    // 1. 存数据库原子记录
    const record: TrialRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: sessionIdRef.current,
      mode,
      timestamp: Date.now(),
      gridStep: question.gridStep,
      anchorA: [question.anchorA.x, question.anchorA.y],
      anchorC: question.anchorC ? [question.anchorC.x, question.anchorC.y] : undefined,
      targetB: [question.targetB.x, question.targetB.y],
      userClick: [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y],
      angleDegree: question.angleDegree,
      distanceRatio: question.distanceRatio,
      isHit: hitResult.isHit,
      errorPixelDistance: hitResult.errorDistance,
      responseTimeMs,
    };
~~~~~

---

### 下一步建议
1. **测试交互手感**：启动开发服务器 (`npm run dev`)，验证鼠标划过答题区时网格点是否能流畅放大高亮，以及点击空白处是否能正确忽略操作。
2. **移动端适配**：如果后续需要支持触摸屏（Touch Event），可以考虑将 `onTouchMove` 和 `onTouchEnd` 同样绑定至网格点的感应吸附逻辑。
