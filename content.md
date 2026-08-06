好的，我将为你生成并执行 **Step 2: 几何计算逻辑重构** 的计划，将传统的笛卡尔正方形网格彻底替换为符合视觉感知规律的**极坐标扇形阵列**与**双极透视交叉阵列**。

## [WIP] feat: 重构几何引擎以实现极坐标与双极透视干扰网络

### 用户需求
在极坐标系（单锚点）和双极坐标系（双锚点）下重新设计干扰点阵生成算法，使网格随着距离和角度产生符合心理物理学视差规律的非线性分布，并更新画布渲染与吸附检测逻辑。

### 评论
该重构解决了固定像素正方形网格在远距离处导致的训练难度陡增问题。现在，无论目标距离锚点多远，在同一 Level 下其角度误差和相对比例误差都保持恒定，使得难度体验真正具备科学的一致性。

### 目标
1. **类型扩充 (`src/types/index.ts`)**：在 `QuestionData` 中添加 `distractorPoints: Point[]`，保存发题时计算好的 25 个非线性干扰点。
2. **极坐标算法 (`src/utils/geometry.ts`)**：
   - 实现 `generatePolarGridPoints`（单锚点）：以锚点 A 为原点放射生成带有顺弧弯曲和比例缩放的扇形网格。
   - 实现 `generateBipolarGridPoints`（双锚点）：从锚点 A 和 C 辐射 5x5 条视角线，求其透视交叉点。
3. **点击吸附升级 (`src/utils/geometry.ts`)**：重构 `findNearestGridPoint` 与 `checkHit`，使其直接基于动态非线性点阵执行欧氏距离极小值匹配。
4. **画布渲染升级 (`src/components/StarCanvas.tsx`)**：更新右侧交互画布，直接绘制 `question.distractorPoints`。

### 基本原理
极坐标扇形网格的生成公式为 $P_{i,j} = \text{Point}(R \cdot (1 + i \cdot \Delta r), \Theta + j \cdot \Delta\theta)$；双极透视网格通过求解两端锚点发出的 $5 \times 5$ 条射线的二元一次方程组交点实现。这保证了在 $(i=0, j=0)$ 位置的干扰点精确等于真理点 B，同时点阵拓扑形状自然拟合了人眼视觉定位的生理特征。

### 标签
#intent/build #flow/ready #priority/high #comp/engine #concept/executor #scope/core #ai/instruct #task/domain/geometry #task/object/polar-bipolar-grids #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 更新类型模型与几何计算逻辑

我们将向 `src/types/index.ts` 中加入 `distractorPoints` 数组字段，并在 `src/utils/geometry.ts` 中实现极坐标与双极透视算法。

~~~~~act
write_file
src/types/index.ts
~~~~~
~~~~~typescript
export type TrainingMode = 'single' | 'double_h' | 'double_r';

export interface Point {
  x: number;
  y: number;
}

export interface QuestionData {
  id: string;
  mode: TrainingMode;
  anchorA: Point;
  anchorC: Point | null;
  targetB: Point;
  gridStart: Point;
  gridStep: number; // 仅作为 Step 1/渲染兼容使用
  difficultyLevel: number; // 统一抽象难度等级 (1..N)
  gridDim: number; // 默认 5 (5x5 网格)
  distractorPoints: Point[]; // 25 个非线性干扰点阵数组

  // 衍生分析指标 (用于后续弱点分析)
  angleDegree: number; // 极角 (0~360°)
  distanceRatio: number; // 极径/距离
  rotationAngle?: number; // 整体画布旋转倾角
}

export interface HitResult {
  isHit: boolean; // 是否选中正确的网格点
  nearestGridPoint: Point; // 用户点击位置对应的网格点
  errorDistance: number; // 点击位置与真理点的像素误差
  isWithinRange?: boolean; // 是否落在有效点击感应范围内
}

export interface TrialRecord {
  id: string;
  sessionId: string;
  mode: TrainingMode;
  timestamp: number;
  difficultyLevel: number; // 存入 Level 等级
  anchorA: [number, number];
  anchorC?: [number, number];
  targetB: [number, number];
  userClick: [number, number];
  angleDegree: number;
  distanceRatio: number;
  isHit: boolean;
  errorPixelDistance: number;
  responseTimeMs: number;
}
~~~~~

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
 * 以锚点 A 为原点，向真理点 B 放射。距离越远，点阵间距按比例增大，并呈现顺弧弯曲。
 */
export function generatePolarGridPoints(
  anchorA: Point,
  targetB: Point,
  level: number,
): Point[] {
  const dx = targetB.x - anchorA.x;
  const dy = targetB.y - anchorA.y;
  const R = Math.sqrt(dx * dx + dy * dy);
  const theta = Math.atan2(dy, dx);

  // 角度步长：从 Level 1 的 8.0° 逐渐缩小至 高 Level 的 ~0.5°
  const angleStepDeg = Math.max(0.5, 8.0 * Math.pow(0.82, level - 1));
  const angleStepRad = (angleStepDeg * Math.PI) / 180;
  // 径向比例步长：从 Level 1 的 15% 逐渐缩小至 高 Level 的 ~1.5%
  const rRatioStep = Math.max(0.015, 0.15 * Math.pow(0.82, level - 1));

  const points: Point[] = [];
  // 5x5 网格，(rIdx=0, aIdx=0) 精确为真理点 B
  for (let rIdx = -2; rIdx <= 2; rIdx++) {
    for (let aIdx = -2; aIdx <= 2; aIdx++) {
      const curR = R * (1 + rIdx * rRatioStep);
      const curTheta = theta + aIdx * angleStepRad;
      const x = Math.round((anchorA.x + curR * Math.cos(curTheta)) * 100) / 100;
      const y = Math.round((anchorA.y + curR * Math.sin(curTheta)) * 100) / 100;
      points.push({ x, y });
    }
  }
  return points;
}

/**
 * 双极透视网格生成器 (双锚点模式)
 * 从锚点 A 与 锚点 C 分别向真理点 B 发射 5 条视角射线，计算 5x5 交叉点。
 */
export function generateBipolarGridPoints(
  anchorA: Point,
  anchorC: Point,
  targetB: Point,
  level: number,
): Point[] {
  const alpha = Math.atan2(targetB.y - anchorA.y, targetB.x - anchorA.x);
  const beta = Math.atan2(targetB.y - anchorC.y, targetB.x - anchorC.x);

  // 视线偏角步长：从 Level 1 的 6.0° 缩小至 高 Level 的 ~0.4°
  const phiStepDeg = Math.max(0.4, 6.0 * Math.pow(0.82, level - 1));
  const phiStepRad = (phiStepDeg * Math.PI) / 180;

  const points: Point[] = [];

  for (let aIdx = -2; aIdx <= 2; aIdx++) {
    for (let cIdx = -2; cIdx <= 2; cIdx++) {
      const alphaI = alpha + aIdx * phiStepRad;
      const betaJ = beta + cIdx * phiStepRad;

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
          x: Math.round((targetB.x + aIdx * 15) * 100) / 100,
          y: Math.round((targetB.y + cIdx * 15) * 100) / 100,
        });
      } else {
        const t1 = (dx * v2y - dy * v2x) / det;
        const x = Math.round((anchorA.x + t1 * v1x) * 100) / 100;
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
export function checkHit(
  clickPoint: Point,
  targetB: Point,
  gridPoints: Point[],
): HitResult {
  const { nearestPoint, isWithinRange } = findNearestGridPoint(
    clickPoint,
    gridPoints,
  );

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

    const distractorPoints = generatePolarGridPoints(anchorA, targetB, difficultyLevel);

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

  const distractorPoints = generateBipolarGridPoints(anchorA, anchorC, targetB, difficultyLevel);
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

#### Acts 2: 更新 Canvas 绘图组件与交互事件

更新 `src/components/StarCanvas.tsx`，使其直接渲染并吸附 `question.distractorPoints`。

~~~~~act
write_file
src/components/StarCanvas.tsx
~~~~~
~~~~~typescript
import { useEffect, useRef, useState } from 'preact/hooks';
import type { HitResult, Point, QuestionData } from '../types';
import { CANVAS_SIZE, checkHit, findNearestGridPoint } from '../utils/geometry';

interface StarCanvasProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; hitResult: HitResult } | null;
  onAnswer: (clickPoint: Point, hitResult: HitResult) => void;
  disabled?: boolean;
}

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
  useEffect(() => {
    // 1. 渲染左侧参考图 (Reference Canvas)
    const leftCanvas = leftCanvasRef.current;
    if (leftCanvas) {
      const ctx = leftCanvas.getContext('2d');
      if (ctx) {
        // 清屏与背景
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // 绘制锚点 A
        drawDot(ctx, question.anchorA.x, question.anchorA.y, '#000000', 3.5);

        // 绘制锚点 C (若存在)
        if (question.anchorC) {
          drawDot(ctx, question.anchorC.x, question.anchorC.y, '#000000', 3.5);
        }

        // 绘制真理点 B
        drawDot(ctx, question.targetB.x, question.targetB.y, '#000000', 3.5);
      }
    }

    // 2. 渲染右侧交互区 (Interactive Canvas)
    const rightCanvas = rightCanvasRef.current;
    if (rightCanvas) {
      const ctx = rightCanvas.getContext('2d');
      if (ctx) {
        // 清屏与背景
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // 图层 1: 极坐标/双极透视干扰点阵 (底层)
        const gridPoints = question.distractorPoints;
        for (const p of gridPoints) {
          drawDot(ctx, p.x, p.y, '#888888', 3.5);
        }

        // 图层 1.5: 鼠标悬停高亮网格点
        if (!disabled && !showAnswer && hoverPoint) {
          drawDot(ctx, hoverPoint.x, hoverPoint.y, '#4F46E5', 6);
        }

        // 图层 2: 锚点 (顶层)
        drawDot(ctx, question.anchorA.x, question.anchorA.y, '#000000', 3.5);
        if (question.anchorC) {
          drawDot(ctx, question.anchorC.x, question.anchorC.y, '#000000', 3.5);
        }

        // 图层 3: 做答后的视觉反馈 (反馈层)
        if (showAnswer) {
          const { x: bx, y: by } = question.targetB;

          // 绘制真理点 B 实体点
          drawDot(ctx, bx, by, '#000000', 3.5);

          // 绘制深绿色十字高亮线
          const chSize = 12;
          ctx.strokeStyle = '#00AA00';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(bx - chSize, by);
          ctx.lineTo(bx + chSize, by);
          ctx.moveTo(bx, by - chSize);
          ctx.lineTo(bx, by + chSize);
          ctx.stroke();

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

  // 辅助函数：绘制圆点
  function drawDot(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    radius: number,
  ) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

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
      question.distractorPoints,
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
      question.distractorPoints,
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
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
            }
          }}
          tabIndex={0}
          role="button"
          aria-label="右侧做答画布"
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

### 下一步建议
我们已经完成了几何引擎的全面升级。你可以启动项目开发服务器（如 `npm run dev`）验证练习界面中的非线性干扰网格是否符合视觉直觉。如果一切正常，我们可以进入 **Step 3: 视图层与分析诊断适应性调整**：
1. 检查或调整弱点分析弹窗（`AnalyticsModal`）对极坐标误差展示的适应性。
2. 校验整体系统的编译与 Lint 规则（`npm run check`）。
