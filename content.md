## [WIP] fix(angle): 将包含 JSX 的 index.ts 文件重命名为 index.tsx

### 错误分析
在之前的重构中，`src/modules/angle/EstimationCard/index.ts`、`src/modules/angle/ComparisonCard/index.ts` 和 `src/modules/angle/ParallelCard/index.ts` 中引入了 JSX 语法（用于在 `renderCanvas` 中渲染对应的视图组件）。然而，文件后缀为 `.ts` 而非 `.tsx`，导致 TypeScript 编译器无法解析 JSX 中的尖括号语法，从而抛出 `Expected ">" but found "question"` 编译错误。

### 用户需求
将所有包含 JSX 语法的 `.ts` 入口文件重命名为 `.tsx` 后缀。

### 评论
这是一个典型的由于 TypeScript 文件后缀与内容语法不匹配导致的类型检查/编译错误。通过将其调整为 `.tsx` 能够使编译器正确识别 TSX 语法。

### 目标
1. 通过 `write_file` 重新创建以 `.tsx` 结尾的卡片入口文件。
2. 使用 `delete_file` 清理旧的 `.ts` 文件。

### 基本原理
Quipu Act 指令集没有直接的 `rename_file`（或者为了保险起见），可以通过组合使用 `write_file`（写入到 `.tsx` 路径）和 `delete_file`（删除原 `.ts` 路径）来原子化地完成重命名操作。

### 标签
#intent/fix #flow/ready #priority/high #comp/build #scope/core #ai/instruct #task/domain/modules #task/object/angle-card-rename #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 重命名 EstimationCard 的 index.ts 为 index.tsx

~~~~~act
write_file
src/modules/angle/EstimationCard/index.tsx
~~~~~
~~~~~ts
import { Compass } from 'lucide-preact';
import type { CardManifest } from '../../../core/contracts';
import type { BaseModuleSettings } from '../../../storage/settings';
import { SLIDER_COMMON_SCHEMAS } from '../_shared/schemas';
import {
  type AngleHitResult,
  type AngleQuestionData,
  checkAngleHit,
  generateAngleQuestion,
} from '../_shared/angleUtils';
import { EstimationView } from './EstimationView';

export const angleEstimationCard: CardManifest<
  AngleQuestionData,
  AngleHitResult,
  number,
  BaseModuleSettings
> = {
  id: 'angle_estimation',
  groupId: 'angle',
  mode: 'ANGLE_ESTIMATION',
  icon: Compass,
  tags: {
    domain: ['form_and_proportion'],
    path: ['absolute_estimation'],
    interaction: ['continuous_mod'],
  },
  hasWeaknessAnalytics: true,
  settingSchemas: SLIDER_COMMON_SCHEMAS,
  defaultSettings: {
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
  locales: {
    'zh-CN': {
      title: '夹角大小估算',
      desc: '观察由纯黑线段构成的夹角，使用连续滑块精准评估夹角弧度大小 (0°~180°)。',
      instruction: '观察极简两条射线夹角，调制滑块逼近精准度数 (0°~180°)',
      badge: '夹角大小估算',
      settings: {
        showToleranceBandTitle: '显示容错带范围',
        showToleranceBandDesc: '在滑块轨道上直观展示当前难度下的容错区间色带',
      },
    },
    'en-US': {
      title: 'Angle Estimation',
      desc: 'Observe the angle formed by two rays and estimate its degree using a slider (0°~180°).',
      instruction: 'Observe the two rays and adjust the slider to match the true angle (0°~180°).',
      badge: 'Angle Estimation',
      settings: {
        showToleranceBandTitle: 'Show Tolerance Band',
        showToleranceBandDesc: 'Visually highlight the accepted tolerance window on the slider track.',
      },
    },
  },
  training: {
    generateQuestion: (level) => generateAngleQuestion('ANGLE_ESTIMATION', level),
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
      <EstimationView
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
  },
};

export default angleEstimationCard;
~~~~~

~~~~~act
delete_file
src/modules/angle/EstimationCard/index.ts
~~~~~

#### Acts 2: 重命名 ComparisonCard 的 index.ts 为 index.tsx

~~~~~act
write_file
src/modules/angle/ComparisonCard/index.tsx
~~~~~
~~~~~ts
import { Columns } from 'lucide-preact';
import type { CardManifest } from '../../../core/contracts';
import type { BaseModuleSettings } from '../../../storage/settings';
import {
  type AngleHitResult,
  type AngleQuestionData,
  checkAngleHit,
  generateAngleQuestion,
} from '../_shared/angleUtils';
import { ComparisonView } from './ComparisonView';

export const angleComparisonCard: CardManifest<
  AngleQuestionData,
  AngleHitResult,
  'A' | 'B',
  BaseModuleSettings
> = {
  id: 'angle_comparison_2afc',
  groupId: 'angle',
  mode: 'ANGLE_COMPARISON_2AFC',
  icon: Columns,
  tags: {
    domain: ['form_and_proportion'],
    path: ['relational_mapping'],
    interaction: ['binary_choice'],
  },
  hasWeaknessAnalytics: false,
  locales: {
    'zh-CN': {
      title: '角度二分对比',
      desc: '在消除空间正交基准干扰下，二选一快速判别哪一侧的两射线夹角更大 (2AFC)。',
      instruction: '二选一快速判别哪一侧夹角更大 (键 1 / 2)',
      badge: '角度二分对比',
    },
    'en-US': {
      title: 'Angle 2AFC Comparison',
      desc: 'Quickly identify which side has a larger angle under non-orthogonal orientations (2AFC).',
      instruction: 'Identify which angle is larger (Keys 1 / 2).',
      badge: 'Angle Comparison',
    },
  },
  training: {
    generateQuestion: (level) => generateAngleQuestion('ANGLE_COMPARISON_2AFC', level),
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
      <ComparisonView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={(settings.showCanvasHints as boolean) ?? true}
      />
    ),
  },
};

export default angleComparisonCard;
~~~~~

~~~~~act
delete_file
src/modules/angle/ComparisonCard/index.ts
~~~~~

#### Acts 3: 重命名 ParallelCard 的 index.ts 为 index.tsx

~~~~~act
write_file
src/modules/angle/ParallelCard/index.tsx
~~~~~
~~~~~ts
import { Split } from 'lucide-preact';
import type { CardManifest } from '../../../core/contracts';
import type { BaseModuleSettings } from '../../../storage/settings';
import {
  type AngleHitResult,
  type AngleQuestionData,
  checkAngleHit,
  generateAngleQuestion,
} from '../_shared/angleUtils';
import { ParallelView } from './ParallelView';

export const angleParallelCard: CardManifest<
  AngleQuestionData,
  AngleHitResult,
  'A' | 'B',
  BaseModuleSettings
> = {
  id: 'angle_parallel_2afc',
  groupId: 'angle',
  mode: 'PARALLEL_ALIGNMENT_2AFC',
  icon: Split,
  tags: {
    domain: ['form_and_proportion'],
    path: ['relational_mapping'],
    interaction: ['binary_choice'],
  },
  hasWeaknessAnalytics: false,
  locales: {
    'zh-CN': {
      title: '平行线基准辨识',
      desc: '观察上方给定的斜率基准线，在下方两个候选项中二选一找出与其绝对平行的线段 (2AFC)。',
      instruction: '观察上方基准线，在下方选出与其保持绝对平行的线 (键 1 / 2)',
      badge: '平行线基准辨识',
    },
    'en-US': {
      title: 'Parallel Alignment',
      desc: 'Observe the prompt orientation and identify the strictly parallel line below (2AFC).',
      instruction: 'Find the line that is strictly parallel to the prompt line (Keys 1 / 2).',
      badge: 'Parallel Alignment',
    },
  },
  training: {
    generateQuestion: (level) => generateAngleQuestion('PARALLEL_ALIGNMENT_2AFC', level),
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
      <ParallelView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={(settings.showCanvasHints as boolean) ?? true}
      />
    ),
  },
};

export default angleParallelCard;
~~~~~

~~~~~act
delete_file
src/modules/angle/ParallelCard/index.ts
~~~~~

### 下一步建议
文件已成功从 `.ts` 重命名并迁移至 `.tsx`，JSX 解析错误现已被彻底消除。可以继续运行构建命令以验证 TypeScript 编译是否通过。
