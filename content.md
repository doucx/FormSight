好的，我们现在推进第二阶段架构重构：
1. 封装通用声明式 Canvas 渲染组件 `<CanvasView />`，消除分散在数十个组件中的 `useRef` + `useEffect` 样板代码；
2. 封装高阶通用 2AFC 交互壳组件 `<Standard2AfcView />`，统一管理 2AFC 状态重置、选项渲染与键盘响应逻辑，大幅削减领域层组件冗余。

## [WIP] refactor: 抽象通用 CanvasView 与 Standard2AfcView 消除重复样板代码

### 用户需求
消除各个领域组件中重复率超过 90% 的 Canvas 引用挂载逻辑与 2AFC 状态选择容器代码，构建高内聚的通用基础视图构件。

### 评论
通过将 Canvas 命令式挂载声明化，以及将二选一（2AFC）的标准骨架提取为高阶交互组件，各个具体练习卡片只需要专注于“如何绘制数据”和“题目题干文案”，不再需要维护重复的 DOM 生命周期和状态胶水代码，代码可读性与可维护性显著提升。

### 目标
1. 新建 `src/components/common/CanvasView.tsx`：提供统一的声明式 Canvas 挂载器。
2. 新建 `src/components/common/Standard2AfcView.tsx`：提供标准的 2AFC 卡片壳与键盘/状态管理器。
3. 重构以下 5 个领域 2AFC 组件，全面迁移至新架构：
   - `src/domains/angle/components/AngleComparison2AfcView.tsx`
   - `src/domains/angle/components/AngleParallel2AfcView.tsx`
   - `src/domains/negative_space/components/AreaComparison2AfcView.tsx`
   - `src/domains/relative_color/components/Decontextual2AfcView.tsx`
   - `src/domains/abstraction/components/TopDown2AfcView.tsx`

### 基本原理
- `<CanvasView width={w} height={h} draw={(canvas) => ...} deps={[...]} />` 封装了 `useRef` 与依赖驱动的重绘 Effect，避免组件内部书写重复的生命周期逻辑。
- `<Standard2AfcView />` 组合了 `QuestionCardShell` 与 `Choice2AfcContainer`，内置了针对 `questionId` 变化的自动重置与选项激活逻辑，使每个领域只需返回轻量的纯布局配置。

### 标签
#intent/refine #flow/ready #priority/high
#comp/components #scope/dx #scope/core
#ai/instruct
#task/domain/refactoring
#task/object/common-view-primitives
#task/action/abstraction-and-consolidation
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 创建通用 `<CanvasView />` 与 `<Standard2AfcView />` 组件

~~~~~act
write_file
src/components/common/CanvasView.tsx
~~~~~
~~~~~typescript
import { useEffect, useRef } from 'preact/hooks';

export interface CanvasViewProps {
  width: number;
  height: number;
  className?: string;
  draw: (canvas: HTMLCanvasElement) => void;
  deps?: unknown[];
}

export function CanvasView({ width, height, className = '', draw, deps = [] }: CanvasViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: dynamic dependencies passed by parent
  useEffect(() => {
    if (canvasRef.current) {
      draw(canvasRef.current);
    }
  }, deps);

  return <canvas ref={canvasRef} width={width} height={height} className={className} />;
}
~~~~~

~~~~~act
write_file
src/components/common/Standard2AfcView.tsx
~~~~~
~~~~~typescript
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Choice2AfcContainer, type Choice2AfcOption } from './Choice2AfcContainer';
import { QuestionCardShell } from './QuestionCardShell';

export interface Standard2AfcViewProps {
  questionId: string;
  hintText?: string;
  hintIcon?: (props: { className?: string }) => ComponentChildren;
  showCanvasHints?: boolean;
  maxWidth?: string;
  prompt?: ComponentChildren;
  optionA: Omit<Choice2AfcOption, 'key'>;
  optionB: Omit<Choice2AfcOption, 'key'>;
  showAnswer: boolean;
  disabled?: boolean;
  onAnswer: (choice: 'A' | 'B') => void;
  enableKeyboardShortcuts?: boolean;
}

export function Standard2AfcView({
  questionId,
  hintText,
  hintIcon,
  showCanvasHints = true,
  maxWidth = 'max-w-2xl',
  prompt,
  optionA,
  optionB,
  showAnswer,
  disabled = false,
  onAnswer,
  enableKeyboardShortcuts = true,
}: Standard2AfcViewProps) {
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection when question changes
  useEffect(() => {
    setSelectedChoice(null);
  }, [questionId]);

  const handleSelect = (choice: 'A' | 'B') => {
    if (disabled || showAnswer) return;
    setSelectedChoice(choice);
    onAnswer(choice);
  };

  return (
    <QuestionCardShell
      hintText={hintText}
      hintIcon={hintIcon}
      showCanvasHints={showCanvasHints}
      maxWidth={maxWidth}
    >
      {prompt}
      <Choice2AfcContainer
        optionA={{ ...optionA, key: 'A' }}
        optionB={{ ...optionB, key: 'B' }}
        selectedChoice={selectedChoice}
        showAnswer={showAnswer}
        disabled={disabled}
        enableKeyboardShortcuts={enableKeyboardShortcuts}
        onSelect={handleSelect}
      />
    </QuestionCardShell>
  );
}
~~~~~

#### Acts 2: 重构角度领域的两个 2AFC 组件

~~~~~act
write_file
src/domains/angle/components/AngleComparison2AfcView.tsx
~~~~~
~~~~~typescript
import { Columns } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import {
  ANGLE_2AFC_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawAngleCanvas,
} from '../utils/angleUtils';

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
  const isAHit = question.largerSide === 'A';
  const isBHit = question.largerSide === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText="二选一辨识哪一侧的两射线夹角更大 (键 1 / 2)"
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      optionA={{
        title: '区域 A',
        isCorrect: isAHit,
        badge: showAnswer ? `${question.angleA}°` : undefined,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              draw={(canvas) => drawAngleCanvas(canvas, question.linesA, ANGLE_2AFC_SIZE)}
              deps={[question.linesA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: '区域 B',
        isCorrect: isBHit,
        badge: showAnswer ? `${question.angleB}°` : undefined,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              draw={(canvas) => drawAngleCanvas(canvas, question.linesB, ANGLE_2AFC_SIZE)}
              deps={[question.linesB]}
            />
          </div>
        ),
      }}
    />
  );
}
~~~~~

~~~~~act
write_file
src/domains/angle/components/AngleParallel2AfcView.tsx
~~~~~
~~~~~typescript
import { Split } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import {
  ANGLE_2AFC_SIZE,
  ANGLE_PROMPT_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawSingleLineCanvas,
} from '../utils/angleUtils';

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
  const isAHit = question.parallelSide === 'A';
  const isBHit = question.parallelSide === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText="观察上方基准线，选出下方与它严格平行的线 (键 1 / 2)"
      hintIcon={Split}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      prompt={
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            平行基准线 (Prompt)
          </span>
          <CanvasView
            width={ANGLE_PROMPT_SIZE}
            height={ANGLE_PROMPT_SIZE}
            className="w-28 h-28 rounded-xl border border-slate-200 shadow-sm bg-white"
            draw={(canvas) =>
              drawSingleLineCanvas(canvas, question.promptLine, ANGLE_PROMPT_SIZE, '#4F46E5', 3.0)
            }
            deps={[question.promptLine]}
          />
        </div>
      }
      optionA={{
        title: '选项 A',
        isCorrect: isAHit,
        badge: showAnswer
          ? isAHit
            ? '绝对平行'
            : `偏转 ${question.angularDeviation}°`
          : undefined,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              draw={(canvas) =>
                drawSingleLineCanvas(canvas, question.lineOptionA, ANGLE_2AFC_SIZE, '#0F172A', 2.5)
              }
              deps={[question.lineOptionA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: '选项 B',
        isCorrect: isBHit,
        badge: showAnswer
          ? isBHit
            ? '绝对平行'
            : `偏转 ${question.angularDeviation}°`
          : undefined,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              draw={(canvas) =>
                drawSingleLineCanvas(canvas, question.lineOptionB, ANGLE_2AFC_SIZE, '#0F172A', 2.5)
              }
              deps={[question.lineOptionB]}
            />
          </div>
        ),
      }}
    />
  );
}
~~~~~

#### Acts 3: 重构正负形与相对色感 2AFC 组件

~~~~~act
write_file
src/domains/negative_space/components/AreaComparison2AfcView.tsx
~~~~~
~~~~~typescript
import { Columns } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import {
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
  TWO_AFC_CANVAS_SIZE,
} from '../utils/index';

interface AreaComparison2AfcViewProps {
  question: NegativeSpaceQuestionData;
  showAnswer: boolean;
  userAnswer?: NegativeSpaceHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AreaComparison2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AreaComparison2AfcViewProps) {
  const largerSide = question.largerSide;
  const isAHit = largerSide === 'A';
  const isBHit = largerSide === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText="判别哪一侧的白色留白 (负形) 面积更大 (键 1 / 2)"
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      optionA={{
        title: '区域 A',
        isCorrect: isAHit,
        badge: `留白 ${question.negRatioA}%`,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={TWO_AFC_CANVAS_SIZE}
              height={TWO_AFC_CANVAS_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm"
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.verticesA,
                  size: TWO_AFC_CANVAS_SIZE,
                  fillColor: '#0F172A',
                  strokeColor: '#1E293B',
                })
              }
              deps={[question.verticesA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: '区域 B',
        isCorrect: isBHit,
        badge: `留白 ${question.negRatioB}%`,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={TWO_AFC_CANVAS_SIZE}
              height={TWO_AFC_CANVAS_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm"
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.verticesB,
                  size: TWO_AFC_CANVAS_SIZE,
                  fillColor: '#0F172A',
                  strokeColor: '#1E293B',
                })
              }
              deps={[question.verticesB]}
            />
          </div>
        ),
      }}
    />
  );
}
~~~~~

~~~~~act
write_file
src/domains/relative_color/components/Decontextual2AfcView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import { hsvToHex } from '../../../core/color/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../utils/index';

interface Decontextual2AfcViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer?: RelativeColorHitResult | null;
  selectedChoice?: 'A' | 'B' | null;
  onSelectChoice: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function Decontextual2AfcView({
  question,
  showAnswer,
  onSelectChoice,
  disabled = false,
  showCanvasHints = true,
}: Decontextual2AfcViewProps) {
  const isAHit = question.largerPhysicalSide === 'A';
  const isBHit = question.largerPhysicalSide === 'B';

  const hexBgA = hsvToHex(...(question.bgLeft ?? [0, 0, 90]));
  const hexBgB = hsvToHex(...(question.bgRight ?? [0, 0, 10]));
  const hexCenterA = hsvToHex(...(question.centerColorA ?? [0, 0, 50]));
  const hexCenterB = hsvToHex(...(question.centerColorB ?? [0, 0, 50]));

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText="穿透背景视错觉，判别哪一侧中心色块「客观物理明度更高」"
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onSelectChoice}
      optionA={{
        title: '区域 A',
        isCorrect: isAHit,
        badge: isAHit
          ? `物理明度更高 (V: ${question.centerColorA?.[2]}%)`
          : `物理更暗 (V: ${question.centerColorA?.[2]}%)`,
        content: (
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
            style={{ backgroundColor: showAnswer ? '#808080' : hexBgA }}
          >
            <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterA }} />
          </div>
        ),
      }}
      optionB={{
        title: '区域 B',
        isCorrect: isBHit,
        badge: isBHit
          ? `物理明度更高 (V: ${question.centerColorB?.[2]}%)`
          : `物理更暗 (V: ${question.centerColorB?.[2]}%)`,
        content: (
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
            style={{ backgroundColor: showAnswer ? '#808080' : hexBgB }}
          >
            <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterB }} />
          </div>
        ),
      }}
    />
  );
}
~~~~~

#### Acts 4: 重构概括/细化领域的多模态 2AFC 组件

~~~~~act
write_file
src/domains/abstraction/components/TopDown2AfcView.tsx
~~~~~
~~~~~typescript
import { Columns } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import { drawRawGrayscaleNoiseField } from '../../../utils/canvas/drawNotanField';
import { drawParticlesCanvas, drawSpinePromptCanvas } from '../../../utils/canvas/drawParticles';
import {
  ABSTRACTION_2AFC_SIZE,
  ABSTRACTION_CANVAS_SIZE,
  ABSTRACTION_THUMB_SIZE,
  type AbstractionHitResult,
  type AbstractionQuestionData,
} from '../utils/index';

interface TopDown2AfcViewProps {
  question: AbstractionQuestionData;
  showAnswer: boolean;
  userAnswer: AbstractionHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function TopDown2AfcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: TopDown2AfcViewProps) {
  const { mode } = question;
  const isPoly = mode === 'POLYGON_DECIMATION';

  const isTargetA = isPoly
    ? question.correctPolyChoice === 'A'
    : userAnswer?.correctChoice === 'A' ||
      question.correctParticleChoice === 'A' ||
      question.correctHullChoice === 'A' ||
      question.correctNotanChoice === 'A';
  const isTargetB = !isTargetA;

  const renderPrompt = () => {
    if (isPoly && question.detailedPolygon) {
      return (
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            多边形原图
          </span>
          <CanvasView
            width={ABSTRACTION_CANVAS_SIZE}
            height={ABSTRACTION_CANVAS_SIZE}
            className="w-40 h-40 rounded-xl border border-slate-200 shadow-sm"
            draw={(canvas) =>
              drawPolygonCanvas({
                canvas,
                vertices: question.detailedPolygon,
                size: ABSTRACTION_CANVAS_SIZE,
              })
            }
            deps={[question.detailedPolygon]}
          />
        </div>
      );
    }

    if (mode === 'TD_GESTURE_2AFC') {
      return (
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            概括基准 (Prompt)
          </span>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className="w-24 h-24 rounded-xl border border-slate-200 shadow-sm"
            draw={(canvas) =>
              drawSpinePromptCanvas(canvas, question.promptSpine, ABSTRACTION_THUMB_SIZE)
            }
            deps={[question.promptSpine]}
          />
        </div>
      );
    }

    if (mode === 'TD_HULL_2AFC') {
      return (
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            概括基准 (Prompt)
          </span>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className="w-24 h-24 rounded-xl border border-slate-200 shadow-sm"
            draw={(canvas) =>
              drawPolygonCanvas({
                canvas,
                vertices: question.promptHull,
                size: ABSTRACTION_THUMB_SIZE,
                fillColor: '#4F46E5',
                strokeColor: '#3730A3',
              })
            }
            deps={[question.promptHull]}
          />
        </div>
      );
    }

    if (mode === 'TD_NOTAN_2AFC' && question.promptNotanBuffer) {
      return (
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            概括基准 (Prompt)
          </span>
          <CanvasView
            width={ABSTRACTION_THUMB_SIZE}
            height={ABSTRACTION_THUMB_SIZE}
            className="w-24 h-24 rounded-xl border border-slate-200 shadow-sm"
            draw={(canvas) =>
              drawRawGrayscaleNoiseField(
                canvas,
                question.promptNotanBuffer,
                question.notanFieldDim ?? 120,
                ABSTRACTION_THUMB_SIZE,
              )
            }
            deps={[question.promptNotanBuffer, question.notanFieldDim]}
          />
        </div>
      );
    }

    return null;
  };

  const renderOptionCanvas = (choice: 'A' | 'B') => {
    if (isPoly && question.simplifiedOptions) {
      const verts = choice === 'A' ? question.simplifiedOptions[0] : question.simplifiedOptions[1];
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
          draw={(canvas) =>
            drawPolygonCanvas({
              canvas,
              vertices: verts,
              size: ABSTRACTION_2AFC_SIZE,
              fillColor: '#4F46E5',
            })
          }
          deps={[verts]}
        />
      );
    }

    if (mode === 'TD_GESTURE_2AFC') {
      const particles = choice === 'A' ? question.particlesA : question.particlesB;
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
          draw={(canvas) => drawParticlesCanvas(canvas, particles, ABSTRACTION_2AFC_SIZE)}
          deps={[particles]}
        />
      );
    }

    if (mode === 'TD_HULL_2AFC') {
      const verts = choice === 'A' ? question.hullDetailedA : question.hullDetailedB;
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
          draw={(canvas) =>
            drawPolygonCanvas({
              canvas,
              vertices: verts,
              size: ABSTRACTION_2AFC_SIZE,
            })
          }
          deps={[verts]}
        />
      );
    }

    if (mode === 'TD_NOTAN_2AFC') {
      const buf = choice === 'A' ? question.notanSceneBufferA : question.notanSceneBufferB;
      return (
        <CanvasView
          width={ABSTRACTION_2AFC_SIZE}
          height={ABSTRACTION_2AFC_SIZE}
          className="w-full max-w-[200px] aspect-square rounded-xl shadow-sm"
          draw={(canvas) =>
            drawRawGrayscaleNoiseField(
              canvas,
              buf,
              question.notanFieldDim ?? 120,
              ABSTRACTION_2AFC_SIZE,
            )
          }
          deps={[buf, question.notanFieldDim]}
        />
      );
    }

    return null;
  };

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={isPoly ? '选择保留了主要转折大形的精简项' : '判别哪一侧具象细节符合上方骨架'}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      prompt={renderPrompt()}
      optionA={{
        title: '区域 A (键 1)',
        isCorrect: isTargetA,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            {renderOptionCanvas('A')}
          </div>
        ),
      }}
      optionB={{
        title: '区域 B (键 2)',
        isCorrect: isTargetB,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            {renderOptionCanvas('B')}
          </div>
        ),
      }}
    />
  );
}
~~~~~

### 下一步建议
1. **测试用例与校验**：执行 `npm run check` 检查格式与类型，执行 `npm run test` 确保各模式下做答、判分与渲染全部正常。
2. **抽象 Slider 交互壳 (`StandardSliderView`)**：进一步将单图/双图的滑块估算视图（角度估算、势线提取、负形占比估算等）抽离通用壳组件。
