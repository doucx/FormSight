我将为你生成一个完整的实现计划，新增“负形边界反切定点 (Negative Boundary Vertex Fitting)”训练模式，将其整合进 `negative_space` 模块并打通双 Canvas 渲染、点阵自适应生成与判定链路。

## [WIP] feat(negative-space): 实现基于负形反向还原顶点模式

### 用户需求
在 FormSight 中新增“基于负形反向还原顶点（Negative Boundary Fitting）”高阶训练模式：
1. **左侧画布**：展示完整的正负形多边形剪影（正形为深色，负形为白色）。
2. **右侧画布**：正形关键目标顶点被遮挡截断，呈现由负形空隙挤压出的边缘形态；在缺失顶点周围生成随 Level 难度自适应收缩的局部干扰候选点阵。
3. **交互与判定**：用户观察外围负形轮廓的挤压趋势，点击点阵中的点定位正形真实顶点；答题揭晓后提供准星、误差连线以及多边形边界补全反馈。

### 评论
该模式将“寻星练习（Star-Hopping）”的局部点阵自适应定位与“正负形空间感知”深度结合，直接切中美术学院派起形中“通过背景负形反切校验骨点位置”的核心训练法，具有极高的专业训练价值与可玩性。

### 目标
1. **算法扩展 (`negativeSpaceUtils.ts`)**：
   - 增加 `'NEGATIVE_VERTEX_FITTING'` 模式定义与数据结构。
   - 实现 `generateNegativeFittingQuestion` 算法：动态抽取多边形关键拐点、生成拐角截断几何体并构建自适应间距的点阵。
   - 扩展 `checkNegativeSpaceHit`，支持坐标点击与点阵吸附命中评估。
2. **交互画布 (`NegativeSpaceCanvas.tsx`)**：
   - 增加对定点还原模式的双 Canvas 渲染：左侧完整剪影参考，右侧截断残形 + 候选点阵交互。
   - 支持鼠标悬停吸附高亮、点击作答、作答后的十字准星与真实轮廓闭环补全。
3. **元数据与插件注册 (`domains.ts`, `trainingPlugins.tsx`)**：
   - 在 `negative_space` 模块中注册新模式元数据并配置图标。
   - 更新 `negativeSpacePlugin` 统一适配训练控制器与历史日志记录。

### 基本原理
1. **空间知觉解耦**：当正形顶点被隐去时，人眼无法通过直接正形轮廓连线判定，必须转而依赖外侧边缘与画框之间的白色留白几何斜率，有效激活负形观察直觉。
2. **自适应点阵精度**：点间距随当前能力层阶（Level 1..35）从 24px 指数级精细收敛至 3.5px，与自适应引擎无缝衔接。

### 标签
#intent/build #flow/ready #priority/high
#comp/runtime #concept/executor #scope/core #scope/ux
#ai/instruct
#task/domain/geometry #task/object/negative-space-vertex-fitting #task/action/build #task/state/begin

---

### Script

#### Acts 1: 扩展正负形核心算法与定点题型生成器

我们在 `src/utils/negativeSpaceUtils.ts` 中引入定点还原模式的类型定义、截断几何算子与点阵生成算法。

~~~~~act
patch_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~typescript.old
import type { Point } from '../types';

export type NegativeSpaceMode = 'RATIO_ESTIMATION' | 'AREA_COMPARISON_2AFC';

export const NEGATIVE_SPACE_CANVAS_SIZE = 400;
export const TWO_AFC_CANVAS_SIZE = 280;

export interface NegativeSpaceQuestionData {
  id: string;
  mode: NegativeSpaceMode;
  difficultyLevel: number;
  // 单图滑块估算模式字段
  vertices?: Point[];
  canvasArea: number;
  positiveArea?: number;
  negativeArea?: number;
  targetNegativeRatio?: number;
  tolerance: number;

  // 2AFC 二分判别模式字段
  verticesA?: Point[];
  verticesB?: Point[];
  negAreaA?: number;
  negAreaB?: number;
  negRatioA?: number;
  negRatioB?: number;
  largerSide?: 'A' | 'B';
  areaDeltaPercent?: number; // 相对面积差异百分比 (例如 12.5%)
}

export interface NegativeSpaceHitResult {
  isHit: boolean;
  userRatio?: number;
  targetRatio?: number;
  errorValue: number;
  tolerance: number;

  // 2AFC 结果字段
  userChoice?: 'A' | 'B';
  correctChoice?: 'A' | 'B';
  negRatioA?: number;
  negRatioB?: number;
}
~~~~~
~~~~~typescript.new
import type { Point } from '../types';
import {
  calcDistance,
  checkHit,
  findNearestGridPoint,
  getDynamicCrosshairMetrics,
  getDynamicDotRadius,
} from './geometry';

export type NegativeSpaceMode =
  | 'RATIO_ESTIMATION'
  | 'AREA_COMPARISON_2AFC'
  | 'NEGATIVE_VERTEX_FITTING';

export const NEGATIVE_SPACE_CANVAS_SIZE = 400;
export const TWO_AFC_CANVAS_SIZE = 280;
export const FITTING_CANVAS_SIZE = 340;

export interface NegativeSpaceQuestionData {
  id: string;
  mode: NegativeSpaceMode;
  difficultyLevel: number;
  // 单图滑块估算模式字段
  vertices?: Point[];
  canvasArea: number;
  positiveArea?: number;
  negativeArea?: number;
  targetNegativeRatio?: number;
  tolerance: number;

  // 2AFC 二分判别模式字段
  verticesA?: Point[];
  verticesB?: Point[];
  negAreaA?: number;
  negAreaB?: number;
  negRatioA?: number;
  negRatioB?: number;
  largerSide?: 'A' | 'B';
  areaDeltaPercent?: number; // 相对面积差异百分比 (例如 12.5%)

  // 负形反切定点模式字段
  targetVertexIndex?: number;
  targetPoint?: Point;
  truncatedVertices?: Point[]; // 右侧截断残缺多边形
  distractorPoints?: Point[]; // 围绕 targetPoint 的干扰网格点
  gridDim?: number;
}

export interface NegativeSpaceHitResult {
  isHit: boolean;
  userRatio?: number;
  targetRatio?: number;
  errorValue: number;
  tolerance: number;

  // 2AFC 结果字段
  userChoice?: 'A' | 'B';
  correctChoice?: 'A' | 'B';
  negRatioA?: number;
  negRatioB?: number;

  // 定点模式结果字段
  clickPoint?: Point;
  nearestGridPoint?: Point;
  isWithinRange?: boolean;
}
~~~~~

~~~~~act
patch_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~typescript.old
/**
 * 随机生成不自交的不规则正形多边形
 */
export function generateRandomPolygon(level: number): Point[] {
  const clamped = Math.max(1, Math.min(35, level));
  const t = (clamped - 1) / 34;

  // 顶点数量：Level 1 为 3~4，Level 35 为 7~11
  const minVerts = 3 + Math.floor(t * 4);
  const maxVerts = 4 + Math.floor(t * 7);
  const vertexCount = Math.floor(Math.random() * (maxVerts - minVerts + 1)) + minVerts;

  const cx = NEGATIVE_SPACE_CANVAS_SIZE / 2 + (Math.random() - 0.5) * 40;
  const cy = NEGATIVE_SPACE_CANVAS_SIZE / 2 + (Math.random() - 0.5) * 40;

  // 基础半径与扰动率
  const baseRadius = 80 + Math.random() * 60; // 80..140
  const irregularity = 0.2 + t * 0.55; // 0.2..0.75 凹凸度

  // 极角切分并随机抖动
  const angles: number[] = [];
  const angleStep = (Math.PI * 2) / vertexCount;
  for (let i = 0; i < vertexCount; i++) {
    const rawA = i * angleStep + (Math.random() - 0.5) * angleStep * 0.7;
    angles.push((rawA + Math.PI * 2) % (Math.PI * 2));
  }
  angles.sort((a, b) => a - b);

  const vertices: Point[] = [];
  for (const a of angles) {
    const rJitter = 1 + (Math.random() * 2 - 1) * irregularity;
    const r = Math.max(25, Math.min(185, baseRadius * rJitter));
    const x = Math.round(
      Math.max(10, Math.min(NEGATIVE_SPACE_CANVAS_SIZE - 10, cx + r * Math.cos(a))),
    );
    const y = Math.round(
      Math.max(10, Math.min(NEGATIVE_SPACE_CANVAS_SIZE - 10, cy + r * Math.sin(a))),
    );
    vertices.push({ x, y });
  }

  return vertices;
}
~~~~~
~~~~~typescript.new
/**
 * 随机生成不自交的不规则正形多边形
 */
export function generateRandomPolygon(
  level: number,
  canvasSize = NEGATIVE_SPACE_CANVAS_SIZE,
): Point[] {
  const clamped = Math.max(1, Math.min(35, level));
  const t = (clamped - 1) / 34;

  // 顶点数量：Level 1 为 4，Level 35 为 8
  const minVerts = 4 + Math.floor(t * 2);
  const maxVerts = 4 + Math.floor(t * 4);
  const vertexCount = Math.floor(Math.random() * (maxVerts - minVerts + 1)) + minVerts;

  const cx = canvasSize / 2 + (Math.random() - 0.5) * (canvasSize * 0.1);
  const cy = canvasSize / 2 + (Math.random() - 0.5) * (canvasSize * 0.1);

  // 基础半径与扰动率
  const baseRadius = canvasSize * 0.28 + Math.random() * (canvasSize * 0.1);
  const irregularity = 0.2 + t * 0.45; // 0.2..0.65 凹凸度

  // 极角切分并随机抖动
  const angles: number[] = [];
  const angleStep = (Math.PI * 2) / vertexCount;
  for (let i = 0; i < vertexCount; i++) {
    const rawA = i * angleStep + (Math.random() - 0.5) * angleStep * 0.7;
    angles.push((rawA + Math.PI * 2) % (Math.PI * 2));
  }
  angles.sort((a, b) => a - b);

  const vertices: Point[] = [];
  for (const a of angles) {
    const rJitter = 1 + (Math.random() * 2 - 1) * irregularity;
    const r = Math.max(canvasSize * 0.1, Math.min(canvasSize * 0.42, baseRadius * rJitter));
    const x = Math.round(Math.max(15, Math.min(canvasSize - 15, cx + r * Math.cos(a))));
    const y = Math.round(Math.max(15, Math.min(canvasSize - 15, cy + r * Math.sin(a))));
    vertices.push({ x, y });
  }

  return vertices;
}
~~~~~

~~~~~act
patch_file
src/utils/negativeSpaceUtils.ts
~~~~~
~~~~~typescript.old
  // 默认 RATIO_ESTIMATION 滑块评估模式
  const tolerance = getNegativeSpaceToleranceForLevel(clampedLevel);
  const canvasArea = NEGATIVE_SPACE_CANVAS_SIZE * NEGATIVE_SPACE_CANVAS_SIZE;

  let vertices = generateRandomPolygon(clampedLevel);
  let posArea = calcPolygonArea(vertices);

  let attempts = 0;
  while ((posArea / canvasArea < 0.15 || posArea / canvasArea > 0.8) && attempts < 10) {
    attempts++;
    vertices = generateRandomPolygon(clampedLevel);
    posArea = calcPolygonArea(vertices);
  }

  const negArea = canvasArea - posArea;
  const targetNegativeRatio = Math.round((negArea / canvasArea) * 1000) / 10;

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    vertices,
    canvasArea,
    positiveArea: Math.round(posArea),
    negativeArea: Math.round(negArea),
    targetNegativeRatio,
    tolerance,
  };
}

/**
 * 答题结果检测与评估
 */
export function checkNegativeSpaceHit(
  userAnswer: number | 'A' | 'B',
  question: NegativeSpaceQuestionData,
): NegativeSpaceHitResult {
  if (question.mode === 'AREA_COMPARISON_2AFC') {
    const userChoice = userAnswer as 'A' | 'B';
    const isHit = userChoice === question.largerSide;

    return {
      isHit,
      userChoice,
      correctChoice: question.largerSide,
      negRatioA: question.negRatioA,
      negRatioB: question.negRatioB,
      errorValue: isHit ? 0 : (question.areaDeltaPercent ?? 0),
      tolerance: question.tolerance,
    };
  }

  const userRatio = typeof userAnswer === 'number' ? userAnswer : 50;
  const targetRatio = question.targetNegativeRatio ?? 50;
  const errorValue = Math.round(Math.abs(userRatio - targetRatio) * 10) / 10;
  const isHit = errorValue <= question.tolerance;

  return {
    isHit,
    userRatio,
    targetRatio,
    errorValue,
    tolerance: question.tolerance,
  };
}
~~~~~
~~~~~typescript.new
  if (mode === 'NEGATIVE_VERTEX_FITTING') {
    const canvasArea = FITTING_CANVAS_SIZE * FITTING_CANVAS_SIZE;
    const vertices = generateRandomPolygon(clampedLevel, FITTING_CANVAS_SIZE);
    const n = vertices.length;

    // 选取一个目标关键拐点
    const targetVertexIndex = Math.floor(Math.random() * n);
    const targetPoint = vertices[targetVertexIndex];

    const prevIdx = (targetVertexIndex - 1 + n) % n;
    const nextIdx = (targetVertexIndex + 1) % n;
    const prevPoint = vertices[prevIdx];
    const nextPoint = vertices[nextIdx];

    // 计算截断正形多边形（在目标顶点两侧各截去 45% 的线段长度）
    const cutRatio = 0.45;
    const cutPrev: Point = {
      x: Math.round(prevPoint.x + (targetPoint.x - prevPoint.x) * (1 - cutRatio)),
      y: Math.round(prevPoint.y + (targetPoint.y - prevPoint.y) * (1 - cutRatio)),
    };
    const cutNext: Point = {
      x: Math.round(nextPoint.x + (targetPoint.x - nextPoint.x) * (1 - cutRatio)),
      y: Math.round(nextPoint.y + (targetPoint.y - nextPoint.y) * (1 - cutRatio)),
    };

    const truncatedVertices: Point[] = [];
    for (let i = 0; i < n; i++) {
      if (i === targetVertexIndex) {
        truncatedVertices.push(cutPrev);
        truncatedVertices.push(cutNext);
      } else {
        truncatedVertices.push(vertices[i]);
      }
    }

    // 围绕 targetPoint 构建局部干扰网格点 (点间距 S 随 Level 从 24px 缩紧至 3.5px)
    const gridDim = 3;
    const S_MAX = 24;
    const S_MIN = 3.5;
    const t = (clampedLevel - 1) / 34;
    const S = S_MAX * (S_MIN / S_MAX) ** t;

    const targetRow = Math.floor(Math.random() * gridDim);
    const targetCol = Math.floor(Math.random() * gridDim);
    const distractorPoints: Point[] = [];

    for (let r = 0; r < gridDim; r++) {
      for (let c = 0; c < gridDim; c++) {
        const x = Math.round((targetPoint.x + (c - targetCol) * S) * 100) / 100;
        const y = Math.round((targetPoint.y + (r - targetRow) * S) * 100) / 100;
        distractorPoints.push({ x, y });
      }
    }

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      canvasArea,
      vertices,
      targetVertexIndex,
      targetPoint,
      truncatedVertices,
      distractorPoints,
      gridDim,
      tolerance: S / 2,
    };
  }

  // 默认 RATIO_ESTIMATION 滑块评估模式
  const tolerance = getNegativeSpaceToleranceForLevel(clampedLevel);
  const canvasArea = NEGATIVE_SPACE_CANVAS_SIZE * NEGATIVE_SPACE_CANVAS_SIZE;

  let vertices = generateRandomPolygon(clampedLevel);
  let posArea = calcPolygonArea(vertices);

  let attempts = 0;
  while ((posArea / canvasArea < 0.15 || posArea / canvasArea > 0.8) && attempts < 10) {
    attempts++;
    vertices = generateRandomPolygon(clampedLevel);
    posArea = calcPolygonArea(vertices);
  }

  const negArea = canvasArea - posArea;
  const targetNegativeRatio = Math.round((negArea / canvasArea) * 1000) / 10;

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    vertices,
    canvasArea,
    positiveArea: Math.round(posArea),
    negativeArea: Math.round(negArea),
    targetNegativeRatio,
    tolerance,
  };
}

/**
 * 答题结果检测与评估
 */
export function checkNegativeSpaceHit(
  userAnswer: number | 'A' | 'B' | Point,
  question: NegativeSpaceQuestionData,
): NegativeSpaceHitResult {
  if (question.mode === 'NEGATIVE_VERTEX_FITTING') {
    const clickPoint = userAnswer as Point;
    const targetPoint = question.targetPoint ?? { x: 0, y: 0 };
    const distractorPoints = question.distractorPoints ?? [];

    const hitRes = checkHit(clickPoint, targetPoint, distractorPoints);
    return {
      isHit: hitRes.isHit,
      clickPoint,
      nearestGridPoint: hitRes.nearestGridPoint,
      errorValue: hitRes.errorDistance,
      tolerance: question.tolerance,
      isWithinRange: hitRes.isWithinRange,
    };
  }

  if (question.mode === 'AREA_COMPARISON_2AFC') {
    const userChoice = userAnswer as 'A' | 'B';
    const isHit = userChoice === question.largerSide;

    return {
      isHit,
      userChoice,
      correctChoice: question.largerSide,
      negRatioA: question.negRatioA,
      negRatioB: question.negRatioB,
      errorValue: isHit ? 0 : (question.areaDeltaPercent ?? 0),
      tolerance: question.tolerance,
    };
  }

  const userRatio = typeof userAnswer === 'number' ? userAnswer : 50;
  const targetRatio = question.targetNegativeRatio ?? 50;
  const errorValue = Math.round(Math.abs(userRatio - targetRatio) * 10) / 10;
  const isHit = errorValue <= question.tolerance;

  return {
    isHit,
    userRatio,
    targetRatio,
    errorValue,
    tolerance: question.tolerance,
  };
}
~~~~~

#### Acts 2: 升级 `NegativeSpaceCanvas.tsx` 支持双 Canvas 反切定点交互

我们改造 `NegativeSpaceCanvas.tsx`，加入针对 `NEGATIVE_VERTEX_FITTING` 模式的双 Canvas 渲染（左侧展示完整参考多边形，右侧展示截断残形、点阵交互、悬停高亮与答案揭晓的闭环视觉反馈）。

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
interface NegativeSpaceCanvasProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (val: number | 'A' | 'B') => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
}

// 辅助绘图函数：在给定 canvas 上绘制多边形正形与白色负形底
function drawPolygonCanvas(
  canvas: HTMLCanvasElement | null,
  vertices: Point[] | undefined,
  size: number,
  isHighlighted?: boolean,
) {
  if (!canvas || !vertices || vertices.length < 3) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 清屏绘制纯白底色（白色留白即负形）
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // 绘制正形多边形
  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    ctx.lineTo(vertices[i].x, vertices[i].y);
  }
  ctx.closePath();

  ctx.fillStyle = '#0F172A'; // Slate-900 黑色正形
  ctx.fill();

  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 高亮加粗外边框反馈
  if (isHighlighted) {
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}
~~~~~
~~~~~typescript.new
import {
  findNearestGridPoint,
  getDynamicCrosshairMetrics,
  getDynamicDotRadius,
} from '../utils/geometry';
import {
  FITTING_CANVAS_SIZE,
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
  TWO_AFC_CANVAS_SIZE,
} from '../utils/negativeSpaceUtils';

interface NegativeSpaceCanvasProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer: NegativeSpaceHitResult | null;
  onAnswer: (val: number | 'A' | 'B' | Point) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
}

// 辅助绘图函数：在给定 canvas 上绘制多边形正形与白色负形底
function drawPolygonCanvas(
  canvas: HTMLCanvasElement | null,
  vertices: Point[] | undefined,
  size: number,
  isHighlighted?: boolean,
) {
  if (!canvas || !vertices || vertices.length < 3) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 清屏绘制纯白底色（白色留白即负形）
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // 绘制正形多边形
  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    ctx.lineTo(vertices[i].x, vertices[i].y);
  }
  ctx.closePath();

  ctx.fillStyle = '#0F172A'; // Slate-900 黑色正形
  ctx.fill();

  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 高亮加粗外边框反馈
  if (isHighlighted) {
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

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
~~~~~

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
export function NegativeSpaceCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
}: NegativeSpaceCanvasProps) {
  const is2AFC = question.mode === 'AREA_COMPARISON_2AFC';

  // === 1. 单图滑块模式状态 ===
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentVal, setCurrentVal] = useState<number>(50.0);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 100,
    step: 0.1,
    disabled: disabled || showAnswer,
    onValChange: setCurrentVal,
  });

  // === 2. 2AFC 模式专属画布与状态 ===
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  // 切换题目时重置状态
  useEffect(() => {
    if (question.id) {
      setCurrentVal(50.0);
      setHoverVal(null);
      setSelectedChoice(null);
    }
  }, [question.id, setHoverVal]);
~~~~~
~~~~~typescript.new
export function NegativeSpaceCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
}: NegativeSpaceCanvasProps) {
  const is2AFC = question.mode === 'AREA_COMPARISON_2AFC';
  const isFitting = question.mode === 'NEGATIVE_VERTEX_FITTING';

  // === 1. 单图滑块模式状态 ===
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentVal, setCurrentVal] = useState<number>(50.0);

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max: 100,
    step: 0.1,
    disabled: disabled || showAnswer,
    onValChange: setCurrentVal,
  });

  // === 2. 2AFC 模式专属画布与状态 ===
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  // === 3. 定点反切模式专属画布与状态 ===
  const leftFittingRef = useRef<HTMLCanvasElement | null>(null);
  const rightFittingRef = useRef<HTMLCanvasElement | null>(null);
  const [fittingHoverPoint, setFittingHoverPoint] = useState<Point | null>(null);

  // 切换题目时重置状态
  useEffect(() => {
    if (question.id) {
      setCurrentVal(50.0);
      setHoverVal(null);
      setSelectedChoice(null);
      setFittingHoverPoint(null);
    }
  }, [question.id, setHoverVal]);
~~~~~

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
  // 渲染 2AFC 双 Canvas
  useEffect(() => {
    if (is2AFC) {
      drawPolygonCanvas(canvasRefA.current, question.verticesA, TWO_AFC_CANVAS_SIZE);
      drawPolygonCanvas(canvasRefB.current, question.verticesB, TWO_AFC_CANVAS_SIZE);
    }
  }, [is2AFC, question.verticesA, question.verticesB]);
~~~~~
~~~~~typescript.new
  // 渲染 2AFC 双 Canvas
  useEffect(() => {
    if (is2AFC) {
      drawPolygonCanvas(canvasRefA.current, question.verticesA, TWO_AFC_CANVAS_SIZE);
      drawPolygonCanvas(canvasRefB.current, question.verticesB, TWO_AFC_CANVAS_SIZE);
    }
  }, [is2AFC, question.verticesA, question.verticesB]);

  // 渲染 定点反切 双 Canvas (左侧参考，右侧截断 + 点阵)
  useEffect(() => {
    if (!isFitting || !question.vertices) return;

    // 1. 左侧参考 Canvas：绘制完整多边形与负形
    const leftCanvas = leftFittingRef.current;
    if (leftCanvas) {
      drawPolygonCanvas(leftCanvas, question.vertices, FITTING_CANVAS_SIZE);
    }

    // 2. 右侧交互 Canvas
    const rightCanvas = rightFittingRef.current;
    if (rightCanvas) {
      const ctx = rightCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, FITTING_CANVAS_SIZE, FITTING_CANVAS_SIZE);

        // 绘制截断残缺多边形
        if (question.truncatedVertices && question.truncatedVertices.length >= 3) {
          ctx.beginPath();
          ctx.moveTo(question.truncatedVertices[0].x, question.truncatedVertices[0].y);
          for (let i = 1; i < question.truncatedVertices.length; i++) {
            ctx.lineTo(question.truncatedVertices[i].x, question.truncatedVertices[i].y);
          }
          ctx.closePath();
          ctx.fillStyle = '#0F172A';
          ctx.fill();
          ctx.strokeStyle = '#1E293B';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        const distractorPoints = question.distractorPoints || [];
        const dotRadius = getDynamicDotRadius(distractorPoints);
        const hoverRadius = Math.max(2.5, dotRadius * 1.6);

        // 绘制候选干扰点阵
        for (const p of distractorPoints) {
          drawDot(ctx, p.x, p.y, '#888888', dotRadius);
        }

        // 鼠标悬停高亮点
        if (!disabled && !showAnswer && fittingHoverPoint) {
          drawDot(ctx, fittingHoverPoint.x, fittingHoverPoint.y, '#4F46E5', hoverRadius);
        }

        // 揭晓状态：反馈绘制
        if (showAnswer && question.targetPoint) {
          const { x: tx, y: ty } = question.targetPoint;
          const { size: chSize, lineWidth: chLineWidth } =
            getDynamicCrosshairMetrics(distractorPoints);

          // 绘制完整多边形真实线框（绿色半透明补全反馈）
          ctx.beginPath();
          ctx.moveTo(question.vertices[0].x, question.vertices[0].y);
          for (let i = 1; i < question.vertices.length; i++) {
            ctx.lineTo(question.vertices[i].x, question.vertices[i].y);
          }
          ctx.closePath();
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.7)';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // 绘制真理顶点十字准星
          ctx.strokeStyle = '#00AA00';
          ctx.lineWidth = chLineWidth;
          ctx.beginPath();
          ctx.moveTo(tx - chSize, ty);
          ctx.lineTo(tx + chSize, ty);
          ctx.moveTo(tx, ty - chSize);
          ctx.lineTo(tx, ty + chSize);
          ctx.stroke();
          drawDot(ctx, tx, ty, '#000000', dotRadius);

          // 若答错，绘制红虚线与用户点击位置
          if (userAnswer?.nearestGridPoint && !userAnswer.isHit) {
            const chosen = userAnswer.nearestGridPoint;
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = Math.max(1, chLineWidth * 0.85);
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(chosen.x, chosen.y);
            ctx.lineTo(tx, ty);
            ctx.stroke();
            ctx.setLineDash([]);
            drawDot(ctx, chosen.x, chosen.y, '#FF0000', dotRadius);
          }
        }
      }
    }
  }, [isFitting, question, showAnswer, userAnswer, fittingHoverPoint, disabled]);
~~~~~

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
  // 处理 2AFC 点击选择
  const handleSelectChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelectedChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );

  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || showAnswer) return;

      if (is2AFC) {
        if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          handleSelectChoice('A');
        } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          handleSelectChoice('B');
        }
      } else {
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          onAnswer(currentVal);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [is2AFC, disabled, showAnswer, currentVal, onAnswer, handleSelectChoice]);
~~~~~
~~~~~typescript.new
  // 处理 2AFC 点击选择
  const handleSelectChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelectedChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );

  // 定点模式鼠标移动与点击
  const handleFittingMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer || !question.distractorPoints) {
      if (fittingHoverPoint) setFittingHoverPoint(null);
      return;
    }

    const canvas = rightFittingRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = FITTING_CANVAS_SIZE / rect.width;
    const scaleY = FITTING_CANVAS_SIZE / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX * 100) / 100;
    const clickY = Math.round((e.clientY - rect.top) * scaleY * 100) / 100;

    const { nearestPoint, isWithinRange } = findNearestGridPoint(
      { x: clickX, y: clickY },
      question.distractorPoints,
    );

    if (isWithinRange) {
      setFittingHoverPoint(nearestPoint);
    } else if (fittingHoverPoint) {
      setFittingHoverPoint(null);
    }
  };

  const handleFittingClick = (e: MouseEvent) => {
    if (disabled || showAnswer || !question.distractorPoints) return;

    const canvas = rightFittingRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = FITTING_CANVAS_SIZE / rect.width;
    const scaleY = FITTING_CANVAS_SIZE / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX * 100) / 100;
    const clickY = Math.round((e.clientY - rect.top) * scaleY * 100) / 100;

    const clickPoint: Point = { x: clickX, y: clickY };
    const { isWithinRange } = findNearestGridPoint(clickPoint, question.distractorPoints);

    if (!isWithinRange) return;

    setFittingHoverPoint(null);
    onAnswer(clickPoint);
  };

  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || showAnswer) return;

      if (is2AFC) {
        if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          handleSelectChoice('A');
        } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          handleSelectChoice('B');
        }
      } else if (!isFitting) {
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          onAnswer(currentVal);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [is2AFC, isFitting, disabled, showAnswer, currentVal, onAnswer, handleSelectChoice]);
~~~~~

~~~~~act
patch_file
src/components/NegativeSpaceCanvas.tsx
~~~~~
~~~~~typescript.old
  // =========================================================================
  // 模式 A：2AFC 负形面积二分判别视图
  // =========================================================================
  if (is2AFC) {
~~~~~
~~~~~typescript.new
  // =========================================================================
  // 模式 C：NEGATIVE_VERTEX_FITTING 负形反向还原顶点视图
  // =========================================================================
  if (isFitting) {
    return (
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
        <div className="text-center space-y-1">
          <div className="text-base font-black text-slate-800 flex items-center justify-center gap-2">
            <Columns className="w-5 h-5 text-indigo-600" />
            观察负形留白被挤压的轮廓，点击确定右侧被隐藏的正形顶点
          </div>
          <p className="text-xs text-slate-400">
            左侧为完整剪影参考，右侧正形关键拐角被截断。请对比两侧负形空间形态，在右侧点阵中精准定位顶点。
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full">
          {/* 左侧参考 Canvas */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              完整剪影参考
            </span>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={leftFittingRef}
                width={FITTING_CANVAS_SIZE}
                height={FITTING_CANVAS_SIZE}
                className="w-full max-w-[300px] aspect-square rounded-xl border border-slate-100 shadow-sm"
              />
            </div>
          </div>

          {/* 右侧互动做答 Canvas */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
              交互定点画布 (点击做答)
            </span>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={rightFittingRef}
                width={FITTING_CANVAS_SIZE}
                height={FITTING_CANVAS_SIZE}
                onClick={handleFittingClick}
                onMouseMove={handleFittingMouseMove}
                onMouseLeave={() => setFittingHoverPoint(null)}
                className={`w-full max-w-[300px] aspect-square rounded-xl border border-slate-100 shadow-sm transition-all ${
                  disabled || showAnswer
                    ? 'cursor-default'
                    : fittingHoverPoint
                      ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
                      : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
                }`}
              />
            </div>
          </div>
        </div>

        {/* 答案揭晓诊断条 */}
        {showAnswer && (
          <div className="w-full max-w-xl bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-xl ${
                  userAnswer?.isHit
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {userAnswer?.isHit ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-800">
                  {userAnswer?.isHit ? '精准命中目标顶点！' : '定点定位出现偏差'}
                </span>
                <span className="text-slate-400 ml-2">
                  (像素误差:{' '}
                  <strong className="font-mono text-slate-700">{userAnswer?.errorValue}px</strong>)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 模式 A：2AFC 负形面积二分判别视图
  // =========================================================================
  if (is2AFC) {
~~~~~

#### Acts 3: 注册新模式到 `domains.ts` 与 `trainingPlugins.tsx`

在 `src/config/domains.ts` 与 `src/config/trainingPlugins.tsx` 中注册新模式的元数据与插件逻辑。

~~~~~act
patch_file
src/config/domains.ts
~~~~~
~~~~~typescript.old
  negative_space: {
    domain: 'negative_space',
    appId: 'negative-space',
    title: '正负形感知',
    subTitle: 'Negative Space',
    homeTitle: '正负形空间感知 (Negative Space)',
    homeDesc:
      '切换观察视角，通过对几何剪影周围留白（负形）面积占比的估算，打破具象认知偏见，培养专业起形与比例感知力。',
    themeColor: 'emerald',
    icon: Maximize2,
    hasWeaknessAnalytics: false,
    modes: [
      {
        id: 'RATIO_ESTIMATION',
        title: '负形占比滑块评估',
        desc: '估计不规则几何多边形外部留白（负形）占整幅画面的面积百分比，强化空间直觉。',
        icon: Maximize2,
      },
      {
        id: 'AREA_COMPARISON_2AFC',
        title: '负形面积二分判别',
        desc: '快速对比两个形状各异的不规则多边形留白（负形），二选一判别哪侧留白面积更大 (2AFC)。',
        icon: Columns,
      },
    ],
  },
~~~~~
~~~~~typescript.new
  negative_space: {
    domain: 'negative_space',
    appId: 'negative-space',
    title: '正负形感知',
    subTitle: 'Negative Space',
    homeTitle: '正负形空间感知 (Negative Space)',
    homeDesc:
      '切换观察视角，通过对几何剪影周围留白（负形）面积占比的估算与反切定点，打破具象认知偏见，培养专业起形与比例感知力。',
    themeColor: 'emerald',
    icon: Maximize2,
    hasWeaknessAnalytics: false,
    modes: [
      {
        id: 'RATIO_ESTIMATION',
        title: '负形占比滑块评估',
        desc: '估计不规则几何多边形外部留白（负形）占整幅画面的面积百分比，强化空间直觉。',
        icon: Maximize2,
      },
      {
        id: 'AREA_COMPARISON_2AFC',
        title: '负形面积二分判别',
        desc: '快速对比两个形状各异的不规则多边形留白（负形），二选一判别哪侧留白面积更大 (2AFC)。',
        icon: Columns,
      },
      {
        id: 'NEGATIVE_VERTEX_FITTING',
        title: '负形边界反切定点',
        desc: '观察被负形空隙挤压的转折形态，从局部点阵中精准定位被遮挡的关键顶点。',
        icon: Crosshair,
      },
    ],
  },
~~~~~

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript.old
// 4. 正负形感知插件
export const negativeSpacePlugin: TrainingPlugin<
  NegativeSpaceQuestionData,
  NegativeSpaceHitResult,
  number | 'A' | 'B',
  NegativeSpaceSettings
> = {
  domain: 'negative_space',
  title: '正负形感知',
  getModeBadge: (mode) => (mode === 'AREA_COMPARISON_2AFC' ? '负形面积二分判别' : '负形占比估算'),
  generateQuestion: (mode, level) =>
    generateNegativeSpaceQuestion(mode as NegativeSpaceMode, level),
  evaluateAnswer: (userVal, q) => checkNegativeSpaceHit(userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => {
    if (mode === 'AREA_COMPARISON_2AFC') {
      return {
        mode: 'AREA_COMPARISON_2AFC',
        userChoice: userVal,
        correctChoice: q.largerSide,
        negRatioA: q.negRatioA,
        negRatioB: q.negRatioB,
        areaDeltaPercent: q.areaDeltaPercent,
        errorValue: hitResult.errorValue,
      };
    }
    return {
      targetNegativeRatio: q.targetNegativeRatio,
      userRatio: userVal,
      errorValue: hitResult.errorValue,
      positiveArea: q.positiveArea,
      negativeArea: q.negativeArea,
    };
  },
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <NegativeSpaceCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
    />
  ),
};
~~~~~
~~~~~typescript.new
// 4. 正负形感知插件
export const negativeSpacePlugin: TrainingPlugin<
  NegativeSpaceQuestionData,
  NegativeSpaceHitResult,
  number | 'A' | 'B' | Point,
  NegativeSpaceSettings
> = {
  domain: 'negative_space',
  title: '正负形感知',
  getModeBadge: (mode) =>
    mode === 'AREA_COMPARISON_2AFC'
      ? '负形面积二分判别'
      : mode === 'NEGATIVE_VERTEX_FITTING'
        ? '负形边界反切定点'
        : '负形占比估算',
  generateQuestion: (mode, level) =>
    generateNegativeSpaceQuestion(mode as NegativeSpaceMode, level),
  evaluateAnswer: (userVal, q) => checkNegativeSpaceHit(userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (q, hitResult, userVal, mode) => {
    if (mode === 'NEGATIVE_VERTEX_FITTING') {
      return {
        mode: 'NEGATIVE_VERTEX_FITTING',
        targetVertexIndex: q.targetVertexIndex,
        targetPoint: q.targetPoint ? [q.targetPoint.x, q.targetPoint.y] : undefined,
        userClick: hitResult.nearestGridPoint
          ? [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y]
          : undefined,
        errorPixelDistance: hitResult.errorValue,
      };
    }
    if (mode === 'AREA_COMPARISON_2AFC') {
      return {
        mode: 'AREA_COMPARISON_2AFC',
        userChoice: userVal,
        correctChoice: q.largerSide,
        negRatioA: q.negRatioA,
        negRatioB: q.negRatioB,
        areaDeltaPercent: q.areaDeltaPercent,
        errorValue: hitResult.errorValue,
      };
    }
    return {
      targetNegativeRatio: q.targetNegativeRatio,
      userRatio: userVal,
      errorValue: hitResult.errorValue,
      positiveArea: q.positiveArea,
      negativeArea: q.negativeArea,
    };
  },
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <NegativeSpaceCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={settings.sliderHitMargin ?? 12}
      showToleranceBand={settings.showToleranceBand ?? true}
    />
  ),
};
~~~~~

---

### 下一步建议
1. 运行 `npm run build` 或 `npm run test` 验证项目 TypeScript 类型及打包状态。
2. 试运行并在正负形模块看板中体验“负形边界反切定点”模式，评估截断比例（45%）与点阵间距手感是否需要进一步微调。
