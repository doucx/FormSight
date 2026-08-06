已为你设计并整理好干扰点阵算法重构的方案。我们将按照“极坐标扇形网格”（单锚点）与“仿射透视网格”（双锚点）进行实施。

## [WIP] refactor: 重构干扰点阵算法为极坐标与仿射透视网格

### 用户需求
在单锚点及双锚点训练模式下，重构现有屏幕直角坐标系 ($5 \times 5$ 方形) 的干扰点阵生成逻辑，改用符合人类视知觉规律的极坐标扇形网格与仿射透视网格，解决远距离目标感知难度非线性放大及倾斜视角被网格伪线干涉的问题。

### 评论
此重构对于训练精细度与空间几何认知的科学性有显著提升。摒弃呆板的屏幕直角网格，采用自适应极坐标与局部仿射坐标系，能让步长梯度（`gridStep`）真正代表均匀且等价的心理物理学选择难度。

### 目标
1. 在 `QuestionData` 类型中增加 `gridRowIdx` 与 `gridColIdx`，标记目标点在 $5 \times 5$ 局域网格中的逻辑行列索引。
2. 重构 `src/utils/geometry.ts` 中的 `generateGridPoints`、`findNearestGridPoint` 与 `checkHit` 函数：
   * **单锚点 (`single`)**：生成以中心 $A$ 为源头的极坐标扇形网格，径向间距为 `gridStep`，弧度间距依据 $R_B$ 动态调整（满足 $\Delta s \approx \text{gridStep}$）。
   * **双锚点 (`double_h` / `double_r`)**：生成沿 $AC$ 基线及其法线方向的仿射透视网格，并对远离 $AC$ 基线的垂直高度增加透视膨胀修正。
3. 同步调整 `src/components/StarCanvas.tsx` 中对网格生成与碰撞检测函数的调用参数。

### 基本原理
1. **单锚点极坐标化**：人类眼睛推算单点位置是以原点 $A$ 为中心的极坐标系 $(R, \theta)$。利用 $\Delta \theta = \frac{\text{gridStep}}{\text{effectiveR}}$ 计算等弧长角度增量，可在任意距离下生成分布均匀的同心圆弧与辐射射线交点。
2. **双锚点仿射透视化**：双锚点下建立以向量 $\vec{AC}$ 为基底的局部直角坐标系，将干扰点沿 $\vec{AC}$ 单位切向量和法向量展开；同时结合韦伯定律，对垂直高度 $h$ 按距离比例添加膨胀系数 $1 + 0.25 \times \frac{|h|}{\|AC\|}$。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/executor #scope/ux #scope/core #ai/instruct #task/domain/ui #task/object/distractor-mesh #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 更新 QuestionData 类型定义

在 `QuestionData` 接口中补充 `gridRowIdx` 和 `gridColIdx` 字段。

~~~~~act
patch_file
src/types/index.ts
~~~~~
~~~~~typescript.old
export interface QuestionData {
  id: string;
  mode: TrainingMode;
  anchorA: Point;
  anchorC: Point | null;
  targetB: Point;
  gridStart: Point;
  gridStep: number;
  gridDim: number; // 默认 5 (5x5 网格)

  // 衍生分析指标 (用于后续弱点分析)
  angleDegree: number; // 极角 (0~360°)
  distanceRatio: number; // 极径/距离
  rotationAngle?: number; // 整体画布旋转倾角
}
~~~~~
~~~~~typescript.new
export interface QuestionData {
  id: string;
  mode: TrainingMode;
  anchorA: Point;
  anchorC: Point | null;
  targetB: Point;
  gridStart: Point;
  gridRowIdx: number;
  gridColIdx: number;
  gridStep: number;
  gridDim: number; // 默认 5 (5x5 网格)

  // 衍生分析指标 (用于后续弱点分析)
  angleDegree: number; // 极角 (0~360°)
  distanceRatio: number; // 极径/距离
  rotationAngle?: number; // 整体画布旋转倾角
}
~~~~~

#### Acts 2: 重构几何网格生成与判定算法

重构 `src/utils/geometry.ts` 中的点阵生成、最近点查找和命中检测逻辑，并使 `generateQuestion` 记录目标点的行列位置索引。

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~typescript.old
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
~~~~~typescript.new
/**
 * 根据题目数据生成极坐标（单锚点）或仿射透视（双锚点）全量干扰点阵坐标数组
 */
export function generateGridPoints(question: QuestionData): Point[] {
  const { mode, anchorA, anchorC, targetB, gridStep, gridDim = DEFAULT_GRID_DIM } = question;
  const rowIdx = question.gridRowIdx ?? Math.floor(gridDim / 2);
  const colIdx = question.gridColIdx ?? Math.floor(gridDim / 2);

  const points: Point[] = [];

  if (mode === 'single') {
    // === 单锚点：极坐标扇形网格 ===
    const dx = targetB.x - anchorA.x;
    const dy = targetB.y - anchorA.y;
    const Rb = Math.sqrt(dx * dx + dy * dy);
    const thetaB = Math.atan2(dy, dx);

    const effectiveR = Math.max(Rb, 30);
    // 弧长 delta_s = R * delta_theta => delta_theta = gridStep / effectiveR
    const deltaTheta = gridStep / effectiveR;

    for (let r = 0; r < gridDim; r++) {
      const rOffset = r - rowIdx;
      const radius = Rb + rOffset * gridStep;
      if (radius <= 0) continue;

      for (let c = 0; c < gridDim; c++) {
        const cOffset = c - colIdx;
        const theta = thetaB + cOffset * deltaTheta;

        points.push({
          x: Math.round((anchorA.x + radius * Math.cos(theta)) * 100) / 100,
          y: Math.round((anchorA.y + radius * Math.sin(theta)) * 100) / 100,
        });
      }
    }
    return points;
  }

  if (anchorC) {
    // === 双锚点：AC 仿射透视网格 ===
    const acX = anchorC.x - anchorA.x;
    const acY = anchorC.y - anchorA.y;
    const acLen = Math.sqrt(acX * acX + acY * acY);

    if (acLen === 0) return points;

    // 单位切向量 u，单位法向量 v
    const ux = acX / acLen;
    const uy = acY / acLen;
    const vx = -uy;
    const vy = ux;

    // B 相对 A 的向量
    const abX = targetB.x - anchorA.x;
    const abY = targetB.y - anchorA.y;

    // 投影坐标
    const pB = abX * ux + abY * uy; // 平行分量
    const hB = abX * vx + abY * vy; // 垂直高度分量

    // 高度透视膨胀系数：离 AC 基线越远，垂直视觉度量误差越大
    const heightScale = 1 + 0.25 * (Math.abs(hB) / acLen);
    const stepH = gridStep * heightScale;

    for (let r = 0; r < gridDim; r++) {
      const hOffset = r - rowIdx;
      const h = hB + hOffset * stepH;

      for (let c = 0; c < gridDim; c++) {
        const pOffset = c - colIdx;
        const p = pB + pOffset * gridStep;

        const px = anchorA.x + p * ux + h * vx;
        const py = anchorA.y + p * uy + h * vy;

        points.push({
          x: Math.round(px * 100) / 100,
          y: Math.round(py * 100) / 100,
        });
      }
    }
    return points;
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
  const gridPoints = generateGridPoints(question);
  if (gridPoints.length === 0) {
    return {
      nearestPoint: clickPoint,
      minDistance: 0,
      isWithinRange: false,
    };
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

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~typescript.old
    return {
      id,
      mode,
      anchorA,
      anchorC: null,
      targetB,
      gridStart,
      gridStep,
      gridDim,
      angleDegree: angle,
      distanceRatio: dist,
    };
~~~~~
~~~~~typescript.new
    return {
      id,
      mode,
      anchorA,
      anchorC: null,
      targetB,
      gridStart,
      gridRowIdx: randomRow,
      gridColIdx: randomCol,
      gridStep,
      gridDim,
      angleDegree: angle,
      distanceRatio: dist,
    };
~~~~~

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~typescript.old
  return {
    id,
    mode,
    anchorA,
    anchorC,
    targetB,
    gridStart,
    gridStep,
    gridDim,
    angleDegree,
    distanceRatio: Math.round(Math.sqrt(px * px + py * py)),
    rotationAngle: rotAngle,
  };
~~~~~
~~~~~typescript.new
  return {
    id,
    mode,
    anchorA,
    anchorC,
    targetB,
    gridStart,
    gridRowIdx: randomRow,
    gridColIdx: randomCol,
    gridStep,
    gridDim,
    angleDegree,
    distanceRatio: Math.round(Math.sqrt(px * px + py * py)),
    rotationAngle: rotAngle,
  };
~~~~~

#### Acts 3: 更新 StarCanvas 组件中的函数调用参数

更新 `src/components/StarCanvas.tsx` 中绘图和交互函数对 `generateGridPoints`、`findNearestGridPoint` 与 `checkHit` 的调用方式。

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript.old
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
~~~~~typescript.new
        // 图层 1: 干扰点阵 (底层)
        const gridPoints = generateGridPoints(question);
        for (const p of gridPoints) {
          drawDot(ctx, p.x, p.y, '#888888', 3.5);
        }
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript.old
    const currentPoint: Point = { x: clickX, y: clickY };
    const { nearestPoint, isWithinRange } = findNearestGridPoint(
      currentPoint,
      question.gridStart,
      question.gridStep,
      question.gridDim,
    );
~~~~~
~~~~~typescript.new
    const currentPoint: Point = { x: clickX, y: clickY };
    const { nearestPoint, isWithinRange } = findNearestGridPoint(
      currentPoint,
      question,
    );
~~~~~

~~~~~act
patch_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript.old
    const clickPoint: Point = { x: clickX, y: clickY };
    const hitResult = checkHit(
      clickPoint,
      question.targetB,
      question.gridStart,
      question.gridStep,
      question.gridDim,
    );
~~~~~
~~~~~typescript.new
    const clickPoint: Point = { x: clickX, y: clickY };
    const hitResult = checkHit(clickPoint, question);
~~~~~

### 下一步建议
1. **启动测试环境**：运行 `npm run dev` 并在浏览器中开启单锚点及双锚点练习，检查干扰点阵在不同角度、距离下的渲染形态。
2. **体验自适应难度**：验证随着 `gridStep` 缩小，扇形弧度间距与仿射网格步长是否保持均匀同步缩小。
3. **提交代码**：确认符合预期后，可以通过独立的 `[COMMIT]` 计划提交更改。
