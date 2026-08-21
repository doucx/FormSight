基于您提供的 Anki 卡片设计风格与需求，我们将遵循 FormSight 的极简视觉与架构规范，新增 **「角度感知」(Angle Perception)** 领域。

该领域将保持最纯粹的几何视觉（白底 + 纯黑线段），包含以下三张核心卡片：
1. **夹角大小估算 (Angle Estimation)**：基于连续滑块，观察极简线段夹角，直接调制角度度数。
2. **夹角大小二分对比 (Angle Comparison 2AFC)**：二选一辨识哪一侧夹角更大。
3. **平行线对偶辨识 (Parallel Alignment 2AFC)**：二选一判别哪一组线段在几何上真正平行。

以下为完整的实施计划。

## [WIP] feat(angle): 新增角度感知训练领域及连续滑块与 2AFC 卡片系列

### 用户需求
1. 在 FormSight 中新增「角度感知」(`angle`) 领域。
2. 移植 Anki 脚本中克制的视觉风格（纯白背景、无坐标轴干扰、只保留纯黑端点相连线段构成的夹角）。
3. 实现三张训练卡片：
   - 连续滑块卡片：夹角估算（Continuous Slider）。
   - 2AFC 卡片 1：角度大小比较（判别哪一侧夹角更大）。
   - 2AFC 卡片 2：平行判断（判别哪一侧线对真正平行）。

### 评论
角度与方向辨识是绘画起形、透视构图与正负形比例的核心底层感知元。原 Anki 卡片的极简视觉设计有效去除了界面视觉噪音。引入 FormSight 后，结合动态梯度生成（JND 级微小角度差）和连续滑块/2AFC 两种交互形态，能大幅提升感知训练的效率与精准度。

### 目标
1. 在 `src/utils/db/schema.ts`、`src/types/card.ts` 中注册 `angle` 训练领域。
2. 实现 `src/utils/angleUtils.ts`：包含夹角生成、随机旋转基底、平行线对抗扰动生成、基于 JND 指数衰减的容错及命中判定算法。
3. 实现 Canvas 渲染与视图组件：
   - `src/components/angle/AngleAngleView.tsx`（夹角估算连续滑块）
   - `src/components/angle/AngleComparison2AfcView.tsx`（角度二选一对比）
   - `src/components/angle/AngleParallel2AfcView.tsx`（平行线二选一辨识）
   - `src/components/AngleCanvas.tsx`（领域总路由 Canvas）
4. 实现 `src/config/plugins/anglePlugin.tsx` 并将其集成至 `src/config/plugins/index.ts`、`src/config/cards.ts`、`src/config/domains.ts` 以及 `src/utils/settings.ts`。

### 基本原理
1. **视觉克制**：Canvas 纯白底色 (`#FFFFFF`)，只渲染抗锯齿圆角端点的黑线 (`#0F172A`)，线宽保持一致 (2px~2.5px)。
2. **随机倾角旋转不变性 (Invariance)**：所有题目随机给定基底起始角度 $\theta_0 \in [0^\circ, 360^\circ)$，迫使大脑提取相对角度特征而非依赖屏幕正交边缘参考。
3. **难度自适应**：
   - 滑块容错：从 Level 1 的 $\pm 12^\circ$ 随等级衰减至 Level 35 的 $\pm 1.5^\circ$。
   - 2AFC 干扰项差值 $\Delta\theta$：从 Level 1 的 $25^\circ$ 逐步收窄至 Level 35 的 $1.2^\circ$。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #comp/interfaces #concept/ui #concept/state #scope/core #scope/ux #ai/instruct #task/domain/geometry #task/object/angle-perception-module #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 扩展领域类型与数据库 Schema

在核心领域枚举中注册 `angle` 领域。

~~~~~act
patch_file
src/utils/db/schema.ts
~~~~~
~~~~~typescript.old
export type TrainingDomain =
  | 'star'
  | 'color'
  | 'relative_color'
  | 'negative_space'
  | 'abstraction'
  | 'concretization';
~~~~~
~~~~~typescript.new
export type TrainingDomain =
  | 'star'
  | 'color'
  | 'relative_color'
  | 'negative_space'
  | 'abstraction'
  | 'concretization'
  | 'angle';
~~~~~

~~~~~act
patch_file
src/types/card.ts
~~~~~
~~~~~typescript.old
export type SensoryTargetTag =
  | 'geometry'
  | 'color'
  | 'relative_color'
  | 'negative_space'
  | 'abstraction'
  | 'concretization';
~~~~~
~~~~~typescript.new
export type SensoryTargetTag =
  | 'geometry'
  | 'color'
  | 'relative_color'
  | 'negative_space'
  | 'abstraction'
  | 'concretization'
  | 'angle';
~~~~~

#### Acts 2: 实现角度感知工具集与数学算法

新建 `src/utils/angleUtils.ts`，处理角度生成、旋转数学、平行线生成与判题逻辑。

~~~~~act
write_file
src/utils/angleUtils.ts
~~~~~
~~~~~typescript
import type { Point } from '../types';
import { expDecayInterpolate } from './mathUtils';

export type AngleMode =
  | 'ANGLE_ESTIMATION'
  | 'ANGLE_COMPARISON_2AFC'
  | 'PARALLEL_ALIGNMENT_2AFC';

export const ANGLE_CANVAS_SIZE = 340;
export const ANGLE_2AFC_SIZE = 240;

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface AngleQuestionData {
  id: string;
  mode: AngleMode;
  difficultyLevel: number;
  tolerance: number;

  // 1. ANGLE_ESTIMATION 字段
  targetAngleDeg?: number; // 实际夹角 (10°~170°)
  startAngleDeg?: number; // 起始基准旋转角
  lineA?: LineSegment;
  lineB?: LineSegment;

  // 2. ANGLE_COMPARISON_2AFC 字段
  angleA?: number;
  angleB?: number;
  linesA?: [LineSegment, LineSegment];
  linesB?: [LineSegment, LineSegment];
  largerSide?: 'A' | 'B';

  // 3. PARALLEL_ALIGNMENT_2AFC 字段
  parallelLinesA?: [LineSegment, LineSegment];
  parallelLinesB?: [LineSegment, LineSegment];
  parallelSide?: 'A' | 'B';
  angularDeviation?: number; // 干扰项偏离平行的微小角度
}

export interface AngleHitResult {
  isHit: boolean;
  userValue?: number;
  targetValue?: number;
  errorValue: number;
  tolerance: number;
  userChoice?: 'A' | 'B';
  correctChoice?: 'A' | 'B';
}

/**
 * 绘制两条相交构成的夹角线段 (极简纯黑白)
 */
export function drawAngleCanvas(
  canvas: HTMLCanvasElement | null,
  lines: [LineSegment, LineSegment] | undefined,
  size = ANGLE_CANVAS_SIZE,
  strokeColor = '#0F172A',
  lineWidth = 2.5,
): void {
  if (!canvas || !lines) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const line of lines) {
    ctx.beginPath();
    ctx.moveTo(line.p1.x, line.p1.y);
    ctx.lineTo(line.p2.x, line.p2.y);
    ctx.stroke();
  }
}

/**
 * 绘制两根平行或微小偏转的独立线段
 */
export function drawParallelLinesCanvas(
  canvas: HTMLCanvasElement | null,
  lines: [LineSegment, LineSegment] | undefined,
  size = ANGLE_2AFC_SIZE,
  strokeColor = '#0F172A',
  lineWidth = 2.5,
): void {
  if (!canvas || !lines) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';

  for (const line of lines) {
    ctx.beginPath();
    ctx.moveTo(line.p1.x, line.p1.y);
    ctx.lineTo(line.p2.x, line.p2.y);
    ctx.stroke();
  }
}

/**
 * 根据极角生成一条由中心发散出去的线段
 */
function createRadialLine(
  center: Point,
  angleDeg: number,
  length: number,
): LineSegment {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    p1: { x: center.x, y: center.y },
    p2: {
      x: Math.round((center.x + length * Math.cos(rad)) * 10) / 10,
      y: Math.round((center.y - length * Math.sin(rad)) * 10) / 10,
    },
  };
}

/**
 * 生成空间中居中平行分布的两根线段
 */
function createParallelPair(
  center: Point,
  angleDeg: number,
  length: number,
  spacing: number,
  angularJitter = 0,
): [LineSegment, LineSegment] {
  const rad = (angleDeg * Math.PI) / 180;
  const normRad = rad + Math.PI / 2;

  const offsetX = (spacing / 2) * Math.cos(normRad);
  const offsetY = -(spacing / 2) * Math.sin(normRad);

  const c1: Point = { x: center.x + offsetX, y: center.y + offsetY };
  const c2: Point = { x: center.x - offsetX, y: center.y - offsetY };

  const halfL = length / 2;

  // 线 1
  const line1: LineSegment = {
    p1: {
      x: Math.round((c1.x - halfL * Math.cos(rad)) * 10) / 10,
      y: Math.round((c1.y + halfL * Math.sin(rad)) * 10) / 10,
    },
    p2: {
      x: Math.round((c1.x + halfL * Math.cos(rad)) * 10) / 10,
      y: Math.round((c1.y - halfL * Math.sin(rad)) * 10) / 10,
    },
  };

  // 线 2 (带有可选的微小偏转)
  const rad2 = ((angleDeg + angularJitter) * Math.PI) / 180;
  const line2: LineSegment = {
    p1: {
      x: Math.round((c2.x - halfL * Math.cos(rad2)) * 10) / 10,
      y: Math.round((c2.y + halfL * Math.sin(rad2)) * 10) / 10,
    },
    p2: {
      x: Math.round((c2.x + halfL * Math.cos(rad2)) * 10) / 10,
      y: Math.round((c2.y - halfL * Math.sin(rad2)) * 10) / 10,
    },
  };

  return [line1, line2];
}

export function generateAngleQuestion(
  mode: AngleMode,
  level: number,
): AngleQuestionData {
  const id = `ang_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  // 1. ANGLE_ESTIMATION (连续滑块估算夹角)
  if (mode === 'ANGLE_ESTIMATION') {
    const targetAngleDeg = Math.floor(Math.random() * 150) + 15; // 15° ~ 165°
    const startAngleDeg = Math.floor(Math.random() * 360);
    const endAngleDeg = (startAngleDeg + targetAngleDeg) % 360;

    const center: Point = { x: ANGLE_CANVAS_SIZE / 2, y: ANGLE_CANVAS_SIZE / 2 };
    const armLength = ANGLE_CANVAS_SIZE * 0.38;

    const lineA = createRadialLine(center, startAngleDeg, armLength);
    const lineB = createRadialLine(center, endAngleDeg, armLength);

    const tolerance =
      Math.round(expDecayInterpolate(12.0, 1.5, clampedLevel) * 10) / 10;

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      targetAngleDeg,
      startAngleDeg,
      lineA,
      lineB,
      tolerance,
    };
  }

  // 2. ANGLE_COMPARISON_2AFC (角度大小对比)
  if (mode === 'ANGLE_COMPARISON_2AFC') {
    const baseAngle = Math.floor(Math.random() * 110) + 30; // 30° ~ 140°
    const deltaAngle =
      Math.round(expDecayInterpolate(25.0, 1.2, clampedLevel) * 10) / 10;

    const largerAngle = Math.min(170, baseAngle + deltaAngle);
    const smallerAngle = Math.max(10, baseAngle);

    const isALarger = Math.random() < 0.5;
    const angleA = isALarger ? largerAngle : smallerAngle;
    const angleB = isALarger ? smallerAngle : largerAngle;

    const center: Point = { x: ANGLE_2AFC_SIZE / 2, y: ANGLE_2AFC_SIZE / 2 };
    const armLength = ANGLE_2AFC_SIZE * 0.38;

    // 两侧采用独立的随机倾角起始，消除视觉坐标系基准偏置
    const startA = Math.floor(Math.random() * 360);
    const startB = Math.floor(Math.random() * 360);

    const linesA: [LineSegment, LineSegment] = [
      createRadialLine(center, startA, armLength),
      createRadialLine(center, (startA + angleA) % 360, armLength),
    ];
    const linesB: [LineSegment, LineSegment] = [
      createRadialLine(center, startB, armLength),
      createRadialLine(center, (startB + angleB) % 360, armLength),
    ];

    return {
      id,
      mode,
      difficultyLevel: clampedLevel,
      angleA,
      angleB,
      linesA,
      linesB,
      largerSide: isALarger ? 'A' : 'B',
      tolerance: deltaAngle,
    };
  }

  // 3. PARALLEL_ALIGNMENT_2AFC (平行线对偶辨识)
  const baseAngle = Math.floor(Math.random() * 360);
  const angularDeviation =
    Math.round(expDecayInterpolate(16.0, 1.0, clampedLevel) * 10) / 10;
  const deviationSign = Math.random() < 0.5 ? 1 : -1;
  const jitter = angularDeviation * deviationSign;

  const center: Point = { x: ANGLE_2AFC_SIZE / 2, y: ANGLE_2AFC_SIZE / 2 };
  const lineLength = ANGLE_2AFC_SIZE * 0.6;
  const spacing = ANGLE_2AFC_SIZE * 0.28;

  const anglePairA = Math.floor(Math.random() * 360);
  const anglePairB = Math.floor(Math.random() * 360);

  const isAParallel = Math.random() < 0.5;

  const parallelLinesA = isAParallel
    ? createParallelPair(center, anglePairA, lineLength, spacing, 0)
    : createParallelPair(center, anglePairA, lineLength, spacing, jitter);

  const parallelLinesB = isAParallel
    ? createParallelPair(center, anglePairB, lineLength, spacing, jitter)
    : createParallelPair(center, anglePairB, lineLength, spacing, 0);

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    parallelLinesA,
    parallelLinesB,
    parallelSide: isAParallel ? 'A' : 'B',
    angularDeviation,
    tolerance: angularDeviation,
  };
}

export function checkAngleHit(
  userAnswer: number | 'A' | 'B',
  question: AngleQuestionData,
): AngleHitResult {
  const { mode } = question;

  if (mode === 'ANGLE_ESTIMATION') {
    const userVal = typeof userAnswer === 'number' ? userAnswer : 90;
    const targetVal = question.targetAngleDeg ?? 90;
    const errorValue = Math.round(Math.abs(userVal - targetVal) * 10) / 10;
    const isHit = errorValue <= question.tolerance;

    return {
      isHit,
      userValue: userVal,
      targetValue: targetVal,
      errorValue,
      tolerance: question.tolerance,
    };
  }

  const choice = userAnswer as 'A' | 'B';
  const correctChoice =
    mode === 'ANGLE_COMPARISON_2AFC'
      ? question.largerSide ?? 'A'
      : question.parallelSide ?? 'A';

  const isHit = choice === correctChoice;

  return {
    isHit,
    userChoice: choice,
    correctChoice,
    errorValue: isHit ? 0 : 1,
    tolerance: question.tolerance,
  };
}
~~~~~

#### Acts 3: 实现视图组件

创建夹角连续滑块视图、角度二分对比视图与平行线二选一视图。

~~~~~act
write_file
src/components/angle/AngleEstimationView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useTrackPointer } from '../../hooks/useTrackPointer';
import {
  ANGLE_CANVAS_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawAngleCanvas,
} from '../../utils/angleUtils';
import { QuestionCardShell } from '../common/QuestionCardShell';

interface AngleEstimationViewProps {
  question: AngleQuestionData;
  showAnswer: boolean;
  userAnswer: AngleHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function AngleEstimationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: AngleEstimationViewProps) {
  const [sliderVal, setSliderVal] = useState<number>(90);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { trackRef, hoverVal, pointerProps } = useTrackPointer({
    max: 180,
    step: 0.5,
    disabled: disabled || showAnswer,
    onValChange: setSliderVal,
    onCommit: (committedVal) => {
      if (!disabled && !showAnswer) onAnswer(committedVal);
    },
  });

  const activeVal = hoverVal !== null ? hoverVal : sliderVal;
  const userVal = userAnswer?.userValue ?? sliderVal;
  const targetVal = question.targetAngleDeg ?? 90;
  const isHit = Boolean(userAnswer?.isHit);
  const tolerance = question.tolerance;

  useEffect(() => {
    if (question.lineA && question.lineB) {
      drawAngleCanvas(canvasRef.current, [question.lineA, question.lineB], ANGLE_CANVAS_SIZE);
    }
  }, [question.lineA, question.lineB]);

  const unit = '°';

  return (
    <QuestionCardShell
      hintText="观察两射线夹角，调制滑块逼近精准度数 (0°~180°)"
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
    >
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={ANGLE_CANVAS_SIZE}
          height={ANGLE_CANVAS_SIZE}
          className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white"
        />
      </div>

      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>夹角估算值:</span>
          <span className="font-mono text-base font-black text-indigo-600">
            {showAnswer ? `${userVal}${unit}` : `${activeVal}${unit}`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-slate-400 text-xs">0{unit}</span>

          <div
            {...pointerProps}
            style={
              hitMargin > 0
                ? {
                    paddingLeft: `${hitMargin}px`,
                    paddingRight: `${hitMargin}px`,
                    marginLeft: `-${hitMargin}px`,
                    marginRight: `-${hitMargin}px`,
                    paddingTop: '6px',
                    paddingBottom: '6px',
                    marginTop: '-6px',
                    marginBottom: '-6px',
                  }
                : undefined
            }
            className={`relative flex-1 flex items-center select-none touch-none ${
              !showAnswer && !disabled ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <div
              ref={trackRef}
              className="relative w-full h-7 rounded-xl bg-slate-200 border border-slate-300/80 shadow-inner flex items-center overflow-hidden"
            >
              <div
                className="absolute top-0 bottom-0 left-0 bg-indigo-500/20"
                style={{ width: `${(activeVal / 180) * 100}%` }}
              />

              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                  style={{ left: `${(activeVal / 180) * 100}%` }}
                />
              )}

              {!showAnswer && showToleranceBand && (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: `${(Math.max(0, activeVal - tolerance) / 180) * 100}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: `${(Math.min(180, activeVal + tolerance) / 180) * 100}%` }}
                  />
                </>
              )}

              {showAnswer && (
                <>
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                    style={{ left: `${(targetVal / 180) * 100}%` }}
                  />
                  <div
                    className={`absolute top-0 bottom-0 w-1 -translate-x-1/2 z-10 border-x border-white shadow-md ${
                      isHit ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{ left: `${(userVal / 180) * 100}%` }}
                  />
                </>
              )}
            </div>
          </div>

          <span className="font-bold font-mono text-slate-400 text-xs">180{unit}</span>
        </div>

        {showAnswer && (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              绝对真理值:{' '}
              <span className="font-bold text-slate-800 font-mono">
                {targetVal}
                {unit}
              </span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              误差: {Math.round(Math.abs(userVal - targetVal) * 10) / 10}
              {unit} (容错: ±{tolerance}
              {unit})
            </span>
          </div>
        )}
      </div>
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/components/angle/AngleComparison2AfcView.tsx
~~~~~
~~~~~typescript
import { Columns } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  ANGLE_2AFC_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawAngleCanvas,
} from '../../utils/angleUtils';
import { Choice2AfcContainer } from '../common/Choice2AfcContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';

interface AngleComparison2AfcViewProps {
  question: AngleQuestionData;
  showAnswer: boolean;
  userAnswer: AngleHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AngleComparison2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AngleComparison2AfcViewProps) {
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection on question change
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  useEffect(() => {
    drawAngleCanvas(canvasRefA.current, question.linesA, ANGLE_2AFC_SIZE);
    drawAngleCanvas(canvasRefB.current, question.linesB, ANGLE_2AFC_SIZE);
  }, [question.linesA, question.linesB]);

  const handleSelectChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelectedChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );

  const isAHit = question.largerSide === 'A';
  const isBHit = question.largerSide === 'B';

  return (
    <QuestionCardShell
      hintText="二选一辨识哪一侧的两射线夹角更大 (键 1 / 2)"
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      <Choice2AfcContainer
        optionA={{
          key: 'A',
          title: '区域 A',
          isCorrect: isAHit,
          badge: showAnswer ? `${question.angleA}°` : undefined,
          content: (
            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefA}
                width={ANGLE_2AFC_SIZE}
                height={ANGLE_2AFC_SIZE}
                className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              />
            </div>
          ),
        }}
        optionB={{
          key: 'B',
          title: '区域 B',
          isCorrect: isBHit,
          badge: showAnswer ? `${question.angleB}°` : undefined,
          content: (
            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefB}
                width={ANGLE_2AFC_SIZE}
                height={ANGLE_2AFC_SIZE}
                className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              />
            </div>
          ),
        }}
        selectedChoice={selectedChoice}
        showAnswer={showAnswer}
        disabled={disabled}
        enableKeyboardShortcuts={true}
        onSelect={handleSelectChoice}
      />
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/components/angle/AngleParallel2AfcView.tsx
~~~~~
~~~~~typescript
import { Split } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  ANGLE_2AFC_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawParallelLinesCanvas,
} from '../../utils/angleUtils';
import { Choice2AfcContainer } from '../common/Choice2AfcContainer';
import { QuestionCardShell } from '../common/QuestionCardShell';

interface AngleParallel2AfcViewProps {
  question: AngleQuestionData;
  showAnswer: boolean;
  userAnswer: AngleHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AngleParallel2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AngleParallel2AfcViewProps) {
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection on question change
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  useEffect(() => {
    drawParallelLinesCanvas(canvasRefA.current, question.parallelLinesA, ANGLE_2AFC_SIZE);
    drawParallelLinesCanvas(canvasRefB.current, question.parallelLinesB, ANGLE_2AFC_SIZE);
  }, [question.parallelLinesA, question.parallelLinesB]);

  const handleSelectChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelectedChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );

  const isAHit = question.parallelSide === 'A';
  const isBHit = question.parallelSide === 'B';

  return (
    <QuestionCardShell
      hintText="二选一判别哪一侧线对严格平行 (键 1 / 2)"
      hintIcon={Split}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      <Choice2AfcContainer
        optionA={{
          key: 'A',
          title: '线组 A',
          isCorrect: isAHit,
          badge: showAnswer ? (isAHit ? '绝对平行' : `偏转 ${question.angularDeviation}°`) : undefined,
          content: (
            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefA}
                width={ANGLE_2AFC_SIZE}
                height={ANGLE_2AFC_SIZE}
                className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              />
            </div>
          ),
        }}
        optionB={{
          key: 'B',
          title: '线组 B',
          isCorrect: isBHit,
          badge: showAnswer ? (isBHit ? '绝对平行' : `偏转 ${question.angularDeviation}°`) : undefined,
          content: (
            <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
              <canvas
                ref={canvasRefB}
                width={ANGLE_2AFC_SIZE}
                height={ANGLE_2AFC_SIZE}
                className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              />
            </div>
          ),
        }}
        selectedChoice={selectedChoice}
        showAnswer={showAnswer}
        disabled={disabled}
        enableKeyboardShortcuts={true}
        onSelect={handleSelectChoice}
      />
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/components/AngleCanvas.tsx
~~~~~
~~~~~typescript
import type { AngleHitResult, AngleQuestionData } from '../utils/angleUtils';
import { AngleComparison2AfcView } from './angle/AngleComparison2AfcView';
import { AngleEstimationView } from './angle/AngleEstimationView';
import { AngleParallel2AfcView } from './angle/AngleParallel2AfcView';

interface AngleCanvasProps {
  question: AngleQuestionData;
  showAnswer: boolean;
  userAnswer: AngleHitResult | null;
  onAnswer: (val: number | 'A' | 'B') => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function AngleCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: AngleCanvasProps) {
  const { mode } = question;

  if (mode === 'ANGLE_ESTIMATION') {
    return (
      <AngleEstimationView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        hitMargin={hitMargin}
        showToleranceBand={showToleranceBand}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'ANGLE_COMPARISON_2AFC') {
    return (
      <AngleComparison2AfcView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  return (
    <AngleParallel2AfcView
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      showCanvasHints={showCanvasHints}
    />
  );
}
~~~~~

#### Acts 4: 实现插件并注册卡片与领域

创建 `src/config/plugins/anglePlugin.tsx`，并更新 `index.ts`、`cards.ts`、`domains.ts` 与 `settings.ts`。

~~~~~act
write_file
src/config/plugins/anglePlugin.tsx
~~~~~
~~~~~typescript
import { AngleCanvas } from '../../components/AngleCanvas';
import {
  type AngleHitResult,
  type AngleMode,
  type AngleQuestionData,
  checkAngleHit,
  generateAngleQuestion,
} from '../../utils/angleUtils';
import type { BaseModuleSettings } from '../../utils/settings';
import type { TrainingPlugin } from '../trainingPlugins';

export const anglePlugin: TrainingPlugin<
  AngleQuestionData,
  AngleHitResult,
  number | 'A' | 'B',
  BaseModuleSettings
> = {
  domain: 'angle',
  title: '角度感知',
  getModeBadge: (mode) => {
    const map: Record<string, string> = {
      ANGLE_ESTIMATION: '夹角大小估算',
      ANGLE_COMPARISON_2AFC: '角度二分对比',
      PARALLEL_ALIGNMENT_2AFC: '平行线对偶辨识',
    };
    return map[mode] || mode;
  },
  generateQuestion: (mode, level) => generateAngleQuestion(mode as AngleMode, level),
  evaluateAnswer: (userVal, q) => checkAngleHit(userVal, q),
  isHit: (hitResult) => hitResult.isHit,
  getQuestionLevel: (q) => q.difficultyLevel,
  extractRecordDetails: (_q, hitResult, userVal, mode) => ({
    mode,
    userAnswer: userVal,
    errorValue: hitResult.errorValue,
    tolerance: hitResult.tolerance,
  }),
  renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
    <AngleCanvas
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      onAnswer={onAnswer}
      disabled={disabled}
      hitMargin={(settings.sliderHitMargin as number) ?? 12}
      showToleranceBand={(settings.showToleranceBand as boolean) ?? true}
      showCanvasHints={(settings.showCanvasHints as boolean) ?? true}
    />
  ),
};
~~~~~

~~~~~act
patch_file
src/config/plugins/index.ts
~~~~~
~~~~~typescript.old
import type { TrainingDomain } from '../../utils/db';
import type { AnyTrainingPlugin } from '../trainingPlugins';
import { abstractionPlugin } from './abstractionPlugin';
import { colorPlugin } from './colorPlugin';
import { negativeSpacePlugin } from './negativeSpacePlugin';
import { relativeColorPlugin } from './relativeColorPlugin';
import { starPlugin } from './starPlugin';

export { starPlugin } from './starPlugin';
export { colorPlugin } from './colorPlugin';
export { relativeColorPlugin } from './relativeColorPlugin';
export { negativeSpacePlugin } from './negativeSpacePlugin';
export { abstractionPlugin } from './abstractionPlugin';

export const TRAINING_PLUGINS: Record<TrainingDomain, AnyTrainingPlugin> = {
  abstraction: abstractionPlugin as unknown as AnyTrainingPlugin,
  concretization: abstractionPlugin as unknown as AnyTrainingPlugin,
  star: starPlugin as unknown as AnyTrainingPlugin,
  color: colorPlugin as unknown as AnyTrainingPlugin,
  relative_color: relativeColorPlugin as unknown as AnyTrainingPlugin,
  negative_space: negativeSpacePlugin as unknown as AnyTrainingPlugin,
};

export const CARD_PLUGINS: Record<string, AnyTrainingPlugin> = {
  star_single: starPlugin as unknown as AnyTrainingPlugin,
~~~~~
~~~~~typescript.new
import type { TrainingDomain } from '../../utils/db';
import type { AnyTrainingPlugin } from '../trainingPlugins';
import { abstractionPlugin } from './abstractionPlugin';
import { anglePlugin } from './anglePlugin';
import { colorPlugin } from './colorPlugin';
import { negativeSpacePlugin } from './negativeSpacePlugin';
import { relativeColorPlugin } from './relativeColorPlugin';
import { starPlugin } from './starPlugin';

export { starPlugin } from './starPlugin';
export { colorPlugin } from './colorPlugin';
export { relativeColorPlugin } from './relativeColorPlugin';
export { negativeSpacePlugin } from './negativeSpacePlugin';
export { abstractionPlugin } from './abstractionPlugin';
export { anglePlugin } from './anglePlugin';

export const TRAINING_PLUGINS: Record<TrainingDomain, AnyTrainingPlugin> = {
  abstraction: abstractionPlugin as unknown as AnyTrainingPlugin,
  concretization: abstractionPlugin as unknown as AnyTrainingPlugin,
  star: starPlugin as unknown as AnyTrainingPlugin,
  color: colorPlugin as unknown as AnyTrainingPlugin,
  relative_color: relativeColorPlugin as unknown as AnyTrainingPlugin,
  negative_space: negativeSpacePlugin as unknown as AnyTrainingPlugin,
  angle: anglePlugin as unknown as AnyTrainingPlugin,
};

export const CARD_PLUGINS: Record<string, AnyTrainingPlugin> = {
  angle_estimation: anglePlugin as unknown as AnyTrainingPlugin,
  angle_comparison_2afc: anglePlugin as unknown as AnyTrainingPlugin,
  angle_parallel_2afc: anglePlugin as unknown as AnyTrainingPlugin,
  star_single: starPlugin as unknown as AnyTrainingPlugin,
~~~~~

~~~~~act
patch_file
src/config/cards.ts
~~~~~
~~~~~typescript.old
import {
  Columns,
  Crosshair,
  Droplet,
  Maximize2,
  Palette,
  RotateCw,
  Shuffle,
  Sparkles,
  Sun,
  Target,
} from 'lucide-preact';
~~~~~
~~~~~typescript.new
import {
  Columns,
  Compass,
  Crosshair,
  Droplet,
  Maximize2,
  Palette,
  RotateCw,
  Shuffle,
  Sparkles,
  Split,
  Sun,
  Target,
} from 'lucide-preact';
~~~~~

~~~~~act
patch_file
src/config/cards.ts
~~~~~
~~~~~typescript.old
export const ALL_CARDS: CardDefinition[] = [
  // ==========================================
  // 0. 视知觉概括系列 (Visual Abstraction)
  // ==========================================
~~~~~
~~~~~typescript.new
export const ALL_CARDS: CardDefinition[] = [
  // ==========================================
  // 角度感知系列 (Angle Perception)
  // ==========================================
  {
    id: 'angle_estimation',
    domain: 'angle',
    mode: 'ANGLE_ESTIMATION',
    title: '夹角大小估算',
    desc: '观察由纯黑线段构成的夹角，使用连续滑块精准评估夹角弧度大小 (0°~180°)。',
    instruction: '观察极简两条射线夹角，调制滑块逼近精准度数 (0°~180°)',
    icon: Compass,
    tags: {
      target: ['geometry', 'angle'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'angle_comparison_2afc',
    domain: 'angle',
    mode: 'ANGLE_COMPARISON_2AFC',
    title: '角度二分对比',
    desc: '在消除空间正交基准干扰下，二选一快速判别哪一侧的两射线夹角更大 (2AFC)。',
    instruction: '二选一快速判别哪一侧夹角更大 (键 1 / 2)',
    icon: Columns,
    tags: {
      target: ['geometry', 'angle'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'angle_parallel_2afc',
    domain: 'angle',
    mode: 'PARALLEL_ALIGNMENT_2AFC',
    title: '平行线对偶辨识',
    desc: '在空间任意旋转倾角下，二选一辨识哪一组线对保持严格几何平行 (2AFC)。',
    instruction: '二选一判别哪一侧线对严格平行 (键 1 / 2)',
    icon: Split,
    tags: {
      target: ['geometry', 'angle'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },

  // ==========================================
  // 0. 视知觉概括系列 (Visual Abstraction)
  // ==========================================
~~~~~

~~~~~act
patch_file
src/config/domains.ts
~~~~~
~~~~~typescript.old
export interface DomainMeta {
  domain: TrainingDomain;
  appId:
    | 'star-hopping'
    | 'color-sense'
    | 'relative-color'
    | 'negative-space'
    | 'visual-abstraction'
    | 'visual-refinement';
  title: string;
  subTitle: string;
  homeTitle: string;
  homeDesc: string;
  themeColor: 'indigo' | 'amber' | 'purple' | 'emerald';
  icon: (props: { className?: string }) => ComponentChildren;
  hasWeaknessAnalytics?: boolean;
  get cards(): CardDefinition[];
}
~~~~~
~~~~~typescript.new
export interface DomainMeta {
  domain: TrainingDomain;
  appId:
    | 'star-hopping'
    | 'color-sense'
    | 'relative-color'
    | 'negative-space'
    | 'visual-abstraction'
    | 'visual-refinement'
    | 'angle-perception';
  title: string;
  subTitle: string;
  homeTitle: string;
  homeDesc: string;
  themeColor: 'indigo' | 'amber' | 'purple' | 'emerald';
  icon: (props: { className?: string }) => ComponentChildren;
  hasWeaknessAnalytics?: boolean;
  get cards(): CardDefinition[];
}
~~~~~

~~~~~act
patch_file
src/config/domains.ts
~~~~~
~~~~~typescript.old
export const DOMAINS_CONFIG: Record<TrainingDomain, DomainMeta> = {
  star: {
~~~~~
~~~~~typescript.new
export const DOMAINS_CONFIG: Record<TrainingDomain, DomainMeta> = {
  angle: {
    domain: 'angle',
    appId: 'angle-perception',
    title: '角度感知',
    subTitle: 'Angle Perception',
    homeTitle: '角度感知 (Angle Perception)',
    homeDesc:
      '以极简白底黑线剥离干扰，通过夹角大小估算、微小角度二分对比与平行线对偶辨识，构建坚实的正负形起形与角度感知直觉。',
    themeColor: 'indigo',
    icon: Compass,
    hasWeaknessAnalytics: true,
    get cards() {
      return getCardsByDomain('angle');
    },
  },
  star: {
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
  cards: {
    star_single: {
~~~~~
~~~~~typescript.new
  cards: {
    angle_estimation: {
      ...DEFAULT_BASE_SETTINGS,
      sliderHitMargin: 12,
      showToleranceBand: true,
    },
    angle_comparison_2afc: { ...DEFAULT_BASE_SETTINGS },
    angle_parallel_2afc: { ...DEFAULT_BASE_SETTINGS },
    star_single: {
~~~~~

### 下一步建议
1. **运行验证与测试**：在浏览器中测试「角度感知」领域的三个模块，验证连续滑块容错区间的动画与 2AFC 键盘快捷键（按键 1 与 2）的响应。
2. **专项弱点靶向拓展**：后续可为 `angle_estimation` 增加针对锐角 (0°~45°)、直角 (45°~135°) 与钝角 (135°~180°) 的扇区分区弱点靶向强化面板。
