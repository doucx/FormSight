收到，我们将立即执行治理路线图中的**阶段一：核心算法契约与伪容错修复（P0）**。

## [WIP] fix: 修复核心判题契约伪容错与选项类型二义性

### 错误分析

1. **`persp_structure_3d` 伪容错脱节**：
   - 题目生成器中硬编码了常数 `tolerance: 0.5`，该字段并未随层阶 `difficultyLevel` 产生任何自适应衰减。
   - 核心判定函数 `checkHit` 内硬编码了击中阈值 `isHit = dist <= 12`（像素距离），导致界面汇报的容错与实际判定胜负的数学逻辑彻底割裂，违背了自适应系统的契约原则。
2. **`neg_shape_match_2afc` 交互选项类型摇摆**：
   - 全局所有 2AFC 卡片交互结果均规范收敛为 `'A' | 'B'`，但 `neg_shape_match_2afc` 在视图层与清单声明中使用了 `0 | 1`，并在 `evaluateAnswer` 内部编写了 `typeof` 兼容垫片，破坏了 2AFC 契约的一致性。
3. **`rel_hue_induction` 判题双轨二义性**：
   - 该卡片为 4AFC 多选离散卡片，但在 `checkHit` 中却包含了 `selectedIndex !== -1 ? ... : deltaEError <= question.tolerance` 的连续色差截断兜底分支，混淆了单选判题与连续空间调制的业务边界。

### 用户需求

消除判题内核中的硬编码伪容错与类型摇摆，使所有相关模块的容错判定严格与等级衰减自洽，并统一 2AFC / NAFC 的交互入参规范。

### 评论

这是提升认知训练核心严谨性的关键基础操作。真实的动态容错能够保证训练者在爬升至高难度等级时真正感受到吸附精度的收窄，而统一选择题契约将彻底消除后续数据分析层的多态解析负担。

### 目标

1. 在 `persp_structure_3d` 中引入基于等级指数衰减的真实像素容错（Lvl 1 18px ~ Lvl 35 5px），使 `isHit = dist <= question.tolerance` 逻辑闭环。
2. 将 `neg_shape_match_2afc` 的做答入参从 `0 | 1` 重构为标准的 `'A' | 'B'`，清理内部的 `typeof` 运行时分支。
3. 纯化 `rel_hue_induction` 的判定逻辑为精准项匹配 `selectedIndex === question.correctIndex`。

### 基本原理

通过引入数学工具库中的 `expDecayInterpolate`，将连续几何空间的吸附半径映射为可控的感知递进曲线；并在组件与算法清单层统一使用具名字面量联合类型 `'A' | 'B'`，保障编译期类型系统的确定性。

### 标签

#intent/fix #flow/ready #priority/high
#comp/runtime #concept/executor #scope/core
#ai/instruct
#task/domain/core-algorithms
#task/object/evaluation-contracts
#task/action/bug-fix
#task/state/begin #task/status/active

---

### Script

#### Acts 1: 修复 `persp_structure_3d` 的伪容错与吸附判定

引入 `expDecayInterpolate` 动态计算像素容错，并在 `checkHit` 中严格依照声明的容错执行胜负判定。

~~~~~act
patch_file
src/cards/persp_structure_3d/utils/generator.ts
~~~~~
~~~~~ts.old
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';
import type { PerspStructure3DHitResult, PerspStructure3DQuestion, Point3D } from '../types';
~~~~~
~~~~~ts.new
import { expDecayInterpolate } from '../../../core/math/mathUtils';
import type { Point } from '../../../types';
import { CANVAS_THEME } from '../../../utils/theme';
import type { PerspStructure3DHitResult, PerspStructure3DQuestion, Point3D } from '../types';
~~~~~

~~~~~act
patch_file
src/cards/persp_structure_3d/utils/generator.ts
~~~~~
~~~~~ts.old
  const targetProjectedPoint = project3DTo2D(targetPoint3D, center, scale);

  return {
    id,
    difficultyLevel: clampedLevel,
    gridDim3D,
    targetPoint3D,
    projectedGridPoints,
    targetProjectedPoint,
    tolerance: 0.5,
  };
}

export function checkHit(
  clickPoint: Point,
  question: PerspStructure3DQuestion,
): PerspStructure3DHitResult {
  const target = question.targetProjectedPoint;
  const dist = target
    ? Math.sqrt((clickPoint.x - target.x) ** 2 + (clickPoint.y - target.y) ** 2)
    : 999;
  const isHit = dist <= 12;

  return {
    isHit,
    userValue: clickPoint,
    targetValue: target,
    errorValue: Math.round(dist * 10) / 10,
    tolerance: question.tolerance,
  };
}
~~~~~
~~~~~ts.new
  const targetProjectedPoint = project3DTo2D(targetPoint3D, center, scale);
  const tolerance = Math.round(expDecayInterpolate(18.0, 5.0, clampedLevel) * 10) / 10;

  return {
    id,
    difficultyLevel: clampedLevel,
    gridDim3D,
    targetPoint3D,
    projectedGridPoints,
    targetProjectedPoint,
    tolerance,
  };
}

export function checkHit(
  clickPoint: Point,
  question: PerspStructure3DQuestion,
): PerspStructure3DHitResult {
  const target = question.targetProjectedPoint;
  const dist = target
    ? Math.sqrt((clickPoint.x - target.x) ** 2 + (clickPoint.y - target.y) ** 2)
    : 999;
  const isHit = dist <= question.tolerance;

  return {
    isHit,
    userValue: clickPoint,
    targetValue: target,
    errorValue: Math.round(dist * 10) / 10,
    tolerance: question.tolerance,
  };
}
~~~~~

#### Acts 2: 规范化 `neg_shape_match_2afc` 答题入参为标准的 `'A' | 'B'`

重构生成器、视图组件与模块清单，消除内部 `0 | 1` 与 `'A' | 'B'` 的转换垫片。

~~~~~act
patch_file
src/cards/neg_shape_match_2afc/utils/generator.ts
~~~~~
~~~~~ts.old
export function evaluateAnswer(
  userChoiceInput: 0 | 1 | 'A' | 'B',
  question: QuestionData,
): HitResult {
  let userChoiceIndex: number;
  if (typeof userChoiceInput === 'number') {
    userChoiceIndex = userChoiceInput;
  } else if (userChoiceInput === 'A') {
    userChoiceIndex = 0;
  } else {
    userChoiceIndex = 1;
  }

  const isHit = userChoiceIndex === question.correctOptionIndex;
  const userChoice: 'A' | 'B' = userChoiceIndex === 0 ? 'A' : 'B';

  return {
    isHit,
    userChoice,
    userChoiceIndex,
    correctChoice: question.correctChoice,
    correctOptionIndex: question.correctOptionIndex,
    errorValue: isHit ? 0 : 1,
    tolerance: 0,
  };
}
~~~~~
~~~~~ts.new
export function evaluateAnswer(
  userChoice: 'A' | 'B',
  question: QuestionData,
): HitResult {
  const userChoiceIndex = userChoice === 'A' ? 0 : 1;
  const isHit = userChoice === question.correctChoice;

  return {
    isHit,
    userChoice,
    userChoiceIndex,
    correctChoice: question.correctChoice,
    correctOptionIndex: question.correctOptionIndex,
    errorValue: isHit ? 0 : 1,
    tolerance: 0,
  };
}
~~~~~

~~~~~act
patch_file
src/cards/neg_shape_match_2afc/NegShapeMatch2AfcView.tsx
~~~~~
~~~~~ts.old
export interface NegShapeMatch2AfcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer?: HitResult | null;
  onAnswer: (choice: 0 | 1) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}
~~~~~
~~~~~ts.new
export interface NegShapeMatch2AfcViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer?: HitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}
~~~~~

~~~~~act
patch_file
src/cards/neg_shape_match_2afc/NegShapeMatch2AfcView.tsx
~~~~~
~~~~~ts.old
  const handleSelectMatchChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer || matchPhase !== 'recall') return;
      setSelectedMatchChoice(choice);
      onAnswer(choice === 'A' ? 0 : 1);
    },
    [disabled, showAnswer, matchPhase, onAnswer],
  );
~~~~~
~~~~~ts.new
  const handleSelectMatchChoice = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer || matchPhase !== 'recall') return;
      setSelectedMatchChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, matchPhase, onAnswer],
  );
~~~~~

~~~~~act
patch_file
src/cards/neg_shape_match_2afc/index.tsx
~~~~~
~~~~~ts.old
export const negShapeMatch2AfcCard: CardManifest<
  QuestionData,
  HitResult,
  0 | 1,
  BaseModuleSettings
> = {
~~~~~
~~~~~ts.new
export const negShapeMatch2AfcCard: CardManifest<
  QuestionData,
  HitResult,
  'A' | 'B',
  BaseModuleSettings
> = {
~~~~~

~~~~~act
patch_file
src/cards/neg_shape_match_2afc/index.tsx
~~~~~
~~~~~ts.old
    extractRecordDetails: (q, hitResult, userVal) => ({
      userChoice: userVal === 0 ? 'A' : 'B',
      correctChoice: q.correctChoice,
      displayTimeMs: q.displayTimeMs,
      errorValue: hitResult.errorValue,
    }),
~~~~~
~~~~~ts.new
    extractRecordDetails: (q, hitResult, userVal) => ({
      userChoice: userVal,
      correctChoice: q.correctChoice,
      displayTimeMs: q.displayTimeMs,
      errorValue: hitResult.errorValue,
    }),
~~~~~

#### Acts 3: 纯化 `rel_hue_induction` 判题逻辑

移除 4AFC 离散选择题内部多余的色差（DeltaE）截断回退分支。

~~~~~act
patch_file
src/cards/rel_hue_induction/utils/generator.ts
~~~~~
~~~~~ts.old
  const selectedIndex = question.options.findIndex(
    (opt) => opt[0] === userColor[0] && opt[1] === userColor[1] && opt[2] === userColor[2],
  );

  const isHit =
    selectedIndex !== -1
      ? selectedIndex === question.correctIndex
      : deltaEError <= question.tolerance;

  return {
~~~~~
~~~~~ts.new
  const selectedIndex = question.options.findIndex(
    (opt) => opt[0] === userColor[0] && opt[1] === userColor[1] && opt[2] === userColor[2],
  );

  const isHit = selectedIndex === question.correctIndex;

  return {
~~~~~

### 下一步建议

核心算法判题与选项契约已完成修复。接下来建议进入**阶段二：i18n 一致性与数据信任链落地**：
1. 清理 `persp_prop_division`、`persp_prop_migration` 与 `persp_structure_3d` 中的 `cardT` + `commonT` 双翻译实例。
2. 将 `src/storage/planStorage.ts` 中的 `EMPTY_TRAINING_PLAN` 改造为工厂函数，避免模块加载期静态求值导致的词条冻结。
3. 参数化解耦 `fractal_edge_roughness/utils/charts.ts` 与 `drawColorRing.ts` 中的硬编码文案。
4. 移除 `color_hue/analytics.tsx` 与 `star_single/analytics.tsx` 中的防御性解包逻辑，践行私有轻量类型断言。
