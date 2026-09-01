你的分析完全准确。在之前的架构迁移中，`angle` 模块的卡片虽然切换到了独立维护的 `CardManifest` 形态，但其内部视图组件中引用的国际化 Key 仍停留在旧的全局 `packs.angle.views.*` 命名空间下，导致多语言无法正确解析而回退显示为 Key 字符串本身。同时，将多语言词典以 TS 对象内联在 `index.tsx` 中不利于维护，且 `_shared/schemas.ts` 仅被估算卡片单独使用，存在过度共享。

我将生成一个包含完整重构步骤的 `[WIP]` 计划，将国际化 JSON 文件下沉内聚至各个卡片各自的目录下，清理不必要的共享 schema，并精准修正所有视图组件中的 i18n 命名空间路径。

## [WIP] refactor(angle): 将 angle 模块各卡片 i18n 资源内聚至卡片目录并修正命名空间路径

### 错误分析

**问题原因**:
1. **命名空间失配**: 组件（如 `EstimationView`, `ComparisonView`, `ParallelView`）内部调用的 `t()` 函数路径为 `packs.angle.views.xxx`。但在新版架构中，`CardManifest` 的多语言是通过 `registry.registerCard` 自动挂载至 `cards.<cardId>.xxx` 命名空间的，导致全局词典中无法匹配该路径。
2. **多语言内联与维护性差**: 各卡片的文案直接硬编码在 `index.tsx` 的 TS 对象中，违背了国际化资源与逻辑代码分离的最佳实践。
3. **过度共享 (Premature Sharing)**: `_shared/schemas.ts` 仅被 `angle_estimation` 卡片使用，却放在共享目录中，违反了高内聚原则。

**解决方案**:
1. 移除不必要的 `_shared/schemas.ts`，并将设置 Schema 直接内聚到 `EstimationCard/index.tsx` 中。
2. 在各个卡片目录下创建独立的 `locales/en-US.json` 和 `locales/zh-CN.json` 纯 JSON 文件。
3. 在各卡片的 `index.tsx` 中引入这些独立的 JSON 词典。
4. 精准修正 `EstimationView.tsx`、`ComparisonView.tsx` 和 `ParallelView.tsx` 中的 `t()` 调用路径，由 `packs.angle.views.*` 变更为 `cards.<cardId>.views.*`。

### 用户需求
分析并修复 `angle` 模块下各卡片玩法要领显示为原始 Key 的原因，并将所有国际化词典与配置彻底内聚至各卡片文件夹中。

### 评论
此重构彻底理顺了 `modules` 架构下一等公民卡片的国际化加载机制与目录结构，极大地提升了代码的模块化内聚度与多语言协作体验。

### 目标
1. 删除 `src/modules/angle/_shared/schemas.ts`。
2. 为 `EstimationCard`、`ComparisonCard`、`ParallelCard` 创建各自的 `locales/en-US.json` 与 `locales/zh-CN.json`。
3. 重构各卡片的 `index.tsx` 与视图组件，完成 i18n 命名空间对齐。

### 基本原理
通过精确对齐 `CardManifest` 的多语言挂载规则（`cards.<cardId>` 命名空间），配合模块化目录结构，确保每个卡片文件夹都是一个完全自包含、可拔插的独立微模块，符合 FormSight v0.4.x 的架构设计哲学。

### 标签
#intent/refine #flow/ready #priority/high #comp/engine #concept/config #scope/core #ai/instruct #task/domain/ui #task/object/angle-card-i18n #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 删除冗余的共享 schema 文件

~~~~~act
delete_file
src/modules/angle/_shared/schemas.ts
~~~~~

#### Acts 2: 创建 EstimationCard 的英文多语言词典

~~~~~act
write_file
src/modules/angle/EstimationCard/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Angle Estimation",
  "desc": "Observe the angle formed by two rays and estimate its degree using a slider (0°~180°).",
  "instruction": "Observe the two rays and adjust the slider to match the true angle (0°~180°).",
  "badge": "Angle Estimation",
  "settings": {
    "showToleranceBandTitle": "Show Tolerance Band",
    "showToleranceBandDesc": "Visually highlight the accepted tolerance window on the slider track."
  },
  "views": {
    "estimationHint": "Observe the angle formed by rays and modulate the slider to match (0°~180°)",
    "estimationLabel": "Angle Estimation Value:",
    "trueAngle": "Ground Truth Value:",
    "errorInfo": "Error: {{error}}° (Tolerance: ±{{tolerance}}°)"
  }
}
~~~~~

#### Acts 3: 创建 EstimationCard 的中文多语言词典

~~~~~act
write_file
src/modules/angle/EstimationCard/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "夹角大小估算",
  "desc": "观察由纯黑线段构成的夹角，使用连续滑块精准评估夹角弧度大小 (0°~180°)。",
  "instruction": "观察极简两条射线夹角，调制滑块逼近精准度数 (0°~180°)",
  "badge": "夹角大小估算",
  "settings": {
    "showToleranceBandTitle": "显示容错带范围",
    "showToleranceBandDesc": "在滑块轨道上直观展示当前难度下的容错区间色带"
  },
  "views": {
    "estimationHint": "观察两射线夹角，调制滑块逼近精准度数 (0°~180°)",
    "estimationLabel": "夹角估算值:",
    "trueAngle": "绝对真理值:",
    "errorInfo": "误差: {{error}}° (容错: ±{{tolerance}}°)"
  }
}
~~~~~

#### Acts 4: 重构 EstimationCard 的 index.tsx 并内联 Schema 与 Locales

~~~~~act
write_file
src/modules/angle/EstimationCard/index.tsx
~~~~~
~~~~~tsx
import { Compass } from 'lucide-preact';
import type { SettingFieldSchema } from '../../../components/settings/DynamicDomainSettings';
import type { CardManifest } from '../../../core/contracts';
import type { BaseModuleSettings } from '../../../storage/settings';
import {
  type AngleHitResult,
  type AngleQuestionData,
  checkAngleHit,
  generateAngleQuestion,
} from '../_shared/angleUtils';
import { EstimationView } from './EstimationView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: 'cards.angle_estimation.settings.showToleranceBandTitle',
    description: 'cards.angle_estimation.settings.showToleranceBandDesc',
  },
];

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
    'zh-CN': zhCN,
    'en-US': enUS,
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

#### Acts 5: 修正 EstimationView.tsx 中的 i18n Key 路径

~~~~~act
patch_file
src/modules/angle/EstimationCard/EstimationView.tsx
~~~~~
~~~~~python.old
    <StandardSliderView
      questionId={question.id}
      hintText={t('packs.angle.views.estimationHint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label={t('packs.angle.views.estimationLabel')}
      max={180}
      step={0.5}
      initialValue={90}
      unit="°"
      targetValue={targetVal}
      tolerance={tolerance}
      showToleranceBand={showToleranceBand}
      showAnswer={showAnswer}
      isHit={isHit}
      userValue={userVal}
      disabled={disabled}
      hitMargin={hitMargin}
      submitMode="commit_on_release"
      onAnswer={onAnswer}
      preview={
        <div className="bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex justify-center items-center">
          <CanvasView
            width={ANGLE_CANVAS_SIZE}
            height={ANGLE_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card"
            draw={(canvas) => {
              if (question.lineA && question.lineB) {
                drawAngleCanvas(canvas, [question.lineA, question.lineB], ANGLE_CANVAS_SIZE);
              }
            }}
            deps={[question.lineA, question.lineB]}
          />
        </div>
      }
      footerDetails={
        showAnswer && userVal !== undefined ? (
          <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">
              {t('packs.angle.views.trueAngle')}{' '}
              <span className="font-bold text-foreground font-mono">{targetVal}°</span>
            </span>
            <span
              className={
                isHit
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-rose-600 dark:text-rose-400 font-bold'
              }
            >
              {t('packs.angle.views.errorInfo', {
                error: Math.round(Math.abs(userVal - targetVal) * 10) / 10,
                tolerance,
              })}
            </span>
          </div>
        ) : null
      }
    />
~~~~~
~~~~~python.new
    <StandardSliderView
      questionId={question.id}
      hintText={t('cards.angle_estimation.views.estimationHint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label={t('cards.angle_estimation.views.estimationLabel')}
      max={180}
      step={0.5}
      initialValue={90}
      unit="°"
      targetValue={targetVal}
      tolerance={tolerance}
      showToleranceBand={showToleranceBand}
      showAnswer={showAnswer}
      isHit={isHit}
      userValue={userVal}
      disabled={disabled}
      hitMargin={hitMargin}
      submitMode="commit_on_release"
      onAnswer={onAnswer}
      preview={
        <div className="bg-muted/60 p-3 rounded-2xl border border-border shadow-inner flex justify-center items-center">
          <CanvasView
            width={ANGLE_CANVAS_SIZE}
            height={ANGLE_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-border shadow-sm bg-card"
            draw={(canvas) => {
              if (question.lineA && question.lineB) {
                drawAngleCanvas(canvas, [question.lineA, question.lineB], ANGLE_CANVAS_SIZE);
              }
            }}
            deps={[question.lineA, question.lineB]}
          />
        </div>
      }
      footerDetails={
        showAnswer && userVal !== undefined ? (
          <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">
              {t('cards.angle_estimation.views.trueAngle')}{' '}
              <span className="font-bold text-foreground font-mono">{targetVal}°</span>
            </span>
            <span
              className={
                isHit
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-rose-600 dark:text-rose-400 font-bold'
              }
            >
              {t('cards.angle_estimation.views.errorInfo', {
                error: Math.round(Math.abs(userVal - targetVal) * 10) / 10,
                tolerance,
              })}
            </span>
          </div>
        ) : null
      }
    />
~~~~~

#### Acts 6: 创建 ComparisonCard 的英文多语言词典

~~~~~act
write_file
src/modules/angle/ComparisonCard/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Angle 2AFC Comparison",
  "desc": "Quickly identify which side has a larger angle under non-orthogonal orientations (2AFC).",
  "instruction": "Identify which angle is larger (Keys 1 / 2).",
  "badge": "Angle Comparison",
  "views": {
    "comparisonHint": "Identify which side contains a larger angle (Keys 1 / 2)"
  }
}
~~~~~

#### Acts 7: 创建 ComparisonCard 的中文多语言词典

~~~~~act
write_file
src/modules/angle/ComparisonCard/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "角度二分对比",
  "desc": "在消除空间正交基准干扰下，二选一快速判别哪一侧的两射线夹角更大 (2AFC)。",
  "instruction": "二选一快速判别哪一侧夹角更大 (键 1 / 2)",
  "badge": "角度二分对比",
  "views": {
    "comparisonHint": "二选一辨识哪一侧的两射线夹角更大 (键 1 / 2)"
  }
}
~~~~~

#### Acts 8: 重构 ComparisonCard 的 index.tsx 并引入 Locales

~~~~~act
write_file
src/modules/angle/ComparisonCard/index.tsx
~~~~~
~~~~~tsx
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
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

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
    'zh-CN': zhCN,
    'en-US': enUS,
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

#### Acts 9: 修正 ComparisonView.tsx 中的 i18n Key 路径

~~~~~act
patch_file
src/modules/angle/ComparisonCard/ComparisonView.tsx
~~~~~
~~~~~python.old
  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('packs.angle.views.comparisonHint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
~~~~~
~~~~~python.new
  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('cards.angle_comparison_2afc.views.comparisonHint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
~~~~~

#### Acts 10: 创建 ParallelCard 的英文多语言词典

~~~~~act
write_file
src/modules/angle/ParallelCard/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Parallel Alignment",
  "desc": "Observe the prompt orientation and identify the strictly parallel line below (2AFC).",
  "instruction": "Find the line that is strictly parallel to the prompt line (Keys 1 / 2).",
  "badge": "Parallel Alignment",
  "views": {
    "parallelHint": "Observe the prompt line and select the parallel one below (Keys 1 / 2)",
    "parallelPromptTitle": "Parallel Alignment Reference (Prompt)",
    "absoluteParallel": "Strictly Parallel",
    "deviationBadge": "Deviation {{deg}}°"
  }
}
~~~~~

#### Acts 11: 创建 ParallelCard 的中文多语言词典

~~~~~act
write_file
src/modules/angle/ParallelCard/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "平行线基准辨识",
  "desc": "观察上方给定的斜率基准线，在下方两个候选项中二选一找出与其绝对平行的线段 (2AFC)。",
  "instruction": "观察上方基准线，在下方选出与其保持绝对平行的线 (键 1 / 2)",
  "badge": "平行线基准辨识",
  "views": {
    "parallelHint": "观察上方基准线，选出下方与它严格平行的线 (键 1 / 2)",
    "parallelPromptTitle": "平行基准线 (Prompt)",
    "absoluteParallel": "绝对平行",
    "deviationBadge": "偏转 {{deg}}°"
  }
}
~~~~~

#### Acts 12: 重构 ParallelCard 的 index.tsx 并引入 Locales

~~~~~act
write_file
src/modules/angle/ParallelCard/index.tsx
~~~~~
~~~~~tsx
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
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

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
    'zh-CN': zhCN,
    'en-US': enUS,
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

#### Acts 13: 修正 ParallelView.tsx 中的 i18n Key 路径

~~~~~act
patch_file
src/modules/angle/ParallelCard/ParallelView.tsx
~~~~~
~~~~~python.old
  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('packs.angle.views.parallelHint')}
      hintIcon={Split}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      prompt={
        <div className="flex flex-col items-center gap-1.5 bg-muted/60 p-2.5 rounded-2xl border border-border shadow-inner">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t('packs.angle.views.parallelPromptTitle')}
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
      }
      optionA={{
        title: t('common.optionA'),
        isCorrect: isAHit,
        badge: showAnswer
          ? isAHit
            ? t('packs.angle.views.absoluteParallel')
            : t('packs.angle.views.deviationBadge', { deg: question.angularDeviation ?? 0 })
          : undefined,
        content: (
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
        ),
      }}
      optionB={{
        title: t('common.optionB'),
        isCorrect: isBHit,
        badge: showAnswer
          ? isBHit
            ? t('packs.angle.views.absoluteParallel')
            : t('packs.angle.views.deviationBadge', { deg: question.angularDeviation ?? 0 })
          : undefined,
        content: (
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
        ),
      }}
    />
  );
~~~~~
~~~~~python.new
  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('cards.angle_parallel_2afc.views.parallelHint')}
      hintIcon={Split}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      prompt={
        <div className="flex flex-col items-center gap-1.5 bg-muted/60 p-2.5 rounded-2xl border border-border shadow-inner">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t('cards.angle_parallel_2afc.views.parallelPromptTitle')}
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
      }
      optionA={{
        title: t('common.optionA'),
        isCorrect: isAHit,
        badge: showAnswer
          ? isAHit
            ? t('cards.angle_parallel_2afc.views.absoluteParallel')
            : t('cards.angle_parallel_2afc.views.deviationBadge', { deg: question.angularDeviation ?? 0 })
          : undefined,
        content: (
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
        ),
      }}
      optionB={{
        title: t('common.optionB'),
        isCorrect: isBHit,
        badge: showAnswer
          ? isBHit
            ? t('cards.angle_parallel_2afc.views.absoluteParallel')
            : t('cards.angle_parallel_2afc.views.deviationBadge', { deg: question.angularDeviation ?? 0 })
          : undefined,
        content: (
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
        ),
      }}
    />
  );
~~~~~

### 下一步建议

我们已经成功将 `angle` 模块下三张卡片的国际化词典完整下沉至各自目录中，并修复了全部 i18n 命名空间路径。建议启动前端开发服务器或运行构建命令，检查角度感知训练模块的各项玩法要领与界面提示是否能够正确按语言环境显示。
