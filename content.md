我们将按照您的明确需求，将「平行判断」卡片重构为**基于上方基准线的 2AFC 寻线模式**（上方展示一条基准线，下方 A/B 两个候选区域各展示一条线，用户二选一判别哪条线与基准线保持绝对平行）。

以下为重写与重构的完整计划。

## [WIP] refactor(angle): 重构平行判断为上方基准线二选一辨识模式

### 用户需求
1. 废弃原先两组双线并列的“平行线对偶辨识”模式。
2. 重写平行判断交互：
   - **题干 (Prompt)**：屏幕上方居中显示一条具有随机倾角的基准线段。
   - **候选区 (2AFC)**：下方提供 A / B 两个选项卡片，各显示一条线段。
   - **任务**：用户判别哪一个选项中的线段与上方基准线保持严格平行。

### 评论
采用“上方基准 Prompt + 下方 2AFC 选项”的范式，符合视觉感知心理学中的匹配辨识实验（Match-to-Sample）设计，大幅提升了对空间斜率（Orientation / Slope）绝对一致性的感知训练效果。

### 目标
1. 在 `src/utils/angleUtils.ts` 中新增单线段绘制工具 `drawSingleLineCanvas`。
2. 重构 `generateAngleQuestion` 中 `PARALLEL_ALIGNMENT_2AFC` 的数据结构：生成 `promptLine`、`lineOptionA` 与 `lineOptionB`（平行项保持同向/反向平行斜率并施加微小空间位移，干扰项施加基于 JND 等级微小角度偏转）。
3. 重写 `src/components/angle/AngleParallel2AfcView.tsx` 视图组件，上方展示基准 Prompt 画布，下方通过 `Choice2AfcContainer` 渲染 A/B 两个独立线段候选框。
4. 更新 `src/config/cards.ts` 与 `src/config/plugins/anglePlugin.tsx` 中的文案与说明。

### 基本原理
- **基准线生成**：在中心处以随机方向 $\theta \in [0^\circ, 360^\circ)$ 绘制一条长度适中的黑线。
- **候选线生成**：
  - **真理项 (Target)**：角度完全等于 $\theta$，并在候选画布中心（或带少许平移扰动）绘制，斜率严格相同。
  - **干扰项 (Distractor)**：角度为 $\theta \pm \Delta\theta$（$\Delta\theta$ 随 Level 从 $16.0^\circ$ 衰减至 $1.0^\circ$），迫使大脑在微小斜率差下作出判别。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/geometry #task/object/angle-parallel-card #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 重构角度感知数学与题目生成器

修改 `src/utils/angleUtils.ts`，增加单线绘制函数，并重构平行判断的数据结构与生成逻辑。

~~~~~act
patch_file
src/utils/angleUtils.ts
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
export const ANGLE_CANVAS_SIZE = 340;
export const ANGLE_2AFC_SIZE = 240;
export const ANGLE_PROMPT_SIZE = 140;

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

  // 3. PARALLEL_ALIGNMENT_2AFC (基准线 2AFC) 字段
  promptLine?: LineSegment;
  lineOptionA?: LineSegment;
  lineOptionB?: LineSegment;
  parallelSide?: 'A' | 'B';
  angularDeviation?: number; // 干扰项偏离平行的微小角度
}
~~~~~

~~~~~act
patch_file
src/utils/angleUtils.ts
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
/**
 * 绘制单条居中线段 (极简纯黑白)
 */
export function drawSingleLineCanvas(
  canvas: HTMLCanvasElement | null,
  line: LineSegment | undefined,
  size = ANGLE_2AFC_SIZE,
  strokeColor = '#0F172A',
  lineWidth = 2.5,
): void {
  if (!canvas || !line) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(line.p1.x, line.p1.y);
  ctx.lineTo(line.p2.x, line.p2.y);
  ctx.stroke();
}

/**
 * 根据中心点、角度和长度生成居中对称线段
 */
function createCenteredLine(
  center: Point,
  angleDeg: number,
  length: number,
): LineSegment {
  const rad = (angleDeg * Math.PI) / 180;
  const halfL = length / 2;
  return {
    p1: {
      x: Math.round((center.x - halfL * Math.cos(rad)) * 10) / 10,
      y: Math.round((center.y + halfL * Math.sin(rad)) * 10) / 10,
    },
    p2: {
      x: Math.round((center.x + halfL * Math.cos(rad)) * 10) / 10,
      y: Math.round((center.y - halfL * Math.sin(rad)) * 10) / 10,
    },
  };
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
~~~~~

~~~~~act
patch_file
src/utils/angleUtils.ts
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
  // 3. PARALLEL_ALIGNMENT_2AFC (基准线平行 2AFC)
  const baseAngle = Math.floor(Math.random() * 360);
  const angularDeviation =
    Math.round(expDecayInterpolate(16.0, 1.0, clampedLevel) * 10) / 10;
  const deviationSign = Math.random() < 0.5 ? 1 : -1;
  const distractorAngle = (baseAngle + angularDeviation * deviationSign + 360) % 360;

  // 上方 Prompt 基准线
  const promptCenter: Point = {
    x: ANGLE_PROMPT_SIZE / 2,
    y: ANGLE_PROMPT_SIZE / 2,
  };
  const promptLine = createCenteredLine(
    promptCenter,
    baseAngle,
    ANGLE_PROMPT_SIZE * 0.68,
  );

  // 下方选项候选线 (带有适度中心位移，防止仅依赖绝对屏幕位置)
  const optCenterA: Point = {
    x: ANGLE_2AFC_SIZE / 2 + (Math.random() * 20 - 10),
    y: ANGLE_2AFC_SIZE / 2 + (Math.random() * 20 - 10),
  };
  const optCenterB: Point = {
    x: ANGLE_2AFC_SIZE / 2 + (Math.random() * 20 - 10),
    y: ANGLE_2AFC_SIZE / 2 + (Math.random() * 20 - 10),
  };

  const lineLength = ANGLE_2AFC_SIZE * 0.65;
  const isAParallel = Math.random() < 0.5;

  const lineOptionA = isAParallel
    ? createCenteredLine(optCenterA, baseAngle, lineLength)
    : createCenteredLine(optCenterA, distractorAngle, lineLength);

  const lineOptionB = isAParallel
    ? createCenteredLine(optCenterB, distractorAngle, lineLength)
    : createCenteredLine(optCenterB, baseAngle, lineLength);

  return {
    id,
    mode,
    difficultyLevel: clampedLevel,
    promptLine,
    lineOptionA,
    lineOptionB,
    parallelSide: isAParallel ? 'A' : 'B',
    angularDeviation,
    tolerance: angularDeviation,
  };
~~~~~

#### Acts 2: 重构 `AngleParallel2AfcView.tsx` 视图组件

~~~~~act
write_file
src/components/angle/AngleParallel2AfcView.tsx
~~~~~
~~~~~typescript
import { Split } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  ANGLE_2AFC_SIZE,
  ANGLE_PROMPT_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawSingleLineCanvas,
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
  const canvasPromptRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection on question change
  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  useEffect(() => {
    drawSingleLineCanvas(
      canvasPromptRef.current,
      question.promptLine,
      ANGLE_PROMPT_SIZE,
      '#4F46E5', // 基准线用 Indigo 突出
      3.0,
    );
    drawSingleLineCanvas(
      canvasRefA.current,
      question.lineOptionA,
      ANGLE_2AFC_SIZE,
      '#0F172A',
      2.5,
    );
    drawSingleLineCanvas(
      canvasRefB.current,
      question.lineOptionB,
      ANGLE_2AFC_SIZE,
      '#0F172A',
      2.5,
    );
  }, [question.promptLine, question.lineOptionA, question.lineOptionB]);

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
      hintText="观察上方基准线，选出下方与它严格平行的线 (键 1 / 2)"
      hintIcon={Split}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      {/* 上方基准线 Prompt 卡片 */}
      <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          平行基准线 (Prompt)
        </span>
        <canvas
          ref={canvasPromptRef}
          width={ANGLE_PROMPT_SIZE}
          height={ANGLE_PROMPT_SIZE}
          className="w-28 h-28 rounded-xl border border-slate-200 shadow-sm bg-white"
        />
      </div>

      {/* 下方 2AFC 选项区 */}
      <Choice2AfcContainer
        optionA={{
          key: 'A',
          title: '选项 A',
          isCorrect: isAHit,
          badge: showAnswer
            ? isAHit
              ? '绝对平行'
              : `偏转 ${question.angularDeviation}°`
            : undefined,
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
          title: '选项 B',
          isCorrect: isBHit,
          badge: showAnswer
            ? isBHit
              ? '绝对平行'
              : `偏转 ${question.angularDeviation}°`
            : undefined,
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

#### Acts 3: 更新卡片配置文案

~~~~~act
patch_file
src/config/cards.ts
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
  {
    id: 'angle_parallel_2afc',
    domain: 'angle',
    mode: 'PARALLEL_ALIGNMENT_2AFC',
    title: '平行线基准辨识',
    desc: '观察上方给定的斜率基准线，在下方两个候选项中二选一找出与其绝对平行的线段 (2AFC)。',
    instruction: '观察上方基准线，在下方选出与其保持绝对平行的线 (键 1 / 2)',
    icon: Split,
    tags: {
      target: ['geometry', 'angle'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
~~~~~

~~~~~act
patch_file
src/config/plugins/anglePlugin.tsx
~~~~~
~~~~~typescript.old
  getModeBadge: (mode) => {
    const map: Record<string, string> = {
      ANGLE_ESTIMATION: '夹角大小估算',
      ANGLE_COMPARISON_2AFC: '角度二分对比',
      PARALLEL_ALIGNMENT_2AFC: '平行线对偶辨识',
    };
    return map[mode] || mode;
  },
~~~~~
~~~~~typescript.new
  getModeBadge: (mode) => {
    const map: Record<string, string> = {
      ANGLE_ESTIMATION: '夹角大小估算',
      ANGLE_COMPARISON_2AFC: '角度二分对比',
      PARALLEL_ALIGNMENT_2AFC: '平行线基准辨识',
    };
    return map[mode] || mode;
  },
~~~~~

### 下一步建议
1. 进入 `#/train/angle_parallel_2afc` 体验重构后的平行判断卡片。
2. 验证基准线（上方蓝色线段）与下方 A/B 候选线（黑色线段）的渲染比例及键盘快捷键 `1`/`2` 交互。
