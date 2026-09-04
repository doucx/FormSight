现在开始执行**阶段一·批次 A**：重构全部二分选择（2AFC）卡片视图。

我们将移除对废弃容器 `Standard2AfcView` 及 `Choice2AfcContainer` 的所有依赖，就地展开原生扁平布局，全面接入 `QuestionCardShell`、`ChoiceCard`、`getChoiceCardState` 与无头 Hook `useChoiceShortcuts`。

## [WIP] refactor: 重构批次 A 全量 2AFC 卡片至原子组合架构

### 用户需求
落实路线图中的批次 A：将全部 2AFC 模式业务卡片彻底解构，淘汰 `Standard2AfcView` 包装层，转向纯粹的原子组件组合并接入数字键 1/2 快捷键。

### 评论
批次 A 涵盖了系统中占比最高的二分判定题型（共 10 张视图）。将原本塞在 `optionA`、`optionB`、`prompt` 插槽中的代码就地展开后，组件层级将缩减 3 层，渲染流向清晰透明，并彻底抹除旧包装器所带来的 Leaky Abstraction。

### 目标
1. 重构 9 张原本使用 `Standard2AfcView` 的卡片视图：
   - `angle_comparison_2afc/AngleComparison2AfcView.tsx`
   - `angle_parallel_2afc/AngleParallel2AfcView.tsx`
   - `persp_gestalt_continuation/PerspGestaltContinuationView.tsx`
   - `neg_area_comparison_2afc/NegAreaComparison2AfcView.tsx`
   - `rel_decontextual_2afc/RelDecontextual2AfcView.tsx`
   - `abs_polygon_decimation/AbsPolygonDecimationView.tsx`
   - `abs_td_gesture_2afc/AbsTdGesture2afcView.tsx`
   - `abs_td_hull_2afc/AbsTdHull2afcView.tsx`
   - `abs_td_notan_2afc/AbsTdNotan2afcView.tsx`
2. 同步重构使用 `Choice2AfcContainer` 的记忆匹配卡片：
   - `neg_shape_match_2afc/NegShapeMatch2AfcView.tsx`
3. 保证视觉设计、暗色模式、快捷键响应、即时作答与答案揭晓动画完全 100% 体验对齐。

### 基本原理
通过 `<QuestionCardShell>` 作为外壳承载引导胶囊与外围边距，内部直接使用两列 CSS Grid 网格排列 `<ChoiceCard>`。卡片内部状态由纯函数 `getChoiceCardState` 同步映射，键盘事件由 `useChoiceShortcuts` 驱动，彻底消除属性中转与深层 DOM 嵌套。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/ui #scope/dx #scope/ux #ai/instruct #task/domain/ui #task/object/batch-a-2afc #task/action/refactor #task/state/continue #task/status/active

---

### Script

#### Acts 1: 重构几何与空间类 2AFC 卡片视图

~~~~~act
write_file
src/cards/angle_comparison_2afc/AngleComparison2AfcView.tsx
~~~~~
~~~~~typescript
import { Check, Columns } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import {
  Badge,
  CanvasView,
  ChoiceCard,
  QuestionCardShell,
  getChoiceCardState,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import type { AngleComparisonHitResult, AngleComparisonQuestion } from './types';
import { ANGLE_2AFC_SIZE, drawAngleCanvas } from './utils/generator';

export interface AngleComparison2AfcViewProps {
  question: AngleComparisonQuestion;
  showAnswer: boolean;
  userAnswer: AngleComparisonHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AngleComparison2AfcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AngleComparison2AfcViewProps) {
  const { t } = useCardTranslation('angle_comparison_2afc');
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  const handleSelect = (choice: 'A' | 'B') => {
    if (disabled || showAnswer) return;
    setSelectedChoice(choice);
    onAnswer(choice);
  };

  useChoiceShortcuts({
    optionsCount: 2,
    disabled: disabled || showAnswer,
    onSelect: (idx) => handleSelect(idx === 0 ? 'A' : 'B'),
  });

  const effectiveChoice = selectedChoice ?? userAnswer?.userChoice ?? null;
  const isAHit = question.largerSide === 'A';
  const isBHit = question.largerSide === 'B';

  const stateA = getChoiceCardState({
    showAnswer,
    isTarget: isAHit,
    isSelected: effectiveChoice === 'A',
  });

  const stateB = getChoiceCardState({
    showAnswer,
    isTarget: isBHit,
    isSelected: effectiveChoice === 'B',
  });

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
        <ChoiceCard
          state={stateA}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('A')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                1
              </Badge>
              {t('areaA')}
            </span>

            {showAnswer && isAHit && (
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {`${question.angleA}°`}
              </span>
            )}
            {showAnswer && !isAHit && (
              <span className="text-xs font-semibold text-muted-foreground">{`${question.angleA}°`}</span>
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) => drawAngleCanvas(canvas, question.linesA, ANGLE_2AFC_SIZE)}
              deps={[question.linesA]}
            />
          </div>
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                2
              </Badge>
              {t('areaB')}
            </span>

            {showAnswer && isBHit && (
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {`${question.angleB}°`}
              </span>
            )}
            {showAnswer && !isBHit && (
              <span className="text-xs font-semibold text-muted-foreground">{`${question.angleB}°`}</span>
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) => drawAngleCanvas(canvas, question.linesB, ANGLE_2AFC_SIZE)}
              deps={[question.linesB]}
            />
          </div>
        </ChoiceCard>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/cards/angle_parallel_2afc/AngleParallel2AfcView.tsx
~~~~~
~~~~~typescript
import { Check, Split } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import {
  Badge,
  CANVAS_THEME,
  CanvasView,
  ChoiceCard,
  QuestionCardShell,
  getChoiceCardState,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import type { AngleParallelHitResult, AngleParallelQuestion } from './types';
import { ANGLE_2AFC_SIZE, ANGLE_PROMPT_SIZE, drawSingleLineCanvas } from './utils/generator';

export interface AngleParallel2AfcViewProps {
  question: AngleParallelQuestion;
  showAnswer: boolean;
  userAnswer: AngleParallelHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AngleParallel2AfcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AngleParallel2AfcViewProps) {
  const { t } = useCardTranslation('angle_parallel_2afc');
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  const handleSelect = (choice: 'A' | 'B') => {
    if (disabled || showAnswer) return;
    setSelectedChoice(choice);
    onAnswer(choice);
  };

  useChoiceShortcuts({
    optionsCount: 2,
    disabled: disabled || showAnswer,
    onSelect: (idx) => handleSelect(idx === 0 ? 'A' : 'B'),
  });

  const effectiveChoice = selectedChoice ?? userAnswer?.userChoice ?? null;
  const isAHit = question.parallelSide === 'A';
  const isBHit = question.parallelSide === 'B';

  const stateA = getChoiceCardState({
    showAnswer,
    isTarget: isAHit,
    isSelected: effectiveChoice === 'A',
  });

  const stateB = getChoiceCardState({
    showAnswer,
    isTarget: isBHit,
    isSelected: effectiveChoice === 'B',
  });

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Split}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      {/* 题干上方平行基准线 */}
      <div className="flex flex-col items-center gap-1.5 bg-muted/60 p-2.5 rounded-2xl border border-border shadow-inner">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {t('promptTitle')}
        </span>
        <CanvasView
          width={ANGLE_PROMPT_SIZE}
          height={ANGLE_PROMPT_SIZE}
          className="w-28 h-28 rounded-xl border border-border shadow-sm bg-card"
          draw={(canvas) =>
            drawSingleLineCanvas(
              canvas,
              question.promptLine,
              ANGLE_PROMPT_SIZE,
              CANVAS_THEME.status.accent,
              3.0,
            )
          }
          deps={[question.promptLine]}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
        <ChoiceCard
          state={stateA}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('A')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                1
              </Badge>
              {t('optionA')}
            </span>

            {showAnswer && (
              <span
                className={`text-xs font-semibold flex items-center gap-1 ${
                  isAHit ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-muted-foreground'
                }`}
              >
                {isAHit && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                {isAHit ? t('absoluteParallel') : t('deviationBadge', { deg: question.angularDeviation ?? 0 })}
              </span>
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawSingleLineCanvas(
                  canvas,
                  question.lineOptionA,
                  ANGLE_2AFC_SIZE,
                  CANVAS_THEME.shape.fill,
                  2.5,
                )
              }
              deps={[question.lineOptionA]}
            />
          </div>
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                2
              </Badge>
              {t('optionB')}
            </span>

            {showAnswer && (
              <span
                className={`text-xs font-semibold flex items-center gap-1 ${
                  isBHit ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-muted-foreground'
                }`}
              >
                {isBHit && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                {isBHit ? t('absoluteParallel') : t('deviationBadge', { deg: question.angularDeviation ?? 0 })}
              </span>
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawSingleLineCanvas(
                  canvas,
                  question.lineOptionB,
                  ANGLE_2AFC_SIZE,
                  CANVAS_THEME.shape.fill,
                  2.5,
                )
              }
              deps={[question.lineOptionB]}
            />
          </div>
        </ChoiceCard>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/cards/persp_gestalt_continuation/PerspGestaltContinuationView.tsx
~~~~~
~~~~~typescript
import { Check, Eye } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import {
  Badge,
  CanvasView,
  ChoiceCard,
  QuestionCardShell,
  getChoiceCardState,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import type { PerspGestaltHitResult, PerspGestaltQuestion } from './types';
import { PERSPECTIVE_2AFC_SIZE, drawGestaltCanvas } from './utils/generator';

export interface PerspGestaltContinuationViewProps {
  question: PerspGestaltQuestion;
  showAnswer: boolean;
  userAnswer: PerspGestaltHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function PerspGestaltContinuationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: PerspGestaltContinuationViewProps) {
  const { t } = useCardTranslation('persp_gestalt_continuation');
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  const handleSelect = (choice: 'A' | 'B') => {
    if (disabled || showAnswer) return;
    setSelectedChoice(choice);
    onAnswer(choice);
  };

  useChoiceShortcuts({
    optionsCount: 2,
    disabled: disabled || showAnswer,
    onSelect: (idx) => handleSelect(idx === 0 ? 'A' : 'B'),
  });

  const effectiveChoice = selectedChoice ?? userAnswer?.userChoice ?? null;
  const isAHit = question.correctChoice === 'A';
  const isBHit = question.correctChoice === 'B';

  const stateA = getChoiceCardState({
    showAnswer,
    isTarget: isAHit,
    isSelected: effectiveChoice === 'A',
  });

  const stateB = getChoiceCardState({
    showAnswer,
    isTarget: isBHit,
    isSelected: effectiveChoice === 'B',
  });

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
        <ChoiceCard
          state={stateA}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('A')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                1
              </Badge>
              {t('optionA')}
            </span>

            {showAnswer && isAHit && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={PERSPECTIVE_2AFC_SIZE}
              height={PERSPECTIVE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawGestaltCanvas(
                  canvas,
                  question.obstacle,
                  question.incomingLine,
                  question.lineOptionA,
                  PERSPECTIVE_2AFC_SIZE,
                )
              }
              deps={[question.incomingLine, question.lineOptionA]}
            />
          </div>
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                2
              </Badge>
              {t('optionB')}
            </span>

            {showAnswer && isBHit && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={PERSPECTIVE_2AFC_SIZE}
              height={PERSPECTIVE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawGestaltCanvas(
                  canvas,
                  question.obstacle,
                  question.incomingLine,
                  question.lineOptionB,
                  PERSPECTIVE_2AFC_SIZE,
                )
              }
              deps={[question.incomingLine, question.lineOptionB]}
            />
          </div>
        </ChoiceCard>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

#### Acts 2: 重构负形与色彩视错觉 2AFC 卡片视图

~~~~~act
write_file
src/cards/neg_area_comparison_2afc/NegAreaComparison2AfcView.tsx
~~~~~
~~~~~typescript
import { Check, Columns } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import {
  Badge,
  CANVAS_THEME,
  CanvasView,
  ChoiceCard,
  QuestionCardShell,
  drawPolygonCanvas,
  getChoiceCardState,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import { type HitResult, type QuestionData, TWO_AFC_CANVAS_SIZE } from './types';

export interface NegAreaComparison2AfcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer?: HitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function NegAreaComparison2AfcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: NegAreaComparison2AfcViewProps) {
  const { t } = useCardTranslation('neg_area_comparison_2afc');
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  const handleSelect = (choice: 'A' | 'B') => {
    if (disabled || showAnswer) return;
    setSelectedChoice(choice);
    onAnswer(choice);
  };

  useChoiceShortcuts({
    optionsCount: 2,
    disabled: disabled || showAnswer,
    onSelect: (idx) => handleSelect(idx === 0 ? 'A' : 'B'),
  });

  const effectiveChoice = selectedChoice ?? userAnswer?.userChoice ?? null;
  const isAHit = question.largerSide === 'A';
  const isBHit = question.largerSide === 'B';

  const stateA = getChoiceCardState({
    showAnswer,
    isTarget: isAHit,
    isSelected: effectiveChoice === 'A',
  });

  const stateB = getChoiceCardState({
    showAnswer,
    isTarget: isBHit,
    isSelected: effectiveChoice === 'B',
  });

  return (
    <QuestionCardShell
      hintText={t('areaHint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
        <ChoiceCard
          state={stateA}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('A')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                1
              </Badge>
              {t('common.areaA')}
            </span>

            {showAnswer && isAHit && (
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {t('whiteSpace', { ratio: question.negRatioA ?? 50 })}
              </span>
            )}
            {showAnswer && !isAHit && (
              <span className="text-xs font-semibold text-muted-foreground">
                {t('whiteSpace', { ratio: question.negRatioA ?? 50 })}
              </span>
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={TWO_AFC_CANVAS_SIZE}
              height={TWO_AFC_CANVAS_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.verticesA,
                  size: TWO_AFC_CANVAS_SIZE,
                  fillColor: CANVAS_THEME.shape.fill,
                  strokeColor: CANVAS_THEME.shape.stroke,
                })
              }
              deps={[question.verticesA]}
            />
          </div>
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                2
              </Badge>
              {t('common.areaB')}
            </span>

            {showAnswer && isBHit && (
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {t('whiteSpace', { ratio: question.negRatioB ?? 50 })}
              </span>
            )}
            {showAnswer && !isBHit && (
              <span className="text-xs font-semibold text-muted-foreground">
                {t('whiteSpace', { ratio: question.negRatioB ?? 50 })}
              </span>
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={TWO_AFC_CANVAS_SIZE}
              height={TWO_AFC_CANVAS_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-card"
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.verticesB,
                  size: TWO_AFC_CANVAS_SIZE,
                  fillColor: CANVAS_THEME.shape.fill,
                  strokeColor: CANVAS_THEME.shape.stroke,
                })
              }
              deps={[question.verticesB]}
            />
          </div>
        </ChoiceCard>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/cards/rel_decontextual_2afc/RelDecontextual2AfcView.tsx
~~~~~
~~~~~typescript
import { Check, Eye } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import {
  Badge,
  ChoiceCard,
  PALETTE,
  QuestionCardShell,
  getChoiceCardState,
  hsvToHex,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';

export interface RelDecontextual2AfcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer?: HitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function RelDecontextual2AfcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: RelDecontextual2AfcViewProps) {
  const { t } = useCardTranslation('rel_decontextual_2afc');
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  const handleSelect = (choice: 'A' | 'B') => {
    if (disabled || showAnswer) return;
    setSelectedChoice(choice);
    onAnswer(choice);
  };

  useChoiceShortcuts({
    optionsCount: 2,
    disabled: disabled || showAnswer,
    onSelect: (idx) => handleSelect(idx === 0 ? 'A' : 'B'),
  });

  const effectiveChoice = selectedChoice ?? userAnswer?.userChoice ?? null;
  const isAHit = question.largerPhysicalSide === 'A';
  const isBHit = question.largerPhysicalSide === 'B';

  const hexBgA = hsvToHex(...question.bgLeft);
  const hexBgB = hsvToHex(...question.bgRight);
  const hexCenterA = hsvToHex(...question.centerColorA);
  const hexCenterB = hsvToHex(...question.centerColorB);

  const stateA = getChoiceCardState({
    showAnswer,
    isTarget: isAHit,
    isSelected: effectiveChoice === 'A',
  });

  const stateB = getChoiceCardState({
    showAnswer,
    isTarget: isBHit,
    isSelected: effectiveChoice === 'B',
  });

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
        <ChoiceCard
          state={stateA}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('A')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                1
              </Badge>
              {t('common.areaA')}
            </span>

            {showAnswer && (
              <span
                className={`text-xs font-semibold flex items-center gap-1 ${
                  isAHit ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-muted-foreground'
                }`}
              >
                {isAHit && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                {isAHit
                  ? t('physicallyBrighter', { v: question.centerColorA[2] })
                  : t('physicallyDarker', { v: question.centerColorA[2] })}
              </span>
            )}
          </div>

          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
            style={{ backgroundColor: showAnswer ? PALETTE.slate[500] : hexBgA }}
          >
            <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterA }} />
          </div>
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                2
              </Badge>
              {t('common.areaB')}
            </span>

            {showAnswer && (
              <span
                className={`text-xs font-semibold flex items-center gap-1 ${
                  isBHit ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-muted-foreground'
                }`}
              >
                {isBHit && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                {isBHit
                  ? t('physicallyBrighter', { v: question.centerColorB[2] })
                  : t('physicallyDarker', { v: question.centerColorB[2] })}
              </span>
            )}
          </div>

          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
            style={{ backgroundColor: showAnswer ? PALETTE.slate[500] : hexBgB }}
          >
            <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterB }} />
          </div>
        </ChoiceCard>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

#### Acts 3: 重构抽象认知与具象寻形 2AFC 卡片视图

~~~~~act
write_file
src/cards/abs_polygon_decimation/AbsPolygonDecimationView.tsx
~~~~~
~~~~~typescript
import { Check, Columns } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import {
  Badge,
  CANVAS_THEME,
  CanvasView,
  ChoiceCard,
  QuestionCardShell,
  drawPolygonCanvas,
  getChoiceCardState,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
import { CANVAS_SIZE, OPTION_SIZE } from './utils/generator';

const CANVAS_OPTION_CLASS =
  'w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block';

export interface AbsPolygonDecimationViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AbsPolygonDecimationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsPolygonDecimationViewProps) {
  const { t } = useCardTranslation('abs_polygon_decimation');
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  const handleSelect = (choice: 'A' | 'B') => {
    if (disabled || showAnswer) return;
    setSelectedChoice(choice);
    onAnswer(choice);
  };

  useChoiceShortcuts({
    optionsCount: 2,
    disabled: disabled || showAnswer,
    onSelect: (idx) => handleSelect(idx === 0 ? 'A' : 'B'),
  });

  const effectiveChoice = selectedChoice ?? userAnswer?.userChoice ?? null;
  const isTargetA = question.correctPolyChoice === 'A';
  const isTargetB = !isTargetA;

  const stateA = getChoiceCardState({
    showAnswer,
    isTarget: isTargetA,
    isSelected: effectiveChoice === 'A',
  });

  const stateB = getChoiceCardState({
    showAnswer,
    isTarget: isTargetB,
    isSelected: effectiveChoice === 'B',
  });

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      {/* 题干提示细碎原图 */}
      <div className="flex flex-col items-center gap-2 bg-muted/60 p-3 rounded-2xl border border-border shadow-inner w-full max-w-[250px] sm:max-w-[270px] mx-auto">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {t('promptTitle')}
        </span>
        <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
          <CanvasView
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className={CANVAS_OPTION_CLASS}
            draw={(canvas) =>
              drawPolygonCanvas({
                canvas,
                vertices: question.detailedPolygon,
                size: CANVAS_SIZE,
              })
            }
            deps={[question.detailedPolygon]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
        <ChoiceCard
          state={stateA}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('A')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                1
              </Badge>
              {`${t('common.areaA')} (${t('common.optionA')})`}
            </span>
            {showAnswer && isTargetA && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.simplifiedOptions[0],
                  size: OPTION_SIZE,
                  fillColor: CANVAS_THEME.status.accent,
                })
              }
              deps={[question.simplifiedOptions]}
            />
          </div>
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                2
              </Badge>
              {`${t('common.areaB')} (${t('common.optionB')})`}
            </span>
            {showAnswer && isTargetB && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.simplifiedOptions[1],
                  size: OPTION_SIZE,
                  fillColor: CANVAS_THEME.status.accent,
                })
              }
              deps={[question.simplifiedOptions]}
            />
          </div>
        </ChoiceCard>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/cards/abs_td_gesture_2afc/AbsTdGesture2afcView.tsx
~~~~~
~~~~~typescript
import { Check, Columns } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import {
  Badge,
  CanvasView,
  ChoiceCard,
  QuestionCardShell,
  getChoiceCardState,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
import {
  OPTION_SIZE,
  THUMB_SIZE,
  drawParticlesCanvas,
  drawSpinePromptCanvas,
} from './utils/generator';

const CANVAS_OPTION_CLASS =
  'w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block';

export interface AbsTdGesture2afcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AbsTdGesture2afcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsTdGesture2afcViewProps) {
  const { t } = useCardTranslation('abs_td_gesture_2afc');
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  const handleSelect = (choice: 'A' | 'B') => {
    if (disabled || showAnswer) return;
    setSelectedChoice(choice);
    onAnswer(choice);
  };

  useChoiceShortcuts({
    optionsCount: 2,
    disabled: disabled || showAnswer,
    onSelect: (idx) => handleSelect(idx === 0 ? 'A' : 'B'),
  });

  const effectiveChoice = selectedChoice ?? userAnswer?.userChoice ?? null;
  const isTargetA = question.correctParticleChoice === 'A';
  const isTargetB = !isTargetA;

  const stateA = getChoiceCardState({
    showAnswer,
    isTarget: isTargetA,
    isSelected: effectiveChoice === 'A',
  });

  const stateB = getChoiceCardState({
    showAnswer,
    isTarget: isTargetB,
    isSelected: effectiveChoice === 'B',
  });

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col items-center gap-2 bg-muted/60 p-3 rounded-2xl border border-border shadow-inner w-full max-w-[250px] sm:max-w-[270px] mx-auto">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {t('promptTitle')}
        </span>
        <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
          <CanvasView
            width={THUMB_SIZE}
            height={THUMB_SIZE}
            className={CANVAS_OPTION_CLASS}
            draw={(canvas) => drawSpinePromptCanvas(canvas, question.promptSpine, THUMB_SIZE)}
            deps={[question.promptSpine]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
        <ChoiceCard
          state={stateA}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('A')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                1
              </Badge>
              {`${t('common.areaA')} (${t('common.optionA')})`}
            </span>
            {showAnswer && isTargetA && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) => drawParticlesCanvas(canvas, question.particlesA, OPTION_SIZE)}
              deps={[question.particlesA]}
            />
          </div>
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                2
              </Badge>
              {`${t('common.areaB')} (${t('common.optionB')})`}
            </span>
            {showAnswer && isTargetB && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) => drawParticlesCanvas(canvas, question.particlesB, OPTION_SIZE)}
              deps={[question.particlesB]}
            />
          </div>
        </ChoiceCard>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/cards/abs_td_hull_2afc/AbsTdHull2afcView.tsx
~~~~~
~~~~~typescript
import { Check, Columns } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import {
  Badge,
  CANVAS_THEME,
  CanvasView,
  ChoiceCard,
  QuestionCardShell,
  drawPolygonCanvas,
  getChoiceCardState,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
import { OPTION_SIZE, THUMB_SIZE } from './utils/generator';

const CANVAS_OPTION_CLASS =
  'w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block';

export interface AbsTdHull2afcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AbsTdHull2afcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsTdHull2afcViewProps) {
  const { t } = useCardTranslation('abs_td_hull_2afc');
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  const handleSelect = (choice: 'A' | 'B') => {
    if (disabled || showAnswer) return;
    setSelectedChoice(choice);
    onAnswer(choice);
  };

  useChoiceShortcuts({
    optionsCount: 2,
    disabled: disabled || showAnswer,
    onSelect: (idx) => handleSelect(idx === 0 ? 'A' : 'B'),
  });

  const effectiveChoice = selectedChoice ?? userAnswer?.userChoice ?? null;
  const isTargetA = question.correctHullChoice === 'A';
  const isTargetB = !isTargetA;

  const stateA = getChoiceCardState({
    showAnswer,
    isTarget: isTargetA,
    isSelected: effectiveChoice === 'A',
  });

  const stateB = getChoiceCardState({
    showAnswer,
    isTarget: isTargetB,
    isSelected: effectiveChoice === 'B',
  });

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col items-center gap-2 bg-muted/60 p-3 rounded-2xl border border-border shadow-inner w-full max-w-[250px] sm:max-w-[270px] mx-auto">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {t('promptTitle')}
        </span>
        <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
          <CanvasView
            width={THUMB_SIZE}
            height={THUMB_SIZE}
            className={CANVAS_OPTION_CLASS}
            draw={(canvas) =>
              drawPolygonCanvas({
                canvas,
                vertices: question.promptHull,
                size: THUMB_SIZE,
                fillColor: CANVAS_THEME.status.accent,
                strokeColor: CANVAS_THEME.status.accentDark,
              })
            }
            deps={[question.promptHull]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
        <ChoiceCard
          state={stateA}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('A')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                1
              </Badge>
              {`${t('common.areaA')} (${t('common.optionA')})`}
            </span>
            {showAnswer && isTargetA && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.hullDetailedA,
                  size: OPTION_SIZE,
                })
              }
              deps={[question.hullDetailedA]}
            />
          </div>
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                2
              </Badge>
              {`${t('common.areaB')} (${t('common.optionB')})`}
            </span>
            {showAnswer && isTargetB && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.hullDetailedB,
                  size: OPTION_SIZE,
                })
              }
              deps={[question.hullDetailedB]}
            />
          </div>
        </ChoiceCard>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/cards/abs_td_notan_2afc/AbsTdNotan2afcView.tsx
~~~~~
~~~~~typescript
import { Check, Columns } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

import {
  Badge,
  CanvasView,
  ChoiceCard,
  QuestionCardShell,
  getChoiceCardState,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
import { OPTION_SIZE, THUMB_SIZE, drawRawGrayscaleNoiseField } from './utils/generator';

const CANVAS_OPTION_CLASS =
  'w-full max-w-[200px] sm:max-w-[220px] aspect-square rounded-xl shadow-sm block';

export interface AbsTdNotan2afcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AbsTdNotan2afcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AbsTdNotan2afcViewProps) {
  const { t } = useCardTranslation('abs_td_notan_2afc');
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [question.id]);

  const handleSelect = (choice: 'A' | 'B') => {
    if (disabled || showAnswer) return;
    setSelectedChoice(choice);
    onAnswer(choice);
  };

  useChoiceShortcuts({
    optionsCount: 2,
    disabled: disabled || showAnswer,
    onSelect: (idx) => handleSelect(idx === 0 ? 'A' : 'B'),
  });

  const effectiveChoice = selectedChoice ?? userAnswer?.userChoice ?? null;
  const isTargetA = question.correctNotanChoice === 'A';
  const isTargetB = !isTargetA;

  const stateA = getChoiceCardState({
    showAnswer,
    isTarget: isTargetA,
    isSelected: effectiveChoice === 'A',
  });

  const stateB = getChoiceCardState({
    showAnswer,
    isTarget: isTargetB,
    isSelected: effectiveChoice === 'B',
  });

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col items-center gap-2 bg-muted/60 p-3 rounded-2xl border border-border shadow-inner w-full max-w-[250px] sm:max-w-[270px] mx-auto">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {t('promptTitle')}
        </span>
        <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
          <CanvasView
            width={THUMB_SIZE}
            height={THUMB_SIZE}
            className={CANVAS_OPTION_CLASS}
            draw={(canvas) =>
              drawRawGrayscaleNoiseField(
                canvas,
                question.promptNotanBuffer,
                question.notanFieldDim ?? 120,
                THUMB_SIZE,
              )
            }
            deps={[question.promptNotanBuffer, question.notanFieldDim]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
        <ChoiceCard
          state={stateA}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('A')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                1
              </Badge>
              {`${t('common.areaA')} (${t('common.optionA')})`}
            </span>
            {showAnswer && isTargetA && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawRawGrayscaleNoiseField(
                  canvas,
                  question.notanSceneBufferA,
                  question.notanFieldDim ?? 120,
                  OPTION_SIZE,
                )
              }
              deps={[question.notanSceneBufferA, question.notanFieldDim]}
            />
          </div>
        </ChoiceCard>

        <ChoiceCard
          state={stateB}
          size="lg"
          disabled={disabled || showAnswer}
          onClick={() => handleSelect('B')}
        >
          <div className="flex items-center justify-between w-full px-1">
            <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
              <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                2
              </Badge>
              {`${t('common.areaB')} (${t('common.optionB')})`}
            </span>
            {showAnswer && isTargetB && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
            )}
          </div>

          <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
            <CanvasView
              width={OPTION_SIZE}
              height={OPTION_SIZE}
              className={CANVAS_OPTION_CLASS}
              draw={(canvas) =>
                drawRawGrayscaleNoiseField(
                  canvas,
                  question.notanSceneBufferB,
                  question.notanFieldDim ?? 120,
                  OPTION_SIZE,
                )
              }
              deps={[question.notanSceneBufferB, question.notanFieldDim]}
            />
          </div>
        </ChoiceCard>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

#### Acts 4: 重构 `neg_shape_match_2afc` 视图，解构 `Choice2AfcContainer`

~~~~~act
write_file
src/cards/neg_shape_match_2afc/NegShapeMatch2AfcView.tsx
~~~~~
~~~~~typescript
import { Check, Sparkles } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import {
  Badge,
  ChoiceCard,
  QuestionCardShell,
  drawPolygonCanvas,
  getChoiceCardState,
  useCardTranslation,
  useChoiceShortcuts,
} from '@formsight/card-sdk';
import { type HitResult, NEGATIVE_SPACE_CANVAS_SIZE, type QuestionData } from './types';

export interface NegShapeMatch2AfcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer?: HitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function NegShapeMatch2AfcView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: NegShapeMatch2AfcViewProps) {
  const { t } = useCardTranslation('neg_shape_match_2afc');
  const [matchPhase, setMatchPhase] = useState<'stimulus' | 'recall'>('stimulus');
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const matchOptionRefA = useRef<HTMLCanvasElement | null>(null);
  const matchOptionRefB = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setMatchPhase('stimulus');
    setSelectedChoice(null);
  }, [question.id]);

  useEffect(() => {
    if (matchPhase === 'stimulus' && !showAnswer) {
      const timer = setTimeout(() => {
        setMatchPhase('recall');
      }, question.displayTimeMs || 1500);
      return () => clearTimeout(timer);
    }
  }, [matchPhase, question.displayTimeMs, showAnswer]);

  useEffect(() => {
    if (matchPhase === 'stimulus' && question.targetPolygon) {
      drawPolygonCanvas({
        canvas: canvasRef.current,
        vertices: question.targetPolygon,
        size: NEGATIVE_SPACE_CANVAS_SIZE,
      });
    }
  }, [matchPhase, question.targetPolygon]);

  useEffect(() => {
    if ((matchPhase === 'recall' || showAnswer) && question.optionsPolygons) {
      drawPolygonCanvas({
        canvas: matchOptionRefA.current,
        vertices: question.optionsPolygons[0],
        size: NEGATIVE_SPACE_CANVAS_SIZE,
      });
      drawPolygonCanvas({
        canvas: matchOptionRefB.current,
        vertices: question.optionsPolygons[1],
        size: NEGATIVE_SPACE_CANVAS_SIZE,
      });
    }
  }, [matchPhase, showAnswer, question.optionsPolygons]);

  const handleSelectChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer || matchPhase !== 'recall') return;
      setSelectedChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, matchPhase, onAnswer],
  );

  useChoiceShortcuts({
    optionsCount: 2,
    disabled: disabled || showAnswer || matchPhase !== 'recall',
    onSelect: (idx) => handleSelectChoice(idx === 0 ? 'A' : 'B'),
  });

  const effectiveChoice = selectedChoice ?? userAnswer?.userChoice ?? null;
  const isTargetA = question.correctOptionIndex === 0;
  const isTargetB = question.correctOptionIndex === 1;

  const stateA = getChoiceCardState({
    showAnswer,
    isTarget: isTargetA,
    isSelected: effectiveChoice === 'A',
  });

  const stateB = getChoiceCardState({
    showAnswer,
    isTarget: isTargetB,
    isSelected: effectiveChoice === 'B',
  });

  return (
    <QuestionCardShell
      hintText={
        matchPhase === 'stimulus' && !showAnswer
          ? t('memoryStimulusHint', {
              ms: question.displayTimeMs ?? 1500,
            })
          : t('memoryRecallHint')
      }
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      {matchPhase === 'stimulus' && !showAnswer ? (
        <div className="bg-muted/60 p-4 rounded-3xl border border-border shadow-inner flex flex-col items-center gap-3 w-full max-w-sm">
          <canvas
            ref={canvasRef}
            width={NEGATIVE_SPACE_CANVAS_SIZE}
            height={NEGATIVE_SPACE_CANVAS_SIZE}
            className="w-full aspect-square rounded-2xl border border-border shadow-sm bg-card"
          />
          <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
            <div
              key={`${question.id}-${matchPhase}`}
              className="bg-indigo-600 h-full"
              style={{
                width: '100%',
                animation: `shrinkWidth ${question.displayTimeMs}ms linear forwards`,
              }}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          <ChoiceCard
            state={stateA}
            size="lg"
            disabled={disabled || matchPhase !== 'recall' || showAnswer}
            onClick={() => handleSelectChoice('A')}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
                <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                  1
                </Badge>
                {t('common.areaA')}
              </span>
              {showAnswer && isTargetA && (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
              )}
            </div>

            <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
              <canvas
                ref={matchOptionRefA}
                width={NEGATIVE_SPACE_CANVAS_SIZE}
                height={NEGATIVE_SPACE_CANVAS_SIZE}
                className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm bg-card"
              />
            </div>
          </ChoiceCard>

          <ChoiceCard
            state={stateB}
            size="lg"
            disabled={disabled || matchPhase !== 'recall' || showAnswer}
            onClick={() => handleSelectChoice('B')}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
                <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-xs">
                  2
                </Badge>
                {t('common.areaB')}
              </span>
              {showAnswer && isTargetB && (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
              )}
            </div>

            <div className="w-full flex justify-center bg-card p-2 rounded-2xl border border-border shadow-inner">
              <canvas
                ref={matchOptionRefB}
                width={NEGATIVE_SPACE_CANVAS_SIZE}
                height={NEGATIVE_SPACE_CANVAS_SIZE}
                className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm bg-card"
              />
            </div>
          </ChoiceCard>
        </div>
      )}
    </QuestionCardShell>
  );
}
~~~~~

---

### 下一步建议

**批次 A（全部 10 张 2AFC 视图）重构已全部完成**。现在系统中已没有任何卡片依赖 `Standard2AfcView` 和 `Choice2AfcContainer`。

下一步建议推进**阶段一·批次 B：多元选择卡片（N-AFC）**：
重构 `abs_palette_clustering`、`abs_td_palette_2afc`、`rel_hue_induction` 和 `rel_vector_shift`，移除 `StandardNafcView`，将色彩预览与选项网格展开为扁平组合。
