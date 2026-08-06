这是一个非常关键的发现！

分析原因：在此前的极坐标与双极极坐标算子实现中，我们将 $(rIdx=0, aIdx=0)$ 固化对应到了真理点 B，这导致真理点 B 总是固定落在 $5 \times 5$ 网格正中间的那个节点（索引 12），破坏了“受试者需要在网格阵列中自行甄别真理点”的训练初衷。

下面我将为你生成并执行修正计划，使真理点 B 在 $5 \times 5$ 非线性网格中**随机陷落在任意位置**。

## [WIP] fix: 将真理点随机陷落在 5x5 非线性网格的任意交叉节点上

### 错误分析
在使用极坐标和双极透视计算网格点阵时，原先算法直接以 $(0, 0)$ 相对网格偏移作为真理点 B 的坐标基准。这使得在 25 个生成的干扰点中，索引 12（第 3 行第 3 列）总是固定精确等于真理点 B。用户只要盲点击网格中心即可 100% 命中，无法达到视觉定位的练习效果。

**解决方案**：
在发题生成时，随机选取目标行列 $(r_0, a_0) \in [0..4] \times [0..4]$，在计算极坐标扇形与双极透视网格时，以该随机行列节点作为偏移原点 $(0, 0)$ 生成其余 24 个干扰点。这样真理点 B 就会随机陷落在 $5 \times 5$ 干扰网格的任意一个交叉节点上。

### 用户需求
真理点 B 必须随机出现在 $5 \times 5$ 干扰网格阵列的任意交叉节点（全网格 25 个节点中的随机一个），用户必须依靠自身手眼估计能力找出正确的点，而不能通过固定位置作弊。

### 评论
在随机网格节点上陷落真理点是训练任务的核心要素，这逼迫训练者必须对相对角度和距离做全盘估算，才能在 25 个相似的交点中认出真理点。

### 目标
1. 修改 `src/utils/geometry.ts` 中的 `generatePolarGridPoints` 函数，加入随机 `targetRow` 和 `targetCol` 参数，依据该偏移量生成网格点。
2. 修改 `src/utils/geometry.ts` 中的 `generateBipolarGridPoints` 函数，同样依据随机行列偏移产生透视交点。
3. 在 `generateQuestion` 发题时传入随机生成的 `randomRow` 与 `randomCol`。

### 基本原理
极坐标公式修改为：
$$ curR = R \cdot (1 + (rIdx - r_0) \cdot \Delta r) $$
$$ curTheta = \Theta + (aIdx - a_0) \cdot \Delta\theta $$
当 $(rIdx, aIdx) = (r_0, a_0)$ 时，$curR = R, curTheta = \Theta$，生成的坐标刚好为真理点 B。而其余节点则围绕该随机位置展开，实现了真正的全网格随机分布。

### 标签
#intent/fix #flow/ready #priority/high #comp/engine #concept/executor #scope/core #ai/instruct #task/domain/geometry #task/object/truth-point-randomization #task/action/fix #task/state/continue

---

### Script

#### Acts 1: 修正 `geometry.ts` 随机节点陷落算法

更新 `src/utils/geometry.ts`，使得极坐标与双极网格生成器接受随机行列参数并将真理点随机陷落在 $5 \times 5$ 网格的任意交叉节点上。

~~~~~act
write_file
src/utils/geometry.ts
~~~~~
~~~~~typescript
import type { HitResult, Point, QuestionData, TrainingMode } from '../types';

export const CANVAS_SIZE = 500;
export const CX = CANVAS_SIZE / 2; // 250
export const CY = CANVAS_SIZE / 2; // 250
export const DEFAULT_GRID_DIM = 5; // 5x5 网格

/**
 * 映射 Level 到临时网格步长 px (兼容使用)
 */
export function levelToTempGridStep(level: number): number {
  const steps = [35, 30, 25, 20, 16, 13, 10, 8, 6, 5, 4, 3];
  const idx = Math.max(0, Math.min(level - 1, steps.length - 1));
  return steps[idx];
}

/**
 * 将点绕指定中心旋转指定角度 (角度制)
 */
export function rotatePoint(p: Point, center: Point, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - center.x;
  const dy = p.y - center.y;

  return {
    x: Math.round((center.x + dx * cos - dy * sin) * 100) / 100,
    y: Math.round((center.y + dx * sin + dy * cos) * 100) / 100,
  };
}

/**
 * 计算两点间的欧氏距离
 */
export function calcDistance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
}

/**
 * 极坐标扇形网格生成器 (单锚点模式)
 * 以锚点 A 为原点，向真理点 B 放射。真理点 B 会随机陷落在 5x5 网格的任意节点上。
 */
export function generatePolarGridPoints(
  anchorA: Point,
  targetB: Point,
  level: number,
  targetRow = Math.floor(Math.random() * 5),
  targetCol = Math.floor(Math.random() * 5),
): Point[] {
  const dx = targetB.x - anchorA.x;
  const dy = targetB.y - anchorA.y;
  const R = Math.sqrt(dx * dx + dy * dy);
  const theta = Math.atan2(dy, dx);

  // 角度步长：从 Level 1 的 8.0° 逐渐缩小至 高 Level 的 ~0.5°
  const angleStepDeg = Math.max(0.5, 8.0 * 0.82 ** (level - 1));
  const angleStepRad = (angleStepDeg * Math.PI) / 180;
  // 径向比例步长：从 Level 1 的 15% 逐渐缩小至 高 Level 的 ~1.5%
  const rRatioStep = Math.max(0.015, 0.15 * 0.82 ** (level - 1));

  // 将 targetRow (0..4) 与 targetCol (0..4) 映射为相对偏移 (-2..2)
  const r0 = targetRow - 2;
  const a0 = targetCol - 2;

  const points: Point[] = [];
  for (let rIdx = -2; rIdx <= 2; rIdx++) {
    for (let aIdx = -2; aIdx <= 2; aIdx++) {
      const curR = R * (1 + (rIdx - r0) * rRatioStep);
      const curTheta = theta + (aIdx - a0) * angleStepRad;
      const x = Math.round((anchorA.x + curR * Math.cos(curTheta)) * 100) / 100;
      const y = Math.round((anchorA.y + curR * Math.sin(curTheta)) * 100) / 100;
      points.push({ x, y });
    }
  }
  return points;
}

/**
 * 双极透视网格生成器 (双锚点模式)
 * 从锚点 A 与 锚点 C 分别向真理点 B 发射 5 条视角射线。真理点 B 会随机陷落在 5x5 交叉点的任意位置。
 */
export function generateBipolarGridPoints(
  anchorA: Point,
  anchorC: Point,
  targetB: Point,
  level: number,
  targetRow = Math.floor(Math.random() * 5),
  targetCol = Math.floor(Math.random() * 5),
): Point[] {
  const alpha = Math.atan2(targetB.y - anchorA.y, targetB.x - anchorA.x);
  const beta = Math.atan2(targetB.y - anchorC.y, targetB.x - anchorC.x);

  // 视线偏角步长：从 Level 1 的 6.0° 缩小至 高 Level 的 ~0.4°
  const phiStepDeg = Math.max(0.4, 6.0 * 0.82 ** (level - 1));
  const phiStepRad = (phiStepDeg * Math.PI) / 180;

  const a0 = targetRow - 2;
  const c0 = targetCol - 2;

  const points: Point[] = [];

  for (let aIdx = -2; aIdx <= 2; aIdx++) {
    for (let cIdx = -2; cIdx <= 2; cIdx++) {
      const alphaI = alpha + (aIdx - a0) * phiStepRad;
      const betaJ = beta + (cIdx - c0) * phiStepRad;

      const v1x = Math.cos(alphaI);
      const v1y = Math.sin(alphaI);
      const v2x = Math.cos(betaJ);
      const v2y = Math.sin(betaJ);

      const dx = anchorC.x - anchorA.x;
      const dy = anchorC.y - anchorA.y;
      const det = v1x * v2y - v1y * v2x;

      if (Math.abs(det) < 1e-5) {
        // 退化近似退回 TargetB 偏移
        points.push({
          x: Math.round((targetB.x + (aIdx - a0) * 15) * 100) / 100,
          y: Math.round((targetB.y + (cIdx - c0) * 15) * 100) / 100,
        });
      } else {
        const t1 = (dx * v2y - dy * v2x) / det;
        const x = Math.round((anchorA.x + t1 * v1x) * 100) / 100,
        const y = Math.round((anchorA.y + t1 * v1y) * 100) / 100;
        points.push({ x, y });
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
  gridPoints: Point[],
): { nearestPoint: Point; minDistance: number; isWithinRange: boolean } {
  if (!gridPoints || gridPoints.length === 0) {
    return { nearestPoint: clickPoint, minDistance: 0, isWithinRange: false };
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

  // 寻找网格中点与点之间的最小相邻距离作为自适应感应半径的参考
  let minNeighborDist = Number.MAX_VALUE;
  for (let i = 0; i < Math.min(5, gridPoints.length - 1); i++) {
    const d = calcDistance(gridPoints[i], gridPoints[i + 1]);
    if (d > 0 && d < minNeighborDist) minNeighborDist = d;
  }
  const maxRadius = Math.max(20, minNeighborDist * 0.75);

  return {
    nearestPoint,
    minDistance,
    isWithinRange: minDistance <= maxRadius,
  };
}

/**
 * 点击作答 Hit Detection：判定用户的点击坐标是否击中了真理点 B 所在的网格
 */
export function checkHit(clickPoint: Point, targetB: Point, gridPoints: Point[]): HitResult {
  const { nearestPoint, isWithinRange } = findNearestGridPoint(clickPoint, gridPoints);

  // 判定吸附点与真理点 B 的直接偏差（是否选中真理点）
  const errorDistance = calcDistance(nearestPoint, targetB);
  const isHit = errorDistance < 0.5;

  return {
    isHit,
    nearestGridPoint: nearestPoint,
    errorDistance,
  isWithinRange,
  };
}

export interface QuestionGenerateOptions {
  targetingMode?: 'off' | 'auto' | 'manual';
  targetSectors?: number[]; // [0~7]
}

/**
 * 加权随机生成极角：70% 概率落入靶向弱点扇区，30% 概率全盘均匀探索
 */
function selectAngleWithTargeting(options?: QuestionGenerateOptions): number {
  if (
    options?.targetingMode &&
    options.targetingMode !== 'off' &&
    options.targetSectors &&
    options.targetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        options.targetSectors[Math.floor(Math.random() * options.targetSectors.length)];
      const sectorCenterAngle = chosenSector * 45;
      const jitter = (Math.random() - 0.5) * 40; // ±20° 范围加权抖动
      return Math.floor((sectorCenterAngle + jitter + 360) % 360);
    }
  }
  return Math.floor(Math.random() * 360);
}

/**
 * 随机生成算法：根据模式与难度 Level 生成一道题目数据及非线性干扰点阵
 */
export function generateQuestion(
  mode: TrainingMode,
  difficultyLevel: number,
  options?: QuestionGenerateOptions,
): QuestionData {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gridDim = DEFAULT_GRID_DIM;
  const gridStep = levelToTempGridStep(difficultyLevel);
  const randomRow = Math.floor(Math.random() * gridDim);
  const randomCol = Math.floor(Math.random() * gridDim);

  if (mode === 'single') {
    // === 1. 单锚点模式 ===
    const anchorA: Point = { x: CX, y: CY };
    const angle = selectAngleWithTargeting(options);
    const distChoices = [60, 90, 120, 150, 180];
    const dist = distChoices[Math.floor(Math.random() * distChoices.length)];

    const rad = (angle * Math.PI) / 180;
    const targetB: Point = {
      x: Math.round((CX + dist * Math.cos(rad)) * 100) / 100,
      y: Math.round((CY + dist * Math.sin(rad)) * 100) / 100,
    };

    const distractorPoints = generatePolarGridPoints(
      anchorA,
      targetB,
      difficultyLevel,
      randomRow,
      randomCol,
    );

    return {
      id,
      mode,
      anchorA,
      anchorC: null,
      targetB,
      gridStart: distractorPoints[0],
      gridStep,
      difficultyLevel,
      gridDim,
      distractorPoints,
      angleDegree: angle,
      distanceRatio: dist,
    };
  }

  // 双锚点基础拓扑
  const baseAx = -70;
  const baseAy = 0;
  const baseCx = 70;
  const baseCy = 0;

  const projChoices = [-90, -45, 0, 45, 90];
  const hgtChoices = [-90, -45, 45, 90];

  const validPairs: { px: number; py: number; angle: number }[] = [];
  for (const x of projChoices) {
    for (const y of hgtChoices) {
      const angle = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
      validPairs.push({ px: x, py: y, angle });
    }
  }

  let chosenPair = validPairs[Math.floor(Math.random() * validPairs.length)];

  if (
    options?.targetingMode &&
    options.targetingMode !== 'off' &&
    options.targetSectors &&
    options.targetSectors.length > 0
  ) {
    if (Math.random() < 0.7) {
      const chosenSector =
        options.targetSectors[Math.floor(Math.random() * options.targetSectors.length)];
      const sectorCenterAngle = chosenSector * 45;

      const targetedPairs = validPairs.filter((p) => {
        const diff = Math.abs(p.angle - sectorCenterAngle);
        const minDiff = Math.min(diff, 360 - diff);
        return minDiff <= 22.5;
      });

      if (targetedPairs.length > 0) {
        chosenPair = targetedPairs[Math.floor(Math.random() * targetedPairs.length)];
      }
    }
  }

  const px = chosenPair.px;
  const py = chosenPair.py;

  const rotAngle =
    mode === 'double_h'
      ? 0
      : [15, 30, 45, 60, 75, 90, 105, 120, 135, 150][Math.floor(Math.random() * 10)];

  const center: Point = { x: 0, y: 0 };
  const rotatedA = rotatePoint({ x: baseAx, y: baseAy }, center, rotAngle);
  const rotatedC = rotatePoint({ x: baseCx, y: baseCy }, center, rotAngle);
  const rotatedB = rotatePoint({ x: px, y: py }, center, rotAngle);

  const anchorA: Point = {
    x: Math.round((rotatedA.x + CX) * 100) / 100,
    y: Math.round((rotatedA.y + CY) * 100) / 100,
  };
  const anchorC: Point = {
    x: Math.round((rotatedC.x + CX) * 100) / 100,
    y: Math.round((rotatedC.y + CY) * 100) / 100,
  };
  const targetB: Point = {
    x: Math.round((rotatedB.x + CX) * 100) / 100,
    y: Math.round((rotatedB.y + CY) * 100) / 100,
  };

  const distractorPoints = generateBipolarGridPoints(
    anchorA,
    anchorC,
    targetB,
    difficultyLevel,
    randomRow,
    randomCol,
  );
  const angleDegree = Math.round(((Math.atan2(py, px) * 180) / Math.PI + 360) % 360);

  return {
    id,
    mode,
    anchorA,
    anchorC,
    targetB,
    gridStart: distractorPoints[0],
    gridStep,
    difficultyLevel,
    gridDim,
    distractorPoints,
    angleDegree,
    distanceRatio: Math.round(Math.sqrt(px * px + py * py)),
    rotationAngle: rotAngle,
  };
}
~~~~~

### 下一步建议
我们已经成功修补了真理点的随机分布计算。现在每一道题目的真理点 B 都会随机分布在 25 个非线性干涉节点的任意位置上。你可以再次运行项目，测试视觉估计训练体验！
