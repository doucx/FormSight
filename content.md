好的。这正是将网格生成逻辑从“全局屏幕坐标系”转换为“与题目空间紧密绑定的相对坐标系”的最后一块拼图。

同时，针对极点周围圆弧过于稠密导致的**黑点粘连问题**，我们在渲染层面上加入了**动态距离半径缩放**：当单锚点模式下干扰点靠近 $A$ 点时，随着距离缩小，其绘制半径将线性缩小。这在视觉上依然保留了极坐标网格的几何暗示（向心聚合），却避免了污损画布。

我将生成并执行代码替换计划。

## [WIP] refactor: 将干扰网格升级为基于锚点的极坐标和仿射网格

### 用户需求
1.  修改单锚点网格生成逻辑为**扇形分布**（极坐标）。
2.  修改双锚点网格生成逻辑为**透视分布**（仿射坐标）。
3.  确保距离过近的干扰点渲染时会**自动缩小**以避免视觉重叠粘连。

### 评论
使用绝对的方形网格会破坏训练中的等效感知，引入极坐标和仿射网格是从直觉上重构视觉训练的最优解。而在渲染层根据距离控制 `radius`，则以最轻量化的方式解决了拓扑聚集带来的 UI 显示问题，没有破坏几何网格本身的连续性。

### 目标
1.  在 `src/utils/geometry.ts` 中废弃旧的 `generateGridPoints`，实现 `generateDynamicGridPoints`。
2.  更新碰撞检测和吸附判定（`findNearestGridPoint`, `checkHit`），使其使用新的动态网格。
3.  在 `src/components/StarCanvas.tsx` 中更新网格渲染逻辑，支持近点半径动态收缩。

### 基本原理
新的生成算法将依赖于 `anchorA`、`anchorC` 和 `targetB`：
- **单锚点**：计算 $B$ 相对于 $A$ 的极角和距离。根据距离决定角度步幅，以此铺设同心圆和放射线。
- **双锚点**：建立由向量 $AC$ 决定的基底向量 $\vec{u}$ 和法线向量 $\vec{v}$。网格在这个倾斜的基底上按一定规则展开，高度离基底越远产生些许透视放大。

### 标签
#intent/refine #flow/ready #priority/high #comp/core #concept/ui #ai/brainstorm #task/domain/geometry #task/object/distractor-mesh #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 重构网格生成与检测逻辑

在 `geometry.ts` 中替换掉死板的坐标网格生成器。

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~old
/**
 * 根据 GridStart、维度和步长生成全量干扰点阵坐标数组
 */
export function generateGridPoints(gridStart: Point, dim: number, step: number): Point[] {
  const points: Point[] = [];
  for (let r = 0; r < dim; r++) {
    for (let c = 0; c < dim; c++) {
      points.push({
        x: Math.round((gridStart.x + c * step) * 100) / 100,
        y: Math.round((gridStart.y + r * step) * 100) / 100,
      });
    }
  }
  return points;
}

/**
 * 寻找最近的网格点及感应范围判定
 */
export function findNearestGridPoint(
  clickPoint: Point,
  gridStart: Point,
  gridStep: number,
  dim: number = DEFAULT_GRID_DIM,
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
  dim: number = DEFAULT_GRID_DIM,
): HitResult {
  const { nearestPoint, isWithinRange } = findNearestGridPoint(
    clickPoint,
    gridStart,
    gridStep,
    dim,
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
~~~~~new
/**
 * 动态生成符合视知觉规律的干扰点阵
 */
export function generateDynamicGridPoints(
  mode: TrainingMode,
  anchorA: Point,
  anchorC: Point | null,
  targetB: Point,
  gridStep: number,
  dim: number = DEFAULT_GRID_DIM,
): Point[] {
  const halfDim = Math.floor(dim / 2);
  const points: Point[] = [];

  if (mode === 'single') {
    // 极坐标扇形网格
    const dx = targetB.x - anchorA.x;
    const dy = targetB.y - anchorA.y;
    const Rb = Math.sqrt(dx * dx + dy * dy);
    const thetaB = Math.atan2(dy, dx);

    const effectiveR = Math.max(Rb, 30);
    const deltaTheta = gridStep / effectiveR;

    for (let rIdx = -halfDim; rIdx <= halfDim; rIdx++) {
      const r = Rb + rIdx * gridStep;
      if (r <= 0) continue; // 跳过反方向或原点

      for (let tIdx = -halfDim; tIdx <= halfDim; tIdx++) {
        const theta = thetaB + tIdx * deltaTheta;
        points.push({
          x: Math.round((anchorA.x + r * Math.cos(theta)) * 100) / 100,
          y: Math.round((anchorA.y + r * Math.sin(theta)) * 100) / 100,
        });
      }
    }
  } else {
    // 双锚点：基线仿射透视网格
    if (!anchorC) return [];
    const acX = anchorC.x - anchorA.x;
    const acY = anchorC.y - anchorA.y;
    const acLen = Math.sqrt(acX * acX + acY * acY);

    if (acLen < 1) return [];

    const ux = acX / acLen;
    const uy = acY / acLen;
    const vx = -uy;
    const vy = ux;

    const abX = targetB.x - anchorA.x;
    const abY = targetB.y - anchorA.y;
    const pB = abX * ux + abY * uy;
    const hB = abX * vx + abY * vy;

    for (let pIdx = -halfDim; pIdx <= halfDim; pIdx++) {
      const p = pB + pIdx * gridStep;
      for (let hIdx = -halfDim; hIdx <= halfDim; hIdx++) {
        const hOffset = hIdx * gridStep;
        const hCurrent = hB + hOffset;
        
        // 距离缩放：离 AC 基线越远，网格高度自然放大（透视效果）
        const heightScale = 1 + 0.3 * (Math.abs(hCurrent) / acLen);
        const actualH = hB + hOffset * heightScale;
        
        const px = anchorA.x + p * ux + actualH * vx;
        const py = anchorA.y + p * uy + actualH * vy;

        points.push({
          x: Math.round(px * 100) / 100,
          y: Math.round(py * 100) / 100,
        });
      }
    }
  }

  return points;
}

/**
 * 寻找最近的网格点及感应范围判定
 */
export function findNearestGridPoint(
  clickPoint: Point,
  question: QuestionData,
): { nearestPoint: Point; minDistance: number; isWithinRange: boolean } {
  const gridPoints = generateDynamicGridPoints(
    question.mode,
    question.anchorA,
    question.anchorC,
    question.targetB,
    question.gridStep,
    question.gridDim,
  );

  if (gridPoints.length === 0) {
    return { nearestPoint: clickPoint, minDistance: 999, isWithinRange: false };
  }

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
  const maxRadius = question.gridStep * 0.55;
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
  question: QuestionData,
): HitResult {
  const { nearestPoint, isWithinRange } = findNearestGridPoint(
    clickPoint,
    question,
  );

  // 1. 判断吸附后网格点与真理点 B 的直接偏差
  const errorDistance = calcDistance(nearestPoint, question.targetB);
  const isHit = errorDistance < 0.5;

  return {
    isHit,
    nearestGridPoint: nearestPoint,
    errorDistance,
    isWithinRange,
  };
}
~~~~~

#### Acts 2: 绑定更新前端 Canvas 交互层

在 `StarCanvas.tsx` 中应用这一修改。

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~old
import { CANVAS_SIZE, checkHit, findNearestGridPoint, generateGridPoints } from '../utils/geometry';
~~~~~
~~~~~new
import { CANVAS_SIZE, checkHit, findNearestGridPoint, generateDynamicGridPoints } from '../utils/geometry';
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~old
        // 图层 1: 干扰点阵 (底层)
        const gridPoints = generateGridPoints(
          question.gridStart,
          question.gridDim,
          question.gridStep,
        );
        for (const p of gridPoints) {
          drawDot(ctx, p.x, p.y, '#888888', 3.5);
        }
~~~~~
~~~~~new
        // 图层 1: 干扰点阵 (底层)
        const gridPoints = generateDynamicGridPoints(
          question.mode,
          question.anchorA,
          question.anchorC,
          question.targetB,
          question.gridStep,
          question.gridDim,
        );
        for (const p of gridPoints) {
          // 处理距离过近的点重叠问题：缩小靠近中心原点区域的点的渲染半径
          let r = 3.5;
          if (question.mode === 'single') {
            const dx = p.x - question.anchorA.x;
            const dy = p.y - question.anchorA.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 40) {
              r = Math.max(1.5, 3.5 * (dist / 40));
            }
          }
          drawDot(ctx, p.x, p.y, '#888888', r);
        }
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~old
    const currentPoint: Point = { x: clickX, y: clickY };
    const { nearestPoint, isWithinRange } = findNearestGridPoint(
      currentPoint,
      question.gridStart,
      question.gridStep,
      question.gridDim,
    );

    if (isWithinRange) {
~~~~~
~~~~~new
    const currentPoint: Point = { x: clickX, y: clickY };
    const { nearestPoint, isWithinRange } = findNearestGridPoint(
      currentPoint,
      question
    );

    if (isWithinRange) {
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~old
    const clickPoint: Point = { x: clickX, y: clickY };
    const hitResult = checkHit(
      clickPoint,
      question.targetB,
      question.gridStart,
      question.gridStep,
      question.gridDim,
    );

    // 忽略在有效感应范围之外的点击
~~~~~
~~~~~new
    const clickPoint: Point = { x: clickX, y: clickY };
    const hitResult = checkHit(
      clickPoint,
      question
    );

    // 忽略在有效感应范围之外的点击
~~~~~

### 下一步建议

网格点重构完成后，极大地提高了双锚点倾斜时的训练价值。你可以打开应用体验一下新的**极坐标/仿射网格**效果。如果目前的一切功能在真实测试中运作良好，我们可以考虑通过 `git_commit` 保存当前的逻辑，或者你是否有关于网格颜色、交互特效的更多构想？
