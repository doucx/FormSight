好的，我们现在将各个领域的专属生成/判定算法（如 `angleUtils`、`negativeSpace` 等）以及对应的专用 Canvas 和 View 组件，全面收敛归位至各自的 `src/domains/<domain>/` 垂直切片目录中。

## [WIP] refactor: 迁移各领域专属算法与 View 组件至垂直切片目录

### 用户需求
将分散在全局 `src/utils/` 和 `src/components/` 下的各领域专属算法与 View 组件，完整归集到对应的 `src/domains/<domain>/` 垂直目录（包含 `views/`、`utils/` 与 `plugin.tsx`），使每个领域成为完全自洽的独立功能包。

### 评论
完成这一步后，每一个领域（如 `angle`、`negative_space` 等）都成为一个完全自给自足的模块。顶层的 `components/` 将只保留纯粹的通用 Shell 与公共组件，彻底终结跨目录修改代码的痛点。

### 目标
1. 在 `src/domains/angle/` 中收敛 `views/`（`AngleEstimationView`、`AngleComparison2AfcView`、`AngleParallel2AfcView`、`AngleCanvas`）与 `utils/`（`angleUtils.ts`）。
2. 在 `src/domains/negative_space/` 中收敛 `views/`（`AreaComparison2AfcView`、`RatioEstimationView`、`ShapeMemory2AfcView`、`VertexFittingView`、`NegativeSpaceCanvas`）与 `utils/`。
3. 在 `src/domains/relative_color/` 中收敛 `views/`（`AlbersInductionView`、`Decontextual2AfcView`、`HueInductionView`、`VectorShiftView`、`RelativeColorCanvas`）与 `utils/`。
4. 在 `src/domains/abstraction/` 中收敛 `views/` 与 `utils/`。
5. 更新各领域的 `index.ts` 和插件导出，并在原路径保留向下兼容别名。

### 基本原理
每个垂直切片遵循统一的内部组织结构：
- `views/`：该领域所有的视觉表现层组件。
- `utils/`：该领域独有的题目生成、几何拓扑与 Hit 判定算法。
- `plugin.tsx`：连接视图与算法的胶水层。
- `index.ts`：对外暴露标准 `DomainManifest` 的唯一出口。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #comp/runtime #concept/executor #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/domain-slices #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 收敛 `angle` 领域算法与 View 组件至 `src/domains/angle/`

创建 `src/domains/angle/utils/angleUtils.ts`、`src/domains/angle/views/` 视图组件及 `src/domains/angle/plugin.tsx`。

~~~~~act
write_file
src/domains/angle/utils/angleUtils.ts
~~~~~
~~~~~typescript
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';

export type AngleMode = 'ANGLE_ESTIMATION' | 'ANGLE_COMPARISON_2AFC' | 'PARALLEL_ALIGNMENT_2AFC';

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

  targetAngleDeg?: number;
  startAngleDeg?: number;
  lineA?: LineSegment;
  lineB?: LineSegment;

  angleA?: number;
  angleB?: number;
  linesA?: [LineSegment, LineSegment];
  linesB?: [LineSegment, LineSegment];
  largerSide?: 'A' | 'B';

  promptLine?: LineSegment;
  lineOptionA?: LineSegment;
  lineOptionB?: LineSegment;
  parallelSide?: 'A' | 'B';
  angularDeviation?: number;
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

function createCenteredLine(center: Point, angleDeg: number, length: number): LineSegment {
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

function createRadialLine(center: Point, angleDeg: number, length: number): LineSegment {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    p1: { x: center.x, y: center.y },
    p2: {
      x: Math.round((center.x + length * Math.cos(rad)) * 10) / 10,
      y: Math.round((center.y - length * Math.sin(rad)) * 10) / 10,
    },
  };
}

export function generateAngleQuestion(mode: AngleMode, level: number): AngleQuestionData {
  const id = `ang_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));

  if (mode === 'ANGLE_ESTIMATION') {
    const targetAngleDeg = Math.floor(Math.random() * 150) + 15;
    const startAngleDeg = Math.floor(Math.random() * 360);
    const endAngleDeg = (startAngleDeg + targetAngleDeg) % 360;

    const center: Point = { x: ANGLE_CANVAS_SIZE / 2, y: ANGLE_CANVAS_SIZE / 2 };
    const armLength = ANGLE_CANVAS_SIZE * 0.38;

    const lineA = createRadialLine(center, startAngleDeg, armLength);
    const lineB = createRadialLine(center, endAngleDeg, armLength);

    const tolerance = Math.round(expDecayInterpolate(12.0, 1.5, clampedLevel) * 10) / 10;

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

  if (mode === 'ANGLE_COMPARISON_2AFC') {
    const baseAngle = Math.floor(Math.random() * 110) + 30;
    const deltaAngle = Math.round(expDecayInterpolate(25.0, 1.2, clampedLevel) * 10) / 10;

    const largerAngle = Math.min(170, baseAngle + deltaAngle);
    const smallerAngle = Math.max(10, baseAngle);

    const isALarger = Math.random() < 0.5;
    const angleA = isALarger ? largerAngle : smallerAngle;
    const angleB = isALarger ? smallerAngle : largerAngle;

    const center: Point = { x: ANGLE_2AFC_SIZE / 2, y: ANGLE_2AFC_SIZE / 2 };
    const armLength = ANGLE_2AFC_SIZE * 0.38;

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

  const baseAngle = Math.floor(Math.random() * 360);
  const angularDeviation = Math.round(expDecayInterpolate(16.0, 1.0, clampedLevel) * 10) / 10;
  const deviationSign = Math.random() < 0.5 ? 1 : -1;
  const distractorAngle = (baseAngle + angularDeviation * deviationSign + 360) % 360;

  const promptCenter: Point = {
    x: ANGLE_PROMPT_SIZE / 2,
    y: ANGLE_PROMPT_SIZE / 2,
  };
  const promptLine = createCenteredLine(promptCenter, baseAngle, ANGLE_PROMPT_SIZE * 0.68);

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
      ? (question.largerSide ?? 'A')
      : (question.parallelSide ?? 'A');

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

~~~~~act
write_file
src/domains/angle/views/AngleCanvas.tsx
~~~~~
~~~~~typescript
import { AngleComparison2AfcView } from '../../../components/angle/AngleComparison2AfcView';
import { AngleEstimationView } from '../../../components/angle/AngleEstimationView';
import { AngleParallel2AfcView } from '../../../components/angle/AngleParallel2AfcView';
import type { AngleHitResult, AngleQuestionData } from '../utils/angleUtils';

export interface AngleCanvasProps {
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

~~~~~act
write_file
src/domains/angle/plugin.tsx
~~~~~
~~~~~typescript
import type { TrainingPlugin } from '../../config/trainingPlugins';
import type { BaseModuleSettings } from '../../utils/settings';
import {
  type AngleHitResult,
  type AngleMode,
  type AngleQuestionData,
  checkAngleHit,
  generateAngleQuestion,
} from './utils/angleUtils';
import { AngleCanvas } from './views/AngleCanvas';

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
      PARALLEL_ALIGNMENT_2AFC: '平行线基准辨识',
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
write_file
src/domains/angle/index.ts
~~~~~
~~~~~typescript
import { Columns, Compass, Split } from 'lucide-preact';
import { SLIDER_COMMON_SCHEMAS } from '../../config/cards';
import type { DomainManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { anglePlugin } from './plugin';

export const angleCards: CardDefinition[] = [
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
];

export const angleDomain: DomainManifest = {
  domain: 'angle',
  meta: {
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
      return angleCards;
    },
  },
  cards: angleCards,
  trainingPlugin: anglePlugin as unknown as DomainManifest['trainingPlugin'],
};

export default angleDomain;
~~~~~

#### Acts 2: 保持 `src/utils/angleUtils.ts` 与 `src/components/AngleCanvas.tsx` 向下兼容

~~~~~act
write_file
src/utils/angleUtils.ts
~~~~~
~~~~~typescript
export * from '../domains/angle/utils/angleUtils';
~~~~~

~~~~~act
write_file
src/components/AngleCanvas.tsx
~~~~~
~~~~~typescript
export { AngleCanvas, type AngleCanvasProps } from '../domains/angle/views/AngleCanvas';
~~~~~

### 下一步建议
1. **继续收敛其他领域**：按照相同标准将 `star`、`color`、`relative_color`、`negative_space` 与 `abstraction` 的专属 views 与 utils 迁移至其 domain 目录。
2. **清理冗余的中间胶水代码**：逐步让 `GenericTrainingView` 和 `App.tsx` 完全依赖 `src/core/registry`，去除残留的静态配置耦合。
